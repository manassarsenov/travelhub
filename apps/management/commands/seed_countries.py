import pycountry
from django.core.management.base import BaseCommand
from django.utils.text import slugify
from phonenumbers.phonenumberutil import country_code_for_region

from apps.models import Country


def country_code_to_flag(code):
    """
    ISO alpha-2 code (UZ) -> 🇺🇿
    """
    return "".join(chr(127397 + ord(c)) for c in code.upper())


class Command(BaseCommand):
    help = "Seed all ISO countries with phone codes and flags"

    def handle(self, *args, **kwargs):
        created_count = 0
        updated_count = 0

        for country in pycountry.countries:
            alpha2 = country.alpha_2
            name = country.name

            # Phone code aniqlash
            try:
                phone_code_number = country_code_for_region(alpha2)
                phone_code = f"+{phone_code_number}" if phone_code_number else ""
            except:
                phone_code = ""

            flag = country_code_to_flag(alpha2)

            obj, created = Country.objects.update_or_create(
                code=alpha2,
                defaults={
                    "name": name,
                    "slug": slugify(name),
                    "phone_code": phone_code,
                    "flag": flag,
                    "is_active": True,
                }
            )

            if created:
                created_count += 1
            else:
                updated_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"✅ Done! Created: {created_count}, Updated: {updated_count}"
            )
        )
