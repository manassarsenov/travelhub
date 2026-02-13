from django.db.models import PositiveIntegerField, CharField

from apps.models.base import SlugBaseModel, CreatedBaseModel


class Category(SlugBaseModel, CreatedBaseModel):
    name = CharField(max_length=250)
    destinations_count = PositiveIntegerField()
    icon = CharField(max_length=100, null=True, blank=True)
    color = CharField(max_length=50, null=True, blank=True)

    def __str__(self):
        return self.name
