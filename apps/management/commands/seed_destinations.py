"""
seed_destinations.py
====================
Mashhur ~30 shahar uchun har biriga 10 tadan realistik Destination yaratadi.

 - Ma'lumot generatsiya qilinadi (booking.com'dan EMAS) — narx, chegirma,
   trip_type, mavsum, tag/activity hammasi realistik shablonlardan.
 - Turlar aralash: flash sale, trending, popular, featured va oddiy.
 - Rasm: LoremFlickr (sayohat mavzusi) -> fallback Picsum.
   Rasm local `media/` ga yuklab olinadi va model orqali .webp ga aylanadi.
 - Idempotent: qayta ishga tushirsa, mavjud destinationlarni o'tkazib yuboradi,
   faqat rasmi yo'qlariga rasm qo'shadi.

Foydalanish:
    python manage.py seed_destinations
    python manage.py seed_destinations --limit 30 --per-city 10
    python manage.py seed_destinations --no-images
    python manage.py seed_destinations --cities "Paris,Rome,Tokyo"
"""
import io
import random
import time
from datetime import timedelta

import requests
from PIL import Image

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify

from apps.models.activities import Activity
from apps.models.categories import City
from apps.models.destinations import Destination, DestinationImage
from apps.models.tags import Tag

# ----------------------------------------------------------------------
#  Nomzod shaharlar — bazada mavjud bo'lganlaridan birinchi --limit tasi olinadi
# ----------------------------------------------------------------------
CANDIDATE_CITIES = [
    "Paris", "Rome", "Barcelona", "London", "Amsterdam", "Prague", "Dubai",
    "Istanbul", "Tokyo", "New York", "Venice", "Florenca", "Vienna", "Madrid",
    "Lisbon", "Berlin", "Budapest", "Athens", "Singapore", "Ubud", "Munich",
    "Zurich", "Copenhagen", "Edinburgh", "Dublin", "Milan", "Naples", "Porto",
    "Reykjavik", "Kyoto", "Stockholm", "Oslo", "Helsinki", "Nice", "Seville",
    "Brussels", "Warsaw", "Salzburg",
]

T = Destination.TripType
D = Destination.Duration
S = Destination.Season
P = Destination.PackageType

# ----------------------------------------------------------------------
#  12 ta arxetip — har shahar ulardan 10 tasini oladi (shahar bo'yicha siljish)
#  tags / acts — kichik harfli normalizatsiya qilingan nomlar bilan beriladi
# ----------------------------------------------------------------------
ARCHETYPES = [
    dict(title="Old Town Walking Tour", trip=T.CULTURAL, dur=D.WEEKEND, season=S.SPRING,
         pkg=P.FAMILY, price=(28, 65), tags=["landmark", "history", "city"],
         acts=["photography"], kw="oldtown",
         blurb="Wander centuries-old cobbled lanes with a local storyteller."),
    dict(title="Sunset River Cruise", trip=T.ROMANTIC, dur=D.WEEKEND, season=S.SUMMER,
         pkg=P.HONEYMOON, price=(45, 95), tags=["romantic", "cruise", "water"],
         acts=["photography"], kw="rivercruise",
         blurb="Glide past glowing skylines as the sun melts into the water."),
    dict(title="Food & Wine Tasting Experience", trip=T.CULTURAL, dur=D.WEEKEND, season=S.AUTUMN,
         pkg=P.FAMILY, price=(55, 120), tags=["food", "city"],
         acts=["food & cuisine"], kw="food",
         blurb="Taste your way through markets, cellars and family-run kitchens."),
    dict(title="Grand Museum & Art Pass", trip=T.CULTURAL, dur=D.WEEKEND, season=S.WINTER,
         pkg=P.BUSINESS, price=(25, 75), tags=["art", "history", "landmark"],
         acts=["photography"], kw="museum",
         blurb="Skip the queues at the city's most celebrated galleries."),
    dict(title="Mountain Hiking Day Trip", trip=T.ADVENTURE, dur=D.SHORT, season=S.SUMMER,
         pkg=P.ADVENTURE, price=(60, 150), tags=["mountain", "nature"],
         acts=["hiking & trekking"], kw="mountain",
         blurb="Trade the streets for alpine trails and sweeping panoramas."),
    dict(title="Hop-on Hop-off City Bus", trip=T.CITY, dur=D.WEEKEND, season=S.SPRING,
         pkg=P.FAMILY, price=(30, 70), tags=["city", "landmark"],
         acts=["photography"], kw="citytour",
         blurb="See every icon at your own pace from an open-top deck."),
    dict(title="Island & Coast Boat Cruise", trip=T.BEACH, dur=D.SHORT, season=S.SUMMER,
         pkg=P.HONEYMOON, price=(85, 240), tags=["beach", "water", "cruise"],
         acts=["water sports"], kw="island",
         blurb="Hop turquoise bays, hidden coves and sun-soaked beaches."),
    dict(title="Adventure Zipline & Park", trip=T.ADVENTURE, dur=D.WEEKEND, season=S.AUTUMN,
         pkg=P.ADVENTURE, price=(50, 130), tags=["mountain", "nature"],
         acts=["cycling"], kw="adventure",
         blurb="Ziplines, rope bridges and adrenaline above the treetops."),
    dict(title="Spa & Wellness Retreat", trip=T.ROMANTIC, dur=D.SHORT, season=S.WINTER,
         pkg=P.HONEYMOON, price=(120, 420), tags=["wellness", "luxury"],
         acts=["photography"], kw="spa",
         blurb="Unwind with thermal baths, massage and pure quiet luxury."),
    dict(title="Family Theme Park Day", trip=T.FAMILY, dur=D.WEEKEND, season=S.SUMMER,
         pkg=P.FAMILY, price=(45, 140), tags=["family", "city"],
         acts=["shopping"], kw="themepark",
         blurb="A full day of rides, shows and smiles for every age."),
    dict(title="Wildlife & Nature Safari", trip=T.NATURE, dur=D.SHORT, season=S.AUTUMN,
         pkg=P.ADVENTURE, price=(90, 280), tags=["nature", "mountain"],
         acts=["camping"], kw="wildlife",
         blurb="Track rare wildlife across untamed reserves and wetlands."),
    dict(title="Night Lights & Local Bars", trip=T.CITY, dur=D.WEEKEND, season=S.SPRING,
         pkg=P.BUSINESS, price=(40, 100), tags=["city", "food"],
         acts=["nightlife"], kw="nightlife",
         blurb="Chase neon streets, rooftop views and the best local bars."),
]

# ----------------------------------------------------------------------
#  Har shahardagi 10 destination uchun "bayroq" rejasi — turlar aralashmasi
# ----------------------------------------------------------------------
FLAG_PLAN = [
    dict(featured=True, badge="#1 Best Seller in {city}"),
    dict(flash=True, discount=(25, 45)),
    dict(trending=True),
    dict(popular=True),
    dict(flash=True, discount=(15, 30)),
    dict(trending=True),
    dict(popular=True, featured=True, badge="Travelers' Choice"),
    dict(discount=(8, 15)),
    dict(trending=True),
    dict(),
]


def _norm(s):
    """Nomni solishtirish uchun normalizatsiya: kichik harf + ortiqcha bo'shliqsiz."""
    return " ".join(s.lower().split())


class Command(BaseCommand):
    help = "Mashhur ~30 shahar uchun har biriga 10 tadan realistik Destination yaratadi."

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int, default=30,
                            help="Nechta shahar (default 30)")
        parser.add_argument("--per-city", type=int, default=10,
                            help="Har shaharda nechta destination (default 10)")
        parser.add_argument("--no-images", action="store_true",
                            help="Rasmsiz — faqat ma'lumot yaratiladi (tez)")
        parser.add_argument("--cities", type=str, default="",
                            help="Vergul bilan ajratilgan shahar ro'yxati (nomzodlar o'rniga)")

    # ------------------------------------------------------------------
    def handle(self, *args, **opts):
        limit = opts["limit"]
        per_city = opts["per_city"]
        do_images = not opts["no_images"]

        # --- shaharlarni aniqlash ---
        wanted = ([c.strip() for c in opts["cities"].split(",") if c.strip()]
                  or CANDIDATE_CITIES)
        cities = []
        missing = []
        for name in wanted:
            city = (City.objects.filter(name__iexact=name)
                    .select_related("country").first())
            if city:
                cities.append(city)
            else:
                missing.append(name)
            if len(cities) >= limit:
                break

        if missing:
            self.stdout.write(self.style.WARNING(
                f"Bazada topilmadi ({len(missing)}): {', '.join(missing)}"))
        if not cities:
            self.stdout.write(self.style.ERROR("Hech qanday shahar topilmadi — to'xtatildi."))
            return

        # --- tag / activity lug'atlari ---
        tag_by = {_norm(t.name): t for t in Tag.objects.all()}
        act_by = {_norm(a.name): a for a in Activity.objects.all()}

        self.stdout.write(self.style.MIGRATE_HEADING(
            f"\n{len(cities)} shahar × {per_city} destination "
            f"= {len(cities) * per_city} ta  |  rasm: {'HA' if do_images else 'YO‘Q'}\n"))

        created_total = 0
        skipped_total = 0
        images_total = 0

        for ci, city in enumerate(cities):
            country = city.country
            country_name = country.name if country else city.name
            had = city.destinations.count()
            line = f"[{ci + 1:>2}/{len(cities)}] {city.name:<16}"

            made = 0
            for i in range(per_city):
                arch = ARCHETYPES[(ci + i) % len(ARCHETYPES)]
                flag = FLAG_PLAN[i % len(FLAG_PLAN)]
                name = f"{city.name}: {arch['title']}"
                slug = slugify(name)

                dest = Destination.objects.filter(slug=slug).first()

                if dest is None:
                    try:
                        dest = self._create_destination(
                            city, country, country_name, arch, flag, tag_by, act_by)
                        created_total += 1
                        made += 1
                    except Exception as exc:  # noqa: BLE001
                        self.stdout.write(self.style.ERROR(
                            f"\n   ✗ {name}: {exc}"))
                        continue
                else:
                    skipped_total += 1

                # rasm — yo'q bo'lsa qo'shamiz (qayta ishga tushirishga chidamli)
                if do_images and not dest.images.exists():
                    if self._attach_image(dest, city, arch):
                        images_total += 1
                    time.sleep(0.2)

            self.stdout.write(
                f"{line} oldin: {had:>2}  yangi: +{made}  jami: {city.destinations.count()}")

        self.stdout.write(self.style.SUCCESS(
            f"\n✓ Tugadi.  Yangi destination: {created_total}   "
            f"O'tkazib yuborilgan (mavjud): {skipped_total}   "
            f"Rasm yuklab olindi: {images_total}"))

    # ------------------------------------------------------------------
    @transaction.atomic
    def _create_destination(self, city, country, country_name, arch, flag, tag_by, act_by):
        """Bitta Destination + tags/activities yaratadi (atomik)."""
        price = int(round(random.randint(*arch["price"]) / 5.0) * 5)
        disc_range = flag.get("discount")
        discount = random.randint(*disc_range) if disc_range else 0

        is_flash = bool(flag.get("flash"))
        flash_end = None
        if is_flash:
            flash_end = timezone.now() + timedelta(
                days=random.randint(2, 12), hours=random.randint(1, 23))
            if discount == 0:
                discount = random.randint(20, 40)

        is_featured = bool(flag.get("featured"))
        badge = flag.get("badge", "").format(city=city.name) if is_featured else ""

        short, desc, why, included, restrict, extra = _descriptions(
            city.name, country_name, arch)

        dest = Destination(
            city=city,
            country=country,
            name=f"{city.name}: {arch['title']}",
            short_description=short,
            description=desc,
            location=f"{city.name}, {country_name}",
            price=price,
            price_label="person",
            discount_percentage=discount,
            hotels_count=random.randint(40, 380),
            restaurants_count=random.randint(70, 620),
            has_flights=True,
            is_flash_sale=is_flash,
            flash_sale_end=flash_end,
            trip_type=arch["trip"],
            duration=arch["dur"],
            season=arch["season"],
            visible_reviews_count=random.randint(180, 4200),
            is_free_cancellation=random.random() < 0.82,
            free_cancellation_hours=random.choice([24, 24, 48, 72]),
            is_popular=bool(flag.get("popular")),
            is_trending=bool(flag.get("trending")),
            is_featured=is_featured,
            featured_badge=badge,
            why_visit=why,
            whats_included=included,
            restrictions=restrict,
            additional_info=extra,
            package_type=arch["pkg"],
        )
        dest.save()

        tags = [tag_by[t] for t in arch["tags"] if t in tag_by]
        acts = [act_by[a] for a in arch["acts"] if a in act_by]
        if tags:
            dest.tags.set(tags)
        if acts:
            dest.activities.set(acts)
        return dest

    # ------------------------------------------------------------------
    def _attach_image(self, dest, city, arch):
        """Destinationga rasm yuklab oladi va biriktiradi (DestinationImage)."""
        data = self._fetch_image(city, arch, dest.slug)
        if not data:
            return False
        try:
            img = DestinationImage(destination=dest, order=0)
            img.image = ContentFile(data, name=f"{dest.slug}.jpg")
            img.save()  # ImageBaseModel.save() avtomatik .webp ga aylantiradi
            return True
        except Exception as exc:  # noqa: BLE001
            self.stdout.write(self.style.WARNING(f"\n   ! rasm saqlanmadi {dest.slug}: {exc}"))
            return False

    @staticmethod
    def _fetch_image(city, arch, seed):
        """LoremFlickr (sayohat) -> fallback Picsum. Bytes qaytaradi yoki None."""
        city_kw = city.name.lower().replace(" ", "").replace("'", "")
        urls = [
            f"https://loremflickr.com/800/600/{city_kw},{arch['kw']}",
            f"https://loremflickr.com/800/600/{arch['kw']},travel",
            f"https://picsum.photos/seed/{seed}/800/600",
        ]
        headers = {"User-Agent": "Mozilla/5.0 (TravelHub seeder)"}
        for url in urls:
            try:
                resp = requests.get(url, timeout=15, headers=headers)
                if resp.status_code == 200 and len(resp.content) > 2000:
                    Image.open(io.BytesIO(resp.content)).verify()  # haqiqiy rasmmi?
                    return resp.content
            except Exception:  # noqa: BLE001
                time.sleep(0.5)
        return None


# ----------------------------------------------------------------------
#  Matn (CKEditor HTML) generatori
# ----------------------------------------------------------------------
def _descriptions(city, country, arch):
    title = arch["title"]
    low = title.lower()
    short = f'{arch["blurb"]} A {low} in {city} you will remember long after the trip.'
    description = (
        f'<p>Discover <strong>{city}</strong> on this unforgettable <em>{low}</em>. '
        f'{arch["blurb"]} Led by friendly local guides, this experience blends the '
        f'must-see highlights of {city}, {country} with the hidden corners only '
        f'insiders know.</p>'
        f'<p>Whether it is your first visit or your tenth, you will see {city} from a '
        f'fresh perspective — at a relaxed pace, with plenty of time for photos and '
        f'genuine local moments.</p>'
    )
    why = (
        '<ul>'
        f'<li>Hand-picked highlights of {city}</li>'
        '<li>Small groups & friendly expert guides</li>'
        '<li>Skip-the-line access where available</li>'
        '<li>Flexible, mobile-friendly tickets</li>'
        '</ul>'
    )
    included = (
        '<ul>'
        '<li>Professional local guide</li>'
        '<li>All entrance fees along the route</li>'
        '<li>Hotel pickup in the city centre</li>'
        '<li>Bottled water</li>'
        '</ul>'
    )
    restrictions = (
        '<ul>'
        '<li>Not recommended for travelers with limited mobility</li>'
        '<li>Minimum age 5 years</li>'
        '<li>Modest dress required for some sites</li>'
        '</ul>'
    )
    additional = (
        '<p>Confirmation is received at the time of booking. Comfortable walking shoes '
        'are recommended. In case of severe weather the experience may be rescheduled '
        'or fully refunded.</p>'
    )
    return short, description, why, included, restrictions, additional