from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db.models import (
    CASCADE, CharField, ForeignKey, JSONField, BooleanField,
    DateTimeField, TextChoices, Index, TextField
)
from django.utils.translation import gettext_lazy as _
from apps.models.base import CreatedBaseModel


class Notification(CreatedBaseModel):
    class Level(TextChoices):
        SUCCESS = 'success', _('Success')
        INFO = 'info', _('Info')
        WARNING = 'warning', _('Warning')
        ERROR = 'error', _('Error')

    class Priority(TextChoices):
        LOW = 'low', _('Low')
        MEDIUM = 'medium', _('Medium')
        HIGH = 'high', _('High')
        URGENT = 'urgent', _('Urgent')

    recipient = ForeignKey(
        'apps.User',
        on_delete=CASCADE,
        related_name='notifications',
        verbose_name=_("Recipient")
    )

    actor = ForeignKey(
        'apps.User',
        on_delete=CASCADE,
        related_name='triggered_notifications',
        null=True,
        blank=True,
        verbose_name=_("Actor")
    )

    verb = CharField(max_length=255, default='created', verbose_name=_("Verb"))
    description = TextField(null=True, blank=True, verbose_name=_("Description"))

    level = CharField(
        max_length=20,
        choices=Level.choices,
        default=Level.INFO,
        verbose_name=_("Level")
    )
    priority = CharField(
        max_length=20,
        choices=Priority.choices,
        default=Priority.MEDIUM,
        verbose_name=_("Priority")
    )

    target_content_type = ForeignKey(
        ContentType,
        on_delete=CASCADE,
        related_name='notify_target',
        null=True,
        blank=True
    )
    target_object_id = CharField(max_length=255, null=True, blank=True)
    target_object = GenericForeignKey('target_content_type', 'target_object_id')

    is_read = BooleanField(default=False, verbose_name=_("Is Read"))
    read_at = DateTimeField(null=True, blank=True, verbose_name=_("Read At"))

    email_sent = BooleanField(default=False, verbose_name=_("Email Sent"))
    push_sent = BooleanField(default=False, verbose_name=_("Push Sent"))

    extra_data = JSONField(default=dict, blank=True, verbose_name=_("Extra Data"))

    class Meta:
        verbose_name = _("Notification")
        verbose_name_plural = _("Notifications")
        ordering = ('-created_at',)
        indexes = [
            Index(fields=['recipient', 'is_read']),
            Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.recipient.username} - {self.verb}"

    def mark_as_read(self):
        if not self.is_read:
            from django.utils import timezone
            self.is_read = True
            self.read_at = timezone.now()
            self.save()


class NotificationSetting(CreatedBaseModel):
    user = ForeignKey(
        'apps.User',
        on_delete=CASCADE,
        related_name='notification_settings',
        unique=True,
        verbose_name=_("User")
    )

    enable_email = BooleanField(default=True, verbose_name=_("Enable Email"))
    enable_push = BooleanField(default=True, verbose_name=_("Enable Push"))
    enable_in_app = BooleanField(default=True, verbose_name=_("Enable In-App"))

    class Meta:
        verbose_name = _("Notification Setting")
        verbose_name_plural = _("Notification Settings")

    def __str__(self):
        return f"{self.user.username}'s notification settings"
