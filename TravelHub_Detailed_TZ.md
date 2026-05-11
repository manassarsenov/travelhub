# TravelHub Tizimi - Texnik Topshiriq (TZ) va Detal Tahlil

Ushbu hujjat "TravelHub" loyihasining hozirgi kundagi holatini to'liq tahlil qilish, uning qanday ishlashini tushuntirish va tizimdagi mavjud muammolarni bartaraf etish uchun qilinishi kerak bo'lgan vazifalarni (Texnik Topshiriq) belgilab beradi.

---

## 1. Loyihaning Maqsadi va Umumiy Ishlash Logikasi

**TravelHub** — bu foydalanuvchilar o'z sayohatlarini rejalashtirishi, mehmonxonalar va aviareyslarni o'z ichiga olgan turistik paketlarni (destinatsiyalarni) topishi, ularni solishtirishi va bron qilishi mumkin bo'lgan keng qamrovli veb-platforma. 

**Qanday ishlaydi?**
1. Foydalanuvchi platformaga kiradi (yoki Google orqali avtorizatsiya qiladi).
2. Qidiruv va filtrlar (davlat, narx, reyting, toifa) orqali o'ziga kerakli destinatsiyani topadi.
3. Destinatsiyaning ob-havosi, xususiyatlari, qoldirilgan sharhlar bilan tanishadi.
4. **Bron qilish (Booking)** jarayoni boshlanadi. Bu asosan 2 bosqichdan iborat: ma'lumotlarni kiritish va to'lovni amalga oshirish.
5. Foydalanuvchi xizmatdan foydalanib bo'lgach, saytda sharh qoldirishi mumkin. Qoldirilgan sharhlar **Sun'iy Intellekt (Gemini)** orqali tekshirilib, mos kelsa saytda chiqariladi, haqoratli bo'lsa bloklanadi.
6. Har bir muhim harakatda (ro'yxatdan o'tish, bron qilish) foydalanuvchiga elektron pochta hamda sayt ichki bildirishnomasi (notification) keladi.

---

## 2. Tizim Arxitekturasi va Stack

Platforma asosan uchta katta qatlamdan iborat monolitik arxitekturaga qurilgan:
* **Backend:** Python 3.13, Django 5.x.
* **Ma'lumotlar Bazasi:** PostgreSQL.
* **Fon Jarayonlari (Asynchronous Tasks):** Celery va Redis. 

**Texnologiyalar o'zaro qanday bog'langan?**
Foydalanuvchi brauzer orqali veb-serverga (Django) so'rov yuboradi. Agar so'rov yengil bo'lsa, Django darhol javob qaytaradi. Agar jarayon og'ir bo'lsa (masalan, foydalanuvchiga email yuborish yoki AI orqali sharhni tekshirish), Django bu vazifani xabarlar brokeri bo'lgan **Redis**'ga yuboradi, va darhol foydalanuvchiga javob qaytaradi. Orqa fonda **Celery** Redis'dan vazifani olib, sekin-asta bajarib qo'yadi.

---

## 3. Asosiy Modullar (Apps) va Modellar

Loyiha bazasi modulli tarzda `apps/models` da tashkil qilingan. 
* **Users (`users.py`):** Tizim foydalanuvchilari profillari va sozlamalari.
* **Destinations (`destinations.py`):** Tizimning yuragi. Sayohat paketlari, ularga tegishli rasmlar, mavsumlar (Season), chegirmalar va bron qilish vaqtlari (TimeSlots).
* **Location (`countries.py`):** Ierarxik hududlar ro'yxati (Mamlakat -> Mintaqa -> Shahar) - MPTT (Modified Preorder Tree Traversal) daraxt tuzilmasidan foydalanib qurilgan. Bu qidiruvni juda tezlashtiradi.
* **Orders & Tickets (`orders.py`, `ticket_details.py`):** Bron qilingan paketlar, ularning holati (Pending, Completed, Cancelled) va to'lov tizimlari.
* **Reviews (`reviews.py`, `ai_moderator.py`):** Baholash tizimi. O'rtacha reyting hisoblash logikasi va AI Moderatsiya steyti.
* **Notifications (`notifications.py`):** Ichki xabar berish mexanizmi. WebSocket ulanmaganligi sababli, asosan sahifa yangilanganda ko'rinadi.

---

## 4. Mavjud Muammolar va Zaif Nuqtalar (Nima Muammo Bor?)

Loyiha funksional tarzda yaxshi o'ylangan, ammo kod darajasida tizimning o'sishiga xalaqit beradigan va "qulab tushishiga" sabab bo'ladigan muammolar bor:

### 1. "God Object" (Juda katta fayl) Muammosi — `views.py`
Hozirda `apps/views.py` fayli o'ta katta bo'lib ketgan (2000 dan ortiq qator kod, ~85 KB). Saytdagi barcha logikalar — ro'yxatdan o'tish, bron qilish, destinatsiya qidirish, sharh qoldirish, bildirishnomalar — hammasi bitta faylga aralashib ketgan.
**Oqibati:** Kodni o'qish qiyinlashgan, yangi dasturchi kelsa tushunishi qiyin, bitta joyni to'g'irlamoqchi bo'lsangiz, ikkinchi joy buzilib qolishi ehtimoli yuqori. Jamoada ishlashning umuman iloji yo'q (git conflictlar ko'payadi).

### 2. N+1 Baza So'rovlari Muammosi (Sekin ishlash xavfi)
Destinatsiyalar ro'yxati yoki reytinglar (service_score, cleanliness_score) yuklanganda, Django ORM har bir element uchun ma'lumotlar bazasiga alohida so'rov yuborishi mumkin. 
**Oqibati:** Agar sahifada 20 ta destinatsiya bo'lsa, baza bilan ishlash uchun 1 ta so'rov o'rniga 100 ta so'rov ketib qoladi. Foydalanuvchilar soni ko'payganda sayt qotib qoladi va qulaydi.

### 3. Konfiguratsiya Xatosi — `DEBUG` Muammosi
`root/settings.py` ichida muhit o'zgaruvchilari tekshirilganda:
`DEBUG = os.getenv('DEBUG', False)` yozilgan. Python `.env` faylidan qiymatni satr (string) sifatida o'qiydi (masalan, `"False"`). Python'da bo'sh bo'lmagan har qanday string mantiqiy `True` ga teng bo'ladi.
**Oqibati:** Haqiqiy serverda (Production) loyihani ko'targanda ham sayt `DEBUG = True` holatida ishlayveradi, bu xavfsizlik uchun juda jiddiy teshik. Bu orqali hakerlar saytning butun kodini va baza parollarini o'g'irlashi mumkin.

### 4. To'lov Tizimi Integratsiyasi Chala
Payme, Click, Kaspi, Humo kabi to'lov tizimlari modellar qismida (PaymentMethod) mavjud, lekin real pul yechish / tranzaksiyani tasdiqlash uchun alohida webhook logikasi yoki tranzaksiya steytlari (to'landi, bekor qilindi) backend bilan to'liq integratsiya qilinmagan (asosan interfeys uchun yozib qo'yilgan).
**Oqibati:** Hozirgi holatda tizim orqali real to'lov qabul qilib bo'lmaydi.

### 5. Avtomatlashtirilgan Testlar Yo'qligi
`apps/tests.py` bo'sh turibdi. Kod to'g'ri ishlayotganini faqat brauzer orqali qo'lda bosib tekshirish mumkin.
**Oqibati:** Katta loyihalarda yangi funksiya qo'shganda eskisi buzilmasligiga kafolat yo'q. Dasturchi doim xavotirda ishlaydi.

---

## 5. Texnik Topshiriq (TZ) - Nimalar Qilish Kerak?

Yuqoridagi muammolarni bartaraf etish va loyihani "Production Ready" (to'liq foydalanishga tayyor) qilish uchun quyidagi vazifalar darhol amalga oshirilishi shart:

### 1-bosqich: Refaktoring (Kodni tozalash va ajratish) - ZARURLIK DARAJASI: KRITIK
* **Vazifa:** `apps/views.py` ni o'chirish va uning o'rniga `apps/views/` papkasini yaratib, kodlarni funksionalligiga qarab bo'lish.
* **Fayllar:** 
  - `auth_views.py` (Kirish, Ro'yxatdan o'tish, Parolni tiklash)
  - `destinations_views.py` (Katalog, Detallar sahifasi, Sayohatlarni qidirish)
  - `booking_views.py` (Bron qilish bosqichlari)
  - `reviews_views.py` (Sharh qoldirish, Like bosish)
  - `profile_views.py` (Foydalanuvchi shaxsiy kabineti)
  - `notifications_views.py` (Bildirishnomalarni boshqarish)

### 2-bosqich: Baza Optimizatsiyasi (Tezlashtirish) - ZARURLIK DARAJASI: YUQORI
* **Vazifa:** Asosiy view'larda N+1 muammosini hal qilish.
* **Harakat:** Destinatsiyalarni bazadan oladigan barcha funksiyalarga `select_related('country', 'city')` va `prefetch_related('images')` qatorlarini qo'shish. Reyting hisoblagichlarni `annotate` funksiyasiga o'tkazish.

### 3-bosqich: Sozlamalar va Xavfsizlikni To'g'rilash - ZARURLIK DARAJASI: YUQORI
* **Vazifa:** `settings.py` faylida `DEBUG` va `ALLOWED_HOSTS` parametrlarini xavfsiz holatga keltirish.
* **Harakat:** 
  ```python
  # Kodni quyidagiga o'zgartirish:
  DEBUG = os.getenv('DEBUG', 'False').lower() in ('true', '1', 't')
  ```

### 4-bosqich: To'lov Tranzaksiyalari Arxitekturasi - ZARURLIK DARAJASI: O'RTA
* **Vazifa:** To'lov provayderlari bilan ishlash uchun haqiqiy API va Callback(Webhook) endpointlarni yozish.

### 5-bosqich: Backend Testlarni Yozish - ZARURLIK DARAJASI: O'RTA
* **Vazifa:** Asosiy biznes logikasi uchun (unit tests) yozish.
* **Harakat:** Asosan Pul yechish (Booking logikasi) hamda Sun'iy intellekt (Gemini moderatsiya) to'g'ri ishlashini tekshiruvchi avtomat testlarni `pytest` yoki Django `TestCase` orqali yaratish.

---

### Xulosa

Hozirgi vaqtda platformaning logikasi va funksionali (Frontend+Backend) katta hajmdagi ishlarni bajarib bo'lgan. AI va Celery qo'llanganligi loyiha darajasini ancha yuqori qilib turibdi. Ammo tizimning eng asosiy muammosi — kod tuzilishi (`views.py` ning kattaligi). Birinchi navbatda albatta `views.py` ni bo'lib chiqish vazifasidan boshlash shart, shundan so'ng boshqa texnik qarzlar (to'lov va testlar) ustida ishlash loyihani mukammal darajaga olib chiqadi.
