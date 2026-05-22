"""
apps/recommendations/ai.py
==========================
Tavsiya tizimining Gemini AI qatlami — 2-bosqich.

`ai_moderator.py` naqshida qurilgan: genai + GEMINI_API_KEY + JSON rejimi +
timeout + zirhli try/except. Har qanday xatoda None qaytaradi — chaqiruvchi
1-bosqichdagi shablonli matnga (fallback) qaytadi, sahifa hech qachon buzilmaydi.

Uchta vazifa:
  • parse_search_query()  — tabiiy til so'rovini structured filterga aylantiradi
  • taste_and_pitches()   — Taste portreti + Top Pick pitchlarini 1 chaqiruvda yozadi
Natijalar keshlanadi (pul va vaqt tejash uchun).
"""
import hashlib
import json
import logging

import google.generativeai as genai

from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

_MODEL = 'gemini-flash-latest'
_TIMEOUT = 12.0
_CACHE_TTL = 60 * 60 * 24            # 24 soat
_SAFETY = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
]

# Gemini erkin matn qaytarmasligi uchun ruxsat etilgan qiymatlar
TRIP_TYPES = ['adventure', 'beach', 'cultural', 'nature', 'city', 'romantic', 'family']
SEASONS = ['spring', 'summer', 'autumn', 'winter']


def ai_enabled():
    """API kalit borligini tekshiradi va genani sozlaydi."""
    key = getattr(settings, 'GEMINI_API_KEY', None)
    if not key:
        logger.warning("GEMINI_API_KEY topilmadi — AI tavsiya shablonli rejimda.")
        return False
    try:
        genai.configure(api_key=key)
        return True
    except Exception as exc:                       # noqa: BLE001
        logger.error("Gemini configure xatosi: %s", exc)
        return False


def _json_model(system_instruction, temperature=0.4):
    return genai.GenerativeModel(
        model_name=_MODEL,
        system_instruction=system_instruction,
        generation_config=genai.GenerationConfig(
            response_mime_type='application/json',
            temperature=temperature,
        ),
    )


def _generate(model, prompt):
    """Bitta generatsiya — JSON dict yoki None."""
    resp = model.generate_content(
        prompt, safety_settings=_SAFETY,
        request_options={"timeout": _TIMEOUT},
    )
    if not resp.text:
        return None
    return json.loads(resp.text)


# ────────────────────────────────────────────────────────────────────────────
#  1) TABIIY TILDA QIDIRUV  →  STRUCTURED FILTER
# ────────────────────────────────────────────────────────────────────────────
_SEARCH_SYSTEM = f"""
Sen TravelHub sayohat platformasi uchun qidiruv tahlilchisisan.
Foydalanuvchi o'z orzu sayohatini erkin matnda (har qanday tilda) yozadi.
Sening vazifang — uni QAT'IY JSON structured filterga aylantirish.

Faqat quyidagi JSON ni qaytar (boshqa hech narsa yo'q):
{{
  "trip_type": <{TRIP_TYPES} dan biri yoki null>,
  "city":      <shahar nomi, ingliz/transliteratsiyada, masalan "Bukhara" yoki null>,
  "country":   <davlat nomi, ingliz tilida, masalan "Uzbekistan" yoki null>,
  "max_price": <butun son USD yoki null>,
  "min_price": <butun son USD yoki null>,
  "season":    <{SEASONS} dan biri yoki null>,
  "party":     <odamlar soni, butun son yoki null>,
  "keywords":  [<matndagi muhim sifatlar, ingliz tilida, masalan "quiet","luxury">]
}}

QOIDALAR:
- Matnda aniq ko'rsatilmagan maydonni null qoldir (taxmin qilma).
- trip_type — bu sayohat USLUBI: "beach/plyaj" → beach; "culture/madaniyat/tarix" → cultural;
  "adventure/sarguzasht/tog'" → adventure; "romantic" → romantic;
  "shahar ekskursiyasi" → city; "nature/tabiat" → nature; "family/oila" → family.
- city — bu aniq SHAHAR nomi. "Buxoro/Buxorodan/Бухара" → "Bukhara";
  "Samarqand/Самарканд" → "Samarkand"; "Toshkent" → "Tashkent". Joy nomini
  doim standart inglizcha shaklda yoz.
- country — aniq davlat aytilsa: "O'zbekiston/Узбекистан" → "Uzbekistan".
- Narx "$600", "600 dollargacha", "under 1000" → max_price.
- keywords 4 tadan oshmasin (shahar/davlat nomi keywords ga TUSHMAYDI).
"""


def parse_search_query(text):
    """Tabiiy til so'rovi → structured filter dict. Xato bo'lsa None."""
    text = (text or '').strip()
    if not text or not ai_enabled():
        return None

    cache_key = 'recai:q2:' + hashlib.md5(text.lower().encode()).hexdigest()
    cached = cache.get(cache_key)
    if cached is not None:
        return cached or None                      # {} ni None ga aylantiramiz

    try:
        model = _json_model(_SEARCH_SYSTEM, temperature=0.1)
        data = _generate(model, f'Foydalanuvchi so\'rovi: "{text[:500]}"')
        if not isinstance(data, dict):
            return None

        city = data.get('city')
        country = data.get('country')
        result = {
            'trip_type': data.get('trip_type') if data.get('trip_type') in TRIP_TYPES else None,
            'season': data.get('season') if data.get('season') in SEASONS else None,
            'city': str(city).strip()[:80] if city else None,
            'country': str(country).strip()[:80] if country else None,
            'max_price': _as_int(data.get('max_price')),
            'min_price': _as_int(data.get('min_price')),
            'party': _as_int(data.get('party')),
            'keywords': [str(k)[:30] for k in (data.get('keywords') or [])][:4],
        }
        cache.set(cache_key, result, _CACHE_TTL)
        return result
    except json.JSONDecodeError as exc:
        logger.error("AI qidiruv JSON xatosi: %s", exc)
    except Exception as exc:                       # noqa: BLE001
        logger.error("Gemini qidiruv xatosi: %s", exc)
    return None


def _as_int(value):
    try:
        return int(value) if value is not None else None
    except (TypeError, ValueError):
        return None


# ────────────────────────────────────────────────────────────────────────────
#  2) TASTE PORTRETI  +  TOP PICK PITCHLARI  (1 chaqiruv, keshlanadi)
# ────────────────────────────────────────────────────────────────────────────
_PITCH_SYSTEM = """
Sen TravelHub uchun iliq, shaxsiy va qisqa sayohat matni yozuvchi kopiraytersan.
Sayohatchining "ta'm profili" va unga tavsiya qilingan joylar beriladi.

Faqat quyidagi JSON ni qaytar:
{
  "portrait": "<sayohatchi haqida 1 jumla, 2-shaxsda 'Siz...' bilan, max 28 so'z>",
  "pitches": [ {"id": <destination id>, "text": "<o'sha joy uchun 1 jumlali shaxsiy pitch, max 22 so'z>"} ]
}

QOIDALAR:
- Hammasi O'ZBEK tilida (lotin yozuvida), iliq va ishonarli, lekin reklama shiori emas.
- Har bir berilgan destination uchun aynan bitta pitch yoz (id ni o'zgartirma).
- Joyning nomi va trip_type ini, sayohatchi ta'miga nega mosligini hisobga ol.
- Joy nomlari (masalan "Registan Square") o'z holicha qoladi — tarjima qilinmaydi.
- Klişe so'zlardan saqlan; aniq, tabiiy va jonli yoz.
"""


def taste_and_pitches(taste, picks):
    """
    taste  — engine.taste_dna() dict
    picks  — [{'id','name','place','trip_type','reasons'}] ro'yxati
    →  {'portrait': str, 'pitches': {id: str}}  yoki  None (fallback uchun)
    """
    if not picks or not ai_enabled():
        return None

    signature = json.dumps({
        't': [(s['key'], s['pct']) for s in taste.get('styles', [])],
        'b': taste.get('budget'), 'r': taste.get('favorite_region'),
        'p': sorted(p['id'] for p in picks),
    }, sort_keys=True)
    cache_key = 'recai:tp:uz1:' + hashlib.md5(signature.encode()).hexdigest()
    cached = cache.get(cache_key)
    if cached is not None:
        return cached or None

    styles = ', '.join(f"{s['label']} {s['pct']}%" for s in taste.get('styles', [])) or 'no history yet'
    picks_txt = '\n'.join(
        f"- id={p['id']} | {p['name']} ({p['place']}) | type={p['trip_type']} | why: {p['reasons']}"
        for p in picks
    )
    prompt = (
        f"Sayohatchi ta'mi: styles=[{styles}], budget={taste.get('budget')}, "
        f"favorite={taste.get('favorite_region')}.\n\n"
        f"Tavsiya qilingan joylar:\n{picks_txt}"
    )

    try:
        model = _json_model(_PITCH_SYSTEM, temperature=0.6)
        data = _generate(model, prompt)
        if not isinstance(data, dict):
            return None
        pitches = {}
        for item in (data.get('pitches') or []):
            pid = _as_int(item.get('id'))
            txt = (item.get('text') or '').strip()
            if pid and txt:
                pitches[pid] = txt
        result = {'portrait': (data.get('portrait') or '').strip(), 'pitches': pitches}
        if not result['portrait'] and not pitches:
            return None
        cache.set(cache_key, result, _CACHE_TTL)
        return result
    except json.JSONDecodeError as exc:
        logger.error("AI pitch JSON xatosi: %s", exc)
    except Exception as exc:                       # noqa: BLE001
        logger.error("Gemini pitch xatosi: %s", exc)
    return None


def enrich(taste, picks):
    """
    Engine natijasiga Gemini matnini joyida qo'shadi:
      • taste['portrait']      → AI portreti bilan almashtiriladi
      • pick['ai_pitch']       → AI pitchi bilan almashtiriladi
    Muvaffaqiyat bo'lsa True, aks holda False (shablonli matn qoladi).
    """
    if not picks:
        return False
    payload = [{
        'id': p['d'].id,
        'name': p['d'].name,
        'place': p['d'].city.name if p['d'].city_id else (
            p['d'].country.name if p['d'].country_id else ''),
        'trip_type': p['d'].trip_type or 'travel',
        'reasons': '; '.join(r['text'] for r in p.get('reasons', [])),
    } for p in picks]

    data = taste_and_pitches(taste, payload)
    if not data:
        return False
    if data.get('portrait'):
        taste['portrait'] = data['portrait']
    pitches = data.get('pitches') or {}
    for p in picks:
        if p['d'].id in pitches:
            p['ai_pitch'] = pitches[p['d'].id]
    return True