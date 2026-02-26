from PIL import Image
from io import BytesIO
from django.core.files.base import ContentFile
from django.core.files.uploadedfile import InMemoryUploadedFile, TemporaryUploadedFile
from django.core.validators import FileExtensionValidator
from django.db.models import Model, ImageField
from django.db.models.fields import SlugField, DateTimeField
from django.utils.text import slugify

from apps.utils.uplode_image import upload_to_image, upload_image_size_5mb_validator


class SlugBaseModel(Model):
    slug = SlugField(max_length=255, unique=True, editable=False)

    class Meta:
        abstract = True

    def save(self, *, force_insert=False, force_update=False, using=None, update_fields=None):
        if self._state.adding:
            if hasattr(self, 'name'):
                self.slug = slugify(self.name)

            if hasattr(self, 'title'):
                self.slug = slugify(self.title)
        super().save(force_insert=force_insert, force_update=force_update, using=using, update_fields=update_fields)


class CreatedBaseModel(Model):
    updated_at = DateTimeField(auto_now_add=True)
    created_at = DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class ImageBaseModel(Model):
    image = ImageField(upload_to=upload_to_image, null=True, blank=True,
                       validators=[FileExtensionValidator(['jpeg', 'jpg', 'png', 'webp']),
                                   upload_image_size_5mb_validator],
                       help_text='jpg, png, webp are allowed')

    class Meta:
        abstract = True

    def convert_img_to_webp(self):
        is_new_upload = isinstance(self.image.file, (InMemoryUploadedFile, TemporaryUploadedFile))

        if self._state.adding or is_new_upload:
            img = Image.open(self.image)
            img = img.convert("RGB")
            buffer = BytesIO()
            img.save(buffer, format="WEBP", quality=85)
            buffer.seek(0)

            self.image = ContentFile(buffer.read(), f"{self.image.name.split('.')[0]}.webp")
            buffer.close()

    # def delete_old_img(self):
    #     self.is_new_upload = isinstance(self.image.file, (InMemoryUploadedFile, TemporaryUploadedFile))
    #
    #     if not self._state.adding and self.is_new_upload:
    #         _obj = self.__class__.objects.get(id=self.id)
    #         _obj.image.delete()

    def save(self, *, force_insert=False, force_update=False, using=None, update_fields=None):
        # self.delete_old_img()
        if self.image:
            self.convert_img_to_webp()
        super().save(force_insert=force_insert, force_update=force_update, using=using, update_fields=update_fields)
