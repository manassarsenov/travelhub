from django.db.models.signals import pre_save, post_save, post_delete
from django.dispatch import receiver
from apps.models import Review, Destination, PromoCode, Notification
from apps.tasks import flash_sale_notify_task, price_drop_notify_task


class ReviewSignalHandler:
    """
    Review modeli bilan bog'liq barcha avtomatik jarayonlarni (Signallarni)
    boshqaruvchi markaziy Class.
    """

    @classmethod
    def update_destination_count(cls, sender, instance, **kwargs):
        """
        Izoh saqlanganda yoki o'chirilganda Destination'dagi hisoblagichni yangilaydi.
        """
        if not instance.destination_id:
            return

        # sender bu yerda avtomatik Review modelini bildiradi
        actual_count = sender.objects.filter(
            destination_id=instance.destination_id,
            is_visible=True
        ).count()

        from apps.models import Destination  # Circular import bo'lmasligi uchun ichkarida
        Destination.objects.filter(id=instance.destination_id).update(
            visible_reviews_count=actual_count
        )

    # Ertaga Review ga oid boshqa ishlar chiqsa, shu yerga qo'shaverasiz
    # @classmethod
    # def send_notification_to_admin(cls, sender, instance, **kwargs):
    #     pass


post_save.connect(ReviewSignalHandler.update_destination_count, sender=Review)
post_delete.connect(ReviewSignalHandler.update_destination_count, sender=Review)


# ═════════════════════════════════════════════════════════════════════════════
# 5-GURUH: PROMOTIONS SIGNALS
# ═════════════════════════════════════════════════════════════════════════════

@receiver(pre_save, sender=Destination)
def capture_destination_old_values(sender, instance, **kwargs):
    """
    Destination saqlanishidan oldin eski narx va flash sale holatini ushlab qolamiz.
    Buni post_save da ishlata olish uchun instance ga biriktiramiz.
    """
    if instance.pk:
        try:
            old_instance = Destination.objects.get(pk=instance.pk)
            instance._old_price = old_instance.price
            instance._old_is_flash_sale = old_instance.is_flash_sale
        except Destination.DoesNotExist:
            instance._old_price = None
            instance._old_is_flash_sale = None
    else:
        instance._old_price = None
        instance._old_is_flash_sale = None

@receiver(post_save, sender=Destination)
def trigger_destination_promotions(sender, instance, created, **kwargs):
    """
    5.1 Flash Sale boshlanganda va 5.3 Narx tushganda Celery tasklarni ishga tushiradi.
    """
    if created:
        return  # Yangi yaratilganida buni tekshirmaymiz, chunki hali hech kim booking qilmagan

    old_price = getattr(instance, '_old_price', None)
    old_is_flash_sale = getattr(instance, '_old_is_flash_sale', None)

    # ✅ 5.1 FLASH SALE BOSHLANDI
    # Agar oldin flash sale bo'lmagan bo'lsa va hozir true bo'lsa
    if old_is_flash_sale is False and instance.is_flash_sale is True:
        # Taskni asinxron ishga tushiramiz
        flash_sale_notify_task.delay(instance.id)

    # ✅ 5.3 NARX TUSHDI
    # Agar eski narx mavjud bo'lsa va yangi narx undan arzonroq bo'lsa
    if old_price is not None and instance.price < old_price:
        # Taskni asinxron ishga tushiramiz
        price_drop_notify_task.delay(instance.id, old_price, instance.price)

@receiver(post_save, sender=PromoCode)
def trigger_personal_promo_notification(sender, instance, created, **kwargs):
    """
    5.4 SHAXSIY PROMO KOD BERINGANIDA
    Qachon: PromoCode da user biriktirilsa. Kimga: Shu userning o'ziga.
    """
    # Yangi kod yaratilganda yoki oldingi kod kimdirga berilganda
    if instance.user and instance.is_active:
        # Bir xil xabar takrorlanmasligi uchun
        already_sent = Notification.objects.filter(
            recipient=instance.user,
            verb='personal_promo_received',
            extra_data__promo_code=instance.code
        ).exists()

        if not already_sent:
            try:
                dest_text = f" ('{instance.destination.name}' uchun)" if instance.destination else " (barcha sayohatlar uchun)"
                Notification.objects.create(
                    recipient=instance.user,
                    verb='personal_promo_received',
                    description=(
                        f"🎉 Sizga shaxsiy {instance.discount_percent}% chegirma berildi! "
                        f"Promo-kod: {instance.code}. "
                        f"Ushbu kodni to'lov vaqtida ishlating{dest_text}. "
                        f"Muddati: {instance.valid_to.strftime('%d %b %Y, %H:%M')}"
                    ),
                    level=Notification.Level.SUCCESS,
                    priority=Notification.Priority.HIGH,
                    extra_data={
                        'category': 'promotions',
                        'title': "Shaxsiy Chegirma! 🎉",
                        'icon_class': 'fa-gift',
                        'icon_bg': 'promotion',
                        'promo_code': instance.code,
                        'discount_percent': instance.discount_percent,
                        'valid_to': instance.valid_to.strftime('%d %b %Y, %H:%M'),
                        'destination_name': instance.destination.name if instance.destination else 'Barcha manzillar',
                        'action_url': '/destinations/',
                        'action_label': "Sayohat Qidirish",
                    }
                )
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Personal promo notification failed: {e}")