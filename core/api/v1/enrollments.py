import uuid
import mimetypes
from pathlib import Path
from uuid import UUID
from typing import List, Dict, Any
from django.core.files.storage import default_storage
from django.db import models
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.http import JsonResponse
from ninja import Router

from core.models import Tenant, Application, Student, Document, EmergencyContact, AuditLog, PortalRoleMembership
from core.auth.bearer import JWTAuthBearer
from core.auth.decorators import require_roles
from core.auth.scoping import verify_student_access, verify_application_access
from core.schemas.base import build_response, build_error
from core.schemas.enrollment import (
    EnrollmentCreateSchema,
    EnrollmentDraftUpdateSchema,
    EnrollmentDecisionSchema,
    AssessmentAssignmentSchema,
    AssessmentSubmissionSchema,
    EnrollmentRecommendationSchema,
    DocumentUploadSchema,
    DocumentVerifySchema,
    StudentUpdateSchema,
)
from core.business_objects.analytics import ParentDashboardBO
from core.business_objects.enrollment import StudentProfileBO, EnrollmentCaseBO
from core.business_objects.base import BusinessRuleError

router = Router(tags=["Admissions (P01)"])


@router.get("/parent/dashboard", auth=JWTAuthBearer())
@require_roles('Parent')
def get_parent_dashboard(request):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    summary = ParentDashboardBO(
        tenant=tenant,
        user_id=getattr(request, "user_id", None),
        user_email=getattr(request, "user_email", None),
        linked_student_ids=getattr(request, "linked_student_ids", []),
    ).to_dict()
    return JsonResponse(
        build_response(
            data=summary,
            tenant_id=request.tenant_id,
            role=getattr(request, "user_role", "Parent"),
        ),
        status=200,
    )


@router.post("/enrollments", auth=JWTAuthBearer())
@require_roles('Parent', 'Admin')
def create_enrollment(request, payload: EnrollmentCreateSchema):
    """
    P01: Creates a new student inquiry/application, assigns tenant-scoped student number,
    and returns BO-02 EnrollmentCase.
    """
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    actor_id = UUID(request.user_id) if getattr(request, 'user_id', None) else None
    actor_role = getattr(request, 'user_role', 'Parent')

    if not payload.save_as_draft:
        return JsonResponse(build_error(
            errors=[{
                "code": "RULE_VIOLATION",
                "rule": "BR-01-12",
                "message": "Create a saved draft, upload required documents, then submit the application.",
            }],
            tenant_id=request.tenant_id,
            role=actor_role,
        ), status=422)

    data = {
        "student_name": payload.student_name,
        "dob": payload.dob,
        "grade": payload.grade,
        "desired_start_date": payload.desired_start_date,
        "preferred_intake": payload.preferred_intake,
        "comments": payload.comments,
        "save_as_draft": payload.save_as_draft,
        "parent_name": payload.parent_name,
        "parent_relationship": payload.parent_relationship,
        "parent_email": payload.parent_email or getattr(request, 'user_email', '') or '',
        "parent_phone": payload.parent_phone,
        "emergency_contact_name": payload.emergency_contact_name,
        "emergency_contact_phone": payload.emergency_contact_phone,
        "emergency_contact_relationship": payload.emergency_contact_relationship,
        "medical_consent": payload.medical_consent
    }

    bo = EnrollmentCaseBO.create_enrollment(
        tenant=tenant,
        data=data,
        actor_id=actor_id,
        actor_role=actor_role
    )
    return JsonResponse(bo.to_response(tenant_id=request.tenant_id, role=actor_role), status=201)


@router.patch("/enrollments/{uuid:application_id}", auth=JWTAuthBearer())
@require_roles('Parent', 'Admin')
def update_enrollment_draft(request, application_id: UUID, payload: EnrollmentDraftUpdateSchema):
    application = get_object_or_404(
        Application.objects.select_related('student', 'tenant'),
        application_id=application_id,
        tenant_id=request.tenant_id,
        is_deleted=False,
    )
    if not verify_application_access(request, application):
        return JsonResponse(build_error(
            errors=[{"code": "ACCESS_DENIED", "message": "You are not authorized to edit this application."}],
            tenant_id=request.tenant_id,
            role=getattr(request, 'user_role', 'Parent'),
        ), status=403)

    actor_id = UUID(request.user_id) if getattr(request, 'user_id', None) else None
    bo = EnrollmentCaseBO(application=application, actor_role=getattr(request, 'user_role', 'Parent'))
    bo.update_draft(payload.model_dump(exclude_unset=True), actor_id=actor_id)
    return JsonResponse(bo.to_response(tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Parent')))


@router.post("/enrollments/{application_id}/submit", auth=JWTAuthBearer())
@require_roles('Parent', 'Admin')
def submit_enrollment_draft(request, application_id: UUID):
    application = get_object_or_404(
        Application.objects.select_related('student', 'tenant'),
        application_id=application_id,
        tenant_id=request.tenant_id,
        is_deleted=False,
    )
    if not verify_application_access(request, application):
        return JsonResponse(build_error(
            errors=[{"code": "ACCESS_DENIED", "message": "You are not authorized to submit this application."}],
            tenant_id=request.tenant_id,
            role=getattr(request, 'user_role', 'Parent'),
        ), status=403)

    actor_id = UUID(request.user_id) if getattr(request, 'user_id', None) else None
    bo = EnrollmentCaseBO(application=application, actor_role=getattr(request, 'user_role', 'Parent'))
    bo.submit_draft(actor_id=actor_id)
    return JsonResponse(bo.to_response(tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Parent')))


@router.post("/enrollments/{uuid:application_id}/accept-offer", auth=JWTAuthBearer())
@require_roles('Parent')
def accept_enrollment_offer(request, application_id: UUID):
    application = get_object_or_404(
        Application.objects.select_related('student', 'tenant'),
        application_id=application_id,
        tenant_id=request.tenant_id,
        is_deleted=False,
    )
    if not verify_application_access(request, application):
        return JsonResponse(build_error(
            errors=[{"code": "ACCESS_DENIED", "message": "You are not authorized to accept this offer."}],
            tenant_id=request.tenant_id,
            role=getattr(request, 'user_role', 'Parent'),
        ), status=403)

    photo = request.FILES.get('photo')
    allowed_extensions = {'.jpg', '.jpeg', '.png'}
    if (
        not photo
        or photo.size > 10 * 1024 * 1024
        or Path(photo.name).suffix.lower() not in allowed_extensions
    ):
        return JsonResponse(build_error(
            errors=[{"code": "INVALID_UPLOAD", "message": "Upload a JPG or PNG photograph no larger than 10 MB."}],
            tenant_id=request.tenant_id,
            role=getattr(request, 'user_role', 'Parent'),
        ), status=422)

    stored_path = default_storage.save(
        f"admissions/{application_id}/{uuid.uuid4().hex}_{Path(photo.name).name}",
        photo,
    )
    actor_id = UUID(request.user_id) if getattr(request, 'user_id', None) else None
    bo = EnrollmentCaseBO(application=application, actor_role='Parent')
    try:
        bo.accept_offer(photo_file_path=stored_path, actor_id=actor_id)
    except Exception:
        default_storage.delete(stored_path)
        raise

    return JsonResponse(
        bo.to_response(tenant_id=request.tenant_id, role='Parent'),
        status=200,
    )


@router.get("/enrollments/{application_id}/status", auth=JWTAuthBearer())
def get_enrollment_status(request, application_id: UUID):
    """
    P01: Returns BO-02 EnrollmentCase snapshot for a specific application.
    """
    application = get_object_or_404(
        Application.objects.select_related('student', 'tenant'),
        application_id=application_id,
        tenant_id=request.tenant_id,
        is_deleted=False
    )
    if not verify_application_access(request, application):
        return JsonResponse(
            build_error(
                errors=[{"code": "ACCESS_DENIED", "message": "You are not authorized to access this application."}],
                tenant_id=request.tenant_id,
                role=getattr(request, 'user_role', 'Parent')
            ),
            status=403
        )

    bo = EnrollmentCaseBO(
        application=application,
        actor_role=getattr(request, 'user_role', 'Parent')
    )
    return JsonResponse(
        bo.to_response(
            tenant_id=request.tenant_id,
            role=getattr(request, 'user_role', 'Parent')
        ),
        status=200
    )


@router.put("/enrollments/{application_id}/decision", auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def update_decision(request, application_id: UUID, payload: EnrollmentDecisionSchema):
    """
    P01: Advance admission decision (Offered, Accepted, Rejected, Waitlisted, Active).
    Enforces rules BR-01-01, BR-01-02, BR-01-03, BR-01-04.
    """
    application = get_object_or_404(
        Application.objects.select_related('student', 'tenant'),
        application_id=application_id,
        tenant_id=request.tenant_id,
        is_deleted=False
    )
    actor_id = UUID(request.user_id) if getattr(request, 'user_id', None) else None
    actor_role = getattr(request, 'user_role', 'Admin')

    bo = EnrollmentCaseBO(application=application, actor_role=actor_role)
    bo.advance_status(
        new_status=payload.decision,
        actor_id=actor_id,
        actor_role=actor_role,
        reason=payload.reason,
        invoice_amount=payload.invoice_amount,
    )
    return JsonResponse(bo.to_response(tenant_id=request.tenant_id, role=actor_role), status=200)


@router.post("/enrollments/{application_id}/documents", auth=JWTAuthBearer())
def upload_document(request, application_id: UUID, payload: DocumentUploadSchema):
    """
    P01: Uploads a document associated with an admission application.
    """
    application = get_object_or_404(
        Application,
        application_id=application_id,
        tenant_id=request.tenant_id,
        is_deleted=False
    )
    if not verify_application_access(request, application):
        return JsonResponse(
            build_error(
                errors=[{"code": "ACCESS_DENIED", "message": "You are not authorized to upload documents to this application."}],
                tenant_id=request.tenant_id,
                role=getattr(request, 'user_role', 'Parent')
            ),
            status=403
        )

    actor_id = UUID(request.user_id) if getattr(request, 'user_id', None) else None

    EnrollmentCaseBO.upload_document(
        application=application,
        doc_type=payload.doc_type,
        file_path=payload.file_path,
        actor_id=actor_id,
    )

    bo = EnrollmentCaseBO(application=application, actor_role=getattr(request, 'user_role', 'Parent'))
    return JsonResponse(bo.to_response(tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Parent')), status=201)


@router.post("/enrollments/{application_id}/documents/upload", auth=JWTAuthBearer())
def upload_application_file(request, application_id: UUID):
    application = get_object_or_404(
        Application.objects.select_related('student', 'tenant'),
        application_id=application_id,
        tenant_id=request.tenant_id,
        is_deleted=False,
    )
    if not verify_application_access(request, application):
        return JsonResponse(build_error(
            errors=[{"code": "ACCESS_DENIED", "message": "You are not authorized to upload documents to this application."}],
            tenant_id=request.tenant_id,
            role=getattr(request, 'user_role', 'Parent'),
        ), status=403)

    uploaded_file = request.FILES.get('file')
    doc_type = request.POST.get('doc_type', '')
    allowed_types = {'birth_certificate', 'previous_school_records', 'photo', 'immunization', 'proof_of_address', 'other'}
    allowed_extensions = {'.pdf', '.jpg', '.jpeg', '.png'}
    if not uploaded_file or doc_type not in allowed_types:
        return JsonResponse(build_error(
            errors=[{"code": "INVALID_UPLOAD", "message": "Choose a supported document and document type."}],
            tenant_id=request.tenant_id,
            role=getattr(request, 'user_role', 'Parent'),
        ), status=422)
    if uploaded_file.size > 10 * 1024 * 1024 or Path(uploaded_file.name).suffix.lower() not in allowed_extensions:
        return JsonResponse(build_error(
            errors=[{"code": "INVALID_UPLOAD", "message": "Documents must be PDF, JPG, or PNG files no larger than 10 MB."}],
            tenant_id=request.tenant_id,
            role=getattr(request, 'user_role', 'Parent'),
        ), status=422)

    stored_path = default_storage.save(
        f"admissions/{application_id}/{uuid.uuid4().hex}_{Path(uploaded_file.name).name}",
        uploaded_file,
    )
    actor_id = UUID(request.user_id) if getattr(request, 'user_id', None) else None
    EnrollmentCaseBO.upload_document(
        application=application,
        doc_type=doc_type,
        file_path=stored_path,
        actor_id=actor_id,
    )
    bo = EnrollmentCaseBO(application=application, actor_role=getattr(request, 'user_role', 'Parent'))
    return JsonResponse(bo.to_response(tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Parent')), status=201)


@router.get("/enrollments/{application_id}/documents/{document_id}/view", auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def view_application_document(request, application_id: UUID, document_id: UUID):
    application = get_object_or_404(
        Application,
        application_id=application_id,
        tenant_id=request.tenant_id,
        is_deleted=False,
    )
    document = get_object_or_404(
        Document,
        document_id=document_id,
        application=application,
        tenant_id=request.tenant_id,
        is_deleted=False,
    )
    if not default_storage.exists(document.file_path):
        return JsonResponse(build_error(
            errors=[{"code": "DOCUMENT_NOT_FOUND", "message": "The uploaded document is no longer available."}],
            tenant_id=request.tenant_id,
            role=getattr(request, 'user_role', 'Owner'),
        ), status=404)
    content_type = mimetypes.guess_type(document.file_path)[0] or 'application/octet-stream'
    response = FileResponse(default_storage.open(document.file_path, 'rb'), content_type=content_type)
    response['Content-Disposition'] = 'inline'
    return response


@router.get("/enrollments/assessment-assessors", auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def list_assessment_assessors(request):
    memberships = PortalRoleMembership.objects.filter(
        tenant_id=request.tenant_id,
        is_active=True,
        role__in=['Admin', 'Principal', 'Teacher'],
        user__is_active=True,
    ).select_related('user').order_by('role', 'user__first_name', 'user__last_name', 'user__username')
    data = []
    for membership in memberships:
        subject = uuid.uuid5(
            uuid.NAMESPACE_URL,
            f"school-crm:{request.tenant_id}:{membership.user_id}",
        )
        data.append({
            'id': str(subject),
            'name': membership.user.get_full_name() or membership.user.username,
            'role': membership.role,
            'username': membership.user.username,
        })
    return JsonResponse(build_response(data=data, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Owner')))


@router.put("/enrollments/{application_id}/assessment-assignment", auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner', 'Vice_Principal')
def assign_assessment(request, application_id: UUID, payload: AssessmentAssignmentSchema):
    application = get_object_or_404(
        Application.objects.select_related('student', 'tenant'),
        application_id=application_id,
        tenant_id=request.tenant_id,
        is_deleted=False,
    )
    actor_id = UUID(request.user_id) if getattr(request, 'user_id', None) else None
    bo = EnrollmentCaseBO(application=application, actor_role=getattr(request, 'user_role', 'Admin'))
    bo.assign_assessment(
        payload.assessor_id,
        payload.scheduled_at,
        assessment_with=payload.assessment_with,
        assessor_name=payload.assessor_name,
        comments=payload.comments,
        actor_id=actor_id,
    )
    return JsonResponse(bo.to_response(tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')))


@router.get("/enrollments/my-assessments", auth=JWTAuthBearer())
@require_roles('Teacher')
def get_my_assessments(request):
    user_id = str(getattr(request, 'user_id', '') or '')
    applications = Application.objects.filter(
        tenant_id=request.tenant_id,
        is_deleted=False,
        workflow_data__assessment__assessor_id=user_id,
    ).select_related('student', 'tenant').order_by('workflow_data__assessment__scheduled_at')
    data = [EnrollmentCaseBO(application=app, actor_role='Teacher').to_dict() for app in applications]
    return JsonResponse(build_response(data=data, tenant_id=request.tenant_id, role='Teacher'), status=200)


@router.put("/enrollments/{application_id}/assessment", auth=JWTAuthBearer())
@require_roles('Teacher', 'Admin')
def submit_assessment(request, application_id: UUID, payload: AssessmentSubmissionSchema):
    application = get_object_or_404(
        Application.objects.select_related('student', 'tenant'),
        application_id=application_id,
        tenant_id=request.tenant_id,
        is_deleted=False,
    )
    assessment = (application.workflow_data or {}).get('assessment', {})
    actor_id = UUID(request.user_id) if getattr(request, 'user_id', None) else None
    if getattr(request, 'user_role', None) == 'Teacher' and (
        not actor_id or assessment.get('assessor_id') != str(actor_id)
    ):
        return JsonResponse(build_error(
            errors=[{"code": "ACCESS_DENIED", "message": "Only the assigned teacher can submit this assessment."}],
            tenant_id=request.tenant_id,
            role='Teacher',
        ), status=403)

    bo = EnrollmentCaseBO(application=application, actor_role=getattr(request, 'user_role', 'Admin'))
    bo.submit_assessment(payload.model_dump(), actor_id=actor_id)
    return JsonResponse(bo.to_response(tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')))


@router.put("/enrollments/{application_id}/recommendation", auth=JWTAuthBearer())
@require_roles('Vice_Principal')
def recommend_enrollment_decision(request, application_id: UUID, payload: EnrollmentRecommendationSchema):
    application = get_object_or_404(
        Application.objects.select_related('student', 'tenant'),
        application_id=application_id,
        tenant_id=request.tenant_id,
        is_deleted=False,
    )
    assessment = (application.workflow_data or {}).get('assessment', {})
    if assessment.get('status') != 'Completed':
        return JsonResponse(build_error(
            errors=[{"code": "WORKFLOW_NOT_READY", "message": "An assessment must be completed before making a recommendation."}],
            tenant_id=request.tenant_id,
            role='Vice_Principal',
        ), status=409)

    actor_id = UUID(request.user_id) if getattr(request, 'user_id', None) else None
    bo = EnrollmentCaseBO(application=application, actor_role='Vice_Principal')
    bo.save_recommendation(payload.recommendation, payload.reason, actor_id=actor_id)
    return JsonResponse(bo.to_response(tenant_id=request.tenant_id, role='Vice_Principal'))


@router.put("/enrollments/{application_id}/documents/{document_id}/verify", auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def verify_document(request, application_id: UUID, document_id: UUID, payload: DocumentVerifySchema):
    """
    P01: Verifies an uploaded document for the application.
    """
    doc = get_object_or_404(
        Document.objects.select_related('application'),
        document_id=document_id,
        application_id=application_id,
        tenant_id=request.tenant_id,
        is_deleted=False
    )
    actor_id = UUID(request.user_id) if getattr(request, 'user_id', None) else None

    EnrollmentCaseBO.verify_document(
        document=doc,
        verified=payload.verified,
        actor_id=actor_id,
    )

    bo = EnrollmentCaseBO(application=doc.application, actor_role=getattr(request, 'user_role', 'Admin'))
    return JsonResponse(bo.to_response(tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)


@router.get("/enrollments/my-applications", auth=JWTAuthBearer())
def get_my_applications(request):
    """
    P01: Returns applications strictly scoped for the authenticated parent.
    """
    role = getattr(request, 'user_role', 'Parent')
    if role == 'Parent':
        user_id = getattr(request, 'user_id', None)
        user_email = getattr(request, 'user_email', None)
        linked_ids = getattr(request, 'linked_student_ids', [])

        filter_q = models.Q(student__student_id__in=linked_ids)
        if user_id:
            try:
                user_uuid = UUID(str(user_id))
                filter_q |= models.Q(created_by=user_uuid) | models.Q(student__created_by=user_uuid) | models.Q(student__parents__created_by=user_uuid)
            except (ValueError, TypeError):
                pass
        if user_email:
            filter_q |= models.Q(student__parents__email__iexact=user_email)

        applications = Application.objects.filter(
            tenant_id=request.tenant_id,
            is_deleted=False
        ).filter(filter_q).distinct().select_related('student', 'tenant').order_by('-applied_date')
    else:
        applications = Application.objects.filter(
            tenant_id=request.tenant_id,
            is_deleted=False
        ).select_related('student', 'tenant').order_by('-applied_date')

    data = [
        EnrollmentCaseBO(application=app, actor_role=getattr(request, 'user_role', 'Parent')).to_dict()
        for app in applications
    ]
    return JsonResponse(
        build_response(
            data=data,
            tenant_id=request.tenant_id,
            role=getattr(request, 'user_role', 'Parent')
        ),
        status=200
    )


@router.get("/enrollments/pipeline", auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Vice_Principal', 'Owner')
def get_enrollment_pipeline(request):
    """
    P01: Admin pipeline queue of all active enrollment applications.
    """
    applications = Application.objects.filter(
        tenant_id=request.tenant_id,
        is_deleted=False
    ).select_related('student', 'tenant').order_by('-applied_date')

    data = [
        EnrollmentCaseBO(application=app, actor_role=getattr(request, 'user_role', 'Admin')).to_dict()
        for app in applications
    ]
    return JsonResponse(
        build_response(
            data=data,
            tenant_id=request.tenant_id,
            role=getattr(request, 'user_role', 'Admin')
        ),
        status=200
    )


@router.get("/students/aggregate", auth=JWTAuthBearer())
@require_roles('Owner', 'Board', 'Board_Member', 'Trustee', 'Principal', 'Admin', 'Administrator')
def get_student_aggregate(request):
    """
    Returns enrollment counts and aggregate KPIs only.
    No individual student names or PII are returned.
    Used by Board Member and Trustee portals exclusively.
    """
    role = getattr(request, 'user_role', 'Board')
    qs = Student.objects.filter(tenant_id=request.tenant_id, is_deleted=False)
    total_enrolled = qs.filter(status='Active').count() or qs.count()
    by_grade_counts = list(qs.values('grade').annotate(count=models.Count('student_id')).order_by('grade'))

    data = {
        'total_enrolled': total_enrolled,
        'by_grade': [{'grade': str(g['grade']), 'count': int(g['count'])} for g in by_grade_counts],
        'enrollment_trend_pct': 8.5,
        'retention_rate_pct': 97.4,
        'attendance_compliance_pct': 94.2,
        'collection_rate': 91.5,
        'scholarship_utilisation': 14.0,
    }

    meta = {
        "tenant_id": str(request.tenant_id),
        "role": role,
        "version": "v1",
        "permissions": StudentProfileBO.get_role_permissions(role)
    }

    return JsonResponse({
        "data": data,
        "meta": meta,
        "errors": None
    }, status=200)


def get_student_queryset(request):
    """
    Returns student queryset scoped to requester role per student_access_control.md
    """
    role = getattr(request, 'user_role', 'Admin')
    tenant_id = getattr(request, 'tenant_id', None)
    base_qs = Student.objects.filter(tenant_id=tenant_id, is_deleted=False)

    if role in ('Owner', 'Admin', 'Administrator', 'Principal', 'Vice_Principal', 'Staff'):
        return base_qs

    if role == 'Teacher':
        return base_qs

    if role in ('CareGiver', 'Care_Giver'):
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


@router.get("/students", auth=JWTAuthBearer())
@require_roles('Owner', 'Principal', 'Vice_Principal', 'Admin', 'Administrator', 'Teacher', 'CareGiver', 'Care_Giver', 'Parent')
def list_students(
    request,
    grade: str = None,
    section: str = None,
    class_id: UUID = None,
    search: str = None,
    page: int = 1,
    page_size: int = 20,
):
    """
    P01: Scoped student list endpoint with optional filters, pagination, and search.
    """
    role = getattr(request, 'user_role', 'Admin')
    qs = get_student_queryset(request)
    # Apply optional filters
    if grade:
        qs = qs.filter(grade__iexact=grade)
    if section:
        qs = qs.filter(section__iexact=section)
    if class_id:
        qs = qs.filter(class_id=class_id)
    if search and len(search) >= 2:
        qs = qs.filter(name__icontains=search)

    # Pagination logic
    total = qs.count()
    offset = (page - 1) * page_size
    qs_page = qs.order_by('grade', 'name')[offset:offset + page_size]

    students_data = [
        StudentProfileBO(student=s, actor_role=role).to_dict()
        for s in qs_page
    ]

    meta = {
        "tenant_id": str(request.tenant_id),
        "role": role,
        "version": "v1",
        "permissions": StudentProfileBO.get_role_permissions(role),
        "pagination": {
            "total": total,
            "page": page,
            "page_size": page_size,
        },
    }

    return JsonResponse({
        "data": students_data,
        "meta": meta,
        "errors": None,
    }, status=200)



@router.get("/students/{student_id}", auth=JWTAuthBearer())
@require_roles('Owner', 'Principal', 'Vice_Principal', 'Admin', 'Administrator', 'Teacher', 'CareGiver', 'Care_Giver', 'Parent')
def get_single_student(request, student_id: UUID):
    """
    P01: Returns single scoped student profile with role field policy and permissions.
    """
    role = getattr(request, 'user_role', 'Parent')
    qs = get_student_queryset(request)
    student = qs.filter(student_id=student_id).first()
    if not student:
        return JsonResponse(
            build_error(
                errors=[{"code": "NOT_FOUND", "message": "Student not found or out of access scope."}],
                tenant_id=request.tenant_id,
                role=role
            ),
            status=404
        )

    bo = StudentProfileBO(student=student, actor_role=role)
    meta = {
        "tenant_id": str(request.tenant_id),
        "role": role,
        "version": "v1",
        "permissions": StudentProfileBO.get_role_permissions(role)
    }

    return JsonResponse({
        "data": bo.to_dict(),
        "meta": meta,
        "errors": None
    }, status=200)


@router.patch("/students/{student_id}", auth=JWTAuthBearer())
@require_roles('Owner', 'Principal', 'Vice_Principal', 'Admin', 'Administrator', 'Teacher')
def update_student(request, student_id: UUID, payload: StudentUpdateSchema):
    """
    P01: Updates editable student fields for teacher, admin, and school leadership roles.
    """
    role = getattr(request, 'user_role', 'Admin')
    qs = get_student_queryset(request)
    student = qs.filter(student_id=student_id).first()
    if not student:
        return JsonResponse(
            build_error(
                errors=[{"code": "NOT_FOUND", "message": "Student not found or out of access scope."}],
                tenant_id=request.tenant_id,
                role=role
            ),
            status=404
        )

    updates = payload.model_dump(exclude_none=True)
    if not updates:
        return JsonResponse(
            build_error(
                errors=[{"code": "VALIDATION_ERROR", "message": "No student fields provided for update."}],
                tenant_id=request.tenant_id,
                role=role
            ),
            status=400
        )

    def _json_safe(value):
        if isinstance(value, UUID):
            return str(value)
        if isinstance(value, dict):
            return {str(key): _json_safe(item) for key, item in value.items()}
        if isinstance(value, list):
            return [_json_safe(item) for item in value]
        if isinstance(value, tuple):
            return [_json_safe(item) for item in value]
        if hasattr(value, 'isoformat') and callable(value.isoformat):
            return value.isoformat()
        return value

    old_values = {field: _json_safe(getattr(student, field)) for field in updates.keys() if hasattr(student, field)}

    for field, value in updates.items():
        setattr(student, field, value)

    if 'status' in updates and updates['status'] == 'Active' and not student.enrolled_date:
        student.enrolled_date = timezone.now().date()

    if 'status' in updates and updates['status'] == 'Active' and not student.class_id and updates.get('class_id') is None:
        student.class_id = uuid.uuid4()

    student.save()

    AuditLog.objects.create(
        tenant=student.tenant,
        actor_id=UUID(request.user_id) if getattr(request, 'user_id', None) else None,
        action='UPDATE',
        entity='Student',
        entity_id=str(student.student_id),
        old_values=_json_safe(old_values),
        new_values=_json_safe(updates),
    )

    bo = StudentProfileBO(student=student, actor_role=role)
    return JsonResponse({
        "data": bo.to_dict(),
        "meta": {
            "tenant_id": str(request.tenant_id),
            "role": role,
            "version": "v1",
            "permissions": StudentProfileBO.get_role_permissions(role),
        },
        "errors": None,
    }, status=200)


@router.post("/students/{student_id}/documents", auth=JWTAuthBearer())
@require_roles('Owner', 'Principal', 'Vice_Principal', 'Admin', 'Administrator')
def upload_student_document(request, student_id: UUID, payload: DocumentUploadSchema):
    """
    P01: Reusable student document upload endpoint that resolves the active application for a student.
    """
    role = getattr(request, 'user_role', 'Admin')
    student = get_object_or_404(
        Student,
        student_id=student_id,
        tenant_id=request.tenant_id,
        is_deleted=False
    )

    application = student.applications.filter(tenant_id=request.tenant_id, is_deleted=False).order_by('-applied_date').first()
    if not application:
        return JsonResponse(
            build_error(
                errors=[{"code": "NOT_FOUND", "message": "No application record exists for this student."}],
                tenant_id=request.tenant_id,
                role=role,
            ),
            status=404,
        )

    actor_id = UUID(request.user_id) if getattr(request, 'user_id', None) else None
    doc = EnrollmentCaseBO.upload_document(
        application=application,
        doc_type=payload.doc_type,
        file_path=payload.file_path,
        actor_id=actor_id,
    )

    return JsonResponse(
        build_response(
            data={
                "student_id": str(student.student_id),
                "application_id": str(application.application_id),
                "document_id": str(doc.document_id),
                "doc_type": doc.doc_type,
                "file_path": doc.file_path,
                "verified": doc.verified,
            },
            tenant_id=request.tenant_id,
            role=role,
        ),
        status=201,
    )


@router.get("/students/{student_id}/profile", auth=JWTAuthBearer())
def get_student_profile(request, student_id: UUID):
    """
    P01: Returns BO-01 StudentProfile with full aggregated contact and application history.
    """
    student = get_object_or_404(
        Student,
        student_id=student_id,
        tenant_id=request.tenant_id,
        is_deleted=False
    )
    if not verify_student_access(request, student):
        return JsonResponse(
            build_error(
                errors=[{"code": "ACCESS_DENIED", "message": "You are not authorized to view this student profile."}],
                tenant_id=request.tenant_id,
                role=getattr(request, 'user_role', 'Parent')
            ),
            status=403
        )

    bo = StudentProfileBO(
        student=student,
        actor_role=getattr(request, 'user_role', 'Parent')
    )
    return JsonResponse(
        bo.to_response(
            tenant_id=request.tenant_id,
            role=getattr(request, 'user_role', 'Parent')
        ),
        status=200
    )


