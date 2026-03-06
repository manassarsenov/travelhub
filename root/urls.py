"""
URL configuration for root project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf.urls.i18n import i18n_patterns, set_language
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from root.settings import MEDIA_ROOT, MEDIA_URL, STATIC_ROOT, STATIC_URL, DEBUG

urlpatterns = []
if DEBUG:
    import debug_toolbar

    urlpatterns += [
        path("__debug__/", include(debug_toolbar.urls)),
    ]

urlpatterns += i18n_patterns(
    path('admin/', admin.site.urls),
    path('set_language/', set_language, name='set_language'),
    path('', include('apps.urls')),
    path("i18n/", include("django.conf.urls.i18n")),
    path('rosetta/', include('rosetta.urls')),
) + static(MEDIA_URL, document_root=MEDIA_ROOT) + static(STATIC_URL, document_root=STATIC_ROOT)
