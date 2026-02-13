mig:
	./manage.py makemigrations
	./manage.py migrate

createadmin:
	./manage.py createsuperuser

msg:
	./manage.py makemessages -l en -l uz -l ru
	./manage.py compilemessages -i .venv

