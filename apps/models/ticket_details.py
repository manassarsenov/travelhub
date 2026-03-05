from django.db.models import ForeignKey, CASCADE
from django.db.models.fields import CharField, PositiveIntegerField, BooleanField, PositiveSmallIntegerField

from apps.models.base import CreatedBaseModel


class TicketType(CreatedBaseModel):
    destination = ForeignKey('apps.Destination', CASCADE, related_name='ticket_types')
    name = CharField(max_length=100, help_text="Adult (age 16+) | Child | Infant …")
    age_label = CharField(max_length=50, blank=True, help_text="age 16+")
    price = PositiveIntegerField(default=0)
    is_free = BooleanField(default=False)
    order = PositiveSmallIntegerField(default=0)

    def __str__(self):
        return f"{self.destination} — {self.name} (${self.price})"

    class Meta:
        ordering = ['order']
        verbose_name = 'Ticket Type'
        verbose_name_plural = 'Ticket Types'
