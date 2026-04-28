import logging
import time
from celery import shared_task
from django.db import transaction
from django.contrib.contenttypes.models import ContentType
from .ai_moderator import check_review_with_ai
from django.utils.translation import gettext_lazy as _

logger = logging.getLogger(__name__)

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
                Notification.objects.create(
                    recipient=review.user,
                    verb=_("Izohingiz qabul qilindi! ✅") if hasattr(self, 'gettext') else "Izohingiz qabul qilindi! ✅",
                    description=f"'{destination_name}' manziliga yozgan izohingiz muvaffaqiyatli tasdiqlandi. Fikringiz uchun rahmat!",
                    level=Notification.Level.SUCCESS,
                    priority=Notification.Priority.MEDIUM,
                    target_content_type=content_type,
                    target_object_id=str(review.id)
                )
                logger.info(f"Review {review_id} approved by AI. (Took: {exec_seconds:.2f}s)")
            else:
                Notification.objects.create(
                    recipient=review.user,
                    verb=_("Izohingiz rad etildi ❌") if hasattr(self, 'gettext') else "Izohingiz rad etildi ❌",
                    description=f"'{destination_name}' uchun yozgan izohingiz qoidalarga zid deb topildi. Sabab: {reason}",
                    level=Notification.Level.ERROR,
                    priority=Notification.Priority.HIGH,
                    target_content_type=content_type,
                    target_object_id=str(review.id)
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