from django.db.models.enums import TextChoices
from django.db.models.fields import CharField

from apps.models.base import CreatedBaseModel, SlugBaseModel


class Activity(SlugBaseModel, CreatedBaseModel):
    class Icon(TextChoices):
        HIKING = 'fa-hiking', 'Hiking & Trekking'
        WATERSPORTS = 'fa-water', 'Water Sports'
        SHOPPING = 'fa-shopping-bag', 'Shopping'
        NIGHTLIFE = 'fa-moon', 'Nightlife'
        FOOD = 'fa-utensils', 'Food & Cuisine'
        SKIING = 'fa-skiing ', 'Skiing'
        DIVING = 'fa-fish', 'Diving'
        CYCLING = 'fa-bicycle', 'Cycling'
        PHOTOGRAPHY = 'fa-camera', 'Photography'
        CAMPING = 'fa-campground', 'Camping'

    name = CharField(max_length=100)
    icon = CharField(max_length=40, choices=Icon.choices, default=Icon.HIKING)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = 'Activity'
        verbose_name_plural = 'Activities'
