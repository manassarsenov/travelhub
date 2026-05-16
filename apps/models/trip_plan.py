from django.db import models
from django.db.models import Max
from django.utils import timezone


class TripPlan(models.Model):
    user = models.ForeignKey('apps.User', on_delete=models.CASCADE, related_name='trip_plans')
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    start_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user} — {self.name}"

    @property
    def total_days(self):
        agg = self.items.aggregate(m=Max('day_number'))
        return agg['m'] or 0

    @property
    def total_cost(self):
        return sum(
            item.destination.discounted_price
            for item in self.items.select_related('destination').all()
        )


class TripPlanItem(models.Model):
    trip_plan = models.ForeignKey(TripPlan, on_delete=models.CASCADE, related_name='items')
    destination = models.ForeignKey(
        'apps.Destination', on_delete=models.CASCADE, related_name='trip_plan_items'
    )
    day_number = models.PositiveSmallIntegerField(default=1)
    order = models.PositiveSmallIntegerField(default=0)
    note = models.TextField(blank=True)

    class Meta:
        ordering = ['day_number', 'order']
        unique_together = ('trip_plan', 'destination')

    def __str__(self):
        return f"Day {self.day_number}: {self.destination.name}"