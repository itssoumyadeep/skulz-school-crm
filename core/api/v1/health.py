import uuid
from uuid import UUID
from datetime import date
from typing import List, Dict, Any
from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from ninja import Router

from core.models import (
    Tenant, Student, Incident
)
from core.auth.bearer import JWTAuthBearer
from core.auth.decorators import require_roles
from core.auth.scoping import verify_student_access
from core.schemas.base import build_response, build_error
from core.schemas.attendance_health import (
    HealthObservationCreateSchema,
    MedicationLogCreateSchema,
    IncidentCreateSchema,
    SafetyDrillCreateSchema
)
from core.business_objects.attendance_health import (
    HealthRecordBO,
    SafetyComplianceBO
)
from core.business_objects.base import BusinessRuleError

router = Router(tags=["Health & Safety (P07)"])


@router.get("/students/{student_id}/health-record", auth=JWTAuthBearer())
def get_student_health_record(request, student_id: UUID):
    """
    P07: Returns student's BO-17 HealthRecord.
    """
    student = get_object_or_404(
        Student.objects.select_related('health_profile'),
        student_id=student_id,
        tenant_id=request.tenant_id,
        is_deleted=False
    )
    if not verify_student_access(request, student):
        return JsonResponse(
            build_error(
                errors=[{"code": "ACCESS_DENIED", "message": "You are not authorized to view this health record."}],
                tenant_id=request.tenant_id,
                role=getattr(request, 'user_role', 'CareGiver')
            ),
            status=403
        )
    bo = HealthRecordBO(student=student, actor_role=getattr(request, 'user_role', 'CareGiver'))
    return JsonResponse(bo.to_response(tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'CareGiver')), status=200)


@router.post("/health/observations", auth=JWTAuthBearer())
@require_roles('CareGiver', 'Teacher', 'Admin')
def create_health_observation(request, payload: HealthObservationCreateSchema):
    """
    P07: Daily care observation logging.
    """
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    student = get_object_or_404(
        Student,
        student_id=payload.student_id,
        tenant_id=request.tenant_id,
        is_deleted=False
    )
    actor_id = UUID(request.user_id) if getattr(request, 'user_id', None) else uuid.uuid4()
    actor_role = getattr(request, 'user_role', 'CareGiver')

    bo = HealthRecordBO(student=student, actor_role=actor_role)
    bo.log_observation(
        staff_id=actor_id,
        obs_date=payload.date,
        mood=payload.mood,
        appetite=payload.appetite,
        nap_duration_mins=payload.nap_duration_mins,
        feeding_notes=payload.feeding_notes or "",
        general_notes=payload.general_notes or "",
    )
    return JsonResponse(bo.to_response(tenant_id=request.tenant_id, role=actor_role), status=201)


@router.post("/health/medication-log", auth=JWTAuthBearer())
@require_roles('CareGiver', 'Teacher', 'Admin', 'Staff')
def create_medication_log(request, payload: MedicationLogCreateSchema):
    """
    P07: Administer medication, enforcing parental consent gate (BR-07-01).
    """
    student = get_object_or_404(
        Student.objects.select_related('health_profile'),
        student_id=payload.student_id,
        tenant_id=request.tenant_id,
        is_deleted=False
    )
    actor_id = UUID(request.user_id) if getattr(request, 'user_id', None) else uuid.uuid4()
    actor_role = getattr(request, 'user_role', 'CareGiver')

    bo = HealthRecordBO(student=student, actor_role=actor_role)
    med_log = bo.log_medication(
        staff_id=actor_id,
        medicine_name=payload.medicine_name,
        dose=payload.dose,
        notes=payload.notes or ""
    )

    return JsonResponse(bo.to_response(tenant_id=request.tenant_id, role=actor_role), status=201)


@router.post("/incidents", auth=JWTAuthBearer())
@require_roles('Teacher', 'CareGiver', 'Admin', 'Staff')
def report_incident(request, payload: IncidentCreateSchema):
    """
    P07: Logs incident with auto-escalation (BR-07-03) and 1-hr SLA tracking (BR-07-02).
    """
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    actor_id = UUID(request.user_id) if getattr(request, 'user_id', None) else None
    actor_role = getattr(request, 'user_role', 'Staff')

    incident = SafetyComplianceBO.report_incident(
        tenant=tenant,
        incident_type=payload.incident_type,
        severity=payload.severity,
        incident_date=payload.date,
        location=payload.location,
        description=payload.description,
        actions_taken=payload.actions_taken,
        students=payload.students,
        staff=payload.staff,
        actor_id=actor_id
    )

    data = {
        "bo": "Incident",
        "incident_id": str(incident.incident_id),
        "incident_type": incident.incident_type,
        "severity": incident.severity,
        "date": incident.date.isoformat(),
        "location": incident.location,
        "escalated_to_principal": incident.escalated_to_principal,
        "parent_notified": incident.parent_notified
    }
    return JsonResponse(build_response(data=data, tenant_id=request.tenant_id, role=actor_role), status=201)


@router.get("/incidents/{incident_id}", auth=JWTAuthBearer())
def get_incident(request, incident_id: UUID):
    """
    P07: Retrieves incident detail.
    """
    incident = get_object_or_404(
        Incident,
        incident_id=incident_id,
        tenant_id=request.tenant_id,
        is_deleted=False
    )
    data = {
        "bo": "Incident",
        "incident_id": str(incident.incident_id),
        "incident_type": incident.incident_type,
        "severity": incident.severity,
        "date": incident.date.isoformat(),
        "location": incident.location,
        "description": incident.description,
        "actions_taken": incident.actions_taken,
        "escalated_to_principal": incident.escalated_to_principal,
        "parent_notified": incident.parent_notified
    }
    return JsonResponse(build_response(data=data, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Staff')), status=200)


@router.post("/safety/drills", auth=JWTAuthBearer())
@require_roles('Admin', 'Principal')
def record_safety_drill(request, payload: SafetyDrillCreateSchema):
    """
    P07: Records a completed safety drill (BR-07-04).
    """
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    actor_id = UUID(request.user_id) if getattr(request, 'user_id', None) else uuid.uuid4()
    actor_role = getattr(request, 'user_role', 'Admin')

    drill = SafetyComplianceBO.record_safety_drill(
        tenant=tenant,
        drill_type=payload.drill_type,
        scheduled_date=payload.scheduled_date,
        duration_seconds=payload.duration_seconds,
        participation_rate=payload.participation_rate,
        completed_by=actor_id,
        issues_noted=payload.issues_noted
    )

    data = {
        "bo": "SafetyDrill",
        "drill_id": str(drill.drill_id),
        "drill_type": drill.drill_type,
        "scheduled_date": drill.scheduled_date.isoformat(),
        "participation_rate": float(drill.participation_rate),
        "signed_off": drill.signed_off
    }
    return JsonResponse(build_response(data=data, tenant_id=request.tenant_id, role=actor_role), status=201)


@router.get("/safety/compliance-report/{period}", auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner', 'Board')
def get_compliance_report(request, period: str):
    """
    P07: Month-end safety compliance report.
    """
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    bo = SafetyComplianceBO(tenant=tenant, actor_role=getattr(request, 'user_role', 'Admin'))
    report = bo.generate_compliance_report(period=period)
    return JsonResponse(build_response(data=report, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)


@router.get("/safety/compliance-dashboard", auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def get_compliance_dashboard(request):
    """
    P07: Health & safety executive compliance dashboard.
    """
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    bo = SafetyComplianceBO(tenant=tenant, actor_role=getattr(request, 'user_role', 'Admin'))
    return JsonResponse(bo.to_response(tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)
