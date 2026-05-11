# TravelHub Loyihasi — To'liq Tahlil
**Sana:** 2026-05-09

---

## Umumiy Ko'rinish

**TravelHub** — Django asosida qurilgan sayohat bronlash platformasi. Foydalanuvchilar destinatsiyalarni ko'rishi, solishtirishi, bronlashi va sharh yozishi mumkin.

---

## Texnologiyalar Steki

| Qatlam | Texnologiya |
|--------|-------------|
| Backend | Django 5.x, Python 3.13 |
| Database | PostgreSQL |
| Cache / Broker | Redis |
| Async tasks | Celery + Celery Beat |
| AI | Google Gemini Flash (review moderation) |
| Rich text | CKEditor 5 |
| Admin | Jazzmin |
| i18n | Rosetta |
| Auth | Email + Google OAuth2 |
| Debug | Django Debug Toolbar |

---

## Modellar Arxitekturasi

```
User (AbstractUser, email-based)
├── Destination
│   ├── DestinationImage
│   ├── DestinationTimeSlot
│   ├── DestinationFAQ
│   ├── Hotel → HotelImage
│   ├── Flight
│   ├── Review (AI moderated)
│   └── Booking
├── Country → City
├── Tag, Activity, Category
├── PromoCode
├── Notification + NotificationSetting
└── ActionLog
```

**Destination** modeli juda boy: flash sale, discount, trip type, season, package type, bepul bekor qilish, ratings va boshqalar.

---

## Asosiy Funksionallik (URL'lar bo'yicha)

- **Auth**: Ro'yxatdan o'tish, kirish, chiqish, Google OAuth, parol tiklash, email tasdiqlash
- **Destinatsiyalar**: Ro'yxat, filter, solishtirish, detail, shahar bo'yicha, load-more (AJAX)
- **Bronlash**: 2 bosqichli flow (Step 1 → Step 2), promo-kod tekshirish
- **Sharhlar**: Yozish, like, barcha sharhlar sahifasi
- **Bildirishnomalar**: Ko'rish, o'qilgan belgilash, o'chirish, sozlamalar (REST-style)
- **Dashboard, Profile, Wishlist, My Bookings**
- **Kontent**: Blog, FAQ, About, Contact, Help Center, Privacy, Terms

---

## Kuchli Tomonlar

1. **AI Moderation** — Gemini Flash orqali sharhlarni avtomatik tekshirish: timeout, retry, JSON mode, loglar — yaxshi yozilgan
2. **Celery tasks** — Flash sale avtomatik o'chirish, async review moderation
3. **To'lov tizimlari** — Payme, Click, Kaspi, Humo, Uzcard rasmiy logolari bor
4. **Google OAuth2** — Integratsiya qilingan
5. **Ko'p tilli** — Rosetta + `gettext_lazy` ishlatilgan
6. **`rating` property optimizatsiyasi** — `db_avg_rating` annotatsiya bo'lsa undan foydalanadi, bo'lmasa DB dan oladi

---

## Muammolar va Tavsiyalar

### 1. Kritik bug — `DEBUG` sozlamasi

```python
# root/settings.py
import os

DEBUG = os.getenv('DEBUG', False)
# BUG: os.getenv "False" stringini qaytaradi → Python da string truthy!
# To'g'risi:
DEBUG = os.getenv('DEBUG', 'False') == 'True'
```

### 2. `views.py` juda katta — 2048 qator
Barcha viewlar bitta faylda. Quyidagicha bo'lish tavsiya qilinadi:
```
views/
├── auth.py
├── destinations.py
├── booking.py
├── reviews.py
├── notifications.py
└── profile.py
```

### 3. `ALLOWED_HOSTS = ['*']` — production uchun xavfli
Production da aniq domenlar ko'rsatilishi kerak.

### 4. N+1 xavfi — Destination score'lari
`service_score`, `cleanliness_score`, `facilities_score`, `access_score`, `value_score` — har biri alohida DB so'rovi.
Ro'yxat sahifasida 20 ta destination = 100+ qo'shimcha query.

### 5. Typo — fayl nomi
`apps/utils/uplode_image.py` → `upload_image.py` bo'lishi kerak

### 6. `Promocode.py` — bosh harf inconsistency
Barcha boshqa model fayllari kichik harf bilan, faqat bu katta harf bilan (`Promocode.py`).

### 7. Testlar yo'q
`apps/tests.py` mavjud lekin bo'sh. Kamida booking va review logikasi uchun testlar kerak.

### 8. To'lov integratsiyasi noaniq
Payme/Click/Kaspi `PaymentMethod.choices` da bor, lekin haqiqiy payment gateway integratsiyasi ko'rinmaydi — faqat UI uchunmi?

---

## Statistika

| Metrika | Qiymat |
|---------|--------|
| Views fayli | 2048 qator |
| URL pattern'lar | ~45 ta |
| Model fayllari | 14 ta |
| Migration'lar | 18 ta |
| CSS fayllari | ~25 ta |
| JS fayllari | ~15 ta |
| Fixtures | 6 ta (countries, cities, regions, destinations, tags, activities) |

---

## Xulosa

Loyiha funksional jihatdan juda boy va yaxshi o'ylangan. Asosiy texnik qarzdorlik:
1. `views.py` ni bo'lish
2. `DEBUG` bugini tuzatish
3. Score property'larini annotatsiya orqali optimize qilish
