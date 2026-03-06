from django.contrib import admin

from apps.models import Destination, Country, Tag, Review, User, Activity
from apps.models.categories import City, Region
from apps.models.destinations import DestinationImage
from apps.models.ticket_details import TicketType


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
    filter_horizontal = ['tags', 'activities']


@admin.register(Tag)
class TagModelAdmin(admin.ModelAdmin):
    list_display = ['id', 'name']


@admin.register(TicketType)
class TicketTypeAdmin(admin.ModelAdmin):
    list_display = ['id', 'name']


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    pass


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['id', 'first_name']


@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    list_display = ['id', 'name']


@admin.register(Country)
class CountryAdmin(admin.ModelAdmin):
    list_display = ['id', 'name']
