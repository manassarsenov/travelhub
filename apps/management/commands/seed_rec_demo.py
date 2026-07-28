"""
seed_rec_demo.py
================
Tavsiya tizimini sinash uchun bitta foydalanuvchiga izchil "ta'm" beradi —
bir nechta bir xil uslubdagi (cultural) destinationni wishlist va sharh qiladi.
Shunda recommendation sahifasida Taste DNA va personalizatsiya ko'rinadi.

Foydalanish:
    python manage.py seed_rec_demo                       # email sarsenovmanas186... bo'lgan user
    python manage.py seed_rec_demo --user manas
    python manage.py seed_rec_demo --user manas --style beach
"""
import random

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.models.destinations import Destination
from apps.models.reviews import Review
from apps.models.wishlist import Wishlist


class Command(BaseCommand):
    help = "Tavsiya tizimi demosi uchun bitta foydalanuvchiga izchil ta'm seed qiladi."

    def add_arguments(self, parser):
        parser.add_argument("--user", default="", help="username yoki email (bo'sh = sarsenovmanas186...)")
        parser.add_argument("--style", default="cultural", help="trip_type: cultural | beach | adventure ...")

    def handle(self, *args, **opts):
        User = get_user_model()

        # --- foydalanuvchini topish ---
        ident = opts["user"].strip()
        if ident:
            user = (User.objects.filter(username=ident).first()
                    or User.objects.filter(email__iexact=ident).first())
        else:
            user = User.objects.filter(email__icontains="sarsenovmanas186").order_by("id").first()
        if not user:
            self.stdout.write(self.style.ERROR("Foydalanuvchi topilmadi. --user bering."))
            return

        style = opts["style"].strip()

        # --- shu uslubdagi destinationlar ---
        pool = list(Destination.objects.filter(trip_type=style)
                    .order_by("?")[:9])
        if len(pool) < 6:
            pool += list(Destination.objects.filter(trip_type="city")
                         .exclude(id__in=[d.id for d in pool]).order_by("?")[:9 - len(pool)])
        if len(pool) < 4:
            self.stdout.write(self.style.WARNING(
                f"'{style}' uslubida destination kam. Boshqa --style sinab ko'ring."))
            if not pool:
                return

        wishlist_picks = pool[:6]
        review_picks = pool[:3]

        self.stdout.write(self.style.MIGRATE_HEADING(
            f"\n{user.username} uchun '{style}' ta'mi seed qilinmoqda\n"))

        # --- wishlist ---
        wl_added = 0
        for d in wishlist_picks:
            _, created = Wishlist.objects.get_or_create(user=user, destination=d)
            if created:
                wl_added += 1
                self.stdout.write(f"  ♥ wishlist: {d.name}")

        # --- sharhlar (yuqori reyting) ---
        rv_added = 0
        for d in review_picks:
            if not Review.objects.filter(user=user, destination=d).exists():
                Review.objects.create(
                    user=user, destination=d,
                    author_name=user.get_full_name() or user.username,
                    rating=random.choice([4, 5, 5]),
                    text=f"Loved this {style} trip — exactly my kind of place.",
                    is_visible=True,
                )
                rv_added += 1
                self.stdout.write(f"  ★ review:   {d.name}")

        self.stdout.write(self.style.SUCCESS(
            f"\n✓ Tugadi.  Wishlist +{wl_added}   Sharh +{rv_added}   "
            f"({user.username} endi '{style}' ta'miga ega)"))