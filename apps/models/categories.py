from django.db.models import CASCADE, CharField, PositiveIntegerField
from mptt.fields import TreeForeignKey
from mptt.models import MPTTModel

from apps.models.base import CreatedBaseModel, ImageBaseModel, SlugBaseModel


class Region(SlugBaseModel, CreatedBaseModel, MPTTModel):
    name = CharField(max_length=250)
    imoji = CharField(max_length=100, null=True, blank=True)
    parent = TreeForeignKey('self', CASCADE, null=True, blank=True, related_name='children')

    def __str__(self):
        return self.name

    class MPTTMeta:
        order_insertion_by = ['name']


class City(CreatedBaseModel, SlugBaseModel, ImageBaseModel):
    name = CharField(max_length=255)
    things_to_do = PositiveIntegerField(default=0)
    region = TreeForeignKey('apps.Region', CASCADE, related_name='cities', limit_choices_to={'level': 0})

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "City"
        verbose_name_plural = "Cities"
