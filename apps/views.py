import json
import logging
import urllib.parse
import uuid

import requests
import time
from django.contrib import messages
from django.contrib.auth import login, logout
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.auth.tokens import default_token_generator
from django.contrib.contenttypes.models import ContentType
from django.core.cache import cache
from django.core.serializers.json import DjangoJSONEncoder
from django.db import transaction, IntegrityError
from django.db.models import F, Q, Prefetch, Count, Avg
from django.forms.models import model_to_dict
from django.http import JsonResponse, HttpResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.template.loader import render_to_string
from django.urls import reverse_lazy
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode
from django.views import View
from django.views.generic import CreateView, FormView, ListView, TemplateView, DetailView

from apps.ai_moderator import check_review_with_ai
from apps.forms import (ForgotPasswordForm, LoginForm,
                        PasswordResetConfirmForm, RegisterModelForm, ReviewModelForm, BookingGuestForm)
from apps.mixins import LoginNotRequiredMixin
from apps.models import Destination, User, Country, Review, ActionLog, PromoCode, TicketType, Booking
from apps.models.categories import City, Region
from apps.tasks import moderate_review_task
from apps.utils.send_email import send_user_email
from apps.utils.tokens import account_activation_token
from root import settings

from django.core.paginator import Paginator, PageNotAnInteger, EmptyPage


class BookingStep1View(DetailView):
    queryset = Destination.objects.select_related('city').prefetch_related('ticket_types')
    template_name = 'apps/booking_step1.html'
    context_object_name = 'destination'

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

    def get_context_data(self, **kwargs):
        """Ma'lumotlarni URL-dan yoki Session-dan tiklash"""
        context = super().get_context_data(**kwargs)
        request = self.request
        destination = self.object

        # 1. Sessionda saqlangan ma'lumotlarni tekshiramiz
        pending = request.session.get('pending_booking', {})
        is_same_dest = pending.get('destination_id') == destination.id

        # 2. Ma'lumotlarni olish (Birinchi URL-dan, agar yo'q bo'lsa Session-dan)
        selected_date = request.GET.get('date') or (
            pending.get('booking_details', {}).get('date') if is_same_dest else None)
        selected_time = request.GET.get('time') or (
            pending.get('booking_details', {}).get('time') if is_same_dest else None)
        total_price = request.GET.get('total_price') or (
            pending.get('booking_details', {}).get('total_price') if is_same_dest else '0')

        # 3. Chiptalarni tiklash
        selected_tickets = []
        session_tickets = pending.get('booking_details', {}).get('tickets', {}) if is_same_dest else {}

        for t_type in destination.ticket_types.all():
            # URL-dan qidiramiz (ticket_1=2)
            qty = request.GET.get(f'ticket_{t_type.id}')

            # Agar URL-da bo'lmasa, session-dan qidiramiz
            if not qty and str(t_type.id) in session_tickets:
                qty = session_tickets[str(t_type.id)]

            if qty and str(qty).isdigit() and int(qty) > 0:
                selected_tickets.append({
                    'id': t_type.id,
                    'name': t_type.name,
                    'price': t_type.price,
                    'quantity': int(qty),
                })

        # 4. Context-ga hamma narsani yuklaymiz
        context.update({
            'selected_date': selected_date,
            'selected_time': selected_time,
            'total_price': total_price,
            'selected_tickets': selected_tickets,
            'pending_promo': pending.get('booking_details', {}).get('promo_code') if is_same_dest else None})
        return context

    def post(self, request, *args, **kwargs):
        self.object = self.get_object()
        destination = self.object
        user = request.user if request.user.is_authenticated else None

        form = BookingGuestForm(request.POST)

        if form.is_valid():
            cleaned_data = form.cleaned_data

            # Dinamik chiptalarni yig'ish
            tickets_data = {}
            for key, value in request.POST.items():
                if key.startswith('ticket_') and value.isdigit() and int(value) > 0:
                    ticket_id = key.split('_')[1]
                    tickets_data[ticket_id] = int(value)

            promo_from_post = request.POST.get('promo_code', '').strip()

            # Sessionga saqlash
            request.session['pending_booking'] = {
                'destination_id': destination.id,
                'guest_info': {
                    'first_name': cleaned_data['first_name'],
                    'last_name': cleaned_data['last_name'],
                    'email': cleaned_data['email'],
                    'phone': form.get_full_phone(),
                },
                'booking_details': {
                    'date': cleaned_data['selected_date'],
                    'time': cleaned_data['selected_time'],
                    'tickets': tickets_data,
                    'total_price': float(cleaned_data['total_price']),
                    'promo_code': promo_from_post  # <--- MANA SHU ANIQ SAQLAYDI
                }
            }

            # ActionLog (Faqat muvaffaqiyatli holatda)
            ActionLog.objects.create(
                user=user,
                category=ActionLog.Category.DATA,
                action="Completed Booking Step 1",
                verb="submitted",
                level=ActionLog.Level.INFO,
                message=f"User validated details for {destination.name}",
                content_type=ContentType.objects.get_for_model(destination),
                object_id=destination.id,
                object_repr=str(destination),
                ip_address=self.get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT'),
                path=request.path,
                method=request.method,
                extra_info={"total_price": float(cleaned_data['total_price'])}
            )

            return redirect('booking_step2_page', slug=destination.slug)

        else:
            # Xatolik bo'lsa ma'lumotlarni POST-dan tiklaymiz
            for field, errors in form.errors.items():
                for error in errors:
                    messages.error(request, f"{field.replace('_', ' ').capitalize()}: {error}")

            context = self.get_context_data()
            context.update({
                'selected_date': request.POST.get('selected_date'),
                'selected_time': request.POST.get('selected_time'),
                'total_price': request.POST.get('total_price'),
            })

            # Chiptalarni POST ma'lumotidan tiklash
            res_tickets = []
            for t_type in destination.ticket_types.all():
                qty = request.POST.get(f'ticket_{t_type.id}')
                if qty and qty.isdigit() and int(qty) > 0:
                    res_tickets.append({
                        'id': t_type.id, 'name': t_type.name,
                        'price': t_type.price, 'quantity': int(qty),
                    })
            context['selected_tickets'] = res_tickets

            return self.render_to_response(context)


def get_client_ip(request):
    """Foydalanuvchining haqiqiy IP manzilini aniqlash"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def log_action(request, category, action, verb, level, message, target_object=None, post_data=None, extra=None):
    """ActionLog yaratish uchun DRY helper funksiya"""
    ActionLog.objects.create(
        user=request.user if request.user.is_authenticated else None,
        category=category,
        action=action,
        verb=verb,
        level=level,
        message=message,
        target_object=target_object,
        post_change_data=post_data or {},
        extra_info=extra or {},
        ip_address=get_client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
        path=request.path,
        method=request.method,
    )


# ==========================================
# 2. ASOSIY VIEW KLASSI
# ==========================================

class BookingStep2View(View):

    def get(self, request, slug):
        """Step 2 sahifasini ko'rsatish"""
        destination = get_object_or_404(Destination, slug=slug)
        pending = request.session.get('pending_booking')

        if not pending or pending.get('destination_id') != destination.id:
            return redirect('booking_step1_page', slug=slug)

        # Chipta ID-larini nomlarga aylantirish
        tickets_with_names = {}
        tickets_data = pending['booking_details'].get('tickets', {})
        for t_id, qty in tickets_data.items():
            ticket_type = TicketType.objects.filter(id=t_id).first()
            if ticket_type:
                tickets_with_names[ticket_type.name] = qty

        pending['booking_details']['tickets_items'] = tickets_with_names
        promo_code = pending['booking_details'].get('promo_code', '')

        return render(request, 'apps/booking_step2.html', {
            'destination': destination,
            'booking_data': pending,
            'pending_promo': promo_code,
        })

    @transaction.atomic
    def post(self, request, slug):
        """JS dan kelgan JSON ma'lumotni qabul qilib, bazaga hamma narsani saqlash"""
        pending = request.session.get('pending_booking')

        if not pending:
            return JsonResponse({'success': False, 'message': 'Session expired.'})

        destination = get_object_or_404(Destination, slug=slug)

        try:
            # 🚀 1. JS dan yuborilgan JSON body'ni o'qiymiz
            data = json.loads(request.body)

            # JS dan kelayotgan to'lov ma'lumotlari
            payment_method = data.get('method', 'card')
            card_type = data.get('card_type')  # Visa, Humo va h.k.
            card_mask = data.get('card_mask')  # 8600 **** 1234

            # 2. Chipta nomlarini yig'ish
            tickets_with_names = {}
            for t_id, qty in pending['booking_details']['tickets'].items():
                t_obj = TicketType.objects.filter(id=t_id).first()
                if t_obj:
                    tickets_with_names[t_obj.name] = qty

            # 🚀 3. HAQIQIY BOOKING YARATISH (Barcha yangi maydonlar bilan)
            booking = Booking.objects.create(
                user=request.user if request.user.is_authenticated else None,
                destination=destination,
                booking_date=pending['booking_details']['date'],
                time=pending['booking_details'].get('time'),

                guest_first_name=pending['guest_info']['first_name'],
                guest_last_name=pending['guest_info']['last_name'],
                guest_email=pending['guest_info']['email'],
                guest_phone=pending['guest_info']['phone'],

                tickets_data=tickets_with_names,
                total_price=pending['booking_details']['total_price'],
                promo_code=pending['booking_details'].get('promo_code', ''),

                # ✅ YANGI MODEL MAYDONLARI:
                status=Booking.Status.CONFIRMED,
                is_paid=True,
                paid_at=timezone.now(),
                payment_method=payment_method,
                card_type=card_type,
                card_mask=card_mask,
                # Noyob tranzaksiya ID yaratish (kelajakda to'lov tizimidan keladi)
                transaction_id=f"TRX-{uuid.uuid4().hex[:12].upper()}"
            )

            # 4. Promo-kod ishlatilishini yangilash
            p_code = pending['booking_details'].get('promo_code')
            if p_code:
                PromoCode.objects.filter(code__iexact=p_code).update(used_count=F('used_count') + 1)

            # 5. ACTION LOG (Audit uchun barcha detallar bilan)
            log_action(
                request,
                category=ActionLog.Category.FINANCE,
                action="Booking Created & Paid",
                verb="created",
                level=ActionLog.Level.INFO,
                message=f"Booking {booking.booking_number} confirmed via {payment_method}.",
                target_object=booking,
                post_data={
                    "booking_number": booking.booking_number,
                    "method": payment_method,
                    "card": card_mask,
                    "total": float(booking.total_price)
                }
            )

            # 6. Sessionni tozalash
            del request.session['pending_booking']

            return JsonResponse({
                'success': True,
                'booking_number': booking.booking_number  # TH-2026-XXXXXXXX
            })

        except Exception as e:
            # Xatolikni log qilish
            return JsonResponse({'success': False, 'message': f'Error: {str(e)}'})


class CheckPromoCodeView(View):
    """
    AJAX orqali promo-kodni validatsiya qilish uchun View.
    URL: /booking/check-promo/?code=SALE10&dest_id=5
    """

    def get(self, request, *args, **kwargs):
        code = request.GET.get('code', '').strip().upper()
        dest_id = request.GET.get('dest_id')
        user = request.user

        # 1. Kod kiritilganini tekshirish
        if not code:
            return JsonResponse({'success': False, 'message': 'Please enter a promo code.'})

        try:
            # 2. Kodni bazadan qidirish (Faqat aktivlarini)
            promo = PromoCode.objects.get(code__iexact=code, is_active=True)
            # 3. Destinationni bazadan olish
            destination = None
            if dest_id:
                destination = Destination.objects.filter(id=dest_id).first()

            # 4. Model ichidagi is_valid_for metodini chaqiramiz (Boyagi mantiq)
            # Agar sizda metod bo'lmasa, mana bu yerda tekshiramiz:
            now = timezone.now()

            # Muddatni tekshirish
            if not (promo.valid_from <= now <= promo.valid_to):
                return JsonResponse({'success': False, 'message': 'This promo code has expired.'})

            # Ishlatilish sonini tekshirish
            if promo.used_count >= promo.max_uses:
                return JsonResponse({'success': False, 'message': 'Promo code limit reached.'})

            # Shaxsiy kod bo'lsa, foydalanuvchini tekshirish
            if promo.user and promo.user != user:
                return JsonResponse({'success': False, 'message': 'This promo code is not valid for your account.'})

            # Destinationga bog'liqligini tekshirish
            if promo.destination and promo.destination != destination:
                return JsonResponse({
                    'success': False,
                    'message': f'This code only works for {promo.destination.name}.'
                })

            # 5. Hamma tekshiruvdan o'tsa - muvaffaqiyatli javob
            return JsonResponse({
                'success': True,
                'discount_percent': promo.discount_percent,
                'message': f'Promo code applied! You got {promo.discount_percent}% discount.'
            })

        except PromoCode.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Invalid promo code.'})
        except Exception as e:
            return JsonResponse({'success': False, 'message': 'An error occurred. Please try again.'})


class DestinationAllReviewsView(DetailView):
    model = Destination
    template_name = 'apps/all_reviews.html'
    context_object_name = 'destination'

    def get_context_data(self, **kwargs):
        # 1. Ijro vaqtini o'lchashni boshlaymiz
        start_time = time.time()

        context = super().get_context_data(**kwargs)
        destination = self.get_object()
        request = self.request

        # 2. XAVFSIZ FILTRLASH VA OPTIMALLASHTIRISH
        base_reviews_qs = Review.objects.filter(
            destination=destination,
            is_visible=True
        ).select_related('user')

        total_reviews_count = destination.visible_reviews_count
        context['visible_reviews_count'] = total_reviews_count

        # 3. DINAMIK TARTIBLASH (URL Query)
        sort_by = request.GET.get('sort', 'newest')
        if sort_by == 'highest':
            reviews_qs = base_reviews_qs.order_by('-rating', '-created_at')
        elif sort_by == 'lowest':
            reviews_qs = base_reviews_qs.order_by('rating', '-created_at')
        else:
            reviews_qs = base_reviews_qs.order_by('-created_at')

        # 4. FOYDALANUVCHINING SHAXSIY IZOHI
        if request.user.is_authenticated:
            context['user_review'] = Review.objects.filter(
                destination=destination,
                user=request.user
            ).first()
        else:
            context['user_review'] = None

        # 5. PAGINATION (Xatosiz uslub)
        page_number = request.GET.get('page', 1)
        paginator = Paginator(reviews_qs, 10)
        hub_reviews = paginator.get_page(page_number)

        # 6. CONTEXT YIG'ISH
        context.update({
            'hub_reviews': hub_reviews,
            'total_count': total_reviews_count,
            'current_sort': sort_by,
        })

        # ==========================================
        # 7. ADVANCED ACTION LOG (KUZATUV)
        # ==========================================
        execution_time = time.time() - start_time

        if request.user.is_authenticated:
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                ip_address = x_forwarded_for.split(',')[0]
            else:
                ip_address = request.META.get('REMOTE_ADDR')

            try:
                ActionLog.objects.create(
                    user=request.user,
                    category=ActionLog.Category.ACCESS,
                    action="Viewed Destination All Reviews",
                    verb="viewed",
                    level=ActionLog.Level.INFO,
                    message=f"User viewed reviews for destination: {destination.name} (Page: {page_number}, Sort: {sort_by})",
                    content_type=ContentType.objects.get_for_model(Destination),
                    object_id=str(destination.id),
                    object_repr=destination.name,
                    ip_address=ip_address,
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                    path=request.path,
                    method=request.method,
                    execution_time=execution_time,
                    extra_info={
                        "page_number": page_number,
                        "sort_method": sort_by,
                        "total_reviews": total_reviews_count
                    }
                )
            except Exception:
                pass

        return context


logger = logging.getLogger(__name__)


class ToggleReviewLikeView(View):
    """
    Advanced, Secure & Optimized Like Toggle API
    """

    @transaction.atomic
    def post(self, request, review_id, *args, **kwargs):
        # 1. XAVFSIZLIK: Foydalanuvchi tizimga kirganligini tekshirish
        if not request.user.is_authenticated:
            return JsonResponse({'error': 'Please sign in to like reviews.'}, status=401)

        user = request.user

        # 2. XAVFSIZLIK (Anti-Spam): 1.5 soniyada faqat bir marta bosish
        cache_key = f"like_cooldown_{user.id}_{review_id}"
        if cache.get(cache_key):
            return JsonResponse({'error': 'Too many requests. Please wait.'}, status=429)
        cache.set(cache_key, True, timeout=1.5)

        try:
            from apps.models import Review, ActionLog

            # 3. SELECT_FOR_UPDATE: Ma'lumotlar bazasida ushbu qatorni bloklash
            review = Review.objects.select_for_update().get(id=review_id)

            # 4. ASOSIY MANTIQ
            is_liked = review.likes.filter(id=user.id).exists()
            old_likes_count = review.helpful_count  # Integer field dan olamiz

            if is_liked:
                review.likes.remove(user)
                liked = False
                verb_type = "unliked"
                # 🚀 ATOMIK YANGILASH (F expression)
                Review.objects.filter(id=review.id).update(helpful_count=F('helpful_count') - 1)
                new_likes_count = old_likes_count - 1
            else:
                review.likes.add(user)
                liked = True
                verb_type = "liked"
                # 🚀 ATOMIK YANGILASH (F expression)
                Review.objects.filter(id=review.id).update(helpful_count=F('helpful_count') + 1)
                new_likes_count = old_likes_count + 1

            # 5. ACTION LOG (Audit Trail)
            try:
                content_type = ContentType.objects.get_for_model(Review)
                ActionLog.objects.create(
                    user=user,
                    content_type=content_type,
                    object_id=review.id,
                    object_repr=f"Review ID: {review.id}",
                    action="Toggle Review Like",
                    verb=verb_type,
                    category=ActionLog.Category.DATA,
                    level=ActionLog.Level.INFO,
                    message=f"{user.username} {verb_type} review {review.id}",
                    ip_address=request.META.get('REMOTE_ADDR', ''),
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                    path=request.path,
                    method=request.method,
                    pre_change_data={"likes_count": old_likes_count},
                    post_change_data={"likes_count": new_likes_count},
                    changes_diff={"likes_changed": new_likes_count - old_likes_count}
                )
            except Exception as log_e:
                logger.error(f"ActionLog Error: {log_e}")

            # 6. MUAFFAQIYATLI JAVOB
            return JsonResponse({
                'liked': liked,
                'total_likes': new_likes_count
            })

        except Review.DoesNotExist:
            return JsonResponse({'error': 'Review not found.'}, status=404)
        except Exception as e:
            logger.error(f"Database error during like toggle: {e}")
            return JsonResponse({'error': 'Server error.'}, status=500)


class SubmitReviewView(LoginRequiredMixin, View):
    def post(self, request, *args, **kwargs):
        slug = request.POST.get('destination_slug')
        if not slug:
            messages.error(request, "Xatolik: Manzil topilmadi.")
            return redirect(request.META.get('HTTP_REFERER', '/'))

        destination = get_object_or_404(Destination, slug=slug)
        fallback_redirect = redirect('destination_detail_page', slug=slug)

        try:
            form = ReviewModelForm(request.POST)

            if form.is_valid():
                with transaction.atomic():
                    old_instance = Review.objects.filter(user=request.user, destination=destination).first()

                    # 1-TUZATISH: pre_data uchun xavfsiz JSON konvertatsiya
                    pre_data = {}
                    if old_instance:
                        old_dict = model_to_dict(old_instance, exclude=['likes', 'user', 'destination'])
                        old_dict['user'] = old_instance.user_id
                        old_dict['destination'] = old_instance.destination_id
                        pre_data = json.loads(json.dumps(old_dict, cls=DjangoJSONEncoder))

                    # Bazaga saqlash
                    review, created = Review.objects.update_or_create(
                        user=request.user,
                        destination=destination,
                        defaults={
                            'text': form.cleaned_data['text'][:3000],
                            'service_quality': form.cleaned_data['service_quality'],
                            'cleanliness': form.cleaned_data['cleanliness'],
                            'facilities': form.cleaned_data['facilities'],
                            'location_rating': form.cleaned_data['location_rating'],
                            'value_for_money': form.cleaned_data['value_for_money'],
                            'visit_type': form.cleaned_data.get('visit_type', ''),
                            'visited_at': form.cleaned_data.get('visited_at'),
                            'is_visible': False,
                            'is_verified': False,
                            'author_name': request.user.get_full_name().strip() or request.user.username,
                            'author_country': getattr(request.user, 'country', None),
                        }
                    )

                    verb = 'created' if created else 'updated'

                    # 2-TUZATISH: post_data uchun xavfsiz JSON konvertatsiya
                    new_dict = model_to_dict(review, exclude=['likes', 'user', 'destination'])
                    new_dict['user'] = review.user_id
                    new_dict['destination'] = review.destination_id
                    post_data = json.loads(json.dumps(new_dict, cls=DjangoJSONEncoder))

                    diff = {k: post_data[k] for k in post_data if k not in pre_data or pre_data[k] != post_data[k]}
                    # Request ID yasash
                    req_id = getattr(request, 'id', None) or request.META.get('HTTP_X_REQUEST_ID') or str(uuid.uuid4())

                    # SHU QATORNI QO'SHING (Brauzer ma'lumotini olish uchun):
                    user_agent = request.META.get('HTTP_USER_AGENT', '')[:255]

                    ActionLog.objects.create(
                        user=request.user,
                        action=f"Review {verb.capitalize()} (Pending AI Moderation)",
                        verb=verb,
                        target_object=review,
                        object_repr=str(review),  # 1-RASM YECHIMI
                        message="Review saved to database. Waiting for Celery AI task.",
                        pre_change_data=pre_data,
                        post_change_data=post_data,
                        changes_diff=diff,
                        extra_info={},
                        ip_address=self.get_client_ip(request),
                        request_id=req_id,  # 2-RASM YECHIMI
                        user_agent=user_agent,  # <--- SHU YERGA HAM QO'SHIB QO'YING!
                        path=request.path[:250],
                        method=request.method
                    )

                    # AI'ga yuborish
                    transaction.on_commit(
                        lambda: moderate_review_task.delay(review.id, destination.name)
                    )

                messages.info(request, "Izohingiz qabul qilindi. AI uni tekshirmoqda...", extra_tags='info')
            else:
                for field, errors in form.errors.items():
                    for error in errors:
                        messages.error(request, error, extra_tags='error')


        except IntegrityError:

            messages.info(request, "Izohingiz allaqachon yangilangan.", extra_tags='info')

        except Exception as e:

            logger.error(f"CRITICAL ERROR in SubmitReviewView: {str(e)}", exc_info=True)

            messages.error(request, "Tizimda xatolik yuz berdi. Keyinroq qayta urinib ko'ring.", extra_tags='error')

        return fallback_redirect

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        return x_forwarded_for.split(',')[0][:45] if x_forwarded_for else request.META.get('REMOTE_ADDR', '')[:45]


class WeatherView(View):
    """
    GET /weather/?lat=41.2995&lon=69.2401
    OpenWeatherMap API ga so'rov yuboradi va JSON qaytaradi
    """

    def get(self, request):
        lat = request.GET.get('lat', '')
        lon = request.GET.get('lon', '')

        if not lat or not lon:
            return JsonResponse({'error': 'lat va lon kerak'}, status=400)

        api_key = settings.OPENWEATHER_API_KEY
        if not api_key:
            return JsonResponse({'error': 'API key topilmadi'}, status=500)

        try:
            # Bugungi ob-havo
            current_url = (
                f'https://api.openweathermap.org/data/2.5/weather'
                f'?lat={lat}&lon={lon}&appid={api_key}&units=metric&lang=en'
            )
            current_resp = requests.get(current_url, timeout=5)
            current_data = current_resp.json()

            # 5 kunlik prognoz
            forecast_url = (
                f'https://api.openweathermap.org/data/2.5/forecast'
                f'?lat={lat}&lon={lon}&appid={api_key}&units=metric&lang=en&cnt=40'
            )
            forecast_resp = requests.get(forecast_url, timeout=5)
            forecast_data = forecast_resp.json()

            # Bugungi ma'lumotlar
            current = {
                'city': current_data.get('name', ''),
                'country': current_data.get('sys', {}).get('country', ''),
                'temp': round(current_data['main']['temp']),
                'feels_like': round(current_data['main']['feels_like']),
                'humidity': current_data['main']['humidity'],
                'description': current_data['weather'][0]['description'].capitalize(),
                'icon': current_data['weather'][0]['icon'],
                'wind_speed': round(current_data['wind']['speed'] * 3.6),  # m/s → km/h
                'visibility': current_data.get('visibility', 0) // 1000,  # m → km
            }

            # 5 kunlik prognoz — har kun uchun 1 ta (tush vaqti)
            forecast_list = []
            seen_dates = set()

            for item in forecast_data.get('list', []):
                date_str = item['dt_txt'][:10]  # "2024-01-15"
                time_str = item['dt_txt'][11:16]  # "12:00"

                if date_str not in seen_dates and time_str == '12:00':
                    seen_dates.add(date_str)
                    forecast_list.append({
                        'date': date_str,
                        'temp_max': round(item['main']['temp_max']),
                        'temp_min': round(item['main']['temp_min']),
                        'description': item['weather'][0]['description'].capitalize(),
                        'icon': item['weather'][0]['icon'],
                    })

                if len(forecast_list) >= 5:
                    break

            return JsonResponse({
                'success': True,
                'current': current,
                'forecast': forecast_list,
            })

        except requests.exceptions.Timeout:
            return JsonResponse({'error': 'Server javob bermadi'}, status=504)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)


class DestinationDetailView(DetailView):
    template_name = 'apps/destination_detail.html'
    context_object_name = 'destination'
    queryset = Destination.objects.select_related('city', 'country').prefetch_related(
        'images', 'reviews', 'tags',
        'activities',
        'reviews__author_country',
        'time_slots'
    )

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        destination = self.object

        # 🚀 1. TARTIBLASH: helpful_count (Integer) bo'yicha saralaymiz.
        # total_likes property bo'lgani uchun order_by ichida ishlamaydi.
        context['sidebar_reviews'] = destination.reviews.filter(
            is_visible=True
        ).order_by('-helpful_count', '-created_at', '-rating')[:10]

        # 2. O'XSHASH MANZILLAR
        context['similar_destinations'] = Destination.objects.filter(
            city=destination.city,
        ).exclude(id=destination.id).prefetch_related('images')[:5]

        context['today'] = timezone.now().date()

        # 3. FOYDALANUVCHI IZOHI (agar login qilgan bo'lsa)
        if self.request.user.is_authenticated:
            context['user_review'] = Review.objects.filter(destination=destination, user=self.request.user).first()
        else:
            context['user_review'] = None

        # 4. VAQTLARNI JSON QILIB FRONTENDGA UZATISH
        active_slots = destination.time_slots.filter(is_active=True).order_by('time')
        available_times = [slot.time.strftime('%H:%M') for slot in active_slots]

        backend_data = {
            'times': available_times,
            'slug': destination.slug
        }

        context['backend_data_json'] = json.dumps(backend_data)

        return context

class HomeTemplateView(TemplateView):
    template_name = 'apps/test_vaqtinsha.html'

    # def get_context_data(self, **kwargs):
    #     context = super().get_context_data(**kwargs)
    #     now = timezone.now()
    #
    #     flash_qs = Destination.objects.filter(
    #         is_flash_sale=True,
    #         flash_sale_end__gt=now,
    #         discount_percentage__gt=0
    #     ).select_related('city').prefetch_related('tags', 'images', 'reviews').annotate(
    #         reviews_count=Count('reviews', filter=Q(reviews__is_visible=True))
    #     ).only(
    #         'slug', 'name', 'location', 'short_description',
    #         'hotels_count', 'duration', 'price', 'price_label',
    #         'discount_percentage', 'flash_sale_end',
    #         'is_flash_sale', 'city__name', 'has_flights'
    #     )
    #     context['flash_total'] = flash_qs.count()
    #     context['flash_destinations'] = flash_qs[:3]
    #
    #     trending_qs = Destination.objects.filter(
    #         is_trending=True
    #     ).select_related('city').prefetch_related('tags', 'images', 'reviews').annotate(
    #
    #         reviews_count=Count('reviews', filter=Q(reviews__is_visible=True))
    #     ).only(
    #         'slug', 'name', 'location', 'short_description',
    #         'hotels_count', 'duration', 'price_label',
    #         'price', 'has_flights', 'city__name'
    #     )
    #     context['trending_total'] = trending_qs.count()
    #     context['trending_destinations'] = trending_qs[:3]
    #
    #     featured_qs = Destination.objects.filter(
    #         is_featured=True
    #     ).select_related('city').prefetch_related('tags', 'images', 'activities', 'reviews').annotate(
    #
    #         reviews_count=Count('reviews', filter=Q(reviews__is_visible=True))
    #     ).only(
    #         'slug', 'package_type', 'name', 'location',
    #         'short_description', 'duration', 'price_label', 'price',
    #         'restaurants_count', 'has_flights', 'city__name'
    #     )
    #     context['featured_total'] = featured_qs.count()
    #     context['featured_destinations'] = featured_qs[:3]
    #
    #     context['top_reviews'] = Review.objects.filter(
    #         is_visible=True,
    #         rating__gte=4
    #     ).select_related(
    #         'user', 'destination'
    #     ).order_by('-rating', '-helpful_count', '-created_at')[:3]
    #
    #     return context


class LoadMoreDestinationsView(View):
    def get(self, request):
        section = request.GET.get('section', 'all')  # Default 'all'
        offset = int(request.GET.get('offset', 0))
        city_slug = request.GET.get('city', '')  # Shahar bo'yicha filtr
        now = timezone.now()

        # Sayohatlarni optimizatsiya qilingan holda olish (Baza yukini kamaytirish)
        queryset = Destination.objects.select_related('city', 'city__country').prefetch_related(
            'tags', 'images', 'reviews', 'activities'
        ).annotate(
            reviews_count=Count('reviews', filter=Q(reviews__is_visible=True)),
            avg_rating=Avg('reviews__rating', filter=Q(reviews__is_visible=True))
        )

        if section == 'flash':
            destinations = queryset.filter(
                is_flash_sale=True,
                flash_sale_end__gt=now,
                discount_percentage__gt=0
            )
            template_name = 'apps/partials/_flash_card.html'

        elif section == 'featured':
            destinations = queryset.filter(is_featured=True)
            template_name = 'apps/partials/_featured_card.html'

        elif section == 'trending':
            destinations = queryset.filter(is_trending=True)
            template_name = 'apps/partials/_trending_card.html'

        # 🚀 YANGI: Umumiy ro'yxat va shahar bo'yicha filtr (Explore bo'limi uchun)
        else:
            destinations = queryset
            if city_slug:
                destinations = destinations.filter(city__slug=city_slug)
            template_name = 'apps/partials/destination_cards.html'

        total = destinations.count()
        # Bir safarda 6 ta element yuklash (Frontendga moslab)
        limit = 6
        batch = destinations[offset: offset + limit]
        has_more = (offset + limit) < total

        # HTML bo'lagini render qilish
        html = "".join([
            render_to_string(template_name, {'destination': d}, request=request)
            for d in batch
        ])

        if not html and offset == 0:
            return HttpResponse('<p class="no-results">No destinations found.</p>')

        response = HttpResponse(html)
        response['X-Has-More'] = str(has_more).lower()
        response['X-Total'] = str(total)
        response['X-Next-Offset'] = str(offset + limit)

        # JSON response for destinations.js loadMoreDestinations
        accept_header = request.headers.get('accept', '')
        if 'application/json' in accept_header or 'api' in request.path:
            return JsonResponse({
                'html': html,
                'count': batch.count(),
                'has_more': has_more,
                'total': total
            })

        return response


class DestinationsListView(ListView):
    queryset = Destination.objects.all()
    template_name = 'apps/destinations.html'
    context_object_name = 'destinations'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        # Davlatlarni shaharlar soni bo'yicha kamayish tartibida saralaymiz
        countries_qs = Country.objects.annotate(
            city_count=Count('cities')
        ).order_by('-city_count', 'name')

        context['regions'] = Region.objects.filter(level=0).order_by('id').prefetch_related(
            Prefetch('countries', queryset=countries_qs),
            'countries__cities'
        )
        
        # Initial count for the template
        context['initial_count'] = 0
        context['total_count'] = Destination.objects.count()

        return context


class CitiesAjaxView(View):
    def get(self, request, country_code):
        # Davlatni topish
        country = get_object_or_404(Country, code=country_code)

        # Shaharlarni filtrlaymiz
        all_cities_query = City.objects.filter(country=country).order_by('-things_to_do')

        # 6 tadan yuklash mantiqi (offset va limit)
        try:
            offset = int(request.GET.get('offset', 0))
        except (ValueError, TypeError):
            offset = 0
            
        limit = 6
        cities_slice = all_cities_query[offset:offset + limit]
        total_count = all_cities_query.count()

        cities_data = []
        for city in cities_slice:
            cities_data.append({
                'name': city.name,
                'slug': city.slug,
                'things_to_do': city.things_to_do,
                'image_url': city.image.url if city.image else '/static/apps/img/default.jpg',
            })

        return JsonResponse({
            'cities': cities_data,
            'country_name': country.name,
            'total': total_count,
            'has_more': (offset + limit) < total_count,
            'offset': offset + len(cities_data)
        })

class DestinationByCityView(View):
    def get(self, request):
        city_slug = request.GET.get('city')
        offset = int(request.GET.get('offset', 0))
        limit = 6

        all_destinations = Destination.objects.filter(city__slug=city_slug).select_related(
            'city', 'city__country'
        ).prefetch_related(
            'tags', 'images', 'reviews', 'activities'
        ).annotate(
            reviews_count=Count('reviews', filter=Q(reviews__is_visible=True)),
            avg_rating=Avg('reviews__rating', filter=Q(reviews__is_visible=True))
        )
        
        total = all_destinations.count()
        destinations = all_destinations[offset:offset + limit]
        has_more = (offset + limit) < total
        shown = offset + destinations.count()

        return render(request, 'apps/partials/destination_cards.html', {
            'destinations': destinations,
            'total': total,
            'has_more': has_more,
            'shown': shown,
        })


class ActivateAccountView(View):
    def get(self, request, uidb64, token):
        try:
            uid = force_bytes(urlsafe_base64_decode(uidb64)).decode()
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None

        if user is not None and account_activation_token.check_token(user, token):
            user.is_active = True
            user.save()
            # login(request, user)
            messages.success(request, "Email tasdiqlandi, endi bemalol login qilsa bo'ladi")
        else:
            messages.error(request, "Bu linkda xatolik bor")

        return redirect('login_page')


class RegisterCreateView(CreateView):
    template_name = 'apps/auth/register.html'
    redirect_authenticated_user = True
    success_url = reverse_lazy('login_page')
    form_class = RegisterModelForm

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['countries'] = Country.objects.filter(is_active=True).order_by('name')
        return context

    def form_valid(self, form):
        user = form.save(False)

        user.is_active = False
        user.save()

        send_user_email(user, f"{self.request.scheme}://{self.request.get_host()}", email_type='registration')
        messages.success(self.request, "Ro'yxatdan muvaffaqiyatli o'tdingiz! Pochtangizni tekshiring.")
        return redirect(self.success_url)

    def form_invalid(self, form):
        # messages.error(self.request, 'Iltimos, to\'g\'ri email manzilini kiriting.')
        return super().form_invalid(form)


class LoginFormView(LoginNotRequiredMixin, FormView):
    template_name = 'apps/auth/login.html'
    form_class = LoginForm
    redirect_authenticated_user = True
    success_url = reverse_lazy('home_page')

    def get_success_url(self):
        next_url = self.request.POST.get('next') or self.request.GET.get('next')

        if next_url:
            return next_url

        return super().get_success_url()

    def form_valid(self, form):
        login(self.request, form.cleaned_data['user'])
        remember = form.cleaned_data.get('remember')

        if not remember:
            self.request.session.set_expiry(0)
        else:
            self.request.session.set_expiry(60 * 60 * 24 * 14)

        return super().form_valid(form)

    def form_invalid(self, form):
        return super().form_invalid(form)


class CustomLogoutView(View):
    def get(self, request):
        logout(request)
        return redirect('login_page')


class ForgotPasswordView(FormView):
    template_name = 'apps/auth/forgot_password.html'
    form_class = ForgotPasswordForm
    success_url = reverse_lazy('forgot_password_page')

    def form_valid(self, form):
        email = form.cleaned_data['email']

        try:
            user = User.objects.get(email=email)

            host = f"{self.request.scheme}://{self.request.get_host()}"
            send_user_email(user, host, email_type='reset_password')

            messages.success(
                self.request,
                'Parol tiklash havolasi emailingizga yuborildi! Iltimos, pochtangizni tekshiring.'
            )

        except User.DoesNotExist:
            # Xavfsizlik uchun: email topilmasa ham success message ko'rsatamiz
            # (aks holda attackerlar qaysi emaillar ro'yxatdan o'tganini bilib oladi)
            messages.success(
                self.request,
                'Agar bu email bizning tizimimizda mavjud bo\'lsa, parol tiklash havolasi yuborildi.'
            )

        return super().form_valid(form)

    def form_invalid(self, form):
        messages.error(self.request, 'Iltimos, to\'g\'ri email manzilini kiriting.')
        return super().form_invalid(form)


class PasswordResetConfirmView(FormView):
    template_name = 'apps/auth/reset_password.html'
    form_class = PasswordResetConfirmForm
    success_url = reverse_lazy('login_page')

    def dispatch(self, request, *args, **kwargs):
        """Token validatsiyasi - har safar sahifa ochilganda"""
        self.uidb64 = kwargs.get('uidb64')
        self.token = kwargs.get('token')

        try:
            uid = force_str(urlsafe_base64_decode(self.uidb64))
            self.user = User.objects.get(pk=uid)

            if not default_token_generator.check_token(self.user, self.token):
                messages.error(request, 'Bu havola yaroqsiz yoki muddati tugagan.')
                return redirect('forgot_password_page')

        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            messages.error(request, 'Noto\'g\'ri havola.')
            return redirect('forgot_password_page')

        return super().dispatch(request, *args, **kwargs)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['uidb64'] = self.uidb64
        context['token'] = self.token
        context['user'] = self.user
        return context

    def form_valid(self, form):
        password = form.cleaned_data['new_password']

        self.user.set_password(password)
        self.user.save()

        messages.success(
            self.request,
            'Parolingiz muvaffaqiyatli o\'zgartirildi! Endi tizimga kirishingiz mumkin.'
        )
        return super().form_valid(form)

    def form_invalid(self, form):
        messages.error(self.request, 'Iltimos, formani to\'g\'ri to\'ldiring.')
        return super().form_invalid(form)


class GoogleLoginView(View):
    def get(self, request):
        scope = "email profile"
        auth_url = (
            f"https://accounts.google.com/o/oauth2/auth?response_type=code"
            f"&client_id={settings.GOOGLE_CLIENT_ID}"
            f"&redirect_uri={urllib.parse.quote(settings.GOOGLE_REDIRECT_URI)}"
            f"&scope={urllib.parse.quote(scope)}"
        )
        return redirect(auth_url)


class GoogleCallbackView(View):
    def get(self, request):
        code = request.GET.get("code")

        token_data = {
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        }

        token_res = requests.post("https://oauth2.googleapis.com/token", data=token_data).json()
        access_token = token_res.get("access_token")

        response = requests.get(
            "https://www.googleapis.com/oauth2/v1/userinfo",
            headers={"Authorization": f"Bearer {access_token}"}
        )

        if response.status_code != 200:
            messages.error(request, "Google user info olinmadi.")
            return redirect("login_page")

        info = response.json()
        email = info.get("email")
        name = info.get("name", "")

        if not email:
            messages.error(request, "Google account email bermadi.")
            return redirect("login_page")

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:

            base_username = email.split("@")[0]
            username = base_username

            while User.objects.filter(username=username).exists():
                username = f"{base_username}_{uuid.uuid4().hex[:6]}"

            user = User.objects.create(
                username=username,
                email=email,
                first_name=name,
                is_active=True
            )

            user.set_unusable_password()
            user.save()

        login(request, user)
        return redirect("home_page")


class HelpCenterTemplateView(TemplateView):
    template_name = 'apps/help_center.html'


class TermsOfServiceTemplateView(TemplateView):
    template_name = 'apps/terms_of_service.html'


class PrivacyPolicyTemplateView(TemplateView):
    template_name = 'apps/privacy_policy.html'


class CancellationTemplateView(TemplateView):
    template_name = 'apps/cancellation.html'


class FAQTemplateView(TemplateView):
    template_name = 'apps/faq.html'


class RecommendationTemplateView(TemplateView):
    template_name = 'apps/recommendation.html'


class AboutTemplateView(TemplateView):
    template_name = 'apps/about.html'


class ContactTemplateView(TemplateView):
    template_name = 'apps/contact.html'


class BlogTemplateView(TemplateView):
    template_name = 'apps/blog.html'


class NotificationTemplateView(TemplateView):
    template_name = 'apps/notification.html'


class DashboardTemplateView(TemplateView):
    template_name = 'apps/dashboard.html'


class MyBookingsTemplateView(TemplateView):
    template_name = 'apps/my_bookings.html'


class WishlistTemplateView(TemplateView):
    template_name = 'apps/wishlist.html'


class ProfileSettingsTemplateView(TemplateView):
    template_name = 'apps/profile_settings.html'


class AdminPanelTemplateView(TemplateView):
    template_name = 'apps/admin_panel.html'


class TelegramChannelTemplateView(TemplateView):
    template_name = 'apps/telegram_channel.html'


class InstagramTemplateView(TemplateView):
    template_name = 'apps/instagram.html'
