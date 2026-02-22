from django.contrib import admin
from django.contrib.auth import views as auth_views
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
#Remove this
from skucore.views import db_info

from skucore.views import (
    # Dashboard
    dashboard,
    # Student
    student_list, student_create, student_detail, student_update, student_delete,
    # Parent
    parent_list, parent_create, parent_detail, parent_update, parent_delete,
    # Grade
    grade_list, grade_create, grade_update, grade_delete,
    # Subject
    subject_list, subject_create, subject_update, subject_delete,
    # Route
    route_list, route_create, route_update, route_delete,
    # Bus
    bus_list, bus_create, bus_detail, bus_update, bus_delete,
    # Attendance
    attendance_list, attendance_create, attendance_update, attendance_delete,
    # Original views
    python_home, api_data
)
from skucore.portal_views import (
    # Authentication
    CustomLoginView, school_selection_view,
    # Portal routing
    portal_redirect,
    # Individual portals
    teacher_portal, operator_portal, readonly_portal, admin_portal,
    principal_portal, vice_principal_portal,
    # Onboarding
    onboarding_request_list, onboarding_request_create, onboarding_request_detail,
    onboarding_request_approve, onboarding_pending_approvals,
    # AJAX endpoints
    create_parent_inline
)

urlpatterns = [
    path('admin/', admin.site.urls),
#Remove this
    path('db-info/', db_info, name='db_info'),  # add this line
#Remove this
    # REST API endpoints
    path('api/', include('skucore.api_urls')),

    # Authentication
    path('login/', CustomLoginView.as_view(), name='login'),
    path('logout/', auth_views.LogoutView.as_view(next_page='login'), name='logout'),
    path('school-selection/', school_selection_view, name='school_selection'),
    
    # Portal route based on user role
    path('portal/', portal_redirect, name='portal_redirect'),
    
    # Individual Portals
    path('portal/teacher/', teacher_portal, name='teacher_portal'),
    path('portal/operator/', operator_portal, name='operator_portal'),
    path('portal/readonly/', readonly_portal, name='readonly_portal'),
    path('portal/admin/', admin_portal, name='admin_portal'),
    path('portal/principal/', principal_portal, name='principal_portal'),
    path('portal/vice-principal/', vice_principal_portal, name='vice_principal_portal'),
    
    # Onboarding Requests
    path('onboarding/', onboarding_request_list, name='onboarding_request_list'),
    path('onboarding/create/', onboarding_request_create, name='onboarding_request_create'),
    path('onboarding/<int:pk>/', onboarding_request_detail, name='onboarding_request_detail'),
    path('onboarding/<int:pk>/approve/', onboarding_request_approve, name='onboarding_request_approve'),
    path('onboarding/pending-approvals/', onboarding_pending_approvals, name='onboarding_pending_approvals'),
    path('api/parent/create/', create_parent_inline, name='create_parent_inline'),
    
    # Dashboard
    path('', dashboard, name='dashboard'),
    
    # Student URLs
    path('students/', student_list, name='student_list'),
    path('students/create/', student_create, name='student_create'),
    path('students/<int:pk>/', student_detail, name='student_detail'),
    path('students/<int:pk>/edit/', student_update, name='student_update'),
    path('students/<int:pk>/delete/', student_delete, name='student_delete'),
    
    # Parent URLs
    path('parents/', parent_list, name='parent_list'),
    path('parents/create/', parent_create, name='parent_create'),
    path('parents/<int:pk>/', parent_detail, name='parent_detail'),
    path('parents/<int:pk>/edit/', parent_update, name='parent_update'),
    path('parents/<int:pk>/delete/', parent_delete, name='parent_delete'),
    
    # Grade URLs
    path('grades/', grade_list, name='grade_list'),
    path('grades/create/', grade_create, name='grade_create'),
    path('grades/<int:pk>/edit/', grade_update, name='grade_update'),
    path('grades/<int:pk>/delete/', grade_delete, name='grade_delete'),
    
    # Subject URLs
    path('subjects/', subject_list, name='subject_list'),
    path('subjects/create/', subject_create, name='subject_create'),
    path('subjects/<int:pk>/edit/', subject_update, name='subject_update'),
    path('subjects/<int:pk>/delete/', subject_delete, name='subject_delete'),
    
    # Route URLs
    path('routes/', route_list, name='route_list'),
    path('routes/create/', route_create, name='route_create'),
    path('routes/<int:pk>/edit/', route_update, name='route_update'),
    path('routes/<int:pk>/delete/', route_delete, name='route_delete'),
    
    # Bus URLs
    path('buses/', bus_list, name='bus_list'),
    path('buses/create/', bus_create, name='bus_create'),
    path('buses/<int:pk>/', bus_detail, name='bus_detail'),
    path('buses/<int:pk>/edit/', bus_update, name='bus_update'),
    path('buses/<int:pk>/delete/', bus_delete, name='bus_delete'),
    
    # Attendance URLs
    path('attendance/', attendance_list, name='attendance_list'),
    path('attendance/create/', attendance_create, name='attendance_create'),
    path('attendance/<int:pk>/edit/', attendance_update, name='attendance_update'),
    path('attendance/<int:pk>/delete/', attendance_delete, name='attendance_delete'),
    
    # Original views
    path('python-ui/', python_home),
    path('api/data/', api_data),
]
# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)