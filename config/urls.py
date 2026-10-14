from django.contrib import admin
from django.urls import path
from core.api import api
from core.views import parent_portal

urlpatterns = [
    # path('parent-portal/', parent_portal, name='parent-portal'),
    path('admin/', admin.site.urls),
    path('api/', api.urls),
]
