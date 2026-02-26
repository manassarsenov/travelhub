from django.db.models import PositiveIntegerField, CharField, CASCADE, Model, ForeignKey, ManyToManyField
from mptt.fields import TreeForeignKey
from mptt.models import MPTTModel

from apps.models.base import SlugBaseModel, CreatedBaseModel, ImageBaseModel


class Category(SlugBaseModel, CreatedBaseModel, MPTTModel):
    name = CharField(max_length=250)
    imoji = CharField(max_length=100, null=True, blank=True)
    parent = TreeForeignKey('self', CASCADE, null=True, blank=True, related_name='children')

    def __str__(self):
        return self.name

    class MPTTMeta:
        order_insertion_by = ['name']


class City(CreatedBaseModel, SlugBaseModel):
    name = CharField(max_length=255)
    things_to_do = PositiveIntegerField(default=0)
    category = TreeForeignKey('apps.Category', CASCADE, related_name='cities')

    # limit_choices_to={'level': 0})

    def __str__(self):
        return self.name


class CityImage(ImageBaseModel):
    city = ForeignKey('apps.City', CASCADE, related_name='images')
