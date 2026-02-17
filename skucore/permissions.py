from django.contrib.auth.decorators import login_required
from django.core.exceptions import PermissionDenied
from django.shortcuts import redirect
from functools import wraps


def get_user_role(user):
    """Get the role of a user"""
    if not user.is_authenticated:
        return None
    try:
        return user.user_role.role
    except:
        return None


def user_is_teacher(user):
    """Check if user is a teacher"""
    return get_user_role(user) == 'teacher'


def user_is_operator(user):
    """Check if user is an operator"""
    return get_user_role(user) == 'operator'


def user_is_readonly(user):
    """Check if user is read-only"""
    return get_user_role(user) == 'readonly'


def user_is_admin(user):
    """Check if user is administrator"""
    return get_user_role(user) == 'admin'


def user_is_principal(user):
    """Check if user is principal"""
    return get_user_role(user) == 'principal'


def user_is_vice_principal(user):
    """Check if user is vice principal"""
    return get_user_role(user) == 'vice_principal'


def can_initiate_onboarding(user):
    """Check if user can initiate student onboarding (Teacher or Operator)"""
    role = get_user_role(user)
    return role in ['teacher', 'operator']


def can_approve_onboarding(user):
    """Check if user can approve student onboarding (Principal or Vice Principal)"""
    role = get_user_role(user)
    return role in ['principal', 'vice_principal', 'admin']


def can_edit_students(user):
    """Check if user can edit student records (Operator, Teacher, Admin, Principal, VP)"""
    role = get_user_role(user)
    return role in ['operator', 'teacher', 'admin', 'principal', 'vice_principal']


def can_delete_students(user):
    """Check if user can delete student records (Admin, Principal, VP)"""
    role = get_user_role(user)
    return role in ['admin', 'principal', 'vice_principal']


def can_view_all_data(user):
    """Check if user can view all data (everyone except readonly)"""
    role = get_user_role(user)
    return role in ['teacher', 'operator', 'admin', 'principal', 'vice_principal']


# Decorators
def role_required(*allowed_roles):
    """Decorator to check if user has one of the allowed roles"""
    def decorator(view_func):
        @wraps(view_func)
        @login_required
        def wrapper(request, *args, **kwargs):
            user_role = get_user_role(request.user)
            if user_role not in allowed_roles:
                raise PermissionDenied("You do not have permission to access this page.")
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator


def teacher_required(view_func):
    """Decorator for teacher-only access"""
    return role_required('teacher')(view_func)


def operator_required(view_func):
    """Decorator for operator-only access"""
    return role_required('operator')(view_func)


def principal_required(view_func):
    """Decorator for principal-only access"""
    return role_required('principal')(view_func)


def vice_principal_required(view_func):
    """Decorator for vice principal-only access"""
    return role_required('vice_principal')(view_func)


def admin_required(view_func):
    """Decorator for admin-only access"""
    return role_required('admin')(view_func)


def can_edit_student_required(view_func):
    """Decorator for users who can edit students"""
    @wraps(view_func)
    @login_required
    def wrapper(request, *args, **kwargs):
        if not can_edit_students(request.user):
            raise PermissionDenied("You do not have permission to edit student records.")
        return view_func(request, *args, **kwargs)
    return wrapper


def can_approve_onboarding_required(view_func):
    """Decorator for users who can approve onboarding"""
    @wraps(view_func)
    @login_required
    def wrapper(request, *args, **kwargs):
        if not can_approve_onboarding(request.user):
            raise PermissionDenied("You do not have permission to approve student onboarding.")
        return view_func(request, *args, **kwargs)
    return wrapper


# Class-based view Mixins
class RoleRequiredMixin:
    """Mixin for class-based views requiring specific roles"""
    allowed_roles = []

    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect('login')
        
        user_role = get_user_role(request.user)
        if user_role not in self.allowed_roles:
            raise PermissionDenied("You do not have permission to access this page.")
        
        return super().dispatch(request, *args, **kwargs)


class TeacherRequiredMixin(RoleRequiredMixin):
    allowed_roles = ['teacher']


class OperatorRequiredMixin(RoleRequiredMixin):
    allowed_roles = ['operator']


class PrincipalRequiredMixin(RoleRequiredMixin):
    allowed_roles = ['principal']


class VicePrincipalRequiredMixin(RoleRequiredMixin):
    allowed_roles = ['vice_principal']


class AdminRequiredMixin(RoleRequiredMixin):
    allowed_roles = ['admin']


class CanEditStudentMixin(RoleRequiredMixin):
    allowed_roles = ['operator', 'teacher', 'admin', 'principal', 'vice_principal']


class CanApproveOnboardingMixin(RoleRequiredMixin):
    allowed_roles = ['principal', 'vice_principal', 'admin']
