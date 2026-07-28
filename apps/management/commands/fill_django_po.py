"""
Bir martalik komanda: locale/{uz,ru}/LC_MESSAGES/django.po fayllarini
qo'lda yozilgan professional tarjimalar bilan to'ldiradi.

Reuse: apps.management.commands.fill_jsi18n.fill_po (multi-line aware).
"""
from pathlib import Path

from django.core.management.base import BaseCommand
from django.conf import settings

from apps.management.commands.fill_jsi18n import fill_po


TRANSLATIONS = {
    'uz': {
        # ── Money / pricing labels ──────────────────────────────
        "$0–50 / day": "$0–50 / kun",
        "$50–150 / day": "$50–150 / kun",
        "$150+ / day": "$150+ / kun",
        "/person": "/kishi",
        "from": "dan boshlab",
        "From": "Dan boshlab",
        "person": "kishi",
        "Per person, per day.": "Har bir kishi, har kun uchun.",
        "Includes taxes and charges": "Soliqlar va to'lovlar bilan birga",

        # ── Admin / ActionLog ───────────────────────────────────
        "Authentication": "Autentifikatsiya",
        "Data Mutation": "Ma'lumot o'zgarishi",
        "Access Control": "Kirish nazorati",
        "System Event": "Tizim hodisasi",
        "Financial Activity": "Moliyaviy faoliyat",
        "Security Alert": "Xavfsizlik ogohlantirishi",
        "Debug": "Debug",
        "Info": "Ma'lumot",
        "Warning": "Ogohlantirish",
        "Error": "Xato",
        "Critical": "Kritik",
        "Alert": "Ogohlantirish",
        "Actor": "Bajaruvchi",
        "Impersonated By": "Kim sifatida",
        "Action": "Amal",
        "Verb": "Harakat",
        "Message": "Xabar",
        "Object Representation": "Obyekt ko'rinishi",
        "Pre Change Data": "O'zgarishdan oldingi ma'lumot",
        "Post Change Data": "O'zgarishdan keyingi ma'lumot",
        "Changes Diff": "O'zgarishlar farqi",
        "Request ID": "So'rov ID",
        "IP Address": "IP manzil",
        "User Agent": "User Agent",
        "Request Path": "So'rov yo'li",
        "HTTP Method": "HTTP metodi",
        "Is Suspicious": "Shubhalimi",
        "Execution Time (s)": "Bajarilish vaqti (s)",
        "Extra Info": "Qo'shimcha ma'lumot",
        "Action Log": "Amallar jurnali",
        "Action Logs": "Amallar jurnali",
        "Analyzed": "Tahlil qilindi",

        # ── Notifications ───────────────────────────────────────
        "Low": "Past",
        "Medium": "O'rtacha",
        "High": "Yuqori",
        "Urgent": "Shoshilinch",
        "Recipient": "Qabul qiluvchi",
        "Description": "Tavsif",
        "Level": "Daraja",
        "Priority": "Muhimlik",
        "Is Read": "O'qilganmi",
        "Read At": "O'qilgan vaqt",
        "Email Sent": "Email yuborildi",
        "Push Sent": "Push yuborildi",
        "Extra Data": "Qo'shimcha ma'lumot",
        "Notification": "Bildirishnoma",
        "Notifications": "Bildirishnomalar",
        "Enable Email": "Email yoqilgan",
        "Enable Push": "Push yoqilgan",
        "Enable In-App": "Ilova ichida yoqilgan",
        "Booking Updates": "Bron yangiliklari",
        "Promotions & Offers": "Aksiyalar va takliflar",
        "Price Alerts": "Narx ogohlantirishlari",
        "Notification Setting": "Bildirishnoma sozlamasi",
        "Notification Settings": "Bildirishnoma sozlamalari",

        # ── Booking / payment ───────────────────────────────────
        "Pending Payment": "To'lov kutilmoqda",
        "Confirmed": "Tasdiqlangan",
        "Completed": "Tugallangan",
        "Cancelled": "Bekor qilingan",
        "Credit Card": "Bank kartasi",
        "PayPal": "PayPal",
        "Kaspi.kz": "Kaspi.kz",
        "Apple Pay": "Apple Pay",
        "Payme": "Payme",
        "Click": "Click",
        "Special Requests": "Maxsus so'rovlar",
        "Booking": "Bron",
        "Bookings": "Bronlar",

        # ── User / profile ──────────────────────────────────────
        "Admin": "Administrator",
        "User": "Foydalanuvchi",
        "Users": "Foydalanuvchilar",
        "User Role": "Foydalanuvchi roli",
        "Male": "Erkak",
        "Female": "Ayol",
        "Other": "Boshqa",
        "Gender": "Jinsi",
        "Avatar": "Avatar",
        "Bio": "Bio",
        "Cover Photo": "Muqova rasm",
        "Website": "Veb-sayt",
        "Current Location": "Hozirgi joylashuv",
        "Languages Spoken": "Tillar",
        "Travel Styles": "Sayohat uslublari",
        "Budget Range": "Byudjet darajasi",
        "Theme": "Mavzu",
        "Light": "Och",
        "Dark": "Quyuq",
        "Date of Birth": "Tug'ilgan sana",
        "PhoneNumber": "Telefon raqami",
        "email address": "elektron pochta manzili",
        "Budget ($0-50/day)": "Tejamkor ($0-50/kun)",
        "Mid-Range ($50-150/day)": "O'rtacha ($50-150/kun)",
        "Luxury ($150+/day)": "Hashamatli ($150+/kun)",
        "Telefon raqami formati: '+998991234567'. 15 tagacha raqam ruxsat etiladi.":
            "Telefon raqami formati: '+998991234567'. 15 tagacha raqam ruxsat etiladi.",

        # ── Travel styles ───────────────────────────────────────
        "Adventure": "Sarguzasht",
        "Beach": "Plyaj",
        "Cultural": "Madaniy",
        "Nature": "Tabiat",
        "Nature & Wildlife": "Tabiat va yovvoyi hayot",
        "City Tours": "Shahar tashrifi",
        "Romantic": "Romantik",
        "Family": "Oilaviy",
        "Luxury": "Hashamatli",
        "Budget": "Tejamkor",
        "Mid-range": "O'rtacha",
        "Budget style": "Tejamkor uslub",

        # ── Visit types ─────────────────────────────────────────
        "Partner": "Sherigi bilan",
        "Solo": "Yakka",
        "Friends": "Do'stlar bilan",
        "Visited with family": "Oila bilan tashrif buyurgan",
        "Visited with a partner": "Sherigi bilan tashrif buyurgan",
        "Visited with friends": "Do'stlar bilan tashrif buyurgan",
        "Solo traveller": "Yakka sayohatchi",

        # ── Home / hero copy ────────────────────────────────────
        "Discover Your": "Kashf eting",
        "From ancient wonders to modern marvels, discover your next unforgettable journey":
            "Qadimgi mo'jizalardan zamonaviy ajoyibotlargacha — keyingi unutilmas sayohatingizni kashf eting",
        "Browse 450+ destinations or let our AI recommend perfect spots for you":
            "450+ manzilni ko'ring yoki sun'iy intellektimiz siz uchun mukammal joylarni tavsiya qilsin",
        "Compare prices, amenities, and reviews to find the best deal":
            "Eng yaxshi taklifni topish uchun narx, qulayliklar va sharhlarni solishtiring",
        "Book instantly with secure payment and instant confirmation":
            "Xavfsiz to'lov va darhol tasdiqlash bilan birdaniga bron qiling",
        "Pack your bags and enjoy your perfect vacation with 24/7 support":
            "Sumkalaringizni yig'ing va 24/7 yordam bilan mukammal ta'tildan zavqlaning",
        "Get exclusive mobile-only deals and manage your bookings on the go":
            "Faqat mobil ilovada eksklyuziv takliflarni oling va bronlaringizni boshqaring",
        "Your trusted partner in discovering amazing destinations worldwide. AI-powered recommendations for unforgettable travel experiences.":
            "Dunyodagi ajoyib manzillarni kashf etishda ishonchli hamkoringiz. Unutilmas sayohat tajribasi uchun sun'iy intellekt asosidagi tavsiyalar.",
        "Discover more places": "Yana joylarni kashf eting",

        # ── Destinations filters / list ─────────────────────────
        "Try adjusting your price range or other filters to find more options.":
            "Ko'proq variantlarni topish uchun narx oralig'i yoki boshqa filtrlarni o'zgartirib ko'ring.",
        "Clear All Filters": "Barcha filtrlarni tozalash",
        "No destinations available yet.": "Hozircha manzillar mavjud emas.",
        "Grid view": "To'r ko'rinishi",
        "List view": "Ro'yxat ko'rinishi",
        "All": "Hammasi",
        "Sort:": "Saralash:",
        "Tours": "Sayohatlar",
        "TRENDING": "TRENDDA",
        "Bestsellers in": "Eng ko'p sotilganlar:",
        "Best seller": "Eng ko'p sotilgan",
        "Top Picks for You": "Siz uchun eng yaxshi tanlovlar",
        "Hidden Gems for You": "Siz uchun yashirin xazinalar",
        "Generated from your activity": "Sizning faoliyatingiz asosida tuzildi",

        # ── Ticket / time selection ─────────────────────────────
        "Select tickets": "Chiptalarni tanlang",
        "Select time": "Vaqtni tanlang",
        "Search ticket availability by date": "Sana bo'yicha chiptalar mavjudligini izlang",
        "Tickets and prices": "Chiptalar va narxlar",
        "How many tickets?": "Necha dona chipta?",
        "Free entry": "Bepul kirish",
        "This place is free to visit — no ticket or booking required. Just turn up and explore.":
            "Bu joyga tashrif bepul — chipta yoki bron talab qilinmaydi. Kelib, kashf eting.",
        "Standard Experience": "Standart tajriba",

        # ── Reviews ────────────────────────────────────────────
        "Write a review": "Sharh yozing",
        "Share your experience": "Tajribangiz bilan o'rtoqlashing",
        "Thank you for your review!": "Sharhingiz uchun rahmat!",
        "No reviews yet.": "Hozircha sharhlar yo'q.",
        "No reviews found.": "Sharhlar topilmadi.",
        "Verified Traveller": "Tasdiqlangan sayohatchi",
        "Excellent": "Ajoyib",
        "Fabulous": "Zo'r",
        "Good": "Yaxshi",
        "Average": "O'rtacha",
        "Poor": "Past",
        "Quality of service": "Xizmat sifati",
        "Ease of access": "Qulaylik darajasi",
        "Facilities": "Imkoniyatlar",
        "Good value": "Yaxshi qiymat",
        "Favorite place": "Sevimli joy",
        "What guests loved most": "Mehmonlar nimani eng yaxshi ko'rdi",
        "What guests loved most:": "Mehmonlar nimani eng yaxshi ko'rdi:",
        "Explore all %(n)s reviews": "Barcha %(n)s ta sharhni ko'rish",
        "Show all %(n)s photos": "Barcha %(n)s ta rasmni ko'rish",
        "Show more": "Yana ko'rsatish",
        "Show more dates": "Yana sanalarni ko'rsatish",
        "No stories have been shared yet. Be the pioneer and share your thoughts.":
            "Hali hech kim hikoya yozmagan. Birinchi bo'lib o'z fikrlaringizni ulashing.",
        "The stage is yours": "Sahna sizniki",

        # ── Detail page ────────────────────────────────────────
        "Why visit": "Nima uchun tashrif buyurish kerak",
        "Why": "Nima uchun",
        "What's included": "Nimalar kiradi",
        "Frequently asked questions": "Tez-tez beriladigan savollar",
        "Duration:": "Davomiyligi:",
        "Similar travelers": "Sizga o'xshash sayohatchilar",
        "Travelers like you also loved": "Sizga o'xshash sayohatchilar ham yoqtirdi",
        "No similar destinations found.": "O'xshash manzillar topilmadi.",
        "Experiences": "Tajribalar",
        "Perfect for": "Quyidagilar uchun mukammal",
        "View Details": "Batafsil ko'rish",
        "See Details": "Batafsil",

        # ── Compare / wishlist ─────────────────────────────────
        "Free": "Bepul",
        "Non-refundable": "Qaytarib berilmaydi",
        "Match": "Mos kelish",
        "Best Match": "Eng yaxshi moslik",
        "Best match": "Eng yaxshi moslik",
        "Good match": "Yaxshi mos kelish",
        "Bad match": "Yomon mos kelish",
        "Not interested": "Qiziqarli emas",

        # ── Recommendations / quiz ─────────────────────────────
        "Your Taste DNA": "Sizning ta'mingiz DNK'si",
        "Your top travel styles": "Sayohatdagi asosiy uslublaringiz",
        "Taste quiz": "Ta'm so'rovnomasi",
        "Take the 30-second quiz": "30 soniyalik so'rovnomani to'ldirish",
        "Refine my taste": "Ta'mimni aniqlashtirish",
        "Answer 3 quick questions and our AI will instantly re-tune your Taste DNA.":
            "3 ta tez savolga javob bering, sun'iy intellekt darhol Ta'm DNK'ingizni qayta sozlaydi.",
        "What kind of trips do you love?": "Qanday sayohatlarni yoqtirasiz?",
        "What's your budget style?": "Sizning byudjet uslubingiz qanday?",
        "Who do you usually travel with?": "Odatda kim bilan sayohat qilasiz?",
        "Pick all that apply.": "Mos keladiganlarning hammasini tanlang.",
        "Pick one.": "Bittasini tanlang.",
        "Save a few trips you like — your travel styles will appear here and every recommendation gets sharper.":
            "Yoqtirgan sayohatlaringizni saqlang — sayohat uslublaringiz shu yerda paydo bo'ladi va har bir tavsiya yanada aniqroq bo'ladi.",
        "destinations matched to your Taste DNA": "Ta'm DNK'ingizga mos manzillar",
        "Because you saved": "Siz saqlaganingiz uchun",
        "signals": "signal",

        # ── AI search ──────────────────────────────────────────
        "Ask AI": "AI dan so'rang",
        "AI is reading your request…": "AI so'rovingizni o'qimoqda…",
        "Understanding your travel intent": "Sayohat istagingiz tushunilmoqda",
        "Tell us your dream trip in your own words — our AI reads it, understands your taste and finds the best matches.":
            "Orzudagi sayohatingizni o'z so'zlaringiz bilan ayting — AI uni o'qiydi, ta'mingizni tushunadi va eng yaxshi mosliklarni topadi.",
        "e.g. A quiet beach escape under $600 for 2 in summer…":
            "masalan: Yozda 2 kishi uchun $600 dan kam jim plyaj ta'tili…",
        "Try:": "Sinab ko'ring:",
        "Romantic city break in Europe": "Yevropada romantik shahar ta'tili",
        "Family-friendly beach under $1000": "$1000 dan arzon oilaviy plyaj",
        "Adventure trip with mountains & hiking": "Tog'lar va piyoda sayohatli sarguzasht",

        # ── Booking flow ───────────────────────────────────────
        "Continue": "Davom etish",
        "Save": "Saqlash",
        "Back": "Orqaga",
        "Saved": "Saqlandi",
        "Next": "Keyingi",
        "Previous": "Oldingi",
        "Share": "Ulashish",
        "Feedback": "Mulohaza",

        # ── Calendar / time ────────────────────────────────────
        "Days": "Kunlar",
        "Hours": "Soatlar",
        "Mins": "Daqiqalar",
        "Secs": "Soniyalar",
        "Mo": "Du",
        "Tu": "Se",
        "We": "Ch",
        "Th": "Pa",
        "Fr": "Ju",
        "Sa": "Sh",
        "Su": "Ya",
        "Step": "Bosqich",
        "of 3": "/ 3",
        "reviews": "sharhlar",

        # ── Misc ───────────────────────────────────────────────
        "We're still adding destinations here. Check back soon — new cities and tours are on the way.":
            "Biz bu yerga manzillar qo'shishni davom ettirmoqdamiz. Tez orada qayta tashrif buyuring — yangi shaharlar va sayohatlar yo'lda.",
        "No image": "Rasm yo'q",
        "Weather data failed to load. Check your internet connection.":
            "Ob-havo ma'lumotlarini yuklab bo'lmadi. Internet aloqasini tekshiring.",

        # ── Recommendation: Taste DNA portret yorlig'i ──────────
        "Save a trip or take the quiz to personalize this":
            "Buni shaxsiylashtirish uchun sayohat saqlang yoki testdan o'ting",
        "Generated by AI from your activity":
            "Faolligingiz asosida AI tomonidan yaratilgan",
        "Based on your activity": "Faolligingiz asosida",
    },

    'ru': {
        # ── Money / pricing labels ──────────────────────────────
        "$0–50 / day": "$0–50 / день",
        "$50–150 / day": "$50–150 / день",
        "$150+ / day": "$150+ / день",
        "/person": "/человек",
        "from": "от",
        "From": "От",
        "person": "человек",
        "Per person, per day.": "На человека в день.",
        "Includes taxes and charges": "Включая налоги и сборы",

        # ── Admin / ActionLog ───────────────────────────────────
        "Authentication": "Аутентификация",
        "Data Mutation": "Изменение данных",
        "Access Control": "Контроль доступа",
        "System Event": "Системное событие",
        "Financial Activity": "Финансовая активность",
        "Security Alert": "Уведомление безопасности",
        "Debug": "Отладка",
        "Info": "Информация",
        "Warning": "Предупреждение",
        "Error": "Ошибка",
        "Critical": "Критическое",
        "Alert": "Тревога",
        "Actor": "Исполнитель",
        "Impersonated By": "От имени",
        "Action": "Действие",
        "Verb": "Глагол",
        "Message": "Сообщение",
        "Object Representation": "Представление объекта",
        "Pre Change Data": "Данные до изменения",
        "Post Change Data": "Данные после изменения",
        "Changes Diff": "Различия изменений",
        "Request ID": "ID запроса",
        "IP Address": "IP-адрес",
        "User Agent": "User Agent",
        "Request Path": "Путь запроса",
        "HTTP Method": "HTTP-метод",
        "Is Suspicious": "Подозрительно",
        "Execution Time (s)": "Время выполнения (с)",
        "Extra Info": "Доп. информация",
        "Action Log": "Журнал действий",
        "Action Logs": "Журналы действий",
        "Analyzed": "Проанализировано",

        # ── Notifications ───────────────────────────────────────
        "Low": "Низкий",
        "Medium": "Средний",
        "High": "Высокий",
        "Urgent": "Срочный",
        "Recipient": "Получатель",
        "Description": "Описание",
        "Level": "Уровень",
        "Priority": "Приоритет",
        "Is Read": "Прочитано",
        "Read At": "Прочитано в",
        "Email Sent": "Email отправлен",
        "Push Sent": "Push отправлен",
        "Extra Data": "Доп. данные",
        "Notification": "Уведомление",
        "Notifications": "Уведомления",
        "Enable Email": "Включить Email",
        "Enable Push": "Включить Push",
        "Enable In-App": "Включить в приложении",
        "Booking Updates": "Обновления бронирований",
        "Promotions & Offers": "Акции и предложения",
        "Price Alerts": "Ценовые уведомления",
        "Notification Setting": "Настройка уведомлений",
        "Notification Settings": "Настройки уведомлений",

        # ── Booking / payment ───────────────────────────────────
        "Pending Payment": "Ожидание оплаты",
        "Confirmed": "Подтверждено",
        "Completed": "Завершено",
        "Cancelled": "Отменено",
        "Credit Card": "Банковская карта",
        "PayPal": "PayPal",
        "Kaspi.kz": "Kaspi.kz",
        "Apple Pay": "Apple Pay",
        "Payme": "Payme",
        "Click": "Click",
        "Special Requests": "Особые пожелания",
        "Booking": "Бронирование",
        "Bookings": "Бронирования",
        "Hotels": "Отели",

        # ── User / profile ──────────────────────────────────────
        "Admin": "Администратор",
        "User": "Пользователь",
        "Users": "Пользователи",
        "User Role": "Роль пользователя",
        "Male": "Мужской",
        "Female": "Женский",
        "Other": "Другой",
        "Gender": "Пол",
        "Avatar": "Аватар",
        "Bio": "Биография",
        "Cover Photo": "Обложка",
        "Website": "Веб-сайт",
        "Current Location": "Текущее местоположение",
        "Languages Spoken": "Знание языков",
        "Travel Styles": "Стили путешествий",
        "Budget Range": "Бюджетный диапазон",
        "Theme": "Тема",
        "Light": "Светлая",
        "Dark": "Тёмная",
        "Date of Birth": "Дата рождения",
        "PhoneNumber": "Номер телефона",
        "email address": "адрес электронной почты",
        "Budget ($0-50/day)": "Эконом ($0-50/день)",
        "Mid-Range ($50-150/day)": "Средний ($50-150/день)",
        "Luxury ($150+/day)": "Люкс ($150+/день)",
        "Telefon raqami formati: '+998991234567'. 15 tagacha raqam ruxsat etiladi.":
            "Формат номера телефона: '+998991234567'. Разрешается до 15 цифр.",

        # ── Travel styles ───────────────────────────────────────
        "Adventure": "Приключения",
        "Beach": "Пляж",
        "Cultural": "Культурный",
        "Nature": "Природа",
        "Nature & Wildlife": "Природа и дикий мир",
        "City Tours": "Городские туры",
        "Romantic": "Романтический",
        "Family": "Семейный",
        "Luxury": "Люкс",
        "Budget": "Эконом",
        "Mid-range": "Средний",
        "Budget style": "Эконом стиль",

        # ── Visit types ─────────────────────────────────────────
        "Partner": "С партнёром",
        "Solo": "Один",
        "Friends": "С друзьями",
        "Visited with family": "С семьёй",
        "Visited with a partner": "С партнёром",
        "Visited with friends": "С друзьями",
        "Solo traveller": "Одиночный путешественник",

        # ── Home / hero copy ────────────────────────────────────
        "Discover Your": "Откройте свой",
        "From ancient wonders to modern marvels, discover your next unforgettable journey":
            "От древних чудес до современных шедевров — откройте свое следующее незабываемое путешествие",
        "Browse 450+ destinations or let our AI recommend perfect spots for you":
            "Просмотрите 450+ направлений или позвольте нашему ИИ подобрать идеальные места для вас",
        "Compare prices, amenities, and reviews to find the best deal":
            "Сравнивайте цены, удобства и отзывы, чтобы найти лучшее предложение",
        "Book instantly with secure payment and instant confirmation":
            "Бронируйте мгновенно с безопасной оплатой и моментальным подтверждением",
        "Pack your bags and enjoy your perfect vacation with 24/7 support":
            "Собирайте чемоданы и наслаждайтесь идеальным отпуском с поддержкой 24/7",
        "Get exclusive mobile-only deals and manage your bookings on the go":
            "Получите эксклюзивные предложения в приложении и управляйте бронированиями в пути",
        "Your trusted partner in discovering amazing destinations worldwide. AI-powered recommendations for unforgettable travel experiences.":
            "Ваш надёжный партнёр в открытии удивительных направлений по всему миру. Рекомендации на основе ИИ для незабываемых путешествий.",
        "Discover more places": "Откройте больше мест",

        # ── Destinations filters / list ─────────────────────────
        "Try adjusting your price range or other filters to find more options.":
            "Попробуйте изменить ценовой диапазон или другие фильтры, чтобы найти больше вариантов.",
        "Clear All Filters": "Очистить все фильтры",
        "No destinations available yet.": "Пока нет доступных направлений.",
        "Grid view": "Сетка",
        "List view": "Список",
        "All": "Все",
        "Sort:": "Сортировать:",
        "Tours": "Туры",
        "TRENDING": "ПОПУЛЯРНОЕ",
        "Bestsellers in": "Бестселлеры в",
        "Best seller": "Бестселлер",
        "Top Picks for You": "Лучший выбор для вас",
        "Hidden Gems for You": "Скрытые жемчужины для вас",
        "Generated from your activity": "Сгенерировано на основе вашей активности",

        # ── Ticket / time selection ─────────────────────────────
        "Select tickets": "Выберите билеты",
        "Select time": "Выберите время",
        "Search ticket availability by date": "Поиск билетов по дате",
        "Tickets and prices": "Билеты и цены",
        "How many tickets?": "Сколько билетов?",
        "Free entry": "Бесплатный вход",
        "This place is free to visit — no ticket or booking required. Just turn up and explore.":
            "Это место можно посетить бесплатно — билет или бронирование не нужны. Просто приходите и исследуйте.",
        "Standard Experience": "Стандартный опыт",

        # ── Reviews ────────────────────────────────────────────
        "Write a review": "Написать отзыв",
        "Share your experience": "Поделитесь впечатлениями",
        "Thank you for your review!": "Спасибо за ваш отзыв!",
        "No reviews yet.": "Пока нет отзывов.",
        "No reviews found.": "Отзывы не найдены.",
        "Verified Traveller": "Проверенный путешественник",
        "Excellent": "Отлично",
        "Fabulous": "Великолепно",
        "Good": "Хорошо",
        "Average": "Средне",
        "Poor": "Плохо",
        "Quality of service": "Качество обслуживания",
        "Ease of access": "Удобство доступа",
        "Facilities": "Удобства",
        "Good value": "Хорошее соотношение",
        "Favorite place": "Любимое место",
        "What guests loved most": "Что больше всего понравилось гостям",
        "What guests loved most:": "Что больше всего понравилось гостям:",
        "Explore all %(n)s reviews": "Посмотреть все %(n)s отзывов",
        "Show all %(n)s photos": "Показать все %(n)s фото",
        "Show more": "Показать больше",
        "Show more dates": "Показать ещё даты",
        "No stories have been shared yet. Be the pioneer and share your thoughts.":
            "Пока никто не делился впечатлениями. Будьте первым и поделитесь своими мыслями.",
        "The stage is yours": "Сцена ваша",

        # ── Detail page ────────────────────────────────────────
        "Why visit": "Почему стоит посетить",
        "Why": "Почему",
        "What's included": "Что включено",
        "Frequently asked questions": "Часто задаваемые вопросы",
        "Duration:": "Длительность:",
        "Similar travelers": "Похожие путешественники",
        "Travelers like you also loved": "Путешественникам как вы также понравились",
        "No similar destinations found.": "Похожие направления не найдены.",
        "Experiences": "Впечатления",
        "Perfect for": "Идеально для",
        "View Details": "Подробнее",
        "See Details": "Подробнее",

        # ── Compare / wishlist ─────────────────────────────────
        "Free": "Бесплатно",
        "Non-refundable": "Без возврата",
        "Match": "Совпадение",
        "Best Match": "Лучшее совпадение",
        "Best match": "Лучшее совпадение",
        "Good match": "Хорошее совпадение",
        "Bad match": "Плохое совпадение",
        "Not interested": "Не интересно",

        # ── Recommendations / quiz ─────────────────────────────
        "Your Taste DNA": "Ваша ДНК вкуса",
        "Your top travel styles": "Ваши основные стили путешествий",
        "Taste quiz": "Опрос о вкусах",
        "Take the 30-second quiz": "Пройти 30-секундный опрос",
        "Refine my taste": "Уточнить мой вкус",
        "Answer 3 quick questions and our AI will instantly re-tune your Taste DNA.":
            "Ответьте на 3 быстрых вопроса, и наш ИИ мгновенно перенастроит вашу ДНК вкуса.",
        "What kind of trips do you love?": "Какие путешествия вы любите?",
        "What's your budget style?": "Какой ваш бюджетный стиль?",
        "Who do you usually travel with?": "С кем вы обычно путешествуете?",
        "Pick all that apply.": "Выберите все подходящие.",
        "Pick one.": "Выберите один.",
        "Save a few trips you like — your travel styles will appear here and every recommendation gets sharper.":
            "Сохраните несколько понравившихся поездок — ваши стили появятся здесь, а каждая рекомендация станет точнее.",
        "destinations matched to your Taste DNA": "направлений подобрано под вашу ДНК вкуса",
        "Because you saved": "Так как вы сохранили",
        "signals": "сигналов",

        # ── AI search ──────────────────────────────────────────
        "Ask AI": "Спросить ИИ",
        "AI is reading your request…": "ИИ читает ваш запрос…",
        "Understanding your travel intent": "Понимаем ваше намерение",
        "Tell us your dream trip in your own words — our AI reads it, understands your taste and finds the best matches.":
            "Расскажите о поездке мечты своими словами — наш ИИ прочитает это, поймёт ваш вкус и подберёт лучшие варианты.",
        "e.g. A quiet beach escape under $600 for 2 in summer…":
            "напр. Тихий пляжный отдых до $600 для двоих летом…",
        "Try:": "Попробуйте:",
        "Romantic city break in Europe": "Романтическая поездка по Европе",
        "Family-friendly beach under $1000": "Семейный пляж до $1000",
        "Adventure trip with mountains & hiking": "Приключение с горами и треккингом",

        # ── Booking flow ───────────────────────────────────────
        "Continue": "Продолжить",
        "Save": "Сохранить",
        "Back": "Назад",
        "Saved": "Сохранено",
        "Next": "Далее",
        "Previous": "Назад",
        "Share": "Поделиться",
        "Feedback": "Обратная связь",

        # ── Calendar / time ────────────────────────────────────
        "Days": "Дни",
        "Hours": "Часы",
        "Mins": "Минуты",
        "Secs": "Секунды",
        "Mo": "Пн",
        "Tu": "Вт",
        "We": "Ср",
        "Th": "Чт",
        "Fr": "Пт",
        "Sa": "Сб",
        "Su": "Вс",
        "Step": "Шаг",
        "of 3": "из 3",
        "reviews": "отзывов",

        # ── Misc ───────────────────────────────────────────────
        "We're still adding destinations here. Check back soon — new cities and tours are on the way.":
            "Мы продолжаем добавлять направления. Возвращайтесь позже — новые города и туры уже в пути.",
        "No image": "Нет изображения",
        "Weather data failed to load. Check your internet connection.":
            "Не удалось загрузить данные о погоде. Проверьте подключение к интернету.",
    },
}


class Command(BaseCommand):
    help = "Fill django.po with manual professional translations"

    def handle(self, *args, **opts):
        base = Path(settings.BASE_DIR) / 'locale'
        for lang, trans in TRANSLATIONS.items():
            po = base / lang / 'LC_MESSAGES' / 'django.po'
            if not po.exists():
                self.stderr.write(self.style.ERROR(f"Topilmadi: {po}"))
                continue
            count = fill_po(po, trans)
            self.stdout.write(self.style.SUCCESS(
                f"  ✓ {lang}: {count} ta tarjima to'ldirildi → {po.relative_to(settings.BASE_DIR)}"
            ))