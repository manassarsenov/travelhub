from django.db.models import Model, ForeignKey, SET_NULL
from django.db.models.fields import CharField, PositiveIntegerField, DateTimeField, BooleanField
from django.utils import timezone


class PromoCode(Model):
    code = CharField(max_length=50, unique=True)
    discount_percent = PositiveIntegerField()

    destination = ForeignKey(
        'apps.Destination',
        on_delete=SET_NULL,
        null=True,
        blank=True,
        related_name='promo_codes'
    )

    user = ForeignKey(
        'apps.User',
        on_delete=SET_NULL,
        null=True,
        blank=True,
        related_name='personal_promos'
    )

    valid_from = DateTimeField(default=timezone.now)
    valid_to = DateTimeField()
    is_active = BooleanField(default=True)

    # Cheklovlar
    max_uses = PositiveIntegerField(default=100)
    used_count = PositiveIntegerField(default=0)

    def is_valid_for(self, user, destination):
        now = timezone.now()
        # 1. Umumiy holatni tekshirish
        if not (self.is_active and self.valid_from <= now <= self.valid_to and self.used_count < self.max_uses):
            return False, "Promo code is expired or inactive."

        # 2. Foydalanuvchini tekshirish (agar kod shaxsiy bo'lsa)
        if self.user and self.user != user:
            return False, "This promo code is not for you."

        # 3. Manzilni tekshirish (agar kod ma'lum bir joy uchun bo'lsa)
        if self.destination and self.destination != destination:
            return False, f"This code only works for {self.destination.name}."

        return True, "Success"

    def __str__(self):
        return self.code
