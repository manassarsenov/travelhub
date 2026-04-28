from django.db.models.signals import post_save, post_delete

from apps.models import Review


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