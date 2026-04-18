import datetime
import uuid

from django.db.models import ForeignKey, CASCADE, PROTECT
from django.db.models.enums import TextChoices
from django.db.models.fields import CharField, DateField, TimeField, PositiveIntegerField, DecimalField, BooleanField, \
    DateTimeField, TextField
from django.utils.translation import gettext_lazy as _

from apps.models.base import CreatedBaseModel


class Booking(CreatedBaseModel):
    class Status(TextChoices):
        PENDING = 'pending', _('Pending Payment')
        CONFIRMED = 'confirmed', _('Confirmed')
        COMPLETED = 'completed', _('Completed')
        CANCELLED = 'cancelled', _('Cancelled')

    booking_number = CharField(max_length=50, unique=True, editable=False)
    user = ForeignKey('apps.User', CASCADE, related_name='bookings')
    destination = ForeignKey('apps.Destination', PROTECT, related_name='bookings')

    start_date = DateField()
    end_date = DateField()
    time = TimeField(null=True, blank=True)

    adults = PositiveIntegerField(default=1)
    children = PositiveIntegerField(default=0)
    caregivers = PositiveIntegerField(default=0)
    infants = PositiveIntegerField(default=0)

    total_price = DecimalField(max_digits=10, decimal_places=2, default=0)
    status = CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    is_paid = BooleanField(default=False)
    paid_at = DateTimeField(null=True, blank=True)

    cancellation_reason = TextField(null=True, blank=True)
    cancelled_at = DateTimeField(null=True, blank=True)
    refund_amount = DecimalField(max_digits=10, decimal_places=2, default=0.00)

    def calculate_total_price(self):
        if self.destination.discount_percentage > 0:
            base_price = self.destination.discounted_price
        else:
            base_price = self.destination.price

        adult_total = base_price * self.adults

        child_total = int(base_price * 0.7) * self.children

        # Caregiver va Infant — bepul
        return adult_total + child_total

    def save(self, *args, **kwargs):
        # Booking raqami
        if not self.booking_number:
            year = datetime.date.today().year
            unique_id = uuid.uuid4().hex[:8].upper()
            self.booking_number = f"TH-{year}-{unique_id}"

        # Total price avtomatik hisoblash
        if self.destination_id:
            self.total_price = self.calculate_total_price()

        super().save(*args, **kwargs)

    @property
    def duration_days(self):
        return (self.end_date - self.start_date).days

    @property
    def total_guests(self):
        return self.adults + self.children + self.caregivers + self.infants

    def __str__(self):
        return f"{self.booking_number} - {self.destination.name}"

    class Meta:
        verbose_name = _("Booking")
        verbose_name_plural = _("Bookings")
        ordering = ['-created_at']
