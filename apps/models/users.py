from django.contrib.auth.models import AbstractUser
from django.db.models import CharField, DateField
from django.db.models.enums import TextChoices
from django.utils.translation import gettext_lazy as _


class User(AbstractUser):
    class Type(TextChoices):
        USER = 'user', _('User')
        ADMIN = 'admin', _('Admin')

    type = CharField(choices=Type.choices, max_length=20, default=Type.USER)

    phone_number = CharField(max_length=20, unique=True, null=True)
    date_of_birth = DateField(null=True, blank=True)
