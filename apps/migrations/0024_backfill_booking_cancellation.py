from decimal import Decimal
from django.db import migrations

FEE_PERCENT = Decimal('15')


def backfill_cancellations(apps, schema_editor):
    Booking = apps.get_model('apps', 'Booking')
    cancelled = Booking.objects.filter(status='cancelled').select_related('destination')

    updates = []
    for b in cancelled:
        # Cancelled bookinglar uchun fallback hisoblash:
        #   destination free_cancellation = True   → fee 0, refund = total_price
        #   destination free_cancellation = False  → fee 15%, refund = 85%
        is_free = bool(getattr(b.destination, 'is_free_cancellation', False))
        total = Decimal(b.total_price or 0)

        if is_free:
            fee = Decimal('0.00')
            refund = total.quantize(Decimal('0.01'))
        else:
            fee = (total * FEE_PERCENT / Decimal('100')).quantize(Decimal('0.01'))
            refund = (total - fee).quantize(Decimal('0.01'))

        if b.cancellation_fee != fee or b.refund_amount != refund or not b.cancelled_at:
            b.cancellation_fee = fee
            b.refund_amount = refund
            if not b.cancelled_at:
                # CreatedBaseModel: `created_at` auto_now=True (last save),
                # `updated_at` auto_now_add=True (creation). Cancel paytidagi
                # taxminiy vaqt sifatida last-save ni olamiz.
                b.cancelled_at = getattr(b, 'created_at', None) or getattr(b, 'updated_at', None)
            updates.append(b)

    if updates:
        Booking.objects.bulk_update(
            updates,
            fields=['cancellation_fee', 'refund_amount', 'cancelled_at'],
            batch_size=200,
        )


def noop_reverse(apps, schema_editor):
    """Faqat fee/refund qiymatlarni nolga qaytaramiz — cancelled_at ga tegmaymiz."""
    Booking = apps.get_model('apps', 'Booking')
    Booking.objects.filter(status='cancelled').update(
        cancellation_fee=Decimal('0'),
        refund_amount=Decimal('0'),
    )


class Migration(migrations.Migration):

    dependencies = [
        ('apps', '0023_booking_cancellation_fee_booking_cancelled_at_and_more'),
    ]

    operations = [
        migrations.RunPython(backfill_cancellations, noop_reverse),
    ]