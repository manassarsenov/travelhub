"""
Bir martalik komanda: locale/{uz,ru}/LC_MESSAGES/djangojs.po fayllarini
qo'lda yozilgan tarjimalar bilan to'ldiradi.
"""
import re
from pathlib import Path

from django.core.management.base import BaseCommand
from django.conf import settings


TRANSLATIONS = {
    'uz': {
        "0 destinations found": "0 ta manzil topilmadi",
        "Alert off": "Bildirishnoma o'chirildi",
        "Alert on": "Bildirishnoma yoqildi",
        "All": "Hammasi",
        "All alerts on": "Barcha bildirishnomalar yoqilgan",
        "All Destinations": "Barcha manzillar",
        "All price alerts are already active!": "Barcha narx bildirishnomalari allaqachon faol!",
        "Available Flights": "Mavjud reyslar",
        "Available Hotels": "Mavjud mehmonxonalar",
        "Browse All Destinations": "Barcha manzillarni ko'rish",
        "Cancel": "Bekor qilish",
        "Cancellation": "Bekor qilish",
        "Check your connection": "Internet aloqasini tekshiring",
        "Choose destinations from the list to compare them side by side.": "Solishtirish uchun ro'yxatdan manzillar tanlang.",
        "Cities": "Shaharlar",
        "Could not load comparison": "Solishtirishni yuklab bo'lmadi",
        "Could not load results": "Natijalarni yuklab bo'lmadi",
        "Could not load results for \"%s\"": "\"%s\" uchun natijalarni yuklab bo'lmadi",
        "Could not update alert. Try again.": "Bildirishnomani yangilab bo'lmadi. Qayta urinib ko'ring.",
        "Countries": "Davlatlar",
        "Destinations": "Manzillar",
        "Discount": "Chegirma",
        "Duration": "Davomiyligi",
        "Error": "Xato",
        "Error loading destinations.": "Manzillarni yuklashda xato.",
        "Error – Try Again": "Xato – Qayta urinish",
        "Fetching the latest details for your selected destinations.": "Tanlangan manzillar bo'yicha so'nggi ma'lumotlar yuklanmoqda.",
        "Flight Options": "Reys variantlari",
        "Flights": "Reyslar",
        "Free": "Bepul",
        "Hotel Options": "Mehmonxona variantlari",
        "Hotels": "Mehmonxonalar",
        "Link copied!": "Havola nusxalandi!",
        "Loading...": "Yuklanmoqda...",
        "Loading comparison…": "Solishtirish yuklanmoqda…",
        "Load More": "Yana yuklash",
        "Load More Cities": "Yana shaharlarni yuklash",
        "Load More Destinations": "Yana manzillarni yuklash",
        "Login required": "Tizimga kirish kerak",
        "My TravelHub Wishlist": "Mening TravelHub istaklar ro'yxatim",
        "Next": "Keyingi",
        "night": "kecha",
        "No": "Yo'q",
        "No cities yet for %s": "%s uchun hali shaharlar yo'q",
        "No data available": "Ma'lumot yo'q",
        "No destinations selected": "Hech qanday manzil tanlanmagan",
        "No flights": "Reyslar yo'q",
        "No hotels": "Mehmonxonalar yo'q",
        "Non-refundable": "Qaytarib berilmaydi",
        "No results for \"%s\"": "\"%s\" uchun natija yo'q",
        "No results found": "Natija topilmadi",
        "No tickets": "Chiptalar yo'q",
        "Package Type": "Paket turi",
        "per person": "har bir kishi uchun",
        "Please log in to set price alerts.": "Narx bildirishnomalarini sozlash uchun tizimga kiring.",
        "Previous": "Oldingi",
        "Price alert disabled for %s": "%s uchun narx bildirishnomasi o'chirildi",
        "Price alerts enabled for %s destination(s)!": "%s ta manzil uchun narx bildirishnomalari yoqildi!",
        "Regions": "Hududlar",
        "Remove": "O'chirish",
        "Removed": "O'chirildi",
        "%s+ curated things to do": "%s+ tanlab olingan tadbirlar",
        "%s destination(s) removed from wishlist.": "%s ta manzil istaklar ro'yxatidan o'chirildi.",
        "Searching...": "Qidirilmoqda...",
        "Searching for \"%s\"…": "\"%s\" qidirilmoqda…",
        "Season": "Mavsum",
        "See Details": "Batafsil ko'rish",
        "Select": "Tanlash",
        "Select at least 2 destinations": "Kamida 2 ta manzil tanlang",
        "Share": "Ulashish",
        "Showing %s destinations": "%s ta manzil ko'rsatilmoqda",
        "Showing %(shown)s of %(total)s cities": "%(total)s ta shahardan %(shown)s tasi ko'rsatilmoqda",
        "Showing %(shown)s of %(total)s destinations": "%(total)s ta manzildan %(shown)s tasi ko'rsatilmoqda",
        "Something went wrong": "Nimadir noto'g'ri ketdi",
        "Something went wrong while fetching the data. Please try again.": "Ma'lumotlarni olishda xato yuz berdi. Qayta urinib ko'ring.",
        "Start adding your dream destinations!": "Orzudagi manzillaringizni qo'shishni boshlang!",
        "Tickets": "Chiptalar",
        "Ticket Types": "Chipta turlari",
        "Trip Type": "Sayohat turi",
        "Try a different keyword": "Boshqa kalit so'z bilan urining",
        "Try a different search or category filter.": "Boshqa qidiruv yoki kategoriya filtri bilan urining.",
        "Try Again": "Qayta urinish",
        "Try different keywords or browse all destinations": "Boshqa kalit so'zlar bilan urining yoki barcha manzillarni ko'ring",
        "We're still adding destinations here. Check back soon — new cities and tours are on the way.": "Biz bu yerga manzillar qo'shishni davom ettirmoqdamiz. Tez orada qayta tashrif buyuring — yangi shaharlar va sayohatlar yo'lda.",
        "Wishlist link copied to clipboard.": "Istaklar ro'yxati havolasi nusxalandi.",
        "You have 1 destination selected. Please select one more to start comparing.": "Sizda 1 ta manzil tanlangan. Solishtirishni boshlash uchun yana bittasini tanlang.",
        "Yes": "Ha",
        "You can only compare up to %s destinations.": "Faqat %s tagacha manzilni solishtira olasiz.",
        "You'll be notified when %s price drops!": "%s narxi tushganda sizga xabar beriladi!",
        "Your wishlist is empty": "Sizning istaklar ro'yxatingiz bo'sh",
    },
    'ru': {
        "0 destinations found": "Не найдено ни одного направления",
        "Alert off": "Уведомление выключено",
        "Alert on": "Уведомление включено",
        "All": "Все",
        "All alerts on": "Все уведомления включены",
        "All Destinations": "Все направления",
        "All price alerts are already active!": "Все ценовые уведомления уже активны!",
        "Available Flights": "Доступные рейсы",
        "Available Hotels": "Доступные отели",
        "Browse All Destinations": "Посмотреть все направления",
        "Cancel": "Отмена",
        "Cancellation": "Отмена брони",
        "Check your connection": "Проверьте подключение к интернету",
        "Choose destinations from the list to compare them side by side.": "Выберите направления из списка, чтобы сравнить их.",
        "Cities": "Города",
        "Could not load comparison": "Не удалось загрузить сравнение",
        "Could not load results": "Не удалось загрузить результаты",
        "Could not load results for \"%s\"": "Не удалось загрузить результаты для \"%s\"",
        "Could not update alert. Try again.": "Не удалось обновить уведомление. Попробуйте ещё раз.",
        "Countries": "Страны",
        "Destinations": "Направления",
        "Discount": "Скидка",
        "Duration": "Длительность",
        "Error": "Ошибка",
        "Error loading destinations.": "Ошибка при загрузке направлений.",
        "Error – Try Again": "Ошибка – Повторить",
        "Fetching the latest details for your selected destinations.": "Загружаем актуальные данные по выбранным направлениям.",
        "Flight Options": "Варианты рейсов",
        "Flights": "Рейсы",
        "Free": "Бесплатно",
        "Hotel Options": "Варианты отелей",
        "Hotels": "Отели",
        "Link copied!": "Ссылка скопирована!",
        "Loading...": "Загрузка...",
        "Loading comparison…": "Загрузка сравнения…",
        "Load More": "Загрузить ещё",
        "Load More Cities": "Загрузить ещё города",
        "Load More Destinations": "Загрузить ещё направления",
        "Login required": "Требуется вход",
        "My TravelHub Wishlist": "Мой список желаний TravelHub",
        "Next": "Далее",
        "night": "ночь",
        "No": "Нет",
        "No cities yet for %s": "Пока нет городов для %s",
        "No data available": "Нет данных",
        "No destinations selected": "Направления не выбраны",
        "No flights": "Нет рейсов",
        "No hotels": "Нет отелей",
        "Non-refundable": "Без возврата",
        "No results for \"%s\"": "Нет результатов для \"%s\"",
        "No results found": "Ничего не найдено",
        "No tickets": "Нет билетов",
        "Package Type": "Тип пакета",
        "per person": "за человека",
        "Please log in to set price alerts.": "Войдите, чтобы настроить ценовые уведомления.",
        "Previous": "Назад",
        "Price alert disabled for %s": "Ценовое уведомление для %s отключено",
        "Price alerts enabled for %s destination(s)!": "Ценовые уведомления включены для %s направлений!",
        "Regions": "Регионы",
        "Remove": "Удалить",
        "Removed": "Удалено",
        "%s+ curated things to do": "%s+ подобранных занятий",
        "%s destination(s) removed from wishlist.": "Удалено %s направлений из списка желаний.",
        "Searching...": "Поиск...",
        "Searching for \"%s\"…": "Идёт поиск \"%s\"…",
        "Season": "Сезон",
        "See Details": "Подробнее",
        "Select": "Выбрать",
        "Select at least 2 destinations": "Выберите минимум 2 направления",
        "Share": "Поделиться",
        "Showing %s destinations": "Показано %s направлений",
        "Showing %(shown)s of %(total)s cities": "Показано %(shown)s из %(total)s городов",
        "Showing %(shown)s of %(total)s destinations": "Показано %(shown)s из %(total)s направлений",
        "Something went wrong": "Что-то пошло не так",
        "Something went wrong while fetching the data. Please try again.": "При загрузке данных произошла ошибка. Попробуйте ещё раз.",
        "Start adding your dream destinations!": "Начните добавлять направления своей мечты!",
        "Tickets": "Билеты",
        "Ticket Types": "Типы билетов",
        "Trip Type": "Тип поездки",
        "Try a different keyword": "Попробуйте другое слово",
        "Try a different search or category filter.": "Попробуйте другой поиск или фильтр категории.",
        "Try Again": "Повторить",
        "Try different keywords or browse all destinations": "Попробуйте другие слова или посмотрите все направления",
        "We're still adding destinations here. Check back soon — new cities and tours are on the way.": "Мы продолжаем добавлять направления. Возвращайтесь позже — новые города и туры уже в пути.",
        "Wishlist link copied to clipboard.": "Ссылка на список желаний скопирована.",
        "You have 1 destination selected. Please select one more to start comparing.": "Выбрано 1 направление. Выберите ещё одно, чтобы начать сравнение.",
        "Yes": "Да",
        "You can only compare up to %s destinations.": "Можно сравнивать не более %s направлений.",
        "You'll be notified when %s price drops!": "Вы получите уведомление, когда цена на %s упадёт!",
        "Your wishlist is empty": "Ваш список желаний пуст",
    },
}


def _po_unescape(s: str) -> str:
    """PO escape sequence'larini haqiqiy stringga aylantiradi (Unicode'ni saqlab)."""
    return (s.replace('\\n', '\n')
             .replace('\\"', '"')
             .replace('\\\\', '\\'))


def _po_escape(s: str) -> str:
    return s.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')


def fill_po(po_path: Path, translations: dict) -> int:
    """djangojs.po faylida bo'sh msgstr larni to'ldiradi.
    Single-line va multi-line msgid ikkalasi ham qo'llab-quvvatlanadi.
    Qaytaradi: to'ldirilgan satrlar soni.
    """
    text = po_path.read_text(encoding='utf-8')
    # msgid ... msgstr "" bloklarini topadi. msgid quyidagicha bo'lishi mumkin:
    #   msgid "single"
    #   msgid ""
    #   "first part "
    #   "second part"
    pattern = re.compile(
        r'^msgid\s+("(?:[^"\\]|\\.)*")(?:\s*\n\s*"(?:[^"\\]|\\.)*")*\s*\n'
        r'msgstr\s+""\s*$',
        re.MULTILINE,
    )
    filled = 0

    def replace(match):
        nonlocal filled
        block = match.group(0)
        # Bloк ichidan barcha "..." qismlarni ajratib olamiz
        parts = re.findall(r'"((?:[^"\\]|\\.)*)"', block.split('msgstr')[0])
        msgid = _po_unescape(''.join(parts))
        if not msgid:
            return block  # empty msgid (header) — tegmaymiz
        if msgid in translations:
            translated = translations[msgid]
            escaped = _po_escape(translated)
            # Original msgid ni saqlaymiz (xgettext line-wrap qilgan bo'lsa ham)
            msgid_block = block.split('msgstr')[0].rstrip()
            filled += 1
            return f'{msgid_block}\nmsgstr "{escaped}"'
        return block

    new_text = pattern.sub(replace, text)
    po_path.write_text(new_text, encoding='utf-8')
    return filled


class Command(BaseCommand):
    help = "Fill djangojs.po with manual JS translations"

    def handle(self, *args, **opts):
        base = Path(settings.BASE_DIR) / 'locale'
        for lang, trans in TRANSLATIONS.items():
            po = base / lang / 'LC_MESSAGES' / 'djangojs.po'
            if not po.exists():
                self.stderr.write(self.style.ERROR(f"Topilmadi: {po}"))
                continue
            count = fill_po(po, trans)
            self.stdout.write(self.style.SUCCESS(
                f"  ✓ {lang}: {count} ta tarjima to'ldirildi → {po.relative_to(settings.BASE_DIR)}"
            ))
