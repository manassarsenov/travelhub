"""
seed_uzbekistan.py
==================
O'zbekistonning turistik shaharlari va ularning HAQIQIY diqqatga sazovor
joylarini bazaga qo'shadi.

 - 10 shahar: Tashkent, Samarkand, Bukhara, Khiva, Shahrisabz, Nukus,
   Termez, Kokand, Nurata, Moynaq.
 - 64 ta real destination — Registan, Po-i-Kalyan, Itchan Kala va h.k.
   Har biri uchun aniq, haqiqatga mos tavsif.
 - Turlar aralash: featured / trending / popular / flash sale / oddiy.
 - Rasm: LoremFlickr -> fallback Picsum, local media/ ga .webp.
 - Idempotent: qayta ishga tushirsa dublikat yaratmaydi.

Foydalanish:
    python manage.py seed_uzbekistan
    python manage.py seed_uzbekistan --no-images
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
from apps.models.countries import Country
from apps.models.destinations import Destination, DestinationImage
from apps.models.tags import Tag

T = Destination.TripType
D = Destination.Duration
S = Destination.Season

# ----------------------------------------------------------------------
#  Shaharlar — nom: (aeroporti bormi, rasm kaliti)
# ----------------------------------------------------------------------
UZ_CITIES = {
    "Tashkent":   (True,  "tashkent,uzbekistan"),
    "Samarkand":  (True,  "samarkand,registan"),
    "Bukhara":    (True,  "bukhara,uzbekistan"),
    "Khiva":      (True,  "khiva,uzbekistan"),
    "Shahrisabz": (False, "shahrisabz,uzbekistan"),
    "Nukus":      (True,  "nukus,karakalpakstan"),
    "Termez":     (True,  "termez,uzbekistan"),
    "Kokand":     (False, "kokand,uzbekistan"),
    "Nurata":     (False, "nurata,uzbekistan,desert"),
    "Moynaq":     (False, "moynaq,aral,sea"),
}

# ----------------------------------------------------------------------
#  Destinationlar — (nom, trip_type, narx, mavsum, bayroq, [taglar], rasm_kw, tavsif)
#  bayroq: feat | trend | pop | flash | ""
# ----------------------------------------------------------------------
UZ_DESTINATIONS = {
    "Tashkent": [
        ("Khast Imam Complex", T.CULTURAL, 35, S.SPRING, "feat", ["history", "landmark", "art"], "khast imam,tashkent",
         "Tashkent's spiritual heart, this serene complex houses the 7th-century Uthman Quran — believed to be the world's oldest, written just decades after the Prophet."),
        ("Chorsu Bazaar", T.CITY, 18, S.AUTUMN, "feat", ["shopping", "food", "city"], "chorsu bazaar,tashkent",
         "Step under the giant turquoise dome of Tashkent's oldest bazaar — a swirling marketplace of spices, fresh bread, dried fruit and warm Uzbek hospitality."),
        ("Amir Timur Square", T.CITY, 15, S.SUMMER, "pop", ["landmark", "city", "history"], "amir timur square,tashkent",
         "A leafy ceremonial square at the centre of the capital, ringed by grand architecture, with the equestrian statue of Amir Temur at its core."),
        ("Tashkent Metro Art Tour", T.CITY, 22, S.WINTER, "trend", ["art", "city", "history"], "tashkent metro",
         "Ride one of the world's most beautiful metros — each station a marble-and-mosaic palace that was forbidden to photograph until 2018."),
        ("Independence Square", T.CITY, 12, S.SPRING, "pop", ["landmark", "city"], "independence square,tashkent",
         "Mustaqillik Maydoni — the vast ceremonial heart of modern Uzbekistan, framed by fountains, white arches and the Independence Monument."),
        ("Minor Mosque", T.CULTURAL, 16, S.SPRING, "trend", ["landmark", "art", "photography"], "minor mosque,tashkent",
         "A graceful mosque of white marble and sky-blue domes on the bank of the Ankhor Canal — Tashkent's elegant modern landmark."),
        ("State Museum of Applied Arts", T.CULTURAL, 20, S.AUTUMN, "flash", ["art", "history"], "uzbek applied arts museum",
         "Set inside a richly decorated 19th-century mansion, this museum showcases the finest Uzbek ceramics, suzani embroidery, wood carving and silk."),
        ("Tashkent TV Tower", T.CITY, 25, S.SUMMER, "pop", ["city", "landmark", "photography"], "tashkent tv tower",
         "At 375 metres, one of the tallest towers in Central Asia, with an observation deck and revolving restaurant high above the whole city."),
        ("Hazrati Imam Friday Mosque", T.CULTURAL, 18, S.AUTUMN, "flash", ["landmark", "art", "history"], "hazrati imam,tashkent",
         "The grand congregational mosque of the Khast Imam ensemble, its tall minarets and blue domes glowing gold at sunset."),
        ("Magic City Theme Park", T.FAMILY, 40, S.SUMMER, "trend", ["family", "city"], "magic city,tashkent",
         "A fairy-tale themed leisure park with castles, lakes, light-and-water shows and rides — Tashkent's favourite family day out."),
    ],
    "Samarkand": [
        ("Registan Square", T.CULTURAL, 65, S.SPRING, "feat", ["history", "landmark", "art"], "registan,samarkand",
         "The crown jewel of the Silk Road — three towering madrasahs facing a single square in a blaze of turquoise mosaic and gold."),
        ("Gur-e-Amir Mausoleum", T.CULTURAL, 45, S.SPRING, "feat", ["history", "landmark", "art"], "gur emir,samarkand",
         "Beneath a fluted azure dome lies Amir Temur himself — the tomb whose design inspired the great mausoleums of Mughal India."),
        ("Shah-i-Zinda Necropolis", T.CULTURAL, 50, S.AUTUMN, "feat", ["history", "art", "photography"], "shah i zinda,samarkand",
         "An avenue of shimmering tombs climbing a hillside — often called the most beautiful tilework in the Islamic world."),
        ("Bibi-Khanym Mosque", T.CULTURAL, 38, S.SUMMER, "trend", ["history", "landmark"], "bibi khanym,samarkand",
         "Once one of the largest mosques on earth, built by Temur for his beloved wife — monumental even in its restored grandeur."),
        ("Ulugh Beg Observatory", T.CULTURAL, 30, S.WINTER, "trend", ["history", "art"], "ulugbek observatory,samarkand",
         "The ruins of a 15th-century observatory where the astronomer-king Ulugh Beg mapped over a thousand stars with remarkable accuracy."),
        ("Siab Bazaar", T.CITY, 14, S.AUTUMN, "pop", ["shopping", "food", "city"], "siab bazaar,samarkand",
         "Samarkand's lively traditional bazaar, piled high with the city's famous round bread, dried apricots, nuts and spices."),
        ("Afrasiyab Museum", T.CULTURAL, 22, S.SPRING, "flash", ["history", "art"], "afrasiyab,samarkand",
         "Walk the ancient mound of pre-Mongol Samarkand and see the vivid 7th-century Sogdian frescoes uncovered on this very site."),
        ("Hazrat Khizr Mosque", T.CULTURAL, 20, S.SUMMER, "flash", ["landmark", "art", "photography"], "hazrat khizr,samarkand",
         "A graceful hillside mosque with carved wooden ceilings, panoramic views over Samarkand and a calm, welcoming courtyard."),
        ("Konigil Silk Paper Mill", T.CULTURAL, 28, S.AUTUMN, "flash", ["art", "history"], "samarkand silk paper",
         "Watch master artisans revive the ancient craft of Samarkand silk paper at the water-powered Meros paper mill in Konigil village."),
        ("Imam Al-Bukhari Complex", T.CULTURAL, 32, S.SPRING, "pop", ["history", "landmark"], "imam bukhari,samarkand",
         "The dignified memorial complex of Imam al-Bukhari, the revered compiler of the Hadith and one of Islam's greatest scholars."),
    ],
    "Bukhara": [
        ("Po-i-Kalyan Complex", T.CULTURAL, 48, S.SPRING, "feat", ["history", "landmark", "art"], "kalyan minaret,bukhara",
         "The Kalyan Minaret has watched over Bukhara for 900 years — so magnificent that Genghis Khan himself ordered it to be spared."),
        ("Ark Fortress", T.CULTURAL, 40, S.AUTUMN, "feat", ["history", "landmark"], "ark fortress,bukhara",
         "A massive royal citadel that was a city within a city — the seat of Bukhara's emirs for well over a thousand years."),
        ("Lyab-i Hauz Ensemble", T.CITY, 16, S.SUMMER, "trend", ["city", "landmark", "food"], "lyab i hauz,bukhara",
         "A shaded stone pool ringed by ancient mulberry trees and madrasahs — the relaxed social heart of old Bukhara."),
        ("Chor Minor", T.CULTURAL, 18, S.SPRING, "trend", ["landmark", "photography", "art"], "chor minor,bukhara",
         "A charming little gatehouse crowned with four distinct turquoise-capped towers, unlike any other building in the city."),
        ("Samanid Mausoleum", T.CULTURAL, 26, S.AUTUMN, "pop", ["history", "art"], "samanid mausoleum,bukhara",
         "A 10th-century masterpiece of patterned brickwork — one of the oldest and finest monuments in all of Central Asia."),
        ("Bolo Hauz Mosque", T.CULTURAL, 20, S.SPRING, "pop", ["landmark", "art", "photography"], "bolo hauz,bukhara",
         "The emir's official mosque, famed for its slender carved wooden columns reflected in a quiet pool — the 'mosque of forty pillars'."),
        ("Sitorai Mokhi-Khosa Palace", T.CULTURAL, 30, S.SUMMER, "flash", ["history", "luxury", "art"], "sitorai mohi xosa,bukhara",
         "The 'Palace of Moon and Stars' — the last emir's summer residence, a curious blend of Russian and Bukharan design."),
        ("Trading Domes of Bukhara", T.CITY, 15, S.WINTER, "flash", ["shopping", "history", "city"], "bukhara trading domes",
         "Step through the centuries-old domed bazaars where Silk Road traders once dealt in jewellery, hats, carpets and currency."),
        ("Nadir Divan-Begi Madrasah", T.CULTURAL, 24, S.AUTUMN, "trend", ["art", "history", "landmark"], "nadir divanbegi,bukhara",
         "Famed for its forbidden mosaic of phoenix-like birds soaring toward a sun with a human face — a rare image in Islamic art."),
        ("Magoki-Attori Mosque", T.CULTURAL, 17, S.SPRING, "", ["history", "landmark"], "magoki attori,bukhara",
         "Bukhara's oldest surviving mosque, sunk well below today's street level and built over the site of a pre-Islamic temple."),
    ],
    "Khiva": [
        ("Itchan Kala Walled City", T.CULTURAL, 55, S.SPRING, "feat", ["history", "landmark", "art"], "itchan kala,khiva",
         "The walled inner town of Khiva — a perfectly preserved Silk Road city and a UNESCO World Heritage Site you can wander end to end."),
        ("Kalta Minor Minaret", T.CULTURAL, 30, S.SUMMER, "feat", ["landmark", "photography", "art"], "kalta minor,khiva",
         "The fat, glittering turquoise minaret that was meant to be the tallest in the Muslim world — but was left forever unfinished."),
        ("Kunya-Ark Fortress", T.CULTURAL, 28, S.AUTUMN, "trend", ["history", "landmark"], "kunya ark,khiva",
         "The khans' own fortress within the walls, with a watchtower that offers the classic rooftop panorama over all of Khiva."),
        ("Juma Mosque", T.CULTURAL, 24, S.WINTER, "trend", ["history", "art"], "juma mosque,khiva",
         "A vast, hushed hall whose roof rests on 218 intricately carved wooden columns — some of them over a thousand years old."),
        ("Tash Hauli Palace", T.CULTURAL, 32, S.SPRING, "pop", ["history", "art", "luxury"], "tash hauli,khiva",
         "The 'Stone House' — a labyrinth of harem courtyards covered floor to ceiling in dazzling blue-and-white majolica tilework."),
        ("Islam Khoja Minaret", T.CULTURAL, 22, S.SUMMER, "flash", ["landmark", "photography"], "islam khoja,khiva",
         "The tallest minaret in Khiva — climb its narrow, dark spiral stair for a breathtaking bird's-eye view of the old city."),
        ("Pakhlavan Mahmud Mausoleum", T.CULTURAL, 26, S.AUTUMN, "pop", ["history", "art", "landmark"], "pahlavan mahmud,khiva",
         "The serene turquoise-domed shrine of Pakhlavan Mahmud — Khiva's poet, champion wrestler and patron saint."),
        ("Muhammad Amin Khan Madrasah", T.CULTURAL, 19, S.SPRING, "", ["history", "landmark"], "muhammad amin madrasah,khiva",
         "The largest madrasah in Khiva, its grand striped facade now wrapping a heritage hotel right beside the Kalta Minor."),
    ],
    "Shahrisabz": [
        ("Ak-Saray Palace Ruins", T.CULTURAL, 36, S.SPRING, "feat", ["history", "landmark"], "ak saray,shahrisabz",
         "The soaring ruined gateway of Temur's 'White Palace' in his home town — once the single grandest building of his empire."),
        ("Dorut Tilovat Complex", T.CULTURAL, 20, S.AUTUMN, "flash", ["history", "art", "landmark"], "dorut tilovat,shahrisabz",
         "A peaceful ensemble of mosque and madrasah raised by Temur around the tomb of his revered spiritual teacher."),
        ("Kok Gumbaz Mosque", T.CULTURAL, 18, S.SUMMER, "pop", ["landmark", "art"], "kok gumbaz,shahrisabz",
         "The 'Blue Dome' Friday mosque of Shahrisabz, built by Ulugh Beg in honour of his father, Shahrukh."),
        ("Dorus Saodat Complex", T.CULTURAL, 22, S.SPRING, "trend", ["history", "landmark"], "dorus saodat,shahrisabz",
         "The 'Seat of Power' — Temur's intended family crypt, which still hides his own simple, never-used tomb chamber."),
        ("Amir Timur Park", T.CULTURAL, 12, S.WINTER, "", ["city", "landmark", "photography"], "shahrisabz park",
         "A green ceremonial park where the statue of Shahrisabz's most famous son gazes out toward the ruins of his white palace."),
    ],
    "Nukus": [
        ("Savitsky Art Museum", T.CULTURAL, 34, S.SPRING, "feat", ["art", "history"], "savitsky museum,nukus",
         "The 'Louvre of the Steppe' — a world-class hoard of banned Soviet avant-garde art quietly rescued by collector Igor Savitsky."),
        ("Mizdakhan Necropolis", T.CULTURAL, 24, S.AUTUMN, "trend", ["history", "photography"], "mizdakhan necropolis",
         "An ancient hillside city of the dead, where legend says a slowly crumbling wall is counting down the end of the world."),
        ("Chilpik Dakhma", T.CULTURAL, 20, S.SUMMER, "flash", ["history", "photography"], "chilpik,karakalpakstan",
         "A 2,000-year-old Zoroastrian 'Tower of Silence' — a great ring of mud-brick rising dramatically from the bare desert plain."),
        ("Karakalpakstan Lore Museum", T.CULTURAL, 16, S.WINTER, "pop", ["history", "art"], "nukus museum",
         "Discover the nature, turbulent history and nomadic culture of Karakalpakstan — and the tragic story of the vanished Aral Sea."),
    ],
    "Termez": [
        ("Fayaz Tepe Buddhist Site", T.CULTURAL, 26, S.SPRING, "trend", ["history", "photography"], "fayaz tepe,termez",
         "The excavated ruins of a 2,000-year-old Buddhist monastery — a striking reminder that this was once a great centre of Buddhism."),
        ("Al-Hakim at-Termezi Mausoleum", T.CULTURAL, 22, S.AUTUMN, "pop", ["history", "landmark", "art"], "at termezi mausoleum",
         "The tranquil riverside shrine of the revered Sufi scholar at-Termezi, set right on the bank of the mighty Amu Darya."),
        ("Sultan Saodat Complex", T.CULTURAL, 24, S.SPRING, "pop", ["history", "landmark"], "sultan saodat,termez",
         "A long avenue of dignified mausoleums of the Termez sayyids, spanning a full thousand years of architectural styles."),
        ("Kara Tepe Cave Temples", T.CULTURAL, 20, S.WINTER, "trend", ["history", "photography"], "kara tepe,termez",
         "A complex of Buddhist cave-temples and stupas carved into soft sandstone hills close to the Afghan border."),
        ("Termez Archaeological Museum", T.CULTURAL, 18, S.SUMMER, "", ["history", "art"], "termez museum",
         "One of Central Asia's richest regional museums, tracing ancient Bactria, Buddhism and the long story of the Silk Road."),
    ],
    "Kokand": [
        ("Khudayar Khan Palace", T.CULTURAL, 38, S.SPRING, "feat", ["history", "landmark", "art"], "khudayar khan palace,kokand",
         "The lavish 19th-century palace of the last khan of Kokand — its long facade a dazzling riot of coloured tile and carving."),
        ("Juma Mosque of Kokand", T.CULTURAL, 20, S.AUTUMN, "pop", ["landmark", "art", "history"], "juma mosque,kokand",
         "A grand Friday mosque with a long, beautifully carved column gallery and a slender minaret rising above the old town."),
        ("Modari Khan Mausoleum", T.CULTURAL, 16, S.SUMMER, "", ["history", "art"], "modari khan,kokand",
         "The elegant tile-fronted tomb built for the mother of the Kokand khan — a quiet gem of 19th-century craftsmanship."),
        ("Norbutabek Madrasah", T.CULTURAL, 17, S.SPRING, "trend", ["history", "landmark"], "norbutabek madrasah,kokand",
         "A still-working 18th-century madrasah, the oldest in Kokand, where students have studied for over two hundred years."),
        ("Dakhma-i-Shokhon", T.CULTURAL, 15, S.WINTER, "flash", ["history", "photography"], "dakhma shokhon,kokand",
         "The 'Tomb of Kings' — the atmospheric dynastic burial ground of the rulers of the Kokand Khanate."),
    ],
    "Nurata": [
        ("Chashma Spring Complex", T.CULTURAL, 22, S.SPRING, "pop", ["history", "landmark", "wellness"], "nurata chashma",
         "A sacred spring said to have flowed since the time of the Prophet, alive with shoals of holy fish and a steady stream of pilgrims."),
        ("Nurata Fortress", T.ADVENTURE, 18, S.AUTUMN, "", ["history", "mountain", "photography"], "nurata fortress",
         "The eroded ramparts of a hilltop fortress traditionally said to have been founded by Alexander the Great himself."),
        ("Aydarkul Lake", T.NATURE, 95, S.SUMMER, "trend", ["nature", "water", "photography"], "aydarkul lake,uzbekistan",
         "A vast, unexpected turquoise lake on the very edge of the Kyzylkum Desert — perfect for a swim, a boat ride and a campfire."),
        ("Kyzylkum Yurt Camp Stay", T.NATURE, 140, S.AUTUMN, "feat", ["nature", "mountain"], "yurt camp,kyzylkum desert",
         "Sleep beneath a sky thick with desert stars in a traditional felt yurt, with camel rides, folk music and a fireside dinner."),
    ],
    "Moynaq": [
        ("Aral Sea Ship Graveyard", T.ADVENTURE, 120, S.AUTUMN, "feat", ["history", "photography", "nature"], "aral sea ships,moynaq",
         "Rusting fishing ships stranded on the cracked, dry seabed — the haunting global symbol of the Aral Sea's disappearance."),
        ("Aral Sea Memorial", T.CULTURAL, 60, S.SPRING, "", ["history", "landmark"], "moynaq memorial,aral",
         "A clifftop memorial marking where the shoreline once lapped — today it overlooks nothing but desert to the horizon."),
        ("Stihia Festival Grounds", T.CITY, 80, S.SUMMER, "trend", ["city", "art", "photography"], "moynaq desert festival",
         "The open desert stage of Stihia — the electronic music and science festival that draws the world to the bed of a dead sea."),
    ],
}


def _norm(s):
    return " ".join(s.lower().split())


class Command(BaseCommand):
    help = "O'zbekiston turistik shaharlari va real destinationlarini bazaga qo'shadi."

    def add_arguments(self, parser):
        parser.add_argument("--no-images", action="store_true",
                            help="Rasmsiz — faqat ma'lumot (tez)")

    # ------------------------------------------------------------------
    def handle(self, *args, **opts):
        do_images = not opts["no_images"]

        country = Country.objects.filter(name__iexact="Uzbekistan").first()
        if country is None:
            self.stdout.write(self.style.ERROR("Uzbekistan davlati bazada yo'q — to'xtatildi."))
            return

        tag_by = {_norm(t.name): t for t in Tag.objects.all()}
        act_by = {_norm(a.name): a for a in Activity.objects.all()}

        total_dests = sum(len(v) for v in UZ_DESTINATIONS.values())
        self.stdout.write(self.style.MIGRATE_HEADING(
            f"\nO'zbekiston:  {len(UZ_CITIES)} shahar  ·  {total_dests} destination"
            f"  ·  rasm: {'HA' if do_images else 'YO‘Q'}\n"))

        cities_made = 0
        created_total = 0
        skipped_total = 0
        images_total = 0

        for city_name, (has_air, city_kw) in UZ_CITIES.items():
            # --- shahar ---
            city = City.objects.filter(name__iexact=city_name, country=country).first()
            if city is None:
                city = City(name=city_name, country=country)
                city.save()
                cities_made += 1
                city_state = "YANGI shahar"
            else:
                city_state = "mavjud shahar"

            # shahar rasmi (bo'lmasa)
            if do_images and not city.image:
                data = self._fetch(city_kw, city.slug or slugify(city_name))
                if data:
                    try:
                        city.image = ContentFile(data, name=f"{slugify(city_name)}-city.jpg")
                        city.save()
                    except Exception:  # noqa: BLE001
                        pass

            made = 0
            for row in UZ_DESTINATIONS[city_name]:
                name, trip, price, season, flag, tags, kw, blurb = row
                full_name = f"{name}, {city_name}"
                slug = slugify(full_name)

                dest = Destination.objects.filter(slug=slug).first()
                if dest is None:
                    try:
                        dest = self._create(city, country, has_air, full_name, name,
                                             trip, price, season, flag, tags, blurb,
                                             tag_by, act_by)
                        created_total += 1
                        made += 1
                    except Exception as exc:  # noqa: BLE001
                        self.stdout.write(self.style.ERROR(f"   ✗ {full_name}: {exc}"))
                        continue
                else:
                    skipped_total += 1

                if do_images and not dest.images.exists():
                    if self._attach_image(dest, kw):
                        images_total += 1
                    time.sleep(0.2)

            # things_to_do ni yangilash
            city.things_to_do = city.destinations.count()
            city.save(update_fields=["things_to_do"])

            self.stdout.write(
                f"  {city_name:<12} ({city_state})  yangi: +{made}  jami: {city.destinations.count()}")

        self.stdout.write(self.style.SUCCESS(
            f"\n✓ Tugadi.  Yangi shahar: {cities_made}   Yangi destination: {created_total}   "
            f"O'tkazib yuborilgan: {skipped_total}   Rasm: {images_total}"))

    # ------------------------------------------------------------------
    @transaction.atomic
    def _create(self, city, country, has_air, full_name, short_name, trip, price,
                season, flag, tags, blurb, tag_by, act_by):
        is_flash = flag == "flash"
        is_feat = flag == "feat"
        discount = 0
        flash_end = None
        if is_flash:
            discount = random.randint(20, 40)
            flash_end = timezone.now() + timedelta(
                days=random.randint(3, 14), hours=random.randint(1, 23))

        dur = D.SHORT if any(w in full_name for w in ("Lake", "Yurt", "Ship", "Camp")) else D.WEEKEND

        # activity — nomdan/turdan kelib chiqib
        if "Bazaar" in full_name:
            act_keys = ["shopping", "photography"]
        elif trip == T.NATURE:
            act_keys = ["camping", "photography"]
        elif trip == T.ADVENTURE:
            act_keys = ["hiking & trekking", "photography"]
        else:
            act_keys = ["photography"]

        short, desc, why, included, restrict, extra = _descriptions(
            city.name, short_name, blurb)

        dest = Destination(
            city=city,
            country=country,
            name=full_name,
            short_description=short,
            description=desc,
            location=f"{city.name}, Uzbekistan",
            price=price,
            price_label="person",
            discount_percentage=discount,
            hotels_count=random.randint(12, 140),
            restaurants_count=random.randint(20, 220),
            has_flights=has_air,
            is_flash_sale=is_flash,
            flash_sale_end=flash_end,
            trip_type=trip,
            duration=dur,
            season=season,
            visible_reviews_count=random.randint(60, 2600),
            is_free_cancellation=True,
            free_cancellation_hours=random.choice([24, 24, 48]),
            is_popular=flag == "pop",
            is_trending=flag == "trend",
            is_featured=is_feat,
            featured_badge=f"★ Top Sight in {city.name}" if is_feat else "",
            why_visit=why,
            whats_included=included,
            restrictions=restrict,
            additional_info=extra,
        )
        dest.save()

        t_objs = [tag_by[t] for t in tags if t in tag_by]
        a_objs = [act_by[a] for a in act_keys if a in act_by]
        if t_objs:
            dest.tags.set(t_objs)
        if a_objs:
            dest.activities.set(a_objs)
        return dest

    # ------------------------------------------------------------------
    def _attach_image(self, dest, kw):
        data = self._fetch(kw, dest.slug)
        if not data:
            return False
        try:
            img = DestinationImage(destination=dest, order=0)
            img.image = ContentFile(data, name=f"{dest.slug}.jpg")
            img.save()
            return True
        except Exception as exc:  # noqa: BLE001
            self.stdout.write(self.style.WARNING(f"   ! rasm: {dest.slug}: {exc}"))
            return False

    @staticmethod
    def _fetch(kw, seed):
        """LoremFlickr (kalit so'z) -> fallback Picsum. Bytes yoki None."""
        urls = [
            f"https://loremflickr.com/800/600/{kw}",
            f"https://loremflickr.com/800/600/uzbekistan,architecture",
            f"https://picsum.photos/seed/{seed}/800/600",
        ]
        headers = {"User-Agent": "Mozilla/5.0 (TravelHub seeder)"}
        for url in urls:
            try:
                resp = requests.get(url, timeout=15, headers=headers)
                if resp.status_code == 200 and len(resp.content) > 2000:
                    Image.open(io.BytesIO(resp.content)).verify()
                    return resp.content
            except Exception:  # noqa: BLE001
                time.sleep(0.5)
        return None


# ----------------------------------------------------------------------
def _descriptions(city, name, blurb):
    """Real blurb asosida CKEditor HTML matnlari."""
    short = blurb
    description = (
        f'<p>{blurb}</p>'
        f'<p>This guided experience gives you the full story of <strong>{name}</strong> '
        f'in {city}, Uzbekistan — its history, its legends and the small details most '
        f'visitors walk straight past. Travel at a relaxed pace with a knowledgeable '
        f'local guide and plenty of time for photographs.</p>'
    )
    why = (
        '<ul>'
        f'<li>One of the genuine highlights of {city}</li>'
        '<li>Expert local guide & rich Silk Road history</li>'
        '<li>Skip-the-line entrance where available</li>'
        '<li>Flexible, mobile-friendly tickets</li>'
        '</ul>'
    )
    included = (
        '<ul>'
        '<li>Professional English-speaking guide</li>'
        '<li>Entrance fees to the site</li>'
        '<li>Hotel pickup in the city centre</li>'
        '<li>Bottled water</li>'
        '</ul>'
    )
    restrictions = (
        '<ul>'
        '<li>Modest dress required at religious sites</li>'
        '<li>Some areas involve stairs and uneven ground</li>'
        '<li>Minimum age 5 years</li>'
        '</ul>'
    )
    additional = (
        '<p>Confirmation is received at the time of booking. Comfortable walking shoes '
        'and sun protection are recommended — Uzbekistan is best visited in spring and '
        'autumn. Free cancellation is available up to 24 hours before the start time.</p>'
    )
    return short, description, why, included, restrictions, additional