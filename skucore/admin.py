from django.contrib import admin
from .models import (
    UserRole, Address, Grade, Subject, Route, Bus, Parent, 
    Student, Attendance, StudentOnboardingRequest, Record,
    School, Subscription, UserSchool
)


class SchoolFilteredAdminMixin:
    """Mixin to filter querysets by school in admin"""
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        # Only filter for non-superusers
        if not request.user.is_superuser and hasattr(request, 'school') and request.school:
            qs = qs.filter(school=request.school)
        return qs
    
    def save_model(self, request, obj, form, change):
        # Set school if not already set and user has school context
        if hasattr(obj, 'school') and not obj.school and hasattr(request, 'school') and request.school:
            obj.school = request.school
        super().save_model(request, obj, form, change)


@admin.register(School)
class SchoolAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'email', 'principal_name', 'is_active', 'created_at']
    search_fields = ['name', 'code', 'email']
    list_filter = ['is_active', 'created_at']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'code', 'email', 'phone_number', 'website')
        }),
        ('Address Information', {
            'fields': ('street_address', 'city', 'state', 'postal_code', 'country')
        }),
        ('Administration', {
            'fields': ('principal_name', 'admin_email', 'is_active')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ['school', 'plan', 'status', 'max_students', 'max_users', 'start_date', 'end_date']
    search_fields = ['school__name', 'plan']
    list_filter = ['plan', 'status', 'start_date']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        ('School & Plan', {
            'fields': ('school', 'plan', 'status')
        }),
        ('Limits', {
            'fields': ('max_students', 'max_users')
        }),
        ('Dates', {
            'fields': ('start_date', 'end_date', 'renewal_date')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(UserSchool)
class UserSchoolAdmin(admin.ModelAdmin):
    list_display = ['user', 'school', 'is_primary', 'is_active', 'added_at']
    search_fields = ['user__username', 'school__name']
    list_filter = ['is_primary', 'is_active', 'added_at']
    readonly_fields = ['added_at']
    fieldsets = (
        ('User & School', {
            'fields': ('user', 'school')
        }),
        ('Settings', {
            'fields': ('is_primary', 'is_active')
        }),
        ('Timestamps', {
            'fields': ('added_at',),
            'classes': ('collapse',)
        }),
    )


@admin.register(UserRole)
class UserRoleAdmin(SchoolFilteredAdminMixin, admin.ModelAdmin):
    list_display = ['user', 'school', 'role', 'department', 'is_active', 'created_at']
    search_fields = ['user__username', 'user__email', 'school__name']
    list_filter = ['school', 'role', 'is_active', 'created_at']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        ('User & School', {
            'fields': ('user', 'school')
        }),
        ('Role Information', {
            'fields': ('role', 'department')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ['street_address', 'city', 'state', 'postal_code', 'created_at']
    search_fields = ['street_address', 'city']
    list_filter = ['city', 'state']


@admin.register(Grade)
class GradeAdmin(SchoolFilteredAdminMixin, admin.ModelAdmin):
    list_display = ['school', 'grade_name', 'created_at']
    search_fields = ['school__name', 'grade_name']
    list_filter = ['school', 'created_at']


@admin.register(Subject)
class SubjectAdmin(SchoolFilteredAdminMixin, admin.ModelAdmin):
    list_display = ['school', 'subject_name', 'created_at']
    search_fields = ['school__name', 'subject_name']
    list_filter = ['school', 'created_at']


@admin.register(Route)
class RouteAdmin(SchoolFilteredAdminMixin, admin.ModelAdmin):
    list_display = ['school', 'route_name', 'start_location', 'end_location', 'created_at']
    search_fields = ['school__name', 'route_name']
    list_filter = ['school', 'created_at']


@admin.register(Bus)
class BusAdmin(SchoolFilteredAdminMixin, admin.ModelAdmin):
    list_display = ['school', 'bus_number', 'route', 'capacity', 'driver_name', 'created_at']
    search_fields = ['school__name', 'bus_number', 'driver_name']
    list_filter = ['school', 'route', 'created_at']
    
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        """Filter Route by school"""
        if hasattr(request, 'school') and request.school and db_field.name == 'route':
            kwargs['queryset'] = Route.objects.filter(school=request.school)
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


@admin.register(Parent)
class ParentAdmin(SchoolFilteredAdminMixin, admin.ModelAdmin):
    list_display = ['school', 'first_name', 'last_name', 'parent_type', 'email', 'phone_number', 'created_at']
    search_fields = ['school__name', 'first_name', 'last_name', 'email']
    list_filter = ['school', 'parent_type', 'created_at']


@admin.register(Student)
class StudentAdmin(SchoolFilteredAdminMixin, admin.ModelAdmin):
    list_display = ['school', 'first_name', 'last_name', 'email', 'grade', 'bus', 'is_active', 'created_at']
    search_fields = ['school__name', 'first_name', 'last_name', 'email']
    list_filter = ['school', 'grade', 'is_active', 'created_at']
    filter_horizontal = ['parents', 'subjects']
    
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        """Filter ForeignKey fields by school"""
        if hasattr(request, 'school') and request.school:
            if db_field.name in ['grade', 'bus']:
                kwargs['queryset'] = db_field.related_model.objects.filter(school=request.school)
        return super().formfield_for_foreignkey(db_field, request, **kwargs)
    
    def formfield_for_manytomany(self, db_field, request, **kwargs):
        """Filter ManyToMany fields by school"""
        if hasattr(request, 'school') and request.school:
            if db_field.name in ['parents', 'subjects']:
                kwargs['queryset'] = db_field.related_model.objects.filter(school=request.school)
        return super().formfield_for_manytomany(db_field, request, **kwargs)


@admin.register(Attendance)
class AttendanceAdmin(SchoolFilteredAdminMixin, admin.ModelAdmin):
    list_display = ['school', 'student', 'date', 'status', 'recorded_by', 'created_at']
    search_fields = ['school__name', 'student__first_name', 'student__last_name', 'date']
    list_filter = ['school', 'status', 'date', 'created_at']
    
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        """Filter student by school"""
        if hasattr(request, 'school') and request.school and db_field.name == 'student':
            kwargs['queryset'] = Student.objects.filter(school=request.school)
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


@admin.register(StudentOnboardingRequest)
class StudentOnboardingRequestAdmin(SchoolFilteredAdminMixin, admin.ModelAdmin):
    list_display = ['school', 'first_name', 'last_name', 'requested_by', 'status', 'approved_by', 'created_at']
    search_fields = ['school__name', 'first_name', 'last_name', 'email']
    list_filter = ['school', 'status', 'created_at']
    readonly_fields = ['requested_by', 'approved_by', 'approved_at', 'created_student']
    filter_horizontal = ['parents', 'subjects']

    def get_readonly_fields(self, request, obj=None):
        if obj:  # Editing an existing object
            return self.readonly_fields + ['first_name', 'last_name', 'email', 'phone_number', 'date_of_birth']
        return self.readonly_fields
    
    def formfield_for_manytomany(self, db_field, request, **kwargs):
        """Filter parents and subjects by school"""
        if hasattr(request, 'school') and request.school:
            if db_field.name in ['parents', 'subjects']:
                kwargs['queryset'] = db_field.related_model.objects.filter(school=request.school)
        return super().formfield_for_manytomany(db_field, request, **kwargs)


@admin.register(Record)
class RecordAdmin(SchoolFilteredAdminMixin, admin.ModelAdmin):
    list_display = ['school', 'student', 'record_type', 'uploaded_by', 'created_at']
    search_fields = ['school__name', 'student__first_name', 'student__last_name']
    list_filter = ['school', 'record_type', 'created_at']
    readonly_fields = ['uploaded_by', 'created_at', 'updated_at']
    fieldsets = (
        ('Document Information', {
            'fields': ('school', 'student', 'onboarding_request', 'record_type')
        }),
        ('File', {
            'fields': ('file', 'description')
        }),
        ('Metadata', {
            'fields': ('uploaded_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
