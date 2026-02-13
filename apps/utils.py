from django.contrib.auth.tokens import default_token_generator
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.urls import reverse_lazy
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from apps.tokens import account_activation_token


def send_user_email(user, host: str, email_type: str):
    if email_type == 'registration':
        subject = 'Activate Your Account'
        token = account_activation_token.make_token(user)
        uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
        url = reverse_lazy('confirm_email_page', kwargs={'uidb64': uidb64, 'token': token})
        template = 'apps/auth/registration_email.html'
        context = {
            'username': user.username,
            'confirm_link': host + url,
            'email': user.email
        }
    elif email_type == 'reset_password':
        subject = 'Reset Your Password'
        token = default_token_generator.make_token(user)
        uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
        url = reverse_lazy('password_reset_confirm', kwargs={'uidb64': uidb64, 'token': token})
        template = 'apps/auth/reset_password_email.html'
        context = {
            'username': user.username,
            'reset_link': host + url,
            'email': user.email
        }
    else:
        raise ValueError("Invalid email_type")

    html_content = render_to_string(template, context)
    email = EmailMultiAlternatives(
        subject=subject,
        body="This is an HTML email",  # plain text fallback
        to=[user.email]
    )
    email.attach_alternative(html_content, "text/html")
    email.send()
