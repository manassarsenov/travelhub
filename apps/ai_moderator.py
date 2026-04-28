import json

import logging

import google.generativeai as genai

from django.conf import settings

logger = logging.getLogger(__name__)


def check_review_with_ai(text, destination_name):
    """

    Izohni Gemini AI orqali tekshirishning ENG MUKAMMAL (JSON + Timeout + Logging) usuli.

    """

    # 1-HIMOYA: Bo'sh matnlarni darhol bloklash (Serverni bekorga ishlatmaslik uchun)

    if not text or not text.strip():
        return False, "SYSTEM_REJECT: Izoh bo'sh"

    # 2-HIMOYA: Matnni kesish. Kimdir 1 millionta "A" harfini yozib yuborsa ham,

    # AI faqat birinchi 3000 tasini o'qiydi. (Memory va Pulni tejash uchun)

    safe_text = text.strip()[:3000]

    # 3-HIMOYA: API kalit borligini tekshirish

    api_key = getattr(settings, 'GEMINI_API_KEY', None)

    if not api_key:
        logger.error("CRITICAL: GEMINI_API_KEY topilmadi! AI Moderatsiya o'chirilgan.")
        return False, "SYSTEM_ERROR: Tizim sozlanmagan"

    try:

        genai.configure(api_key=api_key)

        system_rules = f"""

                Sen TravelHub sayti uchun qat'iy va professional moderatorsan. 
                Sening vazifang foydalanuvchi izohini tekshirish.



                MUHIM QOIDA: Izoh har qanday tilda (o'zbek, rus, ingliz, xitoy va h.k.) bo'lishi mumkin. 
                Uni tushun va quyidagi qoidalarga asosan tekshir. Lekin javobdagi "reason" (sabab) qismini 
                HAR DOIM faqat O'ZBEK (yoki INGLIZ) tilida yozishing shart!



                QOIDALAR:

                1. XAVFSIZLIK: Haqorat, so'kinish, tahdid, yomon so'zlar bo'lsa rad et.
                2. SPAM: Faqat havolalar (links), reklama, yoki ma'nosiz harflar (qweqwe) bo'lsa rad et.
                3. RELEVANTLIK: Izoh "{destination_name}" manziliga yoki sayohatga aloqador bo'lmasa rad et.
                4. O'ta qisqa ("Zo'r", "Yaxshi joy") lekin zararsiz izohlarni qabul qil.



                QAT'IY FORMAT: Sen faqatgina JSON formatida javob berishing shart.
                Agar izoh toza bo'lsa: {{"is_safe": true, "reason": "AI Approved"}}
                Agar yomon bo'lsa: {{"is_safe": false, "reason": "[Qisqacha sabab faqat o'zbek tilida]"}}
                """

        safety_settings = [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
        ]

        model = genai.GenerativeModel(

            model_name='gemini-flash-latest',
            system_instruction=system_rules,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.0,  # 0.0 Qilamiz! AI umuman fantaziya qilmaydi, faqat buyruqni bajaradi.

            )

        )

        prompt = f'Manzil: "{destination_name}"\nIzoh: "{safe_text}"'

        # 4-HIMOYA: Timeout (Agar API 15 soniyada javob bermasa, saytni qotirmasdan uzib yuboradi)

        response = model.generate_content(
            prompt,
            safety_settings=safety_settings,
            request_options={"timeout": 15.0}
        )

        if not response.text:
            logger.warning("AI dan bo'sh javob keldi.")
            return False, "SYSTEM_REJECT: Noma'lum AI xatosi"

        result_data = json.loads(response.text)
        # 5-HIMOYA: AI xato qilib is_safe'ni bermasa, default holatda False (Xavfli) deb qabul qilamiz
        is_safe = result_data.get("is_safe", False)
        reason = result_data.get("reason", "Noma'lum sabab")

        return is_safe, reason



    # 6-HIMOYA: Zirhli Exception Catcher'lar (Hech qanday xato ekranga chiqib ketmaydi)

    except json.JSONDecodeError as e:
        logger.error(f"AI javobini JSON ga o'girib bo'lmadi: {e} | Text: {response.text}")
        return False, "SYSTEM_ERROR: AI format xatosi"
    except Exception as e:
        # Endi faqat logga yozamiz, mijozning ekrani portlamaydi
        logger.error(f"GEMINI API CRASH: {str(e)}", exc_info=True)
        return False, "SYSTEM_ERROR: AI xizmatida vaqtincha nosozlik"
