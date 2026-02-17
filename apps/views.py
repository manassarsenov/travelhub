import urllib.parse
import uuid
import requests
from django.contrib import messages
from django.contrib.auth import login, logout
from django.contrib.auth.tokens import default_token_generator
from django.shortcuts import redirect
from django.urls import reverse_lazy
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode
from django.views import View
from django.views.generic import TemplateView, CreateView, FormView

from apps.forms import RegisterModelForm, LoginForm, ForgotPasswordForm, PasswordResetConfirmForm
from apps.mixins import LoginNotRequiredMixin
from apps.models import User
from apps.tokens import account_activation_token
from apps.utils import send_user_email
from root import settings


class HomeTemplateView(TemplateView):
    template_name = 'apps/home.html'


class DestinationsTemplateView(TemplateView):
    template_name = 'apps/destinations.html'


class RecommendationTemplateView(TemplateView):
    template_name = 'apps/recommendation.html'


class AboutTemplateView(TemplateView):
    template_name = 'apps/about.html'


class ContactTemplateView(TemplateView):
    template_name = 'apps/contact.html'


class BlogTemplateView(TemplateView):
    template_name = 'apps/blog.html'


class NotificationTemplateView(TemplateView):
    template_name = 'apps/notification.html'


class DashboardTemplateView(TemplateView):
    template_name = 'apps/dashboard.html'


class MyBookingsTemplateView(TemplateView):
    template_name = 'apps/my_bookings.html'


class WishlistTemplateView(TemplateView):
    template_name = 'apps/wishlist.html'


class ProfileSettingsTemplateView(TemplateView):
    template_name = 'apps/profile_settings.html'


class AdminPanelTemplateView(TemplateView):
    template_name = 'apps/admin_panel.html'


class TelegramChannelTemplateView(TemplateView):
    template_name = 'apps/telegram_channel.html'


class InstagramTemplateView(TemplateView):
    template_name = 'apps/instagram.html'


class ActivateAccountView(View):
    def get(self, request, uidb64, token):
        try:
            uid = force_bytes(urlsafe_base64_decode(uidb64)).decode()
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None

        if user is not None and account_activation_token.check_token(user, token):
            user.is_active = True
            user.save()
            # login(request, user)
            messages.success(request, "Email tasdiqlandi, endi bemalol login qilsa bo'ladi")
        else:
            messages.error(request, "Bu linkda xatolik bor")

        return redirect('login_page')


class RegisterCreateView(CreateView):
    template_name = 'apps/auth/register.html'
    redirect_authenticated_user = True
    success_url = reverse_lazy('login_page')
    form_class = RegisterModelForm

    def form_valid(self, form):
        user = form.save(False)

        user.first_name = form.cleaned_data['first_name']
        user.last_name = form.cleaned_data['last_name']
        user.phone_number = form.cleaned_data['phone_number']
        user.date_of_birth = form.cleaned_data['date_of_birth']

        user.is_active = False
        user.save()

        send_user_email(user, f"http://{self.request.get_host()}", email_type='registration')
        messages.success(self.request, "Ro'yxatdan muvaffaqiyatli o'tdingiz! Pochtangizni tekshiring.")
        return redirect(self.success_url)

    def form_invalid(self, form):
        messages.error(self.request, 'Iltimos, to\'g\'ri email manzilini kiriting.')
        return super().form_invalid(form)


class LoginFormView(LoginNotRequiredMixin, FormView):
    template_name = 'apps/auth/login.html'
    form_class = LoginForm
    redirect_authenticated_user = True
    success_url = reverse_lazy('home_page')

    def form_valid(self, form):
        login(self.request, form.cleaned_data['user'])
        remember = form.cleaned_data.get('remember')

        if not remember:
            self.request.session.set_expiry(0)
        else:
            self.request.session.set_expiry(60 * 60 * 24 * 14)

        return super().form_valid(form)

    def form_invalid(self, form):
        return super().form_invalid(form)


class CustomLogoutView(View):
    def get(self, request):
        logout(request)
        return redirect('login_page')


class ForgotPasswordView(FormView):
    template_name = 'apps/auth/forgot_password.html'
    form_class = ForgotPasswordForm
    success_url = reverse_lazy('forgot_password_page')

    def form_valid(self, form):
        email = form.cleaned_data['email']

        try:
            user = User.objects.get(email=email)

            host = f"http://{self.request.get_host()}"
            send_user_email(user, host, email_type='reset_password')

            messages.success(
                self.request,
                'Parol tiklash havolasi emailingizga yuborildi! Iltimos, pochtangizni tekshiring.'
            )

        except User.DoesNotExist:
            # Xavfsizlik uchun: email topilmasa ham success message ko'rsatamiz
            # (aks holda attackerlar qaysi emaillar ro'yxatdan o'tganini bilib oladi)
            messages.success(
                self.request,
                'Agar bu email bizning tizimimizda mavjud bo\'lsa, parol tiklash havolasi yuborildi.'
            )

        return super().form_valid(form)

    def form_invalid(self, form):
        messages.error(self.request, 'Iltimos, to\'g\'ri email manzilini kiriting.')
        return super().form_invalid(form)


class PasswordResetConfirmView(FormView):
    template_name = 'apps/auth/reset_password.html'
    form_class = PasswordResetConfirmForm
    success_url = reverse_lazy('login_page')

    def dispatch(self, request, *args, **kwargs):
        """Token validatsiyasi - har safar sahifa ochilganda"""
        self.uidb64 = kwargs.get('uidb64')
        self.token = kwargs.get('token')

        try:
            uid = force_str(urlsafe_base64_decode(self.uidb64))
            self.user = User.objects.get(pk=uid)

            if not default_token_generator.check_token(self.user, self.token):
                messages.error(request, 'Bu havola yaroqsiz yoki muddati tugagan.')
                return redirect('forgot_password_page')

        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            messages.error(request, 'Noto\'g\'ri havola.')
            return redirect('forgot_password_page')

        return super().dispatch(request, *args, **kwargs)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['uidb64'] = self.uidb64
        context['token'] = self.token
        context['user'] = self.user
        return context

    def form_valid(self, form):
        password = form.cleaned_data['new_password']

        self.user.set_password(password)
        self.user.save()

        messages.success(
            self.request,
            'Parolingiz muvaffaqiyatli o\'zgartirildi! Endi tizimga kirishingiz mumkin.'
        )
        return super().form_valid(form)

    def form_invalid(self, form):
        messages.error(self.request, 'Iltimos, formani to\'g\'ri to\'ldiring.')
        return super().form_invalid(form)


class GoogleLoginView(View):
    def get(self, request):
        scope = "email profile"
        auth_url = (
            f"https://accounts.google.com/o/oauth2/auth?response_type=code"
            f"&client_id={settings.GOOGLE_CLIENT_ID}"
            f"&redirect_uri={urllib.parse.quote(settings.GOOGLE_REDIRECT_URI)}"
            f"&scope={urllib.parse.quote(scope)}"
        )
        return redirect(auth_url)


class GoogleCallbackView(View):
    def get(self, request):
        code = request.GET.get("code")

        token_data = {
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        }

        token_res = requests.post("https://oauth2.googleapis.com/token", data=token_data).json()
        access_token = token_res.get("access_token")

        response = requests.get(
            "https://www.googleapis.com/oauth2/v1/userinfo",
            headers={"Authorization": f"Bearer {access_token}"}
        )

        if response.status_code != 200:
            messages.error(request, "Google user info olinmadi.")
            return redirect("login_page")

        info = response.json()
        email = info.get("email")
        name = info.get("name", "")

        if not email:
            messages.error(request, "Google account email bermadi.")
            return redirect("login_page")

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:

            base_username = email.split("@")[0]
            username = base_username

            while User.objects.filter(username=username).exists():
                username = f"{base_username}_{uuid.uuid4().hex[:6]}"

            user = User.objects.create(
                username=username,
                email=email,
                first_name=name,
                is_active=True
            )

            user.set_unusable_password()
            user.save()

        login(request, user)
        return redirect("home_page")


class HelpCenterTemplateView(TemplateView):
    template_name = 'apps/help_center.html'


class TermsOfServiceTemplateView(TemplateView):
    template_name = 'apps/terms_of_service.html'


class PrivacyPolicyTemplateView(TemplateView):
    template_name = 'apps/privacy_policy.html'


class CancellationTemplateView(TemplateView):
    template_name = 'apps/cancellation.html'


class FAQTemplateView(TemplateView):
    template_name = 'apps/faq.html'
