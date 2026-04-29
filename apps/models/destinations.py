from django.core.validators import MaxValueValidator, MinValueValidator
from django.db.models import (CASCADE, SET_NULL, BooleanField, CharField,
                              ForeignKey, ManyToManyField,
                              PositiveIntegerField, PositiveSmallIntegerField, ImageField, TimeField, Avg)
from django.db.models.enums import TextChoices
from django.db.models.fields import DecimalField, DateTimeField, TextField
from django_ckeditor_5.fields import CKEditor5Field

from apps.models.base import SlugBaseModel, CreatedBaseModel, ImageBaseModel


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
        # NONE = '', 'No Package'
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
    short_description = CKEditor5Field(blank=True)
    description = CKEditor5Field(blank=True)
    location = CharField(max_length=250, blank=True)

    latitude = DecimalField(max_digits=20, decimal_places=17, null=True, blank=True)
    longitude = DecimalField(max_digits=20, decimal_places=17, null=True, blank=True)

    price = PositiveIntegerField(default=0)
    price_label = CharField(max_length=20, default='person',
                            help_text="person | couple | family")
    discount_percentage = PositiveSmallIntegerField('Discount percentage', default=0, db_default=0,
                                                    validators=[MinValueValidator(0), MaxValueValidator(100)],
                                                    help_text="Discount percentage must be between 0 and 100")

    hotels_count = PositiveIntegerField(default=0, help_text="120 → '120+ Hotels'")
    has_flights = BooleanField(default=True, help_text="Direct FLights ko'rsatilsinmi")
    restaurants_count = PositiveIntegerField(default=0, help_text="120 → '120+ Restaurants'")

    is_flash_sale = BooleanField(default=False)
    flash_sale_end = DateTimeField(null=True, blank=True)

    trip_type = CharField(max_length=20, choices=TripType.choices, blank=True)
    duration = CharField(max_length=20, choices=Duration.choices, blank=True)
    season = CharField(max_length=20, choices=Season.choices, blank=True)

    visible_reviews_count = PositiveIntegerField(default=0, verbose_name="Visible Reviews Count")

    is_free_cancellation = BooleanField(default=False)
    free_cancellation_hours = PositiveIntegerField(
        default=24,
        help_text="Sayohat boshlanishidan necha soat oldingacha bepul bekor qilish mumkin?"
    )

    is_popular = BooleanField(default=False)
    is_trending = BooleanField(default=False)
    is_featured = BooleanField(default=False)
    featured_badge = CharField(max_length=50, blank=True, help_text="#1 Best seller in London")

    why_visit = CKEditor5Field(blank=True, help_text="Nima uchun tashrif buyurish kerak")
    whats_included = CKEditor5Field(blank=True, help_text="Nimalar kiradi")
    restrictions = CKEditor5Field(blank=True, help_text="Cheklovlar")
    additional_info = CKEditor5Field(blank=True, help_text="Qo'shimcha ma'lumot")

    package_type = CharField(max_length=20, choices=PackageType.choices, blank=True, default=PackageType.HONEYMOON)

    @property
    def cancellation_text(self):
        if not self.is_free_cancellation:
            return None

        hours = self.free_cancellation_hours
        if hours >= 24:
            days = hours // 24
            return f"Up to {days} day{'s' if days > 1 else ''} before the start time"
        return f"Up to {hours} hours before the start time"

    @property
    def discounted_price(self):
        if not (0 <= self.discount_percentage <= 100):
            raise ValueError("Discount percentage must be between 0 and 100")

        discounted_price = self.price - (self.price * self.discount_percentage / 100)
        return int(discounted_price)

    @property
    def rating(self):
        from django.db.models import Avg
        result = self.reviews.filter(is_visible=True).aggregate(Avg('rating'))
        return round(result['rating__avg'] or 0, 1)

    @property
    def service_score(self):
        from django.db.models import Avg
        result = self.reviews.filter(is_visible=True).aggregate(Avg('service_quality'))
        return round(result['service_quality__avg'] or 0, 1)

    @property
    def cleanliness_score(self):
        from django.db.models import Avg
        result = self.reviews.filter(is_visible=True).aggregate(Avg('cleanliness'))
        return round(result['cleanliness__avg'] or 0, 1)

    @property
    def facilities_score(self):
        from django.db.models import Avg
        result = self.reviews.filter(is_visible=True).aggregate(Avg('facilities'))
        return round(result['facilities__avg'] or 0, 1)

    @property
    def access_score(self):
        from django.db.models import Avg
        result = self.reviews.filter(is_visible=True).aggregate(Avg('location_rating'))
        return round(result['location_rating__avg'] or 0, 1)

    @property
    def value_score(self):
        from django.db.models import Avg
        result = self.reviews.filter(is_visible=True).aggregate(Avg('value_for_money'))
        return round(result['value_for_money__avg'] or 0, 1)

    @property
    def visible_reviews(self):
        return self.reviews.filter(is_visible=True)

    def update_min_price(self):
        """Eng arzon chipta narxini Destination.price ga yangilaydi"""
        min_ticket_price = self.ticket_types.filter(price__gt=0).order_by('price').first()
        if min_ticket_price:
            self.price = min_ticket_price.price
            self.save(update_fields=['price'])

    class Meta:
        verbose_name = 'Destination'
        verbose_name_plural = 'Destinations'
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class DestinationFAQ(CreatedBaseModel):
    destination = ForeignKey('apps.Destination', CASCADE, related_name='faqs')
    question = CharField(max_length=500, verbose_name="Savol")
    answer = CKEditor5Field(verbose_name="Javob")
    order = PositiveSmallIntegerField(default=0, verbose_name="Tartib")

    class Meta:
        verbose_name = 'Destination FAQ'
        verbose_name_plural = 'Destination FAQs'
        ordering = ['order']

    def __str__(self):
        return f"{self.destination.name} - {self.question[:50]}"

class DestinationTimeSlot(CreatedBaseModel):
    destination = ForeignKey('apps.Destination', CASCADE, related_name='time_slots')
    time = TimeField(verbose_name="Boshlanish vaqti", help_text="Masalan: 14:30")
    is_active = BooleanField(default=True, verbose_name="Faolmi?")

    class Meta:
        verbose_name = 'Time Slot'
        verbose_name_plural = 'Time Slots'
        ordering = ['time']
        unique_together = ('destination', 'time')

    def __str__(self):
        return f"{self.destination.name} - {self.time.strftime('%H:%M')}"

class DestinationImage(ImageBaseModel):
    destination = ForeignKey('apps.Destination', CASCADE, related_name='images')
    order = PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['order']


class Hotel(CreatedBaseModel):
    destination = ForeignKey('apps.Destination', on_delete=CASCADE, related_name='hotels')
    name = CharField(max_length=255)
    stars = PositiveSmallIntegerField(default=3)
    price_per_night = DecimalField(max_digits=10, decimal_places=2)
    address = CharField(max_length=500)
    main_image = ImageField(upload_to='hotels/')
    description = TextField(blank=True)

    has_wifi = BooleanField(default=True)
    has_pool = BooleanField(default=False)

    has_parking = BooleanField(default=False)
    has_restaurant = BooleanField(default=False)
    has_gym = BooleanField(default=False)
    has_spa = BooleanField(default=False)
    has_air_conditioning = BooleanField(default=True)

    latitude = DecimalField(max_digits=18, decimal_places=15, null=True, blank=True)
    longitude = DecimalField(max_digits=18, decimal_places=15, null=True, blank=True)
    location = CharField(max_length=250, blank=True)

    is_featured = BooleanField(default=False)
    is_available = BooleanField(default=True)

    @property
    def rating(self):
        from django.db.models import Avg
        result = self.reviews.aggregate(Avg('rating'))
        return round(result['rating__avg'] or 0, 1)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = 'Hotel'
        verbose_name_plural = 'Hotels'
        ordering = ['-created_at']


class HotelImage(ImageBaseModel):
    hotel = ForeignKey('apps.Hotel', CASCADE, related_name='images')
    order = PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['order']


class Flight(CreatedBaseModel):
    class CabinClass(TextChoices):
        ECONOMY = 'economy', 'Economy'
        BUSINESS = 'business', 'Business'
        FIRST = 'first', 'First Class'

    destination = ForeignKey('apps.Destination', CASCADE, related_name='flights')
    airline_name = CharField(max_length=100)
    airline_logo = ImageField(upload_to='airlines/', null=True, blank=True)
    departure_city = CharField(max_length=100, default='Tashkent')
    departure_time = TimeField(null=True, blank=True)
    arrival_time = TimeField(null=True, blank=True)
    flight_duration = CharField(max_length=50)  # masalan: "3h 45m"
    flight_number = CharField(max_length=20, blank=True)  # masalan: HY-123

    price_economy = DecimalField(max_digits=10, decimal_places=2)
    price_business = DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    price_first = DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    is_direct = BooleanField(default=True)
    is_available = BooleanField(default=True)
    seats_left = PositiveSmallIntegerField(default=50)

    def __str__(self):
        return f"{self.airline_name} — {self.departure_city} → {self.destination.name}"

    class Meta:
        verbose_name = 'Flight'
        verbose_name_plural = 'Flights'
        ordering = ['price_economy']
