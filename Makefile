mig:
	./manage.py makemigrations
	./manage.py migrate

createadmin:
	./manage.py createsuperuser

msg:
	./manage.py makemessages -l en -l uz -l ru
	./manage.py compilemessages -i .venv

celery:
	celery -A root worker -l INFO

flower:
	celery -A root.celery flower --port=5001

beat:
	celery -A root beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler

