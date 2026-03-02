from django.contrib import admin

from apps.models import Destination
from apps.models.categories import Region, City
from apps.models.destinations import DestinationImage


class DestinationImageInline(admin.StackedInline):
    model = DestinationImage
    min_num = 1
    extra = 1
    max_num = 8


@admin.register(Region)
class RegionModelAdmin(admin.ModelAdmin):
    list_display = ['id', 'name']


@admin.register(City)
class CityModelAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'things_to_do']


@admin.register(Destination)
class DestinationModelAdmin(admin.ModelAdmin):
    list_display = ['id', 'name']
    inlines = [DestinationImageInline]
