import urllib.parse
import uuid

import requests
from django.contrib import messages
from django.contrib.auth import login, logout
from django.contrib.auth.tokens import default_token_generator
from django.http import JsonResponse, HttpResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse_lazy
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode
from django.views import View
from django.views.generic import CreateView, FormView, ListView, TemplateView

from apps.forms import (ForgotPasswordForm, LoginForm,
                        PasswordResetConfirmForm, RegisterModelForm)
from apps.mixins import LoginNotRequiredMixin
from apps.models import Destination, User, Country
from apps.models.categories import City, Region
from apps.utils.send_email import send_user_email
from apps.utils.tokens import account_activation_token
from root import settings


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


class DestinationDetailView(TemplateView):
    template_name = 'apps/destination_detail.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        slug = self.kwargs.get('slug')

        destination = get_object_or_404(
            Destination.objects.select_related('city', 'country').prefetch_related('images', 'reviews', 'tags',
                                                                                   'activities',
                                                                                   'reviews__author_country'),
            slug=slug)
        context['destination'] = destination
        context['top_review'] = destination.reviews.filter(is_visible=True).first()
        context['similar_destinations'] = Destination.objects.filter(
            city=destination.city,
        ).exclude(slug=slug).prefetch_related('images')[:5]
        context['today'] = timezone.now().date()
        return context


# class HomeTemplateView(TemplateView):
#     template_name = 'apps/home.html'
#
#     def get_context_data(self, **kwargs):
#         context = super().get_context_data(**kwargs)
#         now = timezone.now()
#
#         context['flash_destinations'] = Destination.objects.filter(
#             is_flash_sale=True,
#             flash_sale_end__gt=now,
#             discount_percentage__gt=0
#         ).select_related('city').prefetch_related('tags', 'images').only('slug', 'name', 'location',
#                                                                          'short_description',
#                                                                          'hotels_count', 'duration', 'price',
#                                                                          'price_label',
#                                                                          'discount_percentage', 'flash_sale_end',
#                                                                          'is_flash_sale', 'city__name', 'has_flights')[
#             :3]
#
#         context['trending_destinations'] = Destination.objects.filter(
#             is_trending=True
#         ).select_related('city').prefetch_related('tags', 'images').only('slug', 'name', 'location',
#                                                                          'short_description', 'hotels_count',
#                                                                          'duration', 'price_label',
#                                                                          'price', 'has_flights', 'city__name')[:3]
#
#         context['featured_destinations'] = Destination.objects.filter(
#             is_featured=True
#         ).select_related('city').prefetch_related('tags', 'images', 'activities').only('slug', 'package_type', 'name',
#                                                                                        'location',
#                                                                                        'short_description', 'duration',
#                                                                                        'price_label', 'price',
#                                                                                        'restaurants_count',
#                                                                                        'has_flights', 'city__name')[:3]
#
#         return context
class HomeTemplateView(TemplateView):
    template_name = 'apps/home.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        now = timezone.now()

        flash_qs = Destination.objects.filter(
            is_flash_sale=True,
            flash_sale_end__gt=now,
            discount_percentage__gt=0
        ).select_related('city').prefetch_related('tags', 'images', 'reviews').only(
            'slug', 'name', 'location', 'short_description',
            'hotels_count', 'duration', 'price', 'price_label',
            'discount_percentage', 'flash_sale_end',
            'is_flash_sale', 'city__name', 'has_flights'
        )
        context['flash_total'] = flash_qs.count()
        context['flash_destinations'] = flash_qs[:3]

        trending_qs = Destination.objects.filter(
            is_trending=True
        ).select_related('city').prefetch_related('tags', 'images', 'reviews').only(
            'slug', 'name', 'location', 'short_description',
            'hotels_count', 'duration', 'price_label',
            'price', 'has_flights', 'city__name'
        )
        context['trending_total'] = trending_qs.count()
        context['trending_destinations'] = trending_qs[:3]

        featured_qs = Destination.objects.filter(
            is_featured=True
        ).select_related('city').prefetch_related('tags', 'images', 'activities', 'reviews').only(
            'slug', 'package_type', 'name', 'location',
            'short_description', 'duration', 'price_label', 'price',
            'restaurants_count', 'has_flights', 'city__name'
        )
        context['featured_total'] = featured_qs.count()
        context['featured_destinations'] = featured_qs[:3]

        return context


# class LoadMoreDestinationsView(View):
#
#     def get(self, request):
#         section = request.GET.get('section', '')
#         offset = int(request.GET.get('offset', 3))
#         now = timezone.now()
#
#         if section == 'flash':
#             destinations = Destination.objects.filter(
#                 is_flash_sale=True,
#                 flash_sale_end__gt=now,
#                 discount_percentage__gt=0
#             ).select_related('city').prefetch_related('tags', 'images').only(
#                 'slug', 'name', 'location', 'short_description',
#                 'hotels_count', 'duration', 'price', 'price_label',
#                 'discount_percentage', 'flash_sale_end',
#                 'is_flash_sale', 'city__name', 'has_flights'
#             )
#             template_name = 'apps/partials/_flash_card.html'
#
#         elif section == 'featured':
#             destinations = Destination.objects.filter(
#                 is_featured=True
#             ).select_related('city').prefetch_related('tags', 'images', 'activities').only(
#                 'slug', 'package_type', 'name', 'location',
#                 'short_description', 'duration', 'price_label', 'price',
#                 'restaurants_count', 'has_flights', 'city__name'
#             )
#             template_name = 'apps/partials/_featured_card.html'
#
#         elif section == 'trending':
#             destinations = Destination.objects.filter(
#                 is_trending=True
#             ).select_related('city').prefetch_related('tags', 'images').only(
#                 'slug', 'name', 'location', 'short_description',
#                 'hotels_count', 'duration', 'price_label',
#                 'price', 'has_flights', 'city__name'
#             )
#             template_name = 'apps/partials/_trending_card.html'
#
#         else:
#             return HttpResponse('', status=400)
#
#         total = destinations.count()
#         batch = destinations[offset: offset + 3]
#         has_more = (offset + 3) < total
#
#         return render(request, template_name, {
#             'destinations': batch,
#             'has_more': has_more,
#             'total': total,
#             'next_offset': offset + 3,
#         })
class LoadMoreDestinationsView(View):

    def get(self, request):
        section = request.GET.get('section', '')
        offset = int(request.GET.get('offset', 3))
        now = timezone.now()

        if section == 'flash':
            destinations = (Destination.objects.filter(
                is_flash_sale=True,
                flash_sale_end__gt=now,
                discount_percentage__gt=0
            ).select_related('city').prefetch_related('tags', 'images', 'reviews').only(
                'slug', 'name', 'location', 'short_description',
                'hotels_count', 'duration', 'price', 'price_label',
                'discount_percentage', 'flash_sale_end',
                'is_flash_sale', 'city__name', 'has_flights'
            )
            )
            template_name = 'apps/partials/_flash_card.html'
            context_var = 'flash_destinations'

        elif section == 'featured':
            destinations = (Destination.objects.filter(
                is_featured=True
            ).select_related('city').prefetch_related('tags', 'images', 'activities', 'reviews').only(
                'slug', 'package_type', 'name', 'location',
                'short_description', 'duration', 'price_label', 'price',
                'restaurants_count', 'has_flights', 'city__name'
            )
            )
            template_name = 'apps/partials/_featured_card.html'
            context_var = 'featured_destinations'

        elif section == 'trending':
            destinations = (Destination.objects.filter(
                is_trending=True
            ).select_related('city').prefetch_related('tags', 'images', 'reviews').only(
                'slug', 'name', 'location', 'short_description',
                'hotels_count', 'duration', 'price_label',
                'price', 'has_flights', 'city__name'
            )
            )
            template_name = 'apps/partials/_trending_card.html'
            context_var = 'trending_destinations'


        else:
            return HttpResponse('', status=400)

        total = destinations.count()
        batch = destinations[offset: offset + 3]
        has_more = (offset + 3) < total

        # Har bir destination uchun alohida HTML render qilamiz
        from django.template.loader import render_to_string
        html = "".join([
            render_to_string(template_name, {'destination': d}, request=request)
            for d in batch
        ])

        response = HttpResponse(html)
        response['X-Has-More'] = str(has_more).lower()  # 'true' yoki 'false'
        response['X-Total'] = str(total)
        response['X-Next-Offset'] = str(offset + 3)
        return response


class DestinationsListView(ListView):
    queryset = Destination.objects.all()
    template_name = 'apps/destinations.html'
    context_object_name = 'destinations'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['regions'] = Region.objects.filter(level=0).order_by('id').prefetch_related('cities')
        return context


class CitiesAjaxView(View):

    def get(self, request, region_slug):
        region = get_object_or_404(Region, slug=region_slug, level=0)
        all_cities = list(City.objects.filter(region=region))
        offset = int(request.GET.get('offset', 0))
        cities_slice = all_cities[offset:offset + 8]
        cities_data = []
        for city in cities_slice:
            cities_data.append(
                {
                    'name': city.name,
                    'slug': city.slug,
                    'things_to_do': city.things_to_do,
                    'image_url': request.build_absolute_uri(city.image.url),
                }
            )
        return JsonResponse({
            'cities': cities_data,
            'total': len(all_cities),
            'has_more': (offset + 8) < len(all_cities)

        })


class DestinationByCityView(View):
    def get(self, request):
        city_slug = request.GET.get('city')
        offset = int(request.GET.get('offset', 0))
        limit = 6

        all_destinations = Destination.objects.filter(city__slug=city_slug)
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
