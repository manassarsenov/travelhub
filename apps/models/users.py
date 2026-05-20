from django.contrib.auth.models import AbstractUser
from django.core.validators import RegexValidator
from django.db.models import CharField, DateField, ForeignKey, SET_NULL, ImageField, URLField, JSONField
from django.db.models.enums import TextChoices
from django.db.models.fields import EmailField, TextField
from django.utils.translation import gettext_lazy as _


class User(AbstractUser):
    class Role(TextChoices):
        USER = 'user', _('User')
        ADMIN = 'admin', _('Admin')

    class Gender(TextChoices):
        MALE = 'male', _('Male')
        FEMALE = 'female', _('Female')
        OTHER = 'other', _('Other')

    class Theme(TextChoices):
        LIGHT = 'light', _('Light')
        DARK = 'dark', _('Dark')

    class BudgetRange(TextChoices):
        BUDGET = 'budget', _('Budget ($0-50/day)')
        MID = 'mid', _('Mid-Range ($50-150/day)')
        LUXURY = 'luxury', _('Luxury ($150+/day)')

    class TravelStyle(TextChoices):
        ADVENTURE = 'adventure', _('Adventure')
        BEACH = 'beach', _('Beach')
        CULTURAL = 'cultural', _('Cultural')
        NATURE = 'nature', _('Nature & Wildlife')
        CITY = 'city', _('City Tours')
        ROMANTIC = 'romantic', _('Romantic')
        FAMILY = 'family', _('Family')
        LUXURY = 'luxury', _('Luxury')

    phone_regex = RegexValidator(
        regex=r'^\+?1?\d{9,15}$',
        message=_("Telefon raqami formati: '+998991234567'. 15 tagacha raqam ruxsat etiladi.")
    )

    role = CharField(choices=Role.choices, max_length=20, default=Role.USER, verbose_name=_("User Role"))
    email = EmailField(_('email address'), unique=True)
    phone_number = CharField(validators=[phone_regex], max_length=20, unique=True, null=True, blank=True,
                             verbose_name=_("PhoneNumber"))

    avatar = ImageField(upload_to='users/avatars/%Y/%m/%d/', null=True, blank=True, verbose_name=_("Avatar"))
    gender = CharField(choices=Gender.choices, max_length=10, null=True, blank=True, verbose_name=_("Gender"))
    date_of_birth = DateField(null=True, blank=True, verbose_name=_("Date of Birth"))
    country = ForeignKey('apps.Country', on_delete=SET_NULL, null=True, blank=True, related_name='users',
                         verbose_name=_("Country"))

    bio = TextField(max_length=500, blank=True, verbose_name=_("Bio"))

    # ── Extended profile settings ──────────────────────────────────────────
    cover_photo = ImageField(upload_to='users/covers/%Y/%m/%d/', null=True, blank=True,
                             verbose_name=_("Cover Photo"))
    website = URLField(blank=True, verbose_name=_("Website"))
    current_location = CharField(max_length=150, blank=True, verbose_name=_("Current Location"))
    languages_spoken = JSONField(default=list, blank=True, verbose_name=_("Languages Spoken"))
    travel_styles = JSONField(default=list, blank=True, verbose_name=_("Travel Styles"))
    budget_range = CharField(max_length=10, choices=BudgetRange.choices, blank=True,
                             verbose_name=_("Budget Range"))
    theme = CharField(max_length=10, choices=Theme.choices, default=Theme.LIGHT,
                      verbose_name=_("Theme"))

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    @property
    def profile_completion(self):
        """Profil to'ldirilganlik foizi (0-100)."""
        checks = [
            bool(self.first_name), bool(self.last_name), bool(self.bio),
            bool(self.avatar), bool(self.cover_photo), bool(self.phone_number),
            bool(self.date_of_birth), bool(self.gender), bool(self.country_id),
            bool(self.current_location), bool(self.website),
            bool(self.languages_spoken), bool(self.travel_styles),
            bool(self.budget_range),
        ]
        return round(sum(checks) / len(checks) * 100)

    class Meta:
        verbose_name = _("User")
        verbose_name_plural = _("Users")

    def __str__(self):
        return f"{self.email} ({self.get_role_display()})"
