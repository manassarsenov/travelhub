from django.urls import path, re_path

from apps.views import HomeTemplateView, DestinationsTemplateView, RecommendationTemplateView, \
    AboutTemplateView, ContactTemplateView, BlogTemplateView, NotificationTemplateView, DashboardTemplateView, \
    MyBookingsTemplateView, WishlistTemplateView, ProfileSettingsTemplateView, AdminPanelTemplateView, \
    TelegramChannelTemplateView, InstagramTemplateView, RegisterCreateView, LoginFormView, CustomLogoutView, \
    ActivateAccountView, ForgotPasswordView, PasswordResetConfirmView, GoogleLoginView, GoogleCallbackView, \
    HelpCenterTemplateView, TermsOfServiceTemplateView, PrivacyPolicyTemplateView, CancellationTemplateView, \
    FAQTemplateView

urlpatterns = [
    path('', HomeTemplateView.as_view(), name='home_page'),
    path('destinations/', DestinationsTemplateView.as_view(), name='destinations_page'),
    path('recommendation/', RecommendationTemplateView.as_view(), name='recommendation_page'),
    path('about/', AboutTemplateView.as_view(), name='about_page'),
    path('contact/', ContactTemplateView.as_view(), name='contact_page'),
    path('blog/', BlogTemplateView.as_view(), name='blog_page'),
    path('notification/', NotificationTemplateView.as_view(), name='notification_page'),
    path('dashboard/', DashboardTemplateView.as_view(), name='dashboard_page'),
    path('my_bookings/', MyBookingsTemplateView.as_view(), name='my_bookings_page'),
    path('wishlist/', WishlistTemplateView.as_view(), name='wishlist_page'),
    path('profile-settings/', ProfileSettingsTemplateView.as_view(), name='profile_settings_page'),
    path('admin_panel/', AdminPanelTemplateView.as_view(), name='admin_panel_page'),
    path('telegram-channel/', TelegramChannelTemplateView.as_view(), name='telegram_channel_page'),
    path('instagram/', InstagramTemplateView.as_view(), name='instagram_page'),
    path('auth/register/', RegisterCreateView.as_view(), name='register_page'),
    path('auth/login/', LoginFormView.as_view(), name='login_page'),
    path('auth/logout/', CustomLogoutView.as_view(), name='logout_page'),
    path('auth/forgot-password/', ForgotPasswordView.as_view(), name='forgot_password_page'),
    path('help-center/', HelpCenterTemplateView.as_view(), name='help_center_page'),
    path('terms-of-service/', TermsOfServiceTemplateView.as_view(), name='terms_of_service_page'),
    path('privacy-policy/', PrivacyPolicyTemplateView.as_view(), name='privacy_policy_page'),
    path('cancellation/', CancellationTemplateView.as_view(), name='cancellation_page'),
    path('faq/', FAQTemplateView.as_view(), name='faq_page'),

    re_path(r'^auth/user/confirm/(?P<uidb64>[0-9A-Za-z_\-]+)/(?P<token>[0-9A-Za-z]{1,13}-[0-9A-Za-z]{1,40})/$',
            ActivateAccountView.as_view(), name='confirm_email_page'),

    path('reset-password/<uidb64>/<token>/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),

    path("auth/google-login", GoogleLoginView.as_view(), name='google_login_page'),
    path("auth/oauth2/callback", GoogleCallbackView.as_view(), name='google_callback_page'),

]
