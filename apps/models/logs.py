import uuid

from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db.models import (
    SET_NULL, CharField, ForeignKey, JSONField, BooleanField,
    TextChoices, IntegerChoices, UUIDField,
    IntegerField, TextField, GenericIPAddressField, FloatField, Index
)
from django.utils.translation import gettext_lazy as _

from apps.models.base import CreatedBaseModel


class ActionLog(CreatedBaseModel):
    class Category(TextChoices):
        AUTH = 'auth', _('Authentication')
        DATA = 'data', _('Data Mutation')
        ACCESS = 'access', _('Access Control')
        SYSTEM = 'system', _('System Event')
        FINANCE = 'finance', _('Financial Activity')
        SECURITY = 'security', _('Security Alert')

    class Level(IntegerChoices):
        DEBUG = 10, _('Debug')
        INFO = 20, _('Info')
        WARNING = 30, _('Warning')
        ERROR = 40, _('Error')
        CRITICAL = 50, _('Critical')
        ALERT = 60, _('Alert')

    id = UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = ForeignKey(
        'apps.User', 
        on_delete=SET_NULL, 
        null=True, 
        blank=True, 
        related_name='audit_logs',
        verbose_name=_("Actor")
    )
    
    impersonated_by = ForeignKey(
        'apps.User', 
        on_delete=SET_NULL, 
        null=True, 
        blank=True, 
        related_name='impersonated_actions',
        verbose_name=_("Impersonated By")
    )

    category = CharField(max_length=20, choices=Category.choices, default=Category.DATA, db_index=True)
    action = CharField(max_length=255, db_index=True, verbose_name=_("Action"))
    verb = CharField(max_length=100, default='created',verbose_name=_("Verb"))
    level = IntegerField(choices=Level.choices, default=Level.INFO, db_index=True)
    message = TextField(default="no message",verbose_name=_("Message"))

    content_type = ForeignKey(
        ContentType, 
        on_delete=SET_NULL, 
        null=True, 
        blank=True,
        related_name='object_logs'
    )
    object_id = CharField(max_length=255, null=True, blank=True)
    target_object = GenericForeignKey('content_type', 'object_id')
    object_repr = CharField(max_length=255, null=True, blank=True, verbose_name=_("Object Representation"))

    pre_change_data = JSONField(default=dict, blank=True, verbose_name=_("Pre Change Data"))
    post_change_data = JSONField(default=dict, blank=True, verbose_name=_("Post Change Data"))
    changes_diff = JSONField(default=dict, blank=True, verbose_name=_("Changes Diff"))

    request_id = CharField(max_length=50, null=True, blank=True, db_index=True, verbose_name=_("Request ID"))
    ip_address = GenericIPAddressField(null=True, blank=True, db_index=True, verbose_name=_("IP Address"))
    user_agent = TextField(null=True, blank=True, verbose_name=_("User Agent"))
    path = CharField(max_length=1024, null=True, blank=True, verbose_name=_("Request Path"))
    method = CharField(max_length=10, null=True, blank=True, verbose_name=_("HTTP Method"))
    
    is_suspicious = BooleanField(default=False, db_index=True, verbose_name=_("Is Suspicious"))
    execution_time = FloatField(null=True, blank=True, verbose_name=_("Execution Time (s)"))
    extra_info = JSONField(default=dict, blank=True, verbose_name=_("Extra Info"))

    class Meta:
        verbose_name = _('Action Log')
        verbose_name_plural = _('Action Logs')
        ordering = ['-created_at']
        indexes = [
            Index(fields=['content_type', 'object_id']),
            Index(fields=['category', 'level']),
            Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"[{self.get_category_display()}] {self.action} by {self.user or 'System'}"
