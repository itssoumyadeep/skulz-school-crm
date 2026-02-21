from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api_views import (
    api_login, api_logout, api_me,
    StudentViewSet, ParentViewSet, GradeViewSet,
    SubjectViewSet, BusViewSet, RouteViewSet,
    AttendanceViewSet, OnboardingViewSet,
)

router = DefaultRouter()
router.register(r'students', StudentViewSet, basename='api-student')
router.register(r'parents', ParentViewSet, basename='api-parent')
router.register(r'grades', GradeViewSet, basename='api-grade')
router.register(r'subjects', SubjectViewSet, basename='api-subject')
router.register(r'routes', RouteViewSet, basename='api-route')
router.register(r'buses', BusViewSet, basename='api-bus')
router.register(r'attendance', AttendanceViewSet, basename='api-attendance')
router.register(r'onboarding', OnboardingViewSet, basename='api-onboarding')

urlpatterns = [
    # Auth endpoints
    path('auth/login/', api_login, name='api-login'),
    path('auth/logout/', api_logout, name='api-logout'),
    path('auth/me/', api_me, name='api-me'),

    # All resource endpoints
    path('', include(router.urls)),
]
