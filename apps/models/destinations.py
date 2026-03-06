from django.core.validators import MaxValueValidator, MinValueValidator
from django.db.models import (CASCADE, SET_NULL, BooleanField, CharField,
                              FloatField, ForeignKey, ManyToManyField,
                              PositiveIntegerField, PositiveSmallIntegerField,
                              TextField)
from django.db.models.enums import TextChoices
from django.db.models.fields import DateTimeField, DecimalField

from apps.models.base import CreatedBaseModel, ImageBaseModel, SlugBaseModel


class Destination(SlugBaseModel, CreatedBaseModel):
    class TripType(TextChoices):
        ADVENTURE = 'adventure', 'Adventure'
        BEACH = 'beach', 'Beach'
        CULTURAL = 'cultural', 'Cultural'
        NATURE = 'nature', 'Nature & Wildlife'
        CITY = 'city', 'City Tours'
        ROMANTIC = 'romantic', 'Romantic'
        FAMILY = 'family', 'Family'

    class Duration(TextChoices):
        WEEKEND = 'weekend', 'Weekend (1-3 days)'
        SHORT = 'short', 'Short Trip (4-7 days)'
        LONG = 'long', 'Long Vacation (8-14 days)'
        EXTENDED = 'extended', 'Extended (15+ days)'

    class Season(TextChoices):
        SPRING = 'spring', '🌸 Spring'
        SUMMER = 'Summer', '☀️ Summer'
        AUTUMN = 'autumn', '🍂 Autumn'
        WINTER = 'winter', '❄️ Winter'

    class PackageType(TextChoices):
        NONE = '', 'No Package'
        HONEYMOON = 'honeymoon', 'Honeymoon Special'
        FAMILY = 'family', 'Family Fan'
        ADVENTURE = 'adventure', 'Adventure'
        BUSINESS = 'business', 'Business'

    city = ForeignKey('apps.City', CASCADE, related_name='destinations',
                      limit_choices_to={'region__level': 0})
    tags = ManyToManyField('apps.Tag', blank=True, related_name='destinations')
    activities = ManyToManyField('apps.Activity', blank=True, related_name='destinations')
    country = ForeignKey('apps.Country', SET_NULL, null=True, blank=True, related_name='destinations')

    name = CharField(max_length=250)
    short_description = TextField(blank=True)
    description = TextField(blank=True)
    location = CharField(max_length=250, blank=True)

    latitude = DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    price = PositiveIntegerField(default=0)
    price_label = CharField(max_length=20, default='person',
                            help_text="person | couple | family")
    discount_percentage = PositiveSmallIntegerField('Discount percentage', default=0, db_default=0,
                                                    validators=[MinValueValidator(0), MaxValueValidator(100)],
                                                    help_text="Discount percentage must be between 0 and 100")

    hotels_count = PositiveIntegerField(default=0, help_text="120 → '120+ Hotels'")
    has_flights = BooleanField(default=True, help_text="Direct FLights ko'rsatilsinmi")

    is_flash_sale = BooleanField(default=False)
    flash_sale_end = DateTimeField(null=True, blank=True)

    trip_type = CharField(max_length=20, choices=TripType.choices, blank=True)
    duration = CharField(max_length=20, choices=Duration.choices, blank=True)
    season = CharField(max_length=20, choices=Season.choices, blank=True)

    is_free_cancellation = BooleanField(default=False)
    is_popular = BooleanField(default=False)
    is_trending = BooleanField(default=False)
    is_featured = BooleanField(default=False)
    featured_badge = CharField(max_length=50, blank=True, help_text="#1 Best seller in London")

    package_type = CharField(max_length=20, choices=PackageType.choices, blank=True, default=PackageType.NONE)

    @property
    def discounted_price(self):
        if not (0 <= self.discount_percentage <= 100):
            raise ValueError("Discount percentage must be between 0 and 100")

        discounted_price = self.price - (self.price * self.discount_percentage / 100)
        return int(discounted_price)

    @property
    def rating(self):
        from django.db.models import Avg
        result = self.reviews.aggregate(Avg('rating'))
        return round(result['rating__avg'] or 0, 1)

    @property
    def reviews_count(self):
        return self.reviews.count()

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = 'Destination'
        verbose_name_plural = 'Destinations'
        ordering = ['-created_at']


class DestinationImage(ImageBaseModel):
    destination = ForeignKey('apps.Destination', CASCADE, related_name='images')
    order = PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['order']
