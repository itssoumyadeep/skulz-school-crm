"""Object-level authorization guards and query-scoping helpers for students, applications, and vendors."""

import uuid
from uuid import UUID
from django.db import models
from core.models import Student, Application, Vendor


def _teacher_or_caregiver_scope_q(request):
    assigned_class_ids = getattr(request, 'assigned_class_ids', None) or []
    assigned_grades = getattr(request, 'assigned_grades', None) or []
    if not assigned_class_ids and not assigned_grades:
        return None

    scope_q = models.Q()
    valid_class_uuids = []
    for cid in assigned_class_ids:
        try:
            valid_class_uuids.append(UUID(str(cid)))
        except (ValueError, TypeError):
            pass
    if valid_class_uuids:
        scope_q |= models.Q(class_id__in=valid_class_uuids)
    if assigned_grades:
        grade_q = models.Q()
        for g in assigned_grades:
            grade_q |= models.Q(grade__iexact=str(g))
        scope_q |= grade_q
    return scope_q


def get_student_queryset(request):
    """
    Returns student queryset scoped to requester role:
    - Owner, Admin, Principal, Vice_Principal, Staff: all active tenant students.
    - Teacher / CareGiver: scoped to assigned_class_ids / assigned_grades when configured on the token.
    - Parent: strictly scoped to linked children.
    - Board / Trustee / Vendor: no individual student access.
    """
    role = getattr(request, 'user_role', 'Admin')
    tenant_id = getattr(request, 'tenant_id', None)
    base_qs = Student.objects.filter(tenant_id=tenant_id, is_deleted=False)

    if role in ('Owner', 'Admin', 'Administrator', 'Principal', 'Vice_Principal', 'Staff'):
        return base_qs

    if role in ('Teacher', 'CareGiver', 'Care_Giver'):
        scope_q = _teacher_or_caregiver_scope_q(request)
        if scope_q is not None:
            return base_qs.filter(scope_q).distinct()
        return base_qs

    if role == 'Parent':
        user_id = getattr(request, 'user_id', None)
        user_email = getattr(request, 'user_email', None)
        linked_ids = getattr(request, 'linked_student_ids', [])

        filter_q = models.Q(student_id__in=linked_ids)
        if user_id:
            try:
                user_uuid = UUID(str(user_id))
                filter_q |= models.Q(created_by=user_uuid) | models.Q(parents__created_by=user_uuid)
            except (ValueError, TypeError):
                pass
        if user_email:
            filter_q |= models.Q(parents__email__iexact=user_email)

        return base_qs.filter(filter_q).distinct()

    if role in ('Board', 'Board_Member', 'Trustee', 'Vendor'):
        return base_qs.none()

    return base_qs


def verify_student_access(request, student: Student) -> bool:
    """
    Strict Parent & Student Scoping:
    - Admin, Principal, Vice_Principal, Owner, Staff have institutional access based on RBAC.
    - Teacher & CareGiver are scoped to assigned classes/grades when present on token.
    - Parent role can ONLY access students they are explicitly linked to (via linked_student_ids, parent FK, or created_by).
    """
    role = getattr(request, 'user_role', 'Parent')
    if role in ['Admin', 'Administrator', 'Principal', 'Vice_Principal', 'Owner', 'Staff']:
        return True

    if role in ['Teacher', 'CareGiver', 'Care_Giver']:
        assigned_class_ids = getattr(request, 'assigned_class_ids', None) or []
        assigned_grades = getattr(request, 'assigned_grades', None) or []
        if not assigned_class_ids and not assigned_grades:
            return True
        if student.class_id and str(student.class_id) in [str(c) for c in assigned_class_ids]:
            return True
        if student.grade and any(student.grade.lower() == str(g).lower() for g in assigned_grades):
            return True
        return False

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


def verify_enrolled_student_access(request, student: Student) -> bool:
    """
    Strict Student Lifecycle Gate for VA/Pen-test compliance:
    1. IDOR/BOLA Protection: Verifies parent/role relationship to student.
    2. BFLA / Lifecycle Protection: If requester is a Parent, student MUST be in 'Active' status.
       Unadmitted applicants (Pending, Under_Review, Offered, Waitlisted) cannot access
       operational student records (Attendance, Gradebook, Report Cards, Medical Logs).
    """
    if not verify_student_access(request, student):
        return False

    role = getattr(request, 'user_role', 'Parent')
    if role == 'Parent':
        if getattr(student, 'status', None) != 'Active':
            return False

    return True

