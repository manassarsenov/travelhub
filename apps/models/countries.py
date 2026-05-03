from django.db.models import PositiveSmallIntegerField, CASCADE
from django.db.models.fields import BooleanField, CharField
from mptt.fields import TreeForeignKey

from apps.models.base import CreatedBaseModel, SlugBaseModel


class Country(SlugBaseModel, CreatedBaseModel):
    name = CharField(max_length=150)
    code = CharField(max_length=2, unique=True)
    phone_code = CharField(max_length=7)
    flag = CharField(max_length=10, blank=True, null=True)
    phone_length = PositiveSmallIntegerField(default=15)
    is_active = BooleanField(default=True)

    region = TreeForeignKey(
        'apps.Region',
        on_delete=CASCADE,
        related_name='countries',
        limit_choices_to={'level': 0},
        null=True,
        blank=True
    )

    def __str__(self):
        return f"{self.name} ({self.code})"

    class Meta:
        verbose_name = "Country"
        verbose_name_plural = "Countries"
        ordering = ["name"]
