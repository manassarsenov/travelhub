"""
apps/recommendations/engine.py
==============================
TravelHub tavsiya tizimi — 1-bosqich (DB asosida, AIsiz).

RecommendationEngine foydalanuvchining wishlist / sharh / booking tarixidan
"ta'm profili" quradi va har bir destination'ni 4 ta signal bo'yicha baholaydi:

    final = w_content·content + w_collab·collab + w_pop·popularity + w_ctx·context

  • content      — foydalanuvchi ta'miga (trip_type, teg, faoliyat, davlat) o'xshashlik
  • collab       — "shu joylarni saqlaganlar yana nimani saqlagan" (co-occurrence)
  • popularity   — Bayes o'rtacha reyting + trending (cold-start zaxirasi)
  • context      — joriy mavsum, byudjetga moslik, flash sale

Tarixi yo'q (yoki anonim) foydalanuvchi → vaznlar popularity tomon suriladi.
Gemini matnlari (portret, pitch) 2-bosqichda shu yerga ulanadi.
"""
import math
import re
from collections import Counter, defaultdict

from django.db.models import Avg, Count, Q
from django.utils import timezone

from apps.models.destinations import Destination
from apps.models.orders import Booking
from apps.models.reviews import Review
from apps.models.wishlist import Wishlist

# Interaksiya turi -> seed vazni (booking eng kuchli signal)
SEED_WEIGHTS = {'booking': 3.0, 'feedback_up': 2.6, 'review_high': 2.2,
                'wishlist': 1.6, 'review_low': 0.3}
QUIZ_STYLE_WEIGHT = 1.4          # quiz'da tanlangan har bir uslub vazni
QUIZ_BUDGET_PRICE = {'budget': 12, 'mid': 45, 'luxury': 110}   # quiz byudjeti -> taxminiy narx
DOWN_PENALTY = 0.06              # 👎 qilingan trip_type uchun ball jazosi
RECENCY_TAU = 90.0          # recency decay: exp(-kunlar / 90)

# Gemini ishlamay qolganda (rate-limit/xato) ishlatiladigan mahalliy zaxira parser uchun
CITY_ALIASES = {
    'Bukhara': ['buxoro', 'buxara', 'buxaro', 'бухара'],
    'Samarkand': ['samarqand', 'самарканд'],
    'Tashkent': ['toshkent', 'ташкент'],
    'Khiva': ['xiva', 'хива'],
    'Shahrisabz': ['shahrisabz', 'шахрисабз'],
    'Nukus': ['nukus', 'нукус'],
    'Termez': ['termiz', 'термез'],
    'Kokand': ['qoqon', "qo'qon", 'kokon', 'коканд'],
    'Nurata': ['nurota', 'нурата'],
    'Moynaq': ['muynak', 'moynoq', 'мойнак'],
}
COUNTRY_ALIASES = {
    'Uzbekistan': ["o'zbekiston", 'ozbekiston', 'uzbekiston', 'uzbekistan', 'узбекистан'],
}
TRIP_TYPE_WORDS = {
    'beach': ['beach', 'plyaj', 'sohil', 'пляж'],
    'cultural': ['cultur', 'madaniy', 'tarix', 'культур', 'истори'],
    'adventure': ['adventur', 'sarguzasht', 'hiking', 'mountain', 'tog', 'приключ'],
    'romantic': ['romantic', 'romantik', 'романт'],
    'nature': ['nature', 'tabiat', 'природ'],
    'family': ['family', 'oila', 'семь'],
}
SEASON_WORDS = {
    'spring': ['spring', 'bahor', 'весн'],
    'summer': ['summer', 'yoz', 'лет'],
    'autumn': ['autumn', 'fall', 'kuz', 'осен'],
    'winter': ['winter', 'qish', 'зим'],
}


def _extract_price(text):
    """Matndan narx chegarasini ajratadi -> (max_price, min_price).

    Faqat narx belgisiga ($ / dollar / gacha / under / до) yopishgan sonlarni
    oladi — shu sababli yil ("2026") yoki odam soni ("2 kishi") narx deb
    qabul qilinmaydi.
    """
    adjacent = [int(m.group(1) or m.group(2)) for m in re.finditer(
        r'\$\s*(\d{2,6})|(\d{2,6})\s*(?:\$|dollar|usd|у\.?е)', text)]
    bounded = [int(m.group(1) or m.group(2)) for m in re.finditer(
        r'(\d{2,6})\s*gacha|(?:under|less than|до)\s*\$?\s*(\d{2,6})', text)]
    nums = adjacent + bounded
    if not nums:
        return None, None
    price = max(nums)
    if re.search(r'more than|over |dan ortiq|dan yuqori|от |minimum', text):
        return None, price          # quyi chegara
    return price, None              # yuqori chegara (byudjet shifti — odatiy)
BAYES_PRIOR_C = 8           # Bayes o'rtacha uchun "ishonch" og'irligi
BAYES_PRIOR_M = 3.6         # global o'rtacha reyting taxmini

TRIP_TYPE_LABELS = dict(Destination.TripType.choices)
TRIP_TYPE_ICONS = {
    'adventure': 'fa-mountain-sun', 'beach': 'fa-umbrella-beach',
    'cultural': 'fa-landmark', 'nature': 'fa-tree',
    'city': 'fa-city', 'romantic': 'fa-heart', 'family': 'fa-people-roof',
}
SEASON_LABELS = {'spring': 'Spring', 'summer': 'Summer',
                 'autumn': 'Autumn', 'winter': 'Winter'}


def current_season(today=None):
    """Oy bo'yicha joriy mavsum (shimoliy yarimshar)."""
    m = (today or timezone.now()).month
    if m in (3, 4, 5):
        return 'spring'
    if m in (6, 7, 8):
        return 'summer'
    if m in (9, 10, 11):
        return 'autumn'
    return 'winter'


def _budget_band(price):
    """Narxni byudjet uslubiga aylantiradi."""
    if price <= 0:
        return 'free'
    if price < 25:
        return 'budget'
    if price < 80:
        return 'mid'
    return 'luxury'


BUDGET_LABELS = {'free': 'Free spots', 'budget': 'Budget',
                 'mid': 'Mid-range', 'luxury': 'Luxury'}


class RecommendationEngine:
    """Bitta foydalanuvchi uchun bitta sahifa yuklanishida ishlatiladi."""

    def __init__(self, user=None, today=None):
        self.user = user if (user and user.is_authenticated) else None
        self.today = today or timezone.now()
        self.season = current_season(self.today)

        # --- nomzodlar: barcha destinationlar, reyting/sharh annotatsiyasi bilan ---
        self.candidates = list(
            Destination.objects
            .select_related('city', 'country')
            .prefetch_related('tags', 'activities', 'images')
            .annotate(
                db_avg_rating=Avg('reviews__rating', filter=Q(reviews__is_visible=True)),
                rev_count=Count('reviews', filter=Q(reviews__is_visible=True)),
            )
        )
        self._by_id = {d.id: d for d in self.candidates}

        # --- foydalanuvchi tarixi va ta'm profili ---
        self.seeds = {}             # destination_id -> og'irlik (recency bilan)
        self.seed_objects = []      # eng so'nggi seed destinationlar (sabab uchun)
        self.profile = {
            'trip_type': defaultdict(float),
            'tags': defaultdict(float),
            'activities': defaultdict(float),
            'country': defaultdict(float),
            'price_w': 0.0, 'price_sum': 0.0,
        }
        self._collab = Counter()
        self._ranked_cache = None
        self.excluded = set()            # 👎/dismiss qilingan — tavsiya etilmaydi
        self._down_types = Counter()     # 👎 qilingan trip_type'lar — jazo uchun
        self.has_quiz = False
        if self.user:
            self._collect_history()      # wishlist + sharh + booking → seeds
            self._collect_feedback()     # 👍 → seed, 👎/dismiss → excluded
            self._build_profile()        # seeds → ta'm profili
            self._build_quiz()           # quiz javoblari → ta'm profiliga qo'shiladi
            self._build_collab()

    # ------------------------------------------------------------------ #
    #  TARIX VA PROFIL
    # ------------------------------------------------------------------ #
    def _decay(self, when):
        """Recency decay — yaqinda bo'lgan interaksiya muhimroq."""
        if not when:
            return 0.5
        days = max(0.0, (self.today - when).total_seconds() / 86400.0)
        return math.exp(-days / RECENCY_TAU)

    def _add_seed(self, dest_id, base_weight, when):
        w = base_weight * self._decay(when)
        self.seeds[dest_id] = self.seeds.get(dest_id, 0.0) + w

    def _collect_history(self):
        """Wishlist + sharh + booking'dan seed yig'adi."""
        for wl in Wishlist.objects.filter(user=self.user).only('destination_id', 'created_at'):
            self._add_seed(wl.destination_id, SEED_WEIGHTS['wishlist'], wl.created_at)

        for rv in Review.objects.filter(user=self.user).only('destination_id', 'rating', 'created_at'):
            key = 'review_high' if rv.rating >= 4 else 'review_low'
            self._add_seed(rv.destination_id, SEED_WEIGHTS[key], rv.created_at)

        for bk in Booking.objects.filter(user=self.user).only('destination_id', 'created_at'):
            self._add_seed(bk.destination_id, SEED_WEIGHTS['booking'], bk.created_at)

    def _collect_feedback(self):
        """👍 → kuchli ijobiy seed;  👎/dismiss → tavsiyadan chiqariladi."""
        from apps.models.recommendations import RecommendationFeedback
        for fb in (RecommendationFeedback.objects
                   .filter(user=self.user)
                   .only('destination_id', 'action', 'created_at')):
            if fb.action == RecommendationFeedback.Action.UP:
                self._add_seed(fb.destination_id, SEED_WEIGHTS['feedback_up'], fb.created_at)
            else:                                       # down yoki dismiss
                self.excluded.add(fb.destination_id)
                if fb.action == RecommendationFeedback.Action.DOWN:
                    dest = self._by_id.get(fb.destination_id)
                    if dest and dest.trip_type:
                        self._down_types[dest.trip_type] += 1

    def _build_profile(self):
        """Yig'ilgan seed og'irliklarini ta'm profiliga tarqatadi."""
        for dest_id, weight in self.seeds.items():
            dest = self._by_id.get(dest_id)
            if not dest:
                continue
            if dest.trip_type:
                self.profile['trip_type'][dest.trip_type] += weight
            for tag in dest.tags.all():
                self.profile['tags'][tag.id] += weight
            for act in dest.activities.all():
                self.profile['activities'][act.id] += weight
            if dest.country_id:
                self.profile['country'][dest.country_id] += weight
            self.profile['price_sum'] += dest.price * weight
            self.profile['price_w'] += weight

        # eng so'nggi (og'irligi katta) seedlar — "Because you saved" uchun
        self.seed_objects = [
            self._by_id[d] for d, _ in
            sorted(self.seeds.items(), key=lambda kv: -kv[1]) if d in self._by_id
        ]

    def _build_quiz(self):
        """Quiz javoblari → ta'm profili (ayniqsa cold-start uchun)."""
        from apps.models.recommendations import RecommendationProfile
        prof = RecommendationProfile.objects.filter(user=self.user).first()
        if not prof:
            return
        styles = prof.styles_list()
        if not styles and not prof.quiz_budget:
            return
        self.has_quiz = True
        for style in styles:                            # har uslub barqaror og'irlik
            self.profile['trip_type'][style] += QUIZ_STYLE_WEIGHT
        # quiz byudjeti → taxminiy narx (seed narxi bo'lmasa ishlatiladi)
        price_hint = QUIZ_BUDGET_PRICE.get(prof.quiz_budget)
        if price_hint and self.profile['price_w'] <= 0:
            self.profile['price_sum'] = price_hint
            self.profile['price_w'] = 1.0

    def _build_collab(self):
        """Collaborative: shu seedlarni saqlagan boshqa userlar yana nimani saqlagan."""
        if not self.seeds:
            return
        seed_ids = list(self.seeds.keys())
        peer_ids = set(
            Wishlist.objects
            .filter(destination_id__in=seed_ids)
            .exclude(user=self.user)
            .values_list('user_id', flat=True)
        )
        peer_ids |= set(
            Review.objects
            .filter(destination_id__in=seed_ids, rating__gte=4)
            .exclude(user=self.user)
            .values_list('user_id', flat=True)
        )
        if not peer_ids:
            return
        peer_dest = Wishlist.objects.filter(user_id__in=peer_ids).values_list('destination_id', flat=True)
        self._collab = Counter(peer_dest)
        for sid in seed_ids:                     # o'zi saqlagan joylar hisobga olinmaydi
            self._collab.pop(sid, None)

    @property
    def has_history(self):
        return bool(self.seeds) or self.has_quiz

    @property
    def _profile_mass(self):
        return (sum(self.profile['trip_type'].values())
                + sum(self.profile['tags'].values())
                + sum(self.profile['country'].values()))

    @property
    def avg_price(self):
        if self.profile['price_w'] <= 0:
            return None
        return self.profile['price_sum'] / self.profile['price_w']

    # ------------------------------------------------------------------ #
    #  BAHOLASH (SCORERLAR)
    # ------------------------------------------------------------------ #
    def _content_score(self, dest):
        """Nomzod ta'm profiliga qanchalik mos — 0..1."""
        mass = self._profile_mass
        if mass <= 0:
            return 0.0
        hit = 0.0
        if dest.trip_type:
            hit += self.profile['trip_type'].get(dest.trip_type, 0.0)
        for tag in dest.tags.all():
            hit += self.profile['tags'].get(tag.id, 0.0)
        if dest.country_id:
            hit += self.profile['country'].get(dest.country_id, 0.0)
        return min(1.0, hit / mass)

    def _collab_score(self, dest):
        """Co-occurrence bo'yicha — 0..1."""
        if not self._collab:
            return 0.0
        top = self._collab.most_common(1)[0][1]
        return min(1.0, self._collab.get(dest.id, 0) / top) if top else 0.0

    @staticmethod
    def _popularity_score(dest):
        """Bayes o'rtacha reyting + trending/popular — 0..1."""
        avg = dest.db_avg_rating or 0.0
        n = dest.rev_count or 0
        bayes = (BAYES_PRIOR_C * BAYES_PRIOR_M + n * avg) / (BAYES_PRIOR_C + n)
        score = bayes / 5.0
        if dest.is_trending:
            score += 0.08
        if dest.is_popular:
            score += 0.05
        return min(1.0, score)

    def _context_score(self, dest):
        """Mavsum + byudjet + flash sale — 0..1."""
        score = 0.4
        if (dest.season or '').lower() == self.season:
            score += 0.35
        avg = self.avg_price
        if avg is not None and dest.price > 0:
            ratio = dest.price / max(avg, 1.0)
            if 0.6 <= ratio <= 1.4:          # byudjetga yaqin
                score += 0.2
        if dest.is_flash_sale_active:
            score += 0.15
        return min(1.0, score)

    def _weights(self):
        """Vaznlar moslashuvchan: tarix qancha boy bo'lsa, content+collab shuncha kuchli."""
        n = len(self.seeds)
        if n == 0 and not self.has_quiz:
            return dict(content=0.0, collab=0.0, popularity=0.7, context=0.3)
        if n < 3:                                    # kam tarix yoki faqat quiz
            return dict(content=0.32, collab=0.10, popularity=0.38, context=0.20)
        return dict(content=0.42, collab=0.25, popularity=0.18, context=0.15)

    def _score(self, dest):
        """Bitta destination uchun to'liq ball + tarkibiy qismlar."""
        w = self._weights()
        parts = {
            'content': self._content_score(dest),
            'collab': self._collab_score(dest),
            'popularity': self._popularity_score(dest),
            'context': self._context_score(dest),
        }
        final = sum(w[k] * parts[k] for k in w)
        # 👎 qilingan trip_type'larga jazo — "show fewer like this"
        if dest.trip_type and self._down_types:
            final -= DOWN_PENALTY * self._down_types.get(dest.trip_type, 0)
        return max(0.0, final), parts

    # ------------------------------------------------------------------ #
    #  TAVSIYA NATIJALARI
    # ------------------------------------------------------------------ #
    def _card(self, dest, final, parts):
        """Destination + hisoblangan maydonlarni shablon uchun dict qiladi."""
        match = self._to_match_pct(final)
        return {
            'd': dest,
            'match': match,
            'taste_pct': self._sub_pct(parts['content']),
            'similar_pct': self._sub_pct(parts['collab'] or parts['popularity']),
            'trending_pct': self._sub_pct(parts['popularity']),
            'reasons': self._reasons(dest, parts),
            'ai_pitch': self._pitch(dest, parts),     # 2-bosqichda Gemini
            'flag': self._flag(dest),
        }

    @staticmethod
    def _short_name(name):
        """Uzun destination nomidan qisqa ko'rinish (sabab chiplari uchun)."""
        for sep in (',', ' - ', ' — ', ':'):
            if sep in name:
                name = name.split(sep)[0].strip()
                break
        return name if len(name) <= 26 else name[:24].rstrip() + '…'

    @staticmethod
    def _to_match_pct(final):
        """0..1 ballni chiroyli 62..99% oralig'iga joylaydi."""
        return max(62, min(99, round(62 + final * 37)))

    @staticmethod
    def _sub_pct(x):
        return max(55, min(99, round(55 + x * 44)))

    def _flag(self, dest):
        if dest.is_flash_sale_active:
            return {'cls': 'rec-card__flag--sale', 'icon': 'fa-bolt', 'text': 'Flash Sale'}
        if dest.is_trending:
            return {'cls': '', 'icon': 'fa-arrow-trend-up', 'text': 'Trending'}
        avg = self.avg_price
        if avg is not None and 0 < dest.price <= avg:
            return {'cls': 'rec-card__flag--gem', 'icon': 'fa-gem', 'text': 'Within budget'}
        return None

    def _reasons(self, dest, parts):
        """Explainability — har karta uchun sabab chiplari."""
        reasons = []
        # 1) content — eng o'xshash seed
        if parts['content'] > 0.05 and self.seed_objects:
            same = next((s for s in self.seed_objects
                         if s.trip_type and s.trip_type == dest.trip_type and s.id != dest.id), None)
            if same:
                reasons.append({'icon': 'fa-bookmark',
                                'text': f'Because you saved {self._short_name(same.name)}'})
        # 2) trip_type uslubi
        if dest.trip_type and self.profile['trip_type'].get(dest.trip_type, 0) > 0:
            reasons.append({'icon': TRIP_TYPE_ICONS.get(dest.trip_type, 'fa-compass'),
                            'text': f'Matches your {TRIP_TYPE_LABELS.get(dest.trip_type, "travel")} style'})
        # 3) collaborative
        if parts['collab'] > 0.25:
            reasons.append({'icon': 'fa-user-group', 'text': 'Loved by travelers like you'})
        # 4) byudjet
        avg = self.avg_price
        if avg is not None and 0 < dest.price <= avg:
            reasons.append({'icon': 'fa-wallet', 'text': 'Fits your budget'})
        # 5) mavsum
        if (dest.season or '').lower() == self.season:
            reasons.append({'icon': 'fa-seedling',
                            'text': f'Great for {SEASON_LABELS[self.season]}'})
        # cold-start zaxira
        if not reasons:
            if dest.is_trending:
                reasons.append({'icon': 'fa-arrow-trend-up', 'text': 'Trending right now'})
            reasons.append({'icon': 'fa-star', 'text': 'Highly rated by travelers'})
        return reasons[:2]

    def _pitch(self, dest, parts):
        """Shablonli pitch (o'zbekcha) — Gemini ishlamasa shu ishlatiladi."""
        tt = TRIP_TYPE_LABELS.get(dest.trip_type, 'sayohat')
        place = dest.city.name if dest.city_id else (
            dest.country.name if dest.country_id else 'bu yer')
        if parts['content'] > 0.25:
            return f"{place}dagi bu {tt} sayohati siz yoqtirgan joylarga juda mos keladi."
        if parts['collab'] > 0.3:
            return f"Sizga o'xshash sayohatchilar {place}dagi bu sayohatni eng zo'rlari qatoriga qo'shgan."
        return f"{place}dagi yuqori baholangan bu joy — ayni mavsumga ajoyib tanlov."

    # --- ommaviy metodlar (view shularni chaqiradi) ----------------------

    def _ranked(self, exclude_ids=None):
        """Barcha nomzodlarni baholab, (final, parts, dest) ro'yxatini qaytaradi."""
        if exclude_ids is None and self._ranked_cache is not None:
            return self._ranked_cache
        exclude = set(exclude_ids or [])
        exclude |= set(self.seeds.keys())          # allaqachon aloqada bo'lganlar chiqmaydi
        exclude |= self.excluded                   # 👎/dismiss qilinganlar chiqmaydi
        scored = []
        for dest in self.candidates:
            if dest.id in exclude:
                continue
            final, parts = self._score(dest)
            scored.append((final, parts, dest))
        scored.sort(key=lambda t: -t[0])
        if exclude_ids is None:
            self._ranked_cache = scored
        return scored

    def top_picks(self, n=6):
        """Asosiy personallashtirilgan grid (MMR diversity bilan)."""
        ranked = self._ranked()
        picked, used_types = [], Counter()
        # diversity: bitta trip_type 3 martadan oshmasin
        for final, parts, dest in ranked:
            if len(picked) >= n:
                break
            tt = dest.trip_type or 'x'
            if used_types[tt] >= 3 and len(ranked) > n:
                continue
            used_types[tt] += 1
            picked.append(self._card(dest, final, parts))
        # yetmasa — qolganidan to'ldiramiz
        if len(picked) < n:
            seen = {c['d'].id for c in picked}
            for final, parts, dest in ranked:
                if len(picked) >= n:
                    break
                if dest.id not in seen:
                    picked.append(self._card(dest, final, parts))
        return picked

    def fallback_parse(self, text):
        """Gemini ishlamaganda — so'rovdan oddiy mahalliy filtr ajratadi.

        Shahar/davlat nomi va trip_type so'zlarini matndan qidiradi.
        """
        t = (text or '').lower()
        filters = {}

        # shahar — avval DB nomlari, keyin o'zbek/rus alias'lari
        for dest in self.candidates:
            if dest.city_id and dest.city.name.lower() in t:
                filters['city'] = dest.city.name
                break
        if 'city' not in filters:
            for canon, aliases in CITY_ALIASES.items():
                if any(a in t for a in aliases):
                    filters['city'] = canon
                    break

        # davlat
        for dest in self.candidates:
            if dest.country_id and dest.country.name.lower() in t:
                filters['country'] = dest.country.name
                break
        if 'country' not in filters:
            for canon, aliases in COUNTRY_ALIASES.items():
                if any(a in t for a in aliases):
                    filters['country'] = canon
                    break

        # trip_type
        for key, words in TRIP_TYPE_WORDS.items():
            if any(w in t for w in words):
                filters['trip_type'] = key
                break

        # mavsum
        for key, words in SEASON_WORDS.items():
            if any(w in t for w in words):
                filters['season'] = key
                break

        # narx (max / min)
        max_p, min_p = _extract_price(t)
        if max_p is not None:
            filters['max_price'] = max_p
        if min_p is not None:
            filters['min_price'] = min_p

        return filters

    def search(self, filters, n=6):
        """Structured filter bo'yicha qidiruv (AI tabiiy qidiruv uchun).

        filters — {'trip_type','city','country','season','max_price','min_price','keywords'}.
        Aniq filtr (shahar, davlat, uslub, mavsum, narx) berilsa — natija AYNAN
        shunga mos joylardan iborat bo'ladi. Hech narsa topilmasagina eng yaxshi
        umumiy nomzodlar bilan to'ldiriladi.
        """
        filters = filters or {}
        tt = filters.get('trip_type')
        season = filters.get('season')
        max_p = filters.get('max_price')
        min_p = filters.get('min_price')
        city = (filters.get('city') or '').strip().lower()
        country = (filters.get('country') or '').strip().lower()
        keywords = [str(k).lower() for k in (filters.get('keywords') or [])]

        def ok(d):
            if tt and d.trip_type != tt:
                return False
            if season and (d.season or '').lower() != season:
                return False
            if max_p is not None and d.price > max_p:
                return False
            if min_p is not None and d.price < min_p:
                return False
            if city:
                dc = d.city.name.lower() if d.city_id else ''
                if not dc or (city != dc and city not in dc and dc not in city):
                    return False
            if country:
                cc = d.country.name.lower() if d.country_id else ''
                if not cc or (country != cc and country not in cc and cc not in country):
                    return False
            return True

        matched = []
        for dest in self.candidates:
            if dest.id in self.excluded:             # 👎/dismiss qilingan
                continue
            if not ok(dest):
                continue
            final, parts = self._score(dest)
            if keywords:
                hay = (dest.name + ' ' + (dest.location or '') + ' '
                       + (dest.city.name if dest.city_id else '')).lower()
                final += 0.05 * sum(1 for k in keywords if k in hay)
            matched.append((final, parts, dest))
        matched.sort(key=lambda t: -t[0])
        cards = [self._card(d, f, p) for f, p, d in matched[:n]]

        # filtrlarga HECH NARSA mos kelmasagina — umumiy eng yaxshilar bilan to'ldiramiz
        if not matched:
            for final, parts, dest in self._ranked():
                if len(cards) >= n:
                    break
                cards.append(self._card(dest, final, parts))
        return cards

    def because_you_saved(self, exclude_ids=None):
        """Eng so'nggi seed bo'yicha content-based karusel."""
        if not self.seed_objects:
            return None
        block = self.excluded | set(exclude_ids or ())   # dismiss + boshqa bo'limda ko'rsatilganlar
        seed = self.seed_objects[0]
        items = []
        for final, parts, dest in self._ranked():
            if dest.id in block:
                continue
            if dest.trip_type == seed.trip_type or parts['content'] > 0.2:
                items.append(self._card(dest, final, parts))
            if len(items) >= 8:
                break
        return {'seed': seed, 'items': items} if items else None

    def travelers_also_loved(self, n=8, exclude_ids=None):
        """Collaborative qator — FAQAT haqiqiy co-occurrence signali bo'lganda.

        Collaborative ma'lumot yo'q bo'lsa (yangi foydalanuvchi yoki o'xshash
        sayohatchilar topilmasa) bo'sh ro'yxat qaytaradi — shunda shablon bu
        bo'limni ko'rsatmaydi. Avval "mashhur joylar" zaxirasi bor edi, lekin u
        "Travelers like you also loved" sarlavhasi ostida chalg'ituvchi edi.
        """
        if not self._collab:
            return []
        block = self.excluded | set(exclude_ids or ())
        out = []
        for dest_id, _cnt in self._collab.most_common(n * 3):
            dest = self._by_id.get(dest_id)
            if not dest or dest.id in block:
                continue
            final, parts = self._score(dest)
            out.append(self._card(dest, final, parts))
            if len(out) >= n:
                break
        return out

    def perfect_for_season(self, n=8, exclude_ids=None):
        """Joriy mavsumga mos joylar."""
        block = self.excluded | set(exclude_ids or ())
        seasonal = [d for d in self.candidates
                    if (d.season or '').lower() == self.season and d.id not in block]
        seasonal.sort(key=lambda d: -self._score(d)[0])
        if len(seasonal) < n:                       # mavsum kam bo'lsa — kontekst bali yuqorilar
            seen = {d.id for d in seasonal} | block
            extra = sorted((d for d in self.candidates if d.id not in seen),
                           key=lambda d: -self._context_score(d))
            seasonal += extra[:n - len(seasonal)]
        return [self._card(d, *self._score(d)) for d in seasonal[:n]]

    def hidden_gems(self, n=8, exclude_ids=None):
        """Yuqori reyting, kam mashhur — diversity uchun."""
        block = self.excluded | set(exclude_ids or ())
        rated = [d for d in self.candidates
                 if (d.db_avg_rating or 0) >= 4.3 and (d.rev_count or 0) <= 12
                 and d.id not in self.seeds and d.id not in block]
        rated.sort(key=lambda d: -(d.db_avg_rating or 0))
        gems = rated[:n]
        if len(gems) < n:
            # zaxira: mashhur bo'lmagan, kam sharhli, lekin yaxshi ballga ega joylar
            seen = {d.id for d in gems} | set(self.seeds.keys()) | block
            extra = [d for d in self.candidates
                     if d.id not in seen and not d.is_popular and (d.rev_count or 0) <= 12]
            extra.sort(key=lambda d: -self._score(d)[0])
            gems += extra[:n - len(gems)]
        return [self._card(d, *self._score(d)) for d in gems[:n]]

    # ------------------------------------------------------------------ #
    #  TASTE DNA
    # ------------------------------------------------------------------ #
    def taste_dna(self):
        """Profil bo'limi: top uslublar %, byudjet, sevimli mintaqa, signallar."""
        tt = self.profile['trip_type']
        total = sum(tt.values())
        styles = []
        if total > 0:
            for name, val in sorted(tt.items(), key=lambda kv: -kv[1])[:3]:
                styles.append({
                    'key': name,
                    'label': TRIP_TYPE_LABELS.get(name, name.title()),
                    'pct': round(val / total * 100),
                })

        avg = self.avg_price
        budget = BUDGET_LABELS[_budget_band(avg)] if avg is not None else 'Mid-range'

        # sevimli davlat
        fav_country = None
        if self.profile['country']:
            cid = max(self.profile['country'].items(), key=lambda kv: kv[1])[0]
            dest = next((d for d in self.candidates if d.country_id == cid), None)
            if dest and dest.country_id:
                fav_country = dest.country.name

        signals = (Wishlist.objects.filter(user=self.user).count()
                   + Review.objects.filter(user=self.user).count()
                   + Booking.objects.filter(user=self.user).count()) if self.user else 0

        return {
            'has_history': self.has_history,
            'styles': styles,
            'budget': budget,
            'favorite_region': fav_country or '—',
            'signals': signals,
            'season_label': SEASON_LABELS[self.season],
            'portrait': self._portrait(styles, budget, fav_country),  # 2-bosqich: Gemini
        }

    @staticmethod
    def _portrait(styles, budget, fav_country):
        """Shablonli AI portret (o'zbekcha) — Gemini ishlamasa shu ishlatiladi."""
        if not styles:
            return ("Yoqtirgan sayohatlaringizni saqlang — AI sizning shaxsiy "
                    "Taste DNA'ngizni quradi va har bir tavsiyani aniqlashtiradi.")
        top = styles[0]['label']
        where = f", ayniqsa {fav_country} sizni o'ziga tortadi" if fav_country else ""
        return (f"Siz qalban {top} yo'nalishidagi sayohatchisiz — byudjet uslubingiz "
                f"{budget}{where}. Saqlagan sayohatlaringiz quyidagi mosliklarni shakllantiradi.")