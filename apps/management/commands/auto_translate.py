"""
Auto-translate model fields (en -> uz, ru) using Google Gemini.

Usage:
    python manage.py auto_translate
    python manage.py auto_translate --models=Tag,Activity --langs=uz
    python manage.py auto_translate --dry-run --limit=5
    python manage.py auto_translate --models=Destination --batch-size=5
"""
import json
import logging
import time

import google.generativeai as genai
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.models import Activity, City, Country, Destination, Region, Tag
from apps.models.destinations import DestinationFAQ
from apps.models.ticket_details import TicketType

logger = logging.getLogger(__name__)


# Tarjima qilinadigan modellar va ularning maydonlari
MODEL_FIELDS = {
    'Destination': (Destination, [
        'name', 'short_description', 'description', 'location',
        'price_label', 'featured_badge',
        'why_visit', 'whats_included', 'restrictions', 'additional_info',
    ]),
    'DestinationFAQ': (DestinationFAQ, ['question', 'answer']),
    'Country': (Country, ['name']),
    'Region': (Region, ['name']),
    'City': (City, ['name']),
    'Tag': (Tag, ['name']),
    'Activity': (Activity, ['name']),
    'TicketType': (TicketType, ['name', 'age_label']),
}

LANG_NAMES = {
    'uz': "Uzbek (latin script, modern, natural — NOT Cyrillic)",
    'ru': "Russian",
}


class Command(BaseCommand):
    help = "Translate empty _uz / _ru fields using Gemini AI"

    def add_arguments(self, parser):
        parser.add_argument(
            '--models', default='',
            help='Comma-separated model names. Default: all',
        )
        parser.add_argument(
            '--langs', default='uz,ru',
            help='Target languages: uz, ru, or both (default: uz,ru)',
        )
        parser.add_argument(
            '--batch-size', type=int, default=10,
            help='Records per Gemini API call (default: 10)',
        )
        parser.add_argument(
            '--limit', type=int, default=0,
            help='Max records per model (0 = no limit)',
        )
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Show what would be translated, do not save',
        )
        parser.add_argument(
            '--sleep', type=float, default=1.0,
            help='Seconds to sleep between API calls (default: 1.0)',
        )

    # ──────────────────────────────────────────────────────────────────
    def handle(self, *args, **opts):
        api_key = getattr(settings, 'GEMINI_API_KEY', None)
        if not api_key:
            raise CommandError("GEMINI_API_KEY topilmadi (.env ni tekshiring)")

        genai.configure(api_key=api_key)
        # gemini-2.5-flash: alohida kvota (2.0-flash dan farqli)
        self.model = genai.GenerativeModel(
            model_name='gemini-2.5-flash',
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.2,
            ),
        )

        selected_models = self._parse_models(opts['models'])
        langs = [l.strip() for l in opts['langs'].split(',') if l.strip() in LANG_NAMES]
        if not langs:
            raise CommandError("Hech qanday valid til berilmagan (uz, ru)")

        self.batch_size = opts['batch_size']
        self.limit = opts['limit']
        self.dry_run = opts['dry_run']
        self.sleep = opts['sleep']

        if self.dry_run:
            self.stdout.write(self.style.WARNING("⚠️  DRY-RUN rejimi — hech narsa saqlanmaydi"))

        for model_name, (model_cls, fields) in selected_models.items():
            for lang in langs:
                self._translate_model(model_name, model_cls, fields, lang)

        self.stdout.write(self.style.SUCCESS("\n✅ Tarjima yakunlandi"))

    # ──────────────────────────────────────────────────────────────────
    def _parse_models(self, names_str):
        if not names_str.strip():
            return MODEL_FIELDS
        wanted = {n.strip() for n in names_str.split(',') if n.strip()}
        unknown = wanted - set(MODEL_FIELDS.keys())
        if unknown:
            raise CommandError(f"Noma'lum model(lar): {', '.join(unknown)}")
        return {k: v for k, v in MODEL_FIELDS.items() if k in wanted}

    # ──────────────────────────────────────────────────────────────────
    def _translate_model(self, model_name, model_cls, fields, lang):
        target_lang_name = LANG_NAMES[lang]
        self.stdout.write(
            self.style.MIGRATE_HEADING(
                f"\n▶ {model_name} → {lang.upper()} ({target_lang_name})"
            )
        )

        target_attrs = [f"{f}_{lang}" for f in fields]
        source_attrs = [f"{f}_en" for f in fields]

        # Faqat hech bo'lmasa bitta target maydoni bo'sh bo'lgan yozuvlar
        from django.db.models import Q
        empty_q = Q()
        for attr in target_attrs:
            empty_q |= Q(**{f"{attr}__isnull": True}) | Q(**{attr: ''})

        qs = model_cls.objects.filter(empty_q).order_by('pk')
        if self.limit:
            qs = qs[:self.limit]

        total = qs.count()
        if not total:
            self.stdout.write(f"  ✓ Hammasi to'la, ish yo'q")
            return

        self.stdout.write(f"  📊 Tarjima kerak: {total} ta yozuv")

        saved_total = 0
        skipped_total = 0
        seen = 0
        batch = []
        for obj in qs.iterator(chunk_size=self.batch_size):
            payload = {'id': obj.pk}
            has_any_source = False
            for f, src_attr, tgt_attr in zip(fields, source_attrs, target_attrs):
                src_value = getattr(obj, src_attr, None) or ''
                tgt_value = getattr(obj, tgt_attr, None) or ''
                if src_value.strip() and not tgt_value.strip():
                    payload[f] = src_value
                    has_any_source = True

            if has_any_source:
                batch.append((obj, payload))

            if len(batch) >= self.batch_size:
                s, sk = self._flush_batch(batch, fields, lang)
                saved_total += s
                skipped_total += sk
                seen += len(batch)
                self.stdout.write(f"  ... ko'rilgan {seen}/{total} | saqlandi {saved_total} | o'tkazildi {skipped_total}")
                batch = []
                time.sleep(self.sleep)

        if batch:
            s, sk = self._flush_batch(batch, fields, lang)
            saved_total += s
            skipped_total += sk
            seen += len(batch)
            self.stdout.write(f"  ... ko'rilgan {seen}/{total} | saqlandi {saved_total} | o'tkazildi {skipped_total}")

        style = self.style.SUCCESS if skipped_total == 0 else self.style.WARNING
        self.stdout.write(style(
            f"  → {model_name}/{lang}: saqlandi={saved_total}, o'tkazildi={skipped_total}, jami={seen}"
        ))

    # ──────────────────────────────────────────────────────────────────
    def _flush_batch(self, batch, fields, lang):
        """Bir batch ni Gemini ga jo'natadi va saqlaydi.
        Qaytaradi: (saqlangan_son, o'tkazilgan_son)
        """
        target_lang_name = LANG_NAMES[lang]
        items_payload = [item[1] for item in batch]

        prompt = (
            f"You are a professional travel-industry translator. "
            f"Translate the following items from English to {target_lang_name}.\n\n"
            f"RULES:\n"
            f"1. Preserve HTML markup exactly (tags, attributes) — translate only visible text inside tags.\n"
            f"2. Keep proper nouns (city names, brand names, hotel names) in their commonly-used form.\n"
            f"3. For Uzbek: use modern LATIN script ONLY. Never Cyrillic.\n"
            f"4. Keep prices, numbers, URLs, emails unchanged.\n"
            f"5. Tone should be natural, friendly, suitable for a tourism website.\n"
            f"6. Return ONLY a JSON array — same length and order, with the SAME 'id' as input, "
            f"and translated values for each text field. Do not omit any item.\n\n"
            f"INPUT (JSON array):\n{json.dumps(items_payload, ensure_ascii=False)}"
        )

        # Retry bilan API chaqirish
        translated = self._call_gemini_with_retry(prompt)
        if translated is None:
            return 0, len(batch)

        # natijalarni id bo'yicha indeksga olamiz (str yoki int bo'lishi mumkin)
        by_id = {}
        for item in translated:
            if not isinstance(item, dict):
                continue
            raw_id = item.get('id')
            if raw_id is None:
                continue
            try:
                by_id[int(raw_id)] = item
            except (TypeError, ValueError):
                by_id[raw_id] = item

        saved = 0
        skipped = 0
        for idx, (obj, payload) in enumerate(batch):
            translated_item = by_id.get(obj.pk)
            # Fallback: positional
            if not translated_item and idx < len(translated) and isinstance(translated[idx], dict):
                translated_item = translated[idx]
            if not translated_item:
                skipped += 1
                continue

            update_fields = []
            for f, tgt_attr in zip(fields, [f"{x}_{lang}" for x in fields]):
                if f not in payload:
                    continue
                new_value = translated_item.get(f)
                if new_value and isinstance(new_value, str):
                    if self.dry_run:
                        preview = new_value[:60].replace('\n', ' ')
                        self.stdout.write(f"    [DRY] id={obj.pk} {tgt_attr}: {preview!r}")
                    else:
                        setattr(obj, tgt_attr, new_value)
                        update_fields.append(tgt_attr)

            if self.dry_run:
                saved += 1
            elif update_fields:
                obj.save(update_fields=update_fields)
                saved += 1
            else:
                skipped += 1

        return saved, skipped

    # ──────────────────────────────────────────────────────────────────
    def _call_gemini_with_retry(self, prompt, max_attempts=5):
        """Gemini API ni chaqiradi, rate-limit ga tushsa kutib qayta uradi."""
        for attempt in range(1, max_attempts + 1):
            try:
                response = self.model.generate_content(
                    prompt,
                    request_options={"timeout": 90.0},
                )
                return json.loads(response.text)
            except json.JSONDecodeError as e:
                self.stderr.write(self.style.ERROR(f"  ✗ JSON parse xato: {e}"))
                return None
            except Exception as e:
                msg = str(e)
                # Rate limit yoki quota → kuting va qayta urinish
                retry_seconds = self._extract_retry_delay(msg)
                if retry_seconds is None and '429' not in msg and 'quota' not in msg.lower():
                    self.stderr.write(self.style.ERROR(f"  ✗ Gemini xato: {e}"))
                    return None
                wait = retry_seconds or (10 * attempt)
                self.stdout.write(self.style.WARNING(
                    f"  ⏳ Rate limit (urinish {attempt}/{max_attempts}), {wait}s kutamiz..."
                ))
                time.sleep(wait + 2)
        self.stderr.write(self.style.ERROR(f"  ✗ {max_attempts} urinish yetmadi"))
        return None

    @staticmethod
    def _extract_retry_delay(error_msg):
        """Gemini xato matnidan 'retry_delay { seconds: N }' ni topadi."""
        import re
        m = re.search(r'seconds:\s*(\d+)', error_msg)
        return int(m.group(1)) if m else None
