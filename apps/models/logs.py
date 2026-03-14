from django.db.models import (SET_NULL, CharField, ForeignKey, GenericIPAddressField,
                              JSONField, TextField)
from apps.models.base import CreatedBaseModel


class ActionLog(CreatedBaseModel):
    user = ForeignKey('apps.User', SET_NULL, null=True, blank=True, related_name='action_logs')
    action = CharField(max_length=255, help_text="Amal turi (masalan: 'LOGIN', 'CREATE_DESTINATION')")
    message = TextField(blank=True, null=True, help_text="Batafsil tavsif")
    
    # Qo'shimcha ma'lumotlar uchun JSON formatida saqlash
    extra_data = JSONField(default=dict, blank=True)
    
    # Texnik ma'lumotlar
    ip_address = GenericIPAddressField(null=True, blank=True)
    user_agent = TextField(null=True, blank=True)

    class Meta:
        verbose_name = 'Action Log'
        verbose_name_plural = 'Action Logs'
        ordering = ['-created_at']

    def __str__(self):
        user_str = self.user.username if self.user else "System"
        return f"{user_str} - {self.action} - {self.created_at}"
