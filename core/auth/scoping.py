import uuid
from uuid import UUID
from django.db import models
from core.models import Student, Application, Vendor


def verify_student_access(request, student: Student) -> bool:
    """
    Strict Parent & Student Scoping:
    - Admin, Principal, Vice_Principal, Owner, Teacher, CareGiver, Staff have institutional access based on RBAC.
    - Parent role can ONLY access students they are explicitly linked to (via linked_student_ids, parent FK, or created_by).
    """
    role = getattr(request, 'user_role', 'Parent')
    if role in ['Admin', 'Principal', 'Vice_Principal', 'Owner', 'Teacher', 'CareGiver', 'Staff']:
        return True

    if role == 'Parent':
        user_id = getattr(request, 'user_id', None)
        user_email = getattr(request, 'user_email', None)
        linked_ids = getattr(request, 'linked_student_ids', [])

        if str(student.student_id) in linked_ids:
            return True

        if user_id:
            try:
                user_uuid = UUID(str(user_id))
                if student.created_by == user_uuid:
                    return True
            except (ValueError, TypeError):
                pass

        if user_id or user_email:
            parent_query = models.Q()
            if user_id:
                try:
                    user_uuid = UUID(str(user_id))
                    parent_query |= models.Q(created_by=user_uuid)
                except (ValueError, TypeError):
                    pass
            if user_email:
                parent_query |= models.Q(email__iexact=user_email)

            if student.parents.filter(is_deleted=False).filter(parent_query).exists():
                return True

            app_query = models.Q()
            if user_id:
                try:
                    user_uuid = UUID(str(user_id))
                    app_query |= models.Q(created_by=user_uuid)
                except (ValueError, TypeError):
                    pass
            if student.applications.filter(is_deleted=False).filter(app_query).exists():
                return True

    return False


def verify_application_access(request, application: Application) -> bool:
    """
    Strict Application Scoping:
    - Admin, Principal, Vice_Principal, Owner, Staff have institutional access.
    - Parent role can ONLY view/upload to applications they created or are linked to.
    """
    role = getattr(request, 'user_role', 'Parent')
    if role in ['Admin', 'Principal', 'Vice_Principal', 'Owner', 'Staff']:
        return True

    if role == 'Parent':
        user_id = getattr(request, 'user_id', None)
        if user_id:
            try:
                user_uuid = UUID(str(user_id))
                if application.created_by == user_uuid:
                    return True
            except (ValueError, TypeError):
                pass

        return verify_student_access(request, application.student)

    return False


def verify_vendor_access(request, vendor: Vendor) -> bool:
    """
    Strict Vendor Scoping:
    - Admin, Principal, Owner have institutional procurement access.
    - Vendor role can ONLY view their own vendor account.
    """
    role = getattr(request, 'user_role', 'Vendor')
    if role in ['Admin', 'Principal', 'Owner']:
        return True

    if role == 'Vendor':
        vendor_id = getattr(request, 'vendor_id', None)
        if vendor_id and str(vendor.vendor_id) == str(vendor_id):
            return True
        user_id = getattr(request, 'user_id', None)
        if user_id and str(vendor.created_by) == str(user_id):
            return True

    return False
