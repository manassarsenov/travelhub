import os

from PIL import Image, ImageOps
from django.db.models import CharField, ForeignKey, CASCADE, TextField, ImageField, PositiveIntegerField, FloatField, \
    Model, PositiveSmallIntegerField

from apps.models import Category
from apps.models.base import SlugBaseModel, CreatedBaseModel


class Destination(SlugBaseModel, CreatedBaseModel):
    name = CharField(max_length=250)
    category = ForeignKey(Category, CASCADE, related_name='destinations')
    description = TextField(blank=True)
    location = CharField(max_length=250, blank=True)
    price = PositiveIntegerField()
    discount_percentage = PositiveSmallIntegerField('Discount percentage', default=0, db_default=0,
                                                    help_text="Discount percentage must be between 0 and 100")
    rating = FloatField(default=0)
    stats_hotels = PositiveIntegerField(default=0)
    stats_temperature = CharField(max_length=20, blank=True)
    stats_type = CharField(max_length=50, blank=True)
    featured_badge = CharField(max_length=20, blank=True)

    def __str__(self):
        return self.name


class DestinationImage(Model):
    image = ImageField(upload_to='destinations/%Y/%m/%d')
    destination = ForeignKey('apps.Destination', CASCADE, related_name='images')

    def save(self, *, force_insert=False, force_update=False, using=None, update_fields=None):
        super().save(force_insert=force_insert, force_update=force_update, using=using, update_fields=update_fields)

        img_path = self.image.path
        img = Image.open(img_path)

        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")

        target_size = (777, 508)
        img = ImageOps.fit(img, target_size, Image.Resampling.LANCZOS)

        webp_path = os.path.splitext(img_path)[0] + ".webp"
        img.save(webp_path, "WEBP", quality=90)

        if img_path != webp_path and os.path.exists(img_path):
            os.remove(img_path)

        self.image.name = os.path.splitext(self.image.name)[0] + ".webp"
        super().save(force_insert=force_insert, force_update=force_update, using=using, update_fields=["image"])

    def delete(self, using=None, keep_parents=False):
        self.image.delete(False)
        return super().delete(using, keep_parents)
