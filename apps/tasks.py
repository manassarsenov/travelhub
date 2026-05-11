import logging
import time
from celery import shared_task
from django.db import transaction
from django.contrib.contenttypes.models import ContentType
from .ai_moderator import check_review_with_ai
from django.utils.translation import gettext_lazy as _

logger = logging.getLogger(__name__)

@shared_task(name="expire_flash_sales")
def expire_flash_sales():
    """
    Vaqti o'tib ketgan flash sale'larni avtomatik tozalash.
    is_flash_sale=False, discount_percentage=0 qiladi.
    """
    from django.utils import timezone
    from apps.models import Destination

    expired = Destination.objects.filter(
        is_flash_sale=True,
        flash_sale_end__lt=timezone.now()
    )
    count = expired.count()
    if count:
        expired.update(is_flash_sale=False, discount_percentage=0)
        logger.info(f"Expired {count} flash sales automatically.")
    return f"Expired {count} flash sales"


@shared_task(name="moderate_review_task", bind=True, max_retries=3)
def moderate_review_task(self, review_id, destination_name):
    # Circular importlarni oldini olish uchun importlar task ichida
    from .models import Review, ActionLog, Notification

    try:
        # select_related ishlatish DB so'rovlarini kamaytiradi
        review = Review.objects.select_related('user', 'destination').get(id=review_id)

        # AI Moderatsiya jarayoni
        start_time = time.time()
        is_safe, reason = check_review_with_ai(review.text, destination_name)
        exec_seconds = time.time() - start_time

        with transaction.atomic():
            # 1. Review holatini yangilash
            review.is_visible = is_safe
            review.is_verified = True
            review.save(update_fields=['is_visible', 'is_verified'])

            # 2. Mavjud ActionLog-ni topish va boyitish
            content_type = ContentType.objects.get_for_model(Review)
            last_log = ActionLog.objects.filter(
                content_type=content_type,
                object_id=str(review.id)
            ).order_by('-created_at').first()

            if last_log:
                last_log.extra_info.update({
                    "is_safe": is_safe,
                    "ai_reason": reason,
                    "moderation_type": "AI_CELERY"
                })
                last_log.message = f"AI Moderation Result: {reason}"
                last_log.execution_time = exec_seconds
                last_log.save(update_fields=['extra_info', 'message', 'execution_time'])

            # 3. Bildirishnoma (Notification) yaratish - MODELINGIZGA MOSLANGAN
            # Notification maydonlari: recipient, verb, description, level, target
            if is_safe:
                # ✅ 3.1 Review qabul qilindi
                Notification.objects.create(
                    recipient=review.user,
                    verb='review_approved',
                    description=f"'{destination_name}' manziliga yozgan izohingiz muvaffaqiyatli tasdiqlandi. Fikringiz uchun rahmat!",
                    level=Notification.Level.SUCCESS,
                    priority=Notification.Priority.MEDIUM,
                    target_content_type=content_type,
                    target_object_id=str(review.id),
                    extra_data={
                        'category': 'messages',
                        'title': 'Izohingiz Qabul Qilindi! ✅',
                        'icon_class': 'fa-star',
                        'icon_bg': 'message',
                        'destination_name': destination_name,
                        'action_url': f'/destination-detail/{review.destination.slug}/',
                        'action_label': 'Izohni Ko\'rish',
                    }
                )
                logger.info(f"Review {review_id} approved by AI. (Took: {exec_seconds:.2f}s)")
            else:
                # ✅ 3.2 Review rad etildi
                Notification.objects.create(
                    recipient=review.user,
                    verb='review_rejected',
                    description=f"'{destination_name}' uchun yozgan izohingiz qoidalarga zid deb topildi. Sabab: {reason}",
                    level=Notification.Level.ERROR,
                    priority=Notification.Priority.HIGH,
                    target_content_type=content_type,
                    target_object_id=str(review.id),
                    extra_data={
                        'category': 'messages',
                        'title': 'Izohingiz Rad Etildi ❌',
                        'icon_class': 'fa-times-circle',
                        'icon_bg': 'security',
                        'destination_name': destination_name,
                        'reject_reason': reason,
                        'action_url': f'/destination-detail/{review.destination.slug}/',
                        'action_label': 'Yangi Izoh Yozish',
                    }
                )
                logger.warning(f"Review {review_id} rejected by AI. Reason: {reason}")

        return f"Task completed: Review {review_id} is_safe={is_safe}"

    except Review.DoesNotExist:
        logger.error(f"Review {review_id} not found.")
        return "ERROR: Review not found"
    except Exception as exc:
        logger.error(f"Error in moderate_review_task for review {review_id}: {exc}")
        # Retry mantiqi: Celery xatoni ko'rsa qaytadan urinib ko'radi
        raise self.retry(exc=exc, countdown=60)


# ═════════════════════════════════════════════════════════════════════════════
# 5-GURUH: PROMOTIONS
# ═════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────
# 5.1 FLASH SALE BOSHLANDI
# Qachon: Destination.is_flash_sale=True bo'lganda (signals.py orqali chaqiriladi)
# Kimga: Shu destinationni oldin BOOKING qilgan BARCHA foydalanuvchilarga
# ─────────────────────────────────────────────────────────────────────────────
@shared_task(name="flash_sale_notify_task")
def flash_sale_notify_task(destination_id):
    """
    Destination Flash Sale boshlanganida xabar beradi.
    Bu task signals.py ichida chaqiriladi.
    """
    from django.utils import timezone
    from apps.models import Destination, Booking, Notification, User

    try:
        dest = Destination.objects.get(id=destination_id)
    except Destination.DoesNotExist:
        logger.error(f"Flash sale notify: Destination {destination_id} not found")
        return

    if not dest.is_flash_sale or not dest.flash_sale_end:
        return

    # Bu destinationni oldin booking qilgan barcha userlar
    # (Duplicate oldini olish uchun distinct() ishlatamiz)
    target_users = User.objects.filter(
        bookings__destination=dest,
        is_active=True
    ).distinct()

    # Agar kamdan-kam user bo'lsa — barcha aktiv userlarni olish
    if not target_users.exists():
        target_users = User.objects.filter(is_active=True)[:500]

    time_left = dest.flash_sale_end - timezone.now()
    hours_left = int(time_left.total_seconds() // 3600)

    notifications = []
    for user in target_users:
        # Bir xil notification ikki marta ketmasin
        already = Notification.objects.filter(
            recipient=user,
            verb='flash_sale_started',
            extra_data__destination_id=str(destination_id)
        ).exists()
        if already:
            continue

        notifications.append(Notification(
            recipient=user,
            verb='flash_sale_started',
            description=(
                f"🔥 '{dest.name}' uchun FLASH SALE boshlandi! "
                f"{dest.discount_percentage}% chegirma bilan atigi "
                f"${dest.discounted_price} dan boshlanadi. "
                f"Faqat {hours_left} soat qoldi!"
            ),
            level=Notification.Level.INFO,
            priority=Notification.Priority.HIGH,
            extra_data={
                'category': 'promotions',
                'title': f"🔥 Flash Sale: {dest.name}!",
                'icon_class': 'fa-fire',
                'icon_bg': 'promotion',
                'destination_id': str(destination_id),
                'destination_name': dest.name,
                'destination_slug': dest.slug,
                'original_price': dest.price,
                'discounted_price': dest.discounted_price,
                'discount_percent': dest.discount_percentage,
                'hours_left': hours_left,
                'ends_at': dest.flash_sale_end.strftime('%d %b %Y, %H:%M'),
                'action_url': f'/destination-detail/{dest.slug}/',
                'action_label': 'Hoziroq Bron Qilish',
            }
        ))

    # Bulk create — N ta alohida INSERT o'rniga bitta so'rov
    if notifications:
        Notification.objects.bulk_create(notifications, ignore_conflicts=True)
        logger.info(f"Flash sale notify: {len(notifications)} ta user ga yuborildi ({dest.name})")

    return f"Flash sale notified: {len(notifications)} users for {dest.name}"


# ─────────────────────────────────────────────────────────────────────────────
# 5.2 FLASH SALE TUGAYAPTI (1 soat qoldi)
# Celery beat: har soatda ishlaydi (django_celery_beat dan sozlanadi)
# Kimga: Flash sale destination ni oldin booking qilgan userlarga
# ─────────────────────────────────────────────────────────────────────────────
@shared_task(name="flash_sale_ending_soon_task")
def flash_sale_ending_soon_task():
    """
    1-2 soat ichida tugaydigan flash salelar uchun 'urgency' notification yuboradi.
    Celery beat orqali har soatda run qilinadi.
    """
    from django.utils import timezone
    from datetime import timedelta
    from apps.models import Destination, Booking, Notification, User

    now = timezone.now()
    soon = now + timedelta(hours=2)  # keyingi 2 soatda tugaydigan

    ending_sales = Destination.objects.filter(
        is_flash_sale=True,
        flash_sale_end__gte=now,
        flash_sale_end__lte=soon,
        discount_percentage__gt=0
    )

    total_sent = 0
    for dest in ending_sales:
        minutes_left = int((dest.flash_sale_end - now).total_seconds() // 60)

        # Bu destination ni booking qilgan userlar
        target_users = User.objects.filter(
            bookings__destination=dest,
            is_active=True
        ).distinct()

        if not target_users.exists():
            target_users = User.objects.filter(is_active=True)[:300]

        notifications = []
        for user in target_users:
            # Har destinatsiya uchun 1 marta 'ending soon' yuborilsin
            already = Notification.objects.filter(
                recipient=user,
                verb='flash_sale_ending',
                extra_data__destination_id=str(dest.id)
            ).exists()
            if already:
                continue

            notifications.append(Notification(
                recipient=user,
                verb='flash_sale_ending',
                description=(
                    f"⏰ '{dest.name}' FLASH SALE'ga {minutes_left} daqiqa qoldi! "
                    f"{dest.discount_percentage}% chegirma — ${dest.discounted_price}. "
                    f"Bu imkoniyatni qo'ldan boy bermang!"
                ),
                level=Notification.Level.WARNING,
                priority=Notification.Priority.HIGH,
                extra_data={
                    'category': 'promotions',
                    'title': f"⏰ {minutes_left} daqiqa qoldi! — {dest.name}",
                    'icon_class': 'fa-hourglass-half',
                    'icon_bg': 'promotion',
                    'destination_id': str(dest.id),
                    'destination_name': dest.name,
                    'destination_slug': dest.slug,
                    'discounted_price': dest.discounted_price,
                    'discount_percent': dest.discount_percentage,
                    'minutes_left': minutes_left,
                    'ends_at': dest.flash_sale_end.strftime('%d %b %Y, %H:%M'),
                    'action_url': f'/destination-detail/{dest.slug}/',
                    'action_label': 'Hoziroq Bron Qilish',
                }
            ))

        if notifications:
            Notification.objects.bulk_create(notifications, ignore_conflicts=True)
            total_sent += len(notifications)
            logger.info(f"Flash ending soon: {len(notifications)} users notified for {dest.name}")

    return f"Flash ending soon: {total_sent} total notifications sent"


# ─────────────────────────────────────────────────────────────────────────────
# 5.3 NARX TUSHDI (Price Drop)
# Qachon: Destination.price kamaysa (signals.py da pre_save → post_save orqali)
# Kimga: Shu destinationni oldin booking qilgan userlarga
# ─────────────────────────────────────────────────────────────────────────────
@shared_task(name="price_drop_notify_task")
def price_drop_notify_task(destination_id, old_price, new_price):
    """
    Destination narxi tushganda booking qilgan userlarga xabar beradi.
    signals.py ichida Destination.pre_save da chaqiriladi.
    """
    from apps.models import Destination, Booking, Notification, User

    try:
        dest = Destination.objects.get(id=destination_id)
    except Destination.DoesNotExist:
        logger.error(f"Price drop notify: Destination {destination_id} not found")
        return

    saved_amount = old_price - new_price
    if saved_amount <= 0:
        return  # Narx oshgan, notification kerak emas

    # Bu destinationni oldin book qilgan aktiv userlar
    target_users = User.objects.filter(
        bookings__destination=dest,
        is_active=True
    ).distinct()

    notifications = []
    for user in target_users:
        # Bir xil narx uchun ikki marta ketmasin
        already = Notification.objects.filter(
            recipient=user,
            verb='price_dropped',
            extra_data__destination_id=str(destination_id),
            extra_data__new_price=new_price
        ).exists()
        if already:
            continue

        notifications.append(Notification(
            recipient=user,
            verb='price_dropped',
            description=(
                f"💰 '{dest.name}' sayohat narxi ${saved_amount} ga tushdi! "
                f"Eski narx: ${old_price} → Yangi narx: ${new_price}. "
                f"Hoziroq bron qiling!"
            ),
            level=Notification.Level.INFO,
            priority=Notification.Priority.MEDIUM,
            extra_data={
                'category': 'promotions',
                'title': f"💰 Narx Tushdi — {dest.name}!",
                'icon_class': 'fa-tags',
                'icon_bg': 'payment',
                'destination_id': str(destination_id),
                'destination_name': dest.name,
                'destination_slug': dest.slug,
                'old_price': old_price,
                'new_price': new_price,
                'saved_amount': saved_amount,
                'action_url': f'/destination-detail/{dest.slug}/',
                'action_label': 'Yangi Narxda Bron Qilish',
            }
        ))

    if notifications:
        Notification.objects.bulk_create(notifications, ignore_conflicts=True)
        logger.info(f"Price drop: {len(notifications)} users notified ({dest.name}: ${old_price} → ${new_price})")

    return f"Price drop notified: {len(notifications)} users for {dest.name}"


# ─────────────────────────────────────────────────────────────────────────────
# 1.3 BOOKING REMINDER — Sayohatdan 3 kun oldin eslatma
# Celery beat: har kuni ertalab 09:00 da ishga tushadi
# ─────────────────────────────────────────────────────────────────────────────
@shared_task(name="booking_reminder_task")
def booking_reminder_task():
    """
    Keyingi 3 kunda boshlanadigan barcha bronlar uchun eslatma notification yuboradi.
    django_celery_beat orqali har kuni run qilinishi kerak.
    """
    import datetime
    from django.utils import timezone
    from apps.models import Booking, Notification

    today = timezone.now().date()
    reminder_date = today + datetime.timedelta(days=3)

    # 3 kun keyin boshlanadigan va tasdiqlangan bronlarni topamiz
    bookings = Booking.objects.filter(
        booking_date=reminder_date,
        status=Booking.Status.CONFIRMED,
        user__isnull=False
    ).select_related('user', 'destination')

    count = 0
    for booking in bookings:
        # Bir xil notification ikki marta yuborilmasligi uchun tekshiramiz
        already_sent = Notification.objects.filter(
            recipient=booking.user,
            verb='booking_reminder',
            extra_data__booking_number=booking.booking_number
        ).exists()

        if not already_sent:
            try:
                Notification.objects.create(
                    recipient=booking.user,
                    verb='booking_reminder',
                    description=(
                        f"'{booking.destination.name}' sayohatingiz 3 kun ichida boshlanadi! "
                        f"Sana: {booking.booking_date.strftime('%b %d, %Y')}. "
                        f"Sayohatingizga tayyorlanishni unutmang."
                    ),
                    level=Notification.Level.INFO,
                    priority=Notification.Priority.HIGH,
                    extra_data={
                        'category': 'bookings',
                        'title': "Sayohat Eslatmasi! ⏰",
                        'icon_class': 'fa-clock',
                        'icon_bg': 'booking',
                        'booking_number': booking.booking_number,
                        'destination_name': booking.destination.name,
                        'booking_date': booking.booking_date.strftime('%b %d, %Y'),
                        'days_left': 3,
                        'action_url': '/my_bookings/',
                        'action_label': "Bronni Ko'rish",
                    }
                )
                count += 1
            except Exception as e:
                logger.error(f"Booking reminder notification failed for {booking.booking_number}: {e}")

    logger.info(f"Booking reminder task: {count} ta notification yuborildi.")
    return f"Reminder sent: {count} bookings"


# ─────────────────────────────────────────────────────────────────────────────
# 1.4 BOOKING COMPLETED — Sayohat tugagandan keyin review so'rovi
# Celery beat: har kuni kechki 20:00 da ishga tushadi
# ─────────────────────────────────────────────────────────────────────────────
@shared_task(name="booking_completed_task")
def booking_completed_task():
    """
    Bugun tugagan bronlarga 'Sayohat yakunlandi, izoh qoldiring' notification yuboradi.
    Bronni COMPLETED holatiga o'tkazadi va review so'rovi yuboradi.
    """
    from django.utils import timezone
    from apps.models import Booking, Notification, Review

    today = timezone.now().date()

    # Bugun tugagan va hali COMPLETED bo'lmagan bronlarni topamiz
    finished_bookings = Booking.objects.filter(
        booking_date__lte=today,
        status=Booking.Status.CONFIRMED,
        user__isnull=False
    ).select_related('user', 'destination')

    count = 0
    for booking in finished_bookings:
        # Bronni COMPLETED holatiga o'tkazamiz
        booking.status = Booking.Status.COMPLETED
        booking.save(update_fields=['status'])

        # Foydalanuvchi allaqachon izoh qoldirganmi?
        has_review = Review.objects.filter(
            user=booking.user,
            destination=booking.destination
        ).exists()

        # Bir xil notification ikki marta yuborilmasin
        already_sent = Notification.objects.filter(
            recipient=booking.user,
            verb='booking_completed',
            extra_data__booking_number=booking.booking_number
        ).exists()

        if not already_sent:
            try:
                if has_review:
                    # Izoh allaqachon bor — shunchaki yakunlandi deb xabar beramiz
                    Notification.objects.create(
                        recipient=booking.user,
                        verb='booking_completed',
                        description=(
                            f"'{booking.destination.name}' sayohatingiz muvaffaqiyatli yakunlandi! "
                            f"Ajoyib sayohat bo'ldi degan umiddamiz."
                        ),
                        level=Notification.Level.SUCCESS,
                        priority=Notification.Priority.MEDIUM,
                        extra_data={
                            'category': 'bookings',
                            'title': 'Sayohat Yakunlandi! 🎉',
                            'icon_class': 'fa-flag-checkered',
                            'icon_bg': 'payment',
                            'booking_number': booking.booking_number,
                            'destination_name': booking.destination.name,
                            'action_url': '/destinations/',
                            'action_label': 'Yangi Sayohat Qidirish',
                        }
                    )
                else:
                    # Izoh yo'q — izoh qoldirishni so'raymiz
                    Notification.objects.create(
                        recipient=booking.user,
                        verb='booking_completed',
                        description=(
                            f"'{booking.destination.name}' sayohatingiz yakunlandi! "
                            f"Tajribangizni boshqalar bilan ulashing — izoh qoldiring."
                        ),
                        level=Notification.Level.INFO,
                        priority=Notification.Priority.MEDIUM,
                        extra_data={
                            'category': 'messages',
                            'title': 'Sayohatingiz Qanday Bo\'ldi? ⭐',
                            'icon_class': 'fa-star',
                            'icon_bg': 'message',
                            'booking_number': booking.booking_number,
                            'destination_name': booking.destination.name,
                            'destination_slug': booking.destination.slug,
                            'action_url': f'/destination-detail/{booking.destination.slug}/',
                            'action_label': 'Izoh Qoldirish',
                        }
                    )
                count += 1
            except Exception as e:
                logger.error(f"Booking completed notification failed for {booking.booking_number}: {e}")

    logger.info(f"Booking completed task: {count} ta notification yaratildi.")
    return f"Completed: {count} bookings"


# ═════════════════════════════════════════════════════════════════════════════
# 7-GURUH: SYSTEM (Tizim)
# ═════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────
# 7.1 YANGI XUSUSIYAT (Broadcast)
# Admin paneldan yoki shell orqali barcha faol foydalanuvchilarga jo'natish uchun
# ─────────────────────────────────────────────────────────────────────────────
@shared_task(name="broadcast_system_notification_task")
def broadcast_system_notification_task(title, message, action_url=None, action_label=None):
    """
    Tizimdagi barcha faol foydalanuvchilarga muhim yangilik jo'natadi.
    """
    from apps.models import Notification, User

    active_users = User.objects.filter(is_active=True)
    
    notifications = []
    for user in active_users:
        extra_data = {
            'category': 'updates',
            'title': title,
            'icon_class': 'fa-bullhorn',
            'icon_bg': 'promotion',
        }
        if action_url:
            extra_data['action_url'] = action_url
        if action_label:
            extra_data['action_label'] = action_label

        notifications.append(Notification(
            recipient=user,
            verb='system_broadcast',
            description=message,
            level=Notification.Level.INFO,
            priority=Notification.Priority.LOW,
            extra_data=extra_data
        ))

    if notifications:
        # Barchasini birdaniga yaratish (Optimized)
        Notification.objects.bulk_create(notifications, ignore_conflicts=True)
        logger.info(f"System broadcast yuborildi: {len(notifications)} users.")

    return f"Broadcasted to {len(notifications)} users."


# ─────────────────────────────────────────────────────────────────────────────
# 7.2 REWARDS / LOYALTY (Statistik chegara o'tganda)
# Celery beat: har kuni yoki har oy ishga tushib tekshiradi
# ─────────────────────────────────────────────────────────────────────────────
@shared_task(name="check_loyalty_rewards_task")
def check_loyalty_rewards_task():
    """
    Foydalanuvchilarning sayohat statistikasini tekshirib, 
    ma'lum chegaradan (masalan 5 ta bron) o'tsa, Gold Status beradi.
    """
    from apps.models import Booking, Notification, User
    from django.db.models import Count

    # 5 ta va undan ko'p yakunlangan bronlari bor foydalanuvchilar
    loyal_users = User.objects.annotate(
        completed_bookings=Count('bookings', filter=Q(bookings__status=Booking.Status.COMPLETED))
    ).filter(completed_bookings__gte=5, is_active=True)

    count = 0
    for user in loyal_users:
        # Ushbu mukofotni olganligini tekshirish
        already_rewarded = Notification.objects.filter(
            recipient=user,
            verb='loyalty_reward'
        ).exists()

        if not already_rewarded:
            Notification.objects.create(
                recipient=user,
                verb='loyalty_reward',
                description=(
                    f"Tabriklaymiz! Siz 5 ta sayohatni yakunlab Gold Status oldingiz! "
                    f"Sizga keyingi barcha sayohatlaringiz uchun doimiy 15% chegirma beriladi."
                ),
                level=Notification.Level.SUCCESS,
                priority=Notification.Priority.HIGH,
                extra_data={
                    'category': 'updates',
                    'title': 'Gold Status Oldingiz! 🏆',
                    'icon_class': 'fa-crown',
                    'icon_bg': 'payment',
                    'bookings_count': user.completed_bookings,
                    'action_url': '/profile-settings/',
                    'action_label': 'Statusni Ko\'rish',
                }
            )
            count += 1

    logger.info(f"Loyalty rewards task: {count} ta foydalanuvchiga Gold Status berildi.")
    return f"Rewarded {count} users"


# ─────────────────────────────────────────────────────────────────────────────
# 7.3 TEXNIK XIZMAT (Maintenance)
# Adminlar rejalashtirilgan ishlar haqida e'lon berishganda
# ─────────────────────────────────────────────────────────────────────────────
@shared_task(name="broadcast_maintenance_task")
def broadcast_maintenance_task(start_time, end_time, reason="texnik xizmat"):
    """
    Texnik ishlari haqida ogohlantirishni barcha userlarga yuboradi.
    """
    from apps.models import Notification, User

    active_users = User.objects.filter(is_active=True)
    
    notifications = []
    for user in active_users:
        notifications.append(Notification(
            recipient=user,
            verb='maintenance_warning',
            description=(
                f"Erta {start_time}-{end_time} {reason} bo'ladi. "
                f"Keltirilgan noqulayliklar uchun uzr so'raymiz."
            ),
            level=Notification.Level.WARNING,
            priority=Notification.Priority.MEDIUM,
            extra_data={
                'category': 'updates',
                'title': 'Texnik Xizmat Ogohlantirishi 🛠️',
                'icon_class': 'fa-tools',
                'icon_bg': 'security',
                'start_time': start_time,
                'end_time': end_time,
            }
        ))

    if notifications:
        Notification.objects.bulk_create(notifications, ignore_conflicts=True)
        logger.info(f"Maintenance warning yuborildi: {len(notifications)} users.")

    return f"Maintenance warning to {len(notifications)} users."