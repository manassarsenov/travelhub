from django.db import models
from django.db.models import ForeignKey, CASCADE
from django.db.models.fields import CharField, DecimalField, DateTimeField, TextField
from django.utils.translation import gettext_lazy as _
from apps.models.base import CreatedBaseModel


class Transaction(CreatedBaseModel):
    """
    Payment transactions model - Click va Payme uchun
    """
    class State(models.TextChoices):
        CREATED = 'created', _('Created')
        COMPLETED = 'completed', _('Completed')
        CANCELLED = 'cancelled', _('Cancelled')
        FAILED = 'failed', _('Failed')
    
    payme_id = CharField(max_length=255, null=True, blank=True, help_text="Payme transaction ID")
    click_trans_id = CharField(max_length=255, null=True, blank=True, help_text="Click transaction ID")
    
    booking = ForeignKey('apps.Booking', CASCADE, related_name='transactions')
    
    amount = DecimalField(max_digits=12, decimal_places=2, help_text="Amount in tiyin (Payme) or so'm (Click)")
    state = CharField(max_length=20, choices=State.choices, default=State.CREATED)
    
    perform_time = DateTimeField(null=True, blank=True, help_text="Transaction completion time")
    cancel_time = DateTimeField(null=True, blank=True, help_text="Transaction cancellation time")
    reason = TextField(null=True, blank=True, help_text="Cancellation reason")
    
    payment_method = CharField(max_length=20, help_text="payme or click")
    
    def __str__(self):
        return f"{self.payme_id or self.click_trans_id} - {self.booking.booking_number}"
    
    class Meta:
        verbose_name = _("Transaction")
        verbose_name_plural = _("Transactions")
        ordering = ['-created_at']
