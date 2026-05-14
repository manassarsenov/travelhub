from django.db.models import CASCADE, ForeignKey, UniqueConstraint, DateTimeField
from django.db.models import Model


class Wishlist(Model):
    user = ForeignKey('apps.User', CASCADE, related_name='wishlist_items')
    destination = ForeignKey('apps.Destination', CASCADE, related_name='wishlisted_by')
    created_at = DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [UniqueConstraint(fields=['user', 'destination'], name='unique_user_destination')]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} → {self.destination.name}"