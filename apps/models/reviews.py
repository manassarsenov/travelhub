from django.core.validators import MaxValueValidator, MinValueValidator
from django.db.models import (CASCADE, SET_NULL, BooleanField, CharField,
                              ForeignKey, PositiveSmallIntegerField, TextChoices,
                              TextField, ManyToManyField)
from django.db.models.fields import DateField

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

    # Umumiy reyting (Hisoblanadigan bo'lishi ham mumkin, lekin osonlik uchun saqlaymiz)
    rating = PositiveSmallIntegerField(
        default=5, 
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text='Overall rating 1-5'
    )
    likes = ManyToManyField(
        'apps.User',  # Agar user modelingiz default bo'lsa 'auth.User' yoki tayyor Custom User nomini yozing
        related_name='liked_reviews',
        blank=True,
        verbose_name="Foydali deb topganlar"
    )

    # Detallashgan reytinglar (Senior yondashuv)
    service_quality = PositiveSmallIntegerField(default=5, validators=[MinValueValidator(1), MaxValueValidator(5)])
    cleanliness = PositiveSmallIntegerField(default=5, validators=[MinValueValidator(1), MaxValueValidator(5)])
    facilities = PositiveSmallIntegerField(default=5, validators=[MinValueValidator(1), MaxValueValidator(5)])
    location_rating = PositiveSmallIntegerField(default=5, validators=[MinValueValidator(1), MaxValueValidator(5)])
    value_for_money = PositiveSmallIntegerField(default=5, validators=[MinValueValidator(1), MaxValueValidator(5)])

    text = TextField()
    visit_type = CharField(max_length=20, choices=VisitType.choices, blank=True)
    visited_at = DateField(null=True, blank=True)
    
    is_visible = BooleanField(default=True)
    is_verified = BooleanField(default=False)
    
    helpful_count = PositiveSmallIntegerField(default=0)
    reported_count = PositiveSmallIntegerField(default=0)

    @property
    def total_likes(self):
        return self.likes.count()

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Review'
        verbose_name_plural = 'Reviews'
        unique_together = ('user', 'destination')

    def __str__(self):
        u_name = self.user.username if self.user else "Anonymous"
        display_name = self.author_name or u_name
        return f"{display_name} - {self.destination.name}"

    def save(self, *args, **kwargs):
        # Umumiy reytingni kategoriyalardan kelib chiqib avtomatik hisoblash
        total_rating = (
            self.service_quality + 
            self.cleanliness + 
            self.facilities + 
            self.location_rating + 
            self.value_for_money
        ) / 5
        self.rating = round(total_rating)
        super().save(*args, **kwargs)
