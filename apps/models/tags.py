from django.db.models.enums import TextChoices
from django.db.models.fields import CharField

from apps.models.base import CreatedBaseModel, SlugBaseModel


class Tag(SlugBaseModel, CreatedBaseModel):
    class IconType(TextChoices):
        LANDMARK = 'fa-landmark', 'Landmark'
        HISTORY = 'fa-history', 'History'
        DOLLAR = 'fa-dollar-sign', 'Budget'
        BEACH = 'fa-umbrella-beach', 'Beach'
        HEART = 'fa-heart', 'Romantic'
        PALETTE = 'fa-palette', 'Art'
        UTENSILS = 'fa-utensils', 'Food'
        CROWN = 'fa-crown', 'Luxury'
        CITY = 'fa-city', 'City'
        MOUNTAIN = 'fa-mountain', 'Mountain'
        CAMERA = 'fa-camera', 'Photography'
        SHIP = 'fa-ship', 'Cruise'
        SHOPPING = 'fa-shopping-bag', 'Shopping'
        LEAF = 'fa-leaf', 'Nature'
        SPA = 'fa-spa', 'Wellness'
        USERS = 'fa-users', 'Family'
        WATER = 'fa-water', 'Water'

    name = CharField(max_length=100)
    icon = CharField(max_length=30, choices=IconType.choices, default=IconType.LANDMARK)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = 'Tag'
        verbose_name_plural = 'Tags'
