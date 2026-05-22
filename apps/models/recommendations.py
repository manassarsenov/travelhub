"""
apps/models/recommendations.py
==============================
Tavsiya tizimining o'rganuvchi qatlami — 3-bosqich.

  • RecommendationFeedback — har kartadagi 👍 / 👎 / "Qiziq emas".
    Tizim keyingi yuklashda shu asosda qayta saralaydi.
  • RecommendationProfile  — quiz javoblari (cold-start personalizatsiyasi).
"""
from django.db.models import (CASCADE, CharField, ForeignKey, OneToOneField,
                              UniqueConstraint)
from django.db.models.enums import TextChoices

from apps.models.base import CreatedBaseModel


class RecommendationFeedback(CreatedBaseModel):
    """Tavsiya kartasiga bildirilgan munosabat."""

    class Action(TextChoices):
        UP = 'up', 'Good match'
        DOWN = 'down', 'Bad match'
        DISMISS = 'dismiss', 'Not interested'

    user = ForeignKey('apps.User', CASCADE, related_name='rec_feedback')
    destination = ForeignKey('apps.Destination', CASCADE, related_name='rec_feedback')
    action = CharField(max_length=10, choices=Action.choices)

    class Meta:
        constraints = [
            UniqueConstraint(fields=['user', 'destination'],
                             name='uniq_rec_feedback_user_dest'),
        ]
        verbose_name = 'Recommendation Feedback'
        verbose_name_plural = 'Recommendation Feedback'

    def __str__(self):
        return f"{self.user} → {self.destination} [{self.action}]"


class RecommendationProfile(CreatedBaseModel):
    """Quiz javoblari — tarixi yo'q foydalanuvchini darhol personallashtiradi."""

    user = OneToOneField('apps.User', CASCADE, related_name='rec_profile')
    quiz_styles = CharField(max_length=200, blank=True,
                            help_text="vergul bilan: cultural,beach,adventure")
    quiz_budget = CharField(max_length=20, blank=True, help_text="budget | mid | luxury")
    quiz_party = CharField(max_length=20, blank=True,
                           help_text="solo | partner | family | friends")

    class Meta:
        verbose_name = 'Recommendation Profile'
        verbose_name_plural = 'Recommendation Profiles'

    def styles_list(self):
        return [s.strip() for s in self.quiz_styles.split(',') if s.strip()]

    def __str__(self):
        return f"Taste quiz: {self.user}"