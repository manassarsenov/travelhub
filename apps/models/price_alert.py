from django.db import models
from django.utils import timezone


class PriceAlert(models.Model):
    user = models.ForeignKey(
        'apps.User',
        on_delete=models.CASCADE,
        related_name='price_alerts'
    )
    destination = models.ForeignKey(
        'apps.Destination',
        on_delete=models.CASCADE,
        related_name='price_alerts'
    )
    target_price = models.PositiveIntegerField(
        null=True, blank=True,
        help_text="Alert if price drops below this. Null = alert on any drop."
    )
    last_notified_price = models.PositiveIntegerField(
        null=True, blank=True,
        help_text="Price at the time of last email notification."
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ('user', 'destination')
        verbose_name = 'Price Alert'
        verbose_name_plural = 'Price Alerts'

    def __str__(self):
        return f"{self.user} → {self.destination} (active={self.is_active})"