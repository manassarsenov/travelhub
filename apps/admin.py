from apps.models import Category
from django.contrib import admin


@admin.register(Category)
class CategoryModelAdmin(admin.ModelAdmin):
    list_display = ['id', 'name','destinations_count']

