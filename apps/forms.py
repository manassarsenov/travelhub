from django.contrib.auth import authenticate
from django.contrib.auth.hashers import make_password
from django.core.exceptions import ValidationError
from django.forms import (BooleanField, CharField, ChoiceField, DateField,
                          EmailField, Form, ModelForm)
from django.forms.models import ModelChoiceField
from django.forms.widgets import PasswordInput

from apps.models import User, Country


class RegisterModelForm(ModelForm):
    first_name = CharField(max_length=255, required=True)
    last_name = CharField(max_length=255, required=True)
    username = CharField(max_length=255, required=True)
    email = EmailField(required=True)
    phone_number = CharField(max_length=20, required=False)
    date_of_birth = DateField(required=False)
    password = CharField(max_length=255, required=True)
    confirm_password = CharField(max_length=255, required=True)
    country = CharField(max_length=10, required=True)
    terms = BooleanField(required=True)
    newsletter = BooleanField(required=False)

    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'first_name', 'last_name', 'phone_number',
            'date_of_birth', 'country'
        ]

    def clean(self):
        cleaned_data = super().clean()
        email = cleaned_data.get('email')
        username = cleaned_data.get('username')
        phone_number = cleaned_data.get('phone_number')

        if User.objects.filter(username=username).exists():
            raise ValidationError("Username already exists")

        if User.objects.filter(email=email).exists():
            raise ValidationError("Email already exists")

        if phone_number and User.objects.filter(phone_number=phone_number).exists():
            raise ValidationError("This phone number is already registered")

        if cleaned_data['password'] != cleaned_data.pop('confirm_password'):
            raise ValidationError("Passwords don't match")

        cleaned_data['password'] = make_password(cleaned_data['password'])
        return cleaned_data

    def clean_country(self):
        code = self.cleaned_data.get('country')
        if not code:
            raise ValidationError("Iltimos, mamlakatni tanlang.")
        try:
            return Country.objects.get(code=code, is_active=True)
        except Country.DoesNotExist:
            raise ValidationError("Noto'g'ri mamlakat.")



class LoginForm(Form):
    identifier = CharField(label="Username or Email")
    password = CharField(max_length=128, required=True)

    remember = BooleanField(required=False)

    def clean(self):
        cleaned_data = super().clean()

        identifier = cleaned_data.get('identifier')
        password = cleaned_data.get('password')

        if not identifier or not password:
            return cleaned_data

        is_email = "@" in identifier

        try:
            if is_email:
                user_obj = User.objects.get(email=identifier)
            else:
                user_obj = User.objects.get(username=identifier)
        except User.DoesNotExist:
            if is_email:
                raise ValidationError("Email yoki parol noto'g'ri")
            else:
                raise ValidationError("Username yoki parol noto'g'ri")

        user = authenticate(username=user_obj.username, password=password)
        if not user:
            if is_email:
                raise ValidationError("Email yoki parol noto'g'ri")
            else:
                raise ValidationError("Username yoki parol noto'g'ri")

        cleaned_data['user'] = user
        return cleaned_data


class ForgotPasswordForm(Form):
    email = EmailField(max_length=254)

    def clean_email(self):
        email = self.cleaned_data.get('email')
        return email


class PasswordResetConfirmForm(Form):
    new_password = CharField(min_length=8, widget=PasswordInput())
    confirm_password = CharField(min_length=8, widget=PasswordInput())

    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get('new_password')
        confirm_password = cleaned_data.get('confirm_password')

        if password and confirm_password:
            if password != confirm_password:
                raise ValidationError("Parollar mos kelmadi!")
        return cleaned_data

    def clean_password(self):
        password = self.cleaned_data.get('new_password')

        if len(password) < 8:
            raise ValidationError("Parol kamida 8 ta belgidan iborat bo'lishi kerak.")

        if password.isdigit():
            raise ValidationError("Parol faqat raqamlardan iborat bo'lmasligi kerak.")

        if password.isalpha():
            raise ValidationError("Parol kamida bitta raqam yoki belgi bo'lishi kerak.")

        return password
