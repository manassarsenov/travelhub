import os

from celery import Celery

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'root.settings')

app = Celery('root')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
# - namespace='CELERY' means all celery-related configuration keys
#   should have a `CELERY_` prefix.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django apps.
app.autodiscover_tasks()

# Beat schedule - flash sale'larni avtomatik tozalash
app.conf.beat_schedule = {
    'expire-flash-sales-every-5-minutes': {
        'task': 'expire_flash_sales',
        'schedule': 300.0,  # har 5 daqiqada
    },
    'check-price-drop-alerts-daily': {
        'task': 'check_price_drop_alerts',
        'schedule': 86400.0,  # har kuni (24 soat = 86400 sekund)
    },
}


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f'Request: {self.request!r}')