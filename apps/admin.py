from django.contrib import admin

from apps.models import Destination, Country, Tag, Review, User, Activity, PromoCode, Booking
from apps.models.categories import City, Region
from apps.models.destinations import DestinationImage, DestinationFAQ, DestinationTimeSlot
from apps.models.ticket_details import TicketType
from django.contrib import admin
from django.utils.html import format_html
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderServiceError

from apps.models import Destination


class DestinationImageInline(admin.StackedInline):
    model = DestinationImage
    extra = 1


@admin.register(Region)
class RegionModelAdmin(admin.ModelAdmin):
    list_display = ['id', 'name']


@admin.register(City)
class CityModelAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'things_to_do']


@admin.register(Tag)
class TagModelAdmin(admin.ModelAdmin):
    list_display = ['id', 'name']


@admin.register(TicketType)
class TicketTypeAdmin(admin.ModelAdmin):
    list_display = ['id', 'name']


@admin.register(PromoCode)
class PromoCodeAdmin(admin.ModelAdmin):
    list_display = ['id']


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):

    list_display = ('booking_number', 'guest_first_name', 'destination', 'total_price', 'payment_method', 'is_paid',
                    'status', 'created_at')

    # O'ng tarafda filtr qilish uchun
    list_filter = ('status', 'is_paid', 'payment_method', 'booking_date')

    # Qidiruv berilganda qaysi maydonlardan qidirish kerak
    search_fields = ('booking_number', 'guest_email', 'guest_phone', 'guest_first_name', 'transaction_id')

    # Admin o'zgartira olmaydigan (faqat o'qish uchun) maydonlar
    readonly_fields = ('booking_number', 'transaction_id', 'created_at', 'updated_at')

    # 🚀 ICHKARI SAHIFA: Ma'lumotlarni chiroyli bo'limlarga ajratib ko'rsatish
    fieldsets = (
        ('Primary Information', {
            'fields': ('booking_number', 'user', 'destination', 'status')
        }),
        ('Guest Details', {
            'fields': ('guest_first_name', 'guest_last_name', 'guest_email', 'guest_phone')
        }),
        ('Booking Details', {
            'fields': ('booking_date', 'time', 'tickets_data', 'total_guests', 'promo_code', 'notes')
        }),
        ('💰 Payment Information (Yangi)', {  # Mana shu yerda yangi maydonlar chiqadi
            'fields': ('total_price', 'is_paid', 'paid_at', 'payment_method', 'card_type', 'card_mask',
                       'transaction_id')
        }),
        ('System Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)  # Bu bo'limni yig'ib qo'yadi (joyni tejash uchun)
        }),
    )

@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    pass


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['id', 'first_name']


@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    list_display = ['id', 'name']


@admin.register(Country)
class CountryAdmin(admin.ModelAdmin):
    list_display = ['id', 'name']


class DestinationFAQInline(admin.StackedInline):
    model = DestinationFAQ
    extra = 1


class DestinationTimeSlotInline(admin.StackedInline):
    model = DestinationTimeSlot
    extra = 1


@admin.register(Destination)
class DestinationAdmin(admin.ModelAdmin):
    inlines = [DestinationImageInline, DestinationFAQInline, DestinationTimeSlotInline]

    list_display = (
        'name', 'location', 'city', 'price',
        'is_flash_sale', 'is_trending', 'is_featured', 'is_popular',
        'rating',
    )

    list_filter = (
        'is_flash_sale', 'is_trending', 'is_featured',
        'is_popular', 'is_free_cancellation',
        'trip_type', 'duration', 'season', 'package_type',
        'city__country__region',
    )

    search_fields = ('name', 'location', 'city__name')

    readonly_fields = ('map_preview', 'rating',)

    fieldsets = (
        ('General', {
            'fields': (
                'city', 'country', 'tags', 'activities',
                'name', 'short_description', 'description',
                'featured_badge',
            )
        }),
        ('Location & Map', {
            'fields': (
                'location',
                'latitude', 'longitude',
                'map_preview',  # ← xarita shu yerda ko'rinadi
            ),
            'description': (
                '💡 Location ni yozing va saqlang — koordinatlar avtomatik to\'ldiriladi. '
                'Xaritani tekshiring, noto\'g\'ri bo\'lsa latitude/longitude ni qo\'lda o\'zgartiring.'
            ),
        }),
        ('Pricing', {
            'fields': (
                'price', 'price_label',
                'discount_percentage',
            )
        }),
        ('Details', {
            'fields': (
                'hotels_count', 'has_flights', 'restaurants_count',
                'trip_type', 'duration', 'season', 'package_type',
            )
        }),
        ('Flash Sale', {
            'fields': (
                'is_flash_sale', 'flash_sale_end',
            )
        }),
        ('Flags', {
            'fields': (
                'is_free_cancellation', 'is_popular',
                'is_trending', 'is_featured',
            )
        }),
        ('Reviews (readonly)', {
            'fields': ('rating',),
        }),
    )

    def map_preview(self, obj):
        """Admin da xarita ko'rsatadi"""
        if obj.latitude and obj.longitude:
            # Jingalak qavslar sonini argumentlar soniga mosladik
            return format_html(
                '<div style="margin-top:8px;">'
                '<iframe '
                '  width="560" height="300" '
                '  style="border:0;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.15);" '
                '  loading="lazy" allowfullscreen '
                '  src="http://maps.google.com/maps?q={},{}&z=15&output=embed">'
                '</iframe>'
                '<p style="margin-top:8px;color:#666;font-size:12px;">'
                '📍 lat: <b>{}</b> | lng: <b>{}</b> — '
                'Noto\'g\'ri bo\'lsa latitude/longitude ni o\'zgartiring va qayta saqlang.'
                '</p>'
                '</div>',
                obj.latitude, obj.longitude,  # iframe src uchun
                obj.latitude, obj.longitude  # pastdagi tekst uchun
            )
        return format_html(
            '<p style="color:#999;font-style:italic;">{}</p>',
            "Xarita yo'q — location yozing va saqlang, koordinatlar avtomatik to'ldiriladi."
        )

    map_preview.short_description = '🗺 Map Preview'

    def save_model(self, request, obj, form, change):
        """
        Faqat koordinat bo'lmasa geopy ishlatadi.
        Agar admin qo'lda latitude/longitude kiritgan bo'lsa — o'zgartirmaydi.
        """
        should_geocode = (
                obj.location
                and not obj.latitude
                and not obj.longitude
        )

        if should_geocode:
            try:
                geolocator = Nominatim(
                    user_agent="travelhub_admin",
                    timeout=5
                )
                result = geolocator.geocode(obj.location)

                if result:
                    obj.latitude = result.latitude
                    obj.longitude = result.longitude
                    self.message_user(
                        request,
                        f'✅ Koordinatlar avtomatik topildi: '
                        f'lat={result.latitude}, lng={result.longitude}. '
                        f'Xaritani tekshiring!',
                        level='success'
                    )
                else:
                    self.message_user(
                        request,
                        f'⚠️ "{obj.location}" uchun koordinat topilmadi. '
                        f'Latitude/longitude ni qo\'lda kiriting.',
                        level='warning'
                    )

            except GeocoderTimedOut:
                self.message_user(
                    request,
                    '⚠️ Geopy timeout — koordinatlar topilmadi. Qo\'lda kiriting.',
                    level='warning'
                )
            except GeocoderServiceError as e:
                self.message_user(
                    request,
                    f'⚠️ Geopy xatosi: {e}. Qo\'lda kiriting.',
                    level='warning'
                )

        super().save_model(request, obj, form, change)
