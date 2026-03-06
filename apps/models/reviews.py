from django.core.validators import MaxValueValidator, MinValueValidator
from django.db.models import (CASCADE, SET_NULL, BooleanField, CharField,
                              DateTimeField, ForeignKey, PositiveSmallIntegerField, TextChoices,
                              TextField)

from apps.models.base import CreatedBaseModel


class Review(CreatedBaseModel):
    class VisitType(TextChoices):
        FAMILY = 'family', 'Visited with family'
        PARTNER = 'partner', 'Visited with a partner'
        SOLO = 'solo', 'Solo traveller'
        FRIENDS = 'friends', 'Visited with friends'

    destination = ForeignKey('apps.Destination', CASCADE, related_name='reviews')
    user = ForeignKey('apps.User', SET_NULL, null=True, blank=True, related_name='reviews')

    author_name = CharField(max_length=100, blank=True)
    author_country = ForeignKey('apps.Country', SET_NULL, null=True, blank=True, related_name='reviews')

    rating = PositiveSmallIntegerField(default=5, validators=[MinValueValidator(1), MaxValueValidator(5)],
                                       help_text='1 dan 5 gacha')

    text = TextField()
    visit_type = CharField(max_length=20, choices=VisitType.choices, blank=True)
    visited_at = DateTimeField(null=True, blank=True)
    is_visible = BooleanField(default=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Review'
        verbose_name_plural = 'Reviews'
