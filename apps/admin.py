from apps.models import Category, Destination
from django.contrib import admin

from apps.models.destinations import DestinationImage

class DestinationImageInline(admin.StackedInline):
    model = DestinationImage
    min_num = 1
    extra = 1
    max_num = 8

@admin.register(Category)
class CategoryModelAdmin(admin.ModelAdmin):
    list_display = ['id', 'name']


@admin.register(Destination)
class DestinationModelAdmin(admin.ModelAdmin):
    list_display = ['id', 'name']
    inlines = [DestinationImageInline]

