from django.contrib.auth.models import AbstractUser
from django.core.validators import RegexValidator
from django.db.models import CharField, DateField, ForeignKey, SET_NULL, ImageField
from django.db.models.enums import TextChoices
from django.db.models.fields import EmailField, TextField
from django.utils.translation import gettext_lazy as _


class User(AbstractUser):
    class Type(TextChoices):
        USER = 'user', _('User')
        ADMIN = 'admin', _('Admin')

    class Gender(TextChoices):
        MALE = 'male', _('Male')
        FEMALE = 'female', _('Female')
        OTHER = 'other', _('Other')

    phone_regex = RegexValidator(
        regex=r'^\+?1?\d{9,15}$',
        message=_("Telefon raqami formati: '+998991234567'. 15 tagacha raqam ruxsat etiladi.")
    )

    type = CharField(choices=Type.choices, max_length=20, default=Type.USER, verbose_name=_("User Type"))
    email = EmailField(_('email address'), unique=True)
    phone_number = CharField(validators=[phone_regex], max_length=20, unique=True, null=True, blank=True,
                             verbose_name=_("PhoneNumber"))

    avatar = ImageField(upload_to='users/avatars/', null=True, blank=True, verbose_name=_("Avatar"))
    gender = CharField(choices=Gender.choices, max_length=10, null=True, blank=True, verbose_name=_("Gender"))
    date_of_birth = DateField(null=True, blank=True, verbose_name=_("Date of Birth"))
    country = ForeignKey('apps.Country', on_delete=SET_NULL, null=True, blank=True, related_name='users',
                         verbose_name=_("Country"))

    bio = TextField(max_length=500, blank=True, verbose_name=_("Bio"))

    class Meta:
        verbose_name = _("User")
        verbose_name_plural = _("Users")

    def __str__(self):
        return self.type
