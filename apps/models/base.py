from django.db.models import Model, SlugField, DateTimeField
from django.utils.text import slugify


class CreatedBaseModel(Model):
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class SlugBaseModel(Model):
    slug = SlugField(unique=True, editable=False)

    class Meta:
        abstract = True

    def save(self, *, force_insert=False, force_update=False, using=None, update_fields=None):
        self.slug = slugify(self.name)
        super().save(force_insert=force_insert, force_update=force_update, using=using, update_fields=update_fields)
