#!/bin/sh
set -e

. /app/.venv/bin/activate

echo "==> Running migrations..."
python manage.py migrate --noinput

echo "==> Collecting static files..."
python manage.py collectstatic --noinput

echo "==> Compiling messages..."
python manage.py compilemessages -i .venv || true

echo "==> Starting Gunicorn..."
exec gunicorn root.wsgi:application \
    --bind "0.0.0.0:${PORT:-8000}" \
    --workers "${GUNICORN_WORKERS:-2}" \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -