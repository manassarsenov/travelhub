#!/bin/sh
set -e

echo "==> Container started, PORT=${PORT}"
echo "==> Activating venv..."
. /app/.venv/bin/activate

echo "==> Running migrations..."
python manage.py migrate --noinput

echo "==> Collecting static files..."
python manage.py collectstatic --noinput || true

echo "==> Compiling messages..."
python manage.py compilemessages -i .venv || true

echo "==> Seeding initial data (if empty)..."
python manage.py shell -c "
from apps.models import Destination
if not Destination.objects.exists():
    from django.core.management import call_command
    for fixture in [
        'apps/fixtures/countries.json',
        'apps/fixtures/regions.json',
        'apps/fixtures/cities.json',
        'apps/fixtures/tags.json',
        'apps/fixtures/activities.json',
        'apps/fixtures/destinations.json',
    ]:
        call_command('loaddata', fixture)
        print(f'Loaded {fixture}')
    print('==> Seed done')
else:
    print('==> Data exists, skipping seed')
" || true

echo "==> Starting Gunicorn..."
exec gunicorn root.wsgi:application \
    --bind "0.0.0.0:${PORT:-8000}" \
    --workers "${GUNICORN_WORKERS:-2}" \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -