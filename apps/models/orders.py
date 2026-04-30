import datetime
import uuid
from django.db.models import ForeignKey, CASCADE, PROTECT, Index, JSONField
from django.db.models.enums import TextChoices
from django.db.models.fields import (CharField, DateField, TimeField,
                                     PositiveIntegerField, DecimalField,
                                     BooleanField, DateTimeField, TextField)
from django.utils.translation import gettext_lazy as _
from apps.models.base import CreatedBaseModel


def generate_booking_number():
    year = datetime.date.today().year
    unique_id = uuid.uuid4().hex[:8].upper()
    return f"TH-{year}-{unique_id}"


class Booking(CreatedBaseModel):
    class Status(TextChoices):
        PENDING = 'pending', _('Pending Payment')
        CONFIRMED = 'confirmed', _('Confirmed')
        COMPLETED = 'completed', _('Completed')
        CANCELLED = 'cancelled', _('Cancelled')

    # To'lov usullari uchun Choice qo'shamiz
    class PaymentMethod(TextChoices):
        CARD = 'card', _('Credit Card')
        PAYPAL = 'paypal', _('PayPal')
        KASPI = 'kaspi', _('Kaspi.kz')
        APPLE_PAY = 'apple_pay', _('Apple Pay')
        PAYME = 'payme', _('Payme')
        CLICK = 'click', _('Click')

    booking_number = CharField(max_length=50, unique=True, editable=False, default=generate_booking_number)
    user = ForeignKey('apps.User', CASCADE, related_name='bookings', null=True, blank=True)
    destination = ForeignKey('apps.Destination', PROTECT, related_name='bookings')

    booking_date = DateField()
    time = TimeField(null=True, blank=True)

    guest_first_name = CharField(max_length=100, blank=True)
    guest_last_name = CharField(max_length=100, blank=True)
    guest_email = CharField(max_length=150, blank=True)
    guest_phone = CharField(max_length=20, blank=True)

    tickets_data = JSONField(default=dict, help_text="Example: {'Adult': 2, 'Child': 1}")
    total_guests = PositiveIntegerField(default=1)
    promo_code = CharField(max_length=50, null=True, blank=True)

    total_price = DecimalField(max_digits=10, decimal_places=2, default=0)
    status = CharField(max_length=20, choices=Status.choices, default=Status.PENDING)

    # --- TO'LOV BILAN BOG'LIQ YANGI MAYDONLAR ---
    is_paid = BooleanField(default=False)
    paid_at = DateTimeField(null=True, blank=True)
    payment_method = CharField(
        max_length=20,
        choices=PaymentMethod.choices,
        default=PaymentMethod.CARD
    )
    transaction_id = CharField(max_length=255, null=True, blank=True)  # Tashqi sistemadan kelgan ID
    card_type = CharField(max_length=50, null=True, blank=True)  # Visa, Humo va h.k.
    card_mask = CharField(max_length=20, null=True, blank=True)  # **** **** **** 1234

    notes = TextField(null=True, blank=True, verbose_name=_("Special Requests"))

    def save(self, *args, **kwargs):

        # 2. total_guests hisoblash
        if self.tickets_data:
            try:
                self.total_guests = sum(int(v) for v in self.tickets_data.values())
            except (ValueError, TypeError):
                pass

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.booking_number} - {self.destination.name}"

    class Meta:
        verbose_name = _("Booking")
        verbose_name_plural = _("Bookings")
        ordering = ['-created_at']
        # Bazada tezroq qidirish uchun indekslar
        indexes = [
            Index(fields=['booking_number']),
            Index(fields=['status']),
        ]
