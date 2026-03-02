from django.db.models import CharField, ForeignKey, CASCADE, TextField, PositiveIntegerField, FloatField, \
    PositiveSmallIntegerField, BooleanField

from apps.models.base import SlugBaseModel, CreatedBaseModel, ImageBaseModel


class Destination(SlugBaseModel, CreatedBaseModel):
    name = CharField(max_length=250)
    city = ForeignKey('apps.City', CASCADE, related_name='destinations',
                      limit_choices_to={'level': 1})
    country = CharField(max_length=100)
    short_description = TextField(blank=True)
    description = TextField(blank=True)
    location = CharField(max_length=250, blank=True)
    price = PositiveIntegerField(default=0)
    discount_percentage = PositiveSmallIntegerField('Discount percentage', default=0, db_default=0,
                                                    help_text="Discount percentage must be between 0 and 100")
    rating = FloatField(default=0)
    reviews_count = PositiveIntegerField(default=0)
    is_flash_sale = BooleanField(default=False)
    flash_sale_end = CharField(max_length=50, blank=True)
    # stats_type = CharField(max_length=50, blank=True)
    is_free_cancellation = BooleanField(default=False)
    featured_badge = CharField(max_length=20, blank=True)

    @property
    def discounted_price(self):
        if not (0 <= self.discount_percentage <= 100):
            raise ValueError("Discount percentage must be between 0 and 100")

        discounted_price = self.price - (self.price * self.discount_percentage / 100)
        return int(discounted_price)

    def __str__(self):
        return self.name


class DestinationImage(ImageBaseModel):
    destination = ForeignKey('apps.Destination', CASCADE, related_name='images')
