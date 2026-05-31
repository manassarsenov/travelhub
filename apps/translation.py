from modeltranslation.translator import TranslationOptions, register

from apps.models import Activity, City, Country, Destination, Region, Tag
from apps.models.destinations import DestinationFAQ
from apps.models.ticket_details import TicketType


@register(Destination)
class DestinationTR(TranslationOptions):
    fields = (
        'name',
        'short_description',
        'description',
        'location',
        'price_label',
        'featured_badge',
        'why_visit',
        'whats_included',
        'restrictions',
        'additional_info',
    )


@register(DestinationFAQ)
class DestinationFAQTR(TranslationOptions):
    fields = ('question', 'answer')


@register(Country)
class CountryTR(TranslationOptions):
    fields = ('name',)


@register(Region)
class RegionTR(TranslationOptions):
    fields = ('name',)


@register(City)
class CityTR(TranslationOptions):
    fields = ('name',)


@register(Tag)
class TagTR(TranslationOptions):
    fields = ('name',)


@register(Activity)
class ActivityTR(TranslationOptions):
    fields = ('name',)


@register(TicketType)
class TicketTypeTR(TranslationOptions):
    fields = ('name', 'age_label')