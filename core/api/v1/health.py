import uuid
from uuid import UUID
from datetime import date
from typing import List, Dict, Any
from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from ninja import Router

from core.models import (
    Tenant, Student, HealthObservation, MedicationLog, Incident, SafetyDrill
)
from core.auth.bearer import JWTAuthBearer
from core.auth.decorators import require_roles
from core.auth.scoping import verify_student_access
from core.schemas.base import build_response, build_error
from core.schemas.attendance_health import (
    StudentHealthUpsertInput,
    HealthObservationCreateSchema,
    HealthObservationUpdateInput,
    MedicationLogCreateSchema,
    MedicationLogUpdateInput,
    IncidentCreateSchema,
    IncidentAcknowledgeInput,
    SafetyDrillCreateSchema,
    SafetyDrillUpdateInput,
)
from core.business_objects.attendance_health import (
    HealthRecordBO,
    SafetyComplianceBO
)
from core.business_objects.base import BusinessRuleError

router = Router(tags=["Health & Safety (P07)"])


@router.get("/students/{student_id}/health-record", auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Vice_Principal', 'Teacher', 'CareGiver', 'Parent', 'Owner')
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
        issues_noted=payload.issues_noted,
        signed_off=payload.signed_off,
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


@router.put("/students/{uuid:student_id}/health-record", auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'CareGiver', 'Parent', 'Owner')
def upsert_student_health_record(request, student_id: UUID, payload: StudentHealthUpsertInput):
    student = get_object_or_404(
        Student.objects.select_related('health_profile', 'tenant'),
        student_id=student_id,
        tenant_id=request.tenant_id,
        is_deleted=False,
    )
    actor_role = getattr(request, 'user_role', 'Parent')
    if not verify_student_access(request, student):
        return JsonResponse(
            build_error(
                errors=[{"code": "ACCESS_DENIED", "message": "You are not authorized to update this health record."}],
                tenant_id=request.tenant_id,
                role=actor_role,
            ),
            status=403,
        )
    actor_id = UUID(request.user_id) if getattr(request, 'user_id', None) else None
    bo = HealthRecordBO(student=student, actor_role=actor_role)
    bo.upsert_health_record(data=payload.model_dump(exclude_none=True), actor_id=actor_id)
    return JsonResponse(bo.to_response(tenant_id=request.tenant_id, role=actor_role), status=200)


@router.get("/students/{uuid:student_id}/health-observations", auth=JWTAuthBearer())
@require_roles('CareGiver', 'Teacher', 'Admin', 'Principal', 'Parent', 'Owner')
def list_student_health_observations(request, student_id: UUID):
    student = get_object_or_404(
        Student,
        student_id=student_id,
        tenant_id=request.tenant_id,
        is_deleted=False,
    )
    actor_role = getattr(request, 'user_role', 'Parent')
    if not verify_student_access(request, student):
        return JsonResponse(
            build_error(
                errors=[{"code": "ACCESS_DENIED", "message": "You are not authorized to view observations for this student."}],
                tenant_id=request.tenant_id,
                role=actor_role,
            ),
            status=403,
        )
    bo = HealthRecordBO(student=student, actor_role=actor_role)
    return JsonResponse(build_response(data=bo.list_observations(), tenant_id=request.tenant_id, role=actor_role), status=200)


@router.patch("/health/observations/{uuid:obs_id}", auth=JWTAuthBearer())
@require_roles('CareGiver', 'Teacher', 'Admin', 'Principal', 'Owner')
def update_health_observation(request, obs_id: UUID, payload: HealthObservationUpdateInput):
    obs = get_object_or_404(
        HealthObservation.objects.select_related('student', 'tenant'),
        obs_id=obs_id,
        tenant_id=request.tenant_id,
        is_deleted=False,
    )
    actor_id = UUID(request.user_id) if getattr(request, 'user_id', None) else None
    actor_role = getattr(request, 'user_role', 'CareGiver')
    data = HealthRecordBO.update_observation(obs=obs, data=payload.model_dump(exclude_none=True), actor_id=actor_id)
    return JsonResponse(build_response(data=data, tenant_id=request.tenant_id, role=actor_role), status=200)


@router.delete("/health/observations/{uuid:obs_id}", auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def delete_health_observation(request, obs_id: UUID):
    obs = get_object_or_404(
        HealthObservation.objects.select_related('tenant'),
        obs_id=obs_id,
        tenant_id=request.tenant_id,
        is_deleted=False,
    )
    actor_id = UUID(request.user_id) if getattr(request, 'user_id', None) else None
    actor_role = getattr(request, 'user_role', 'Admin')
    data = HealthRecordBO.delete_observation(obs=obs, actor_id=actor_id)
    return JsonResponse(build_response(data=data, tenant_id=request.tenant_id, role=actor_role), status=200)


@router.get("/students/{uuid:student_id}/medication-logs", auth=JWTAuthBearer())
@require_roles('CareGiver', 'Teacher', 'Admin', 'Principal', 'Parent', 'Owner')
def list_student_medication_logs(request, student_id: UUID):
    student = get_object_or_404(
        Student,
        student_id=student_id,
        tenant_id=request.tenant_id,
        is_deleted=False,
    )
    actor_role = getattr(request, 'user_role', 'Parent')
    if not verify_student_access(request, student):
        return JsonResponse(
            build_error(
                errors=[{"code": "ACCESS_DENIED", "message": "You are not authorized to view medication logs for this student."}],
                tenant_id=request.tenant_id,
                role=actor_role,
            ),
            status=403,
        )
    bo = HealthRecordBO(student=student, actor_role=actor_role)
    return JsonResponse(build_response(data=bo.list_medication_logs(), tenant_id=request.tenant_id, role=actor_role), status=200)


@router.patch("/health/medication-log/{uuid:med_log_id}", auth=JWTAuthBearer())
@require_roles('CareGiver', 'Teacher', 'Admin', 'Principal', 'Owner')
def update_medication_log(request, med_log_id: UUID, payload: MedicationLogUpdateInput):
    med_log = get_object_or_404(
        MedicationLog.objects.select_related('student', 'student__health_profile', 'tenant'),
        med_log_id=med_log_id,
        tenant_id=request.tenant_id,
        is_deleted=False,
    )
    actor_id = UUID(request.user_id) if getattr(request, 'user_id', None) else None
    actor_role = getattr(request, 'user_role', 'CareGiver')
    bo = HealthRecordBO(student=med_log.student, actor_role=actor_role)
    data = bo.update_medication_log(med_log=med_log, data=payload.model_dump(exclude_none=True), actor_id=actor_id)
    return JsonResponse(build_response(data=data, tenant_id=request.tenant_id, role=actor_role), status=200)


@router.get("/incidents", auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Vice_Principal', 'Teacher', 'CareGiver', 'Owner')
def list_incidents(request, severity: str = None):
    actor_role = getattr(request, 'user_role', 'Admin')
    data = SafetyComplianceBO.list_incidents(tenant_id=request.tenant_id, severity=severity)
    return JsonResponse(build_response(data=data, tenant_id=request.tenant_id, role=actor_role), status=200)


@router.patch("/incidents/{uuid:incident_id}", auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Vice_Principal', 'Owner')
def acknowledge_or_update_incident(request, incident_id: UUID, payload: IncidentAcknowledgeInput):
    incident = get_object_or_404(
        Incident.objects.select_related('tenant'),
        incident_id=incident_id,
        tenant_id=request.tenant_id,
        is_deleted=False,
    )
    actor_id = UUID(request.user_id) if getattr(request, 'user_id', None) else None
    actor_role = getattr(request, 'user_role', 'Admin')
    data = SafetyComplianceBO.acknowledge_incident(
        incident=incident,
        data=payload.model_dump(exclude_none=True),
        actor_id=actor_id,
    )
    return JsonResponse(build_response(data=data, tenant_id=request.tenant_id, role=actor_role), status=200)


@router.get("/safety/drills", auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Vice_Principal', 'Owner')
def list_safety_drills(request):
    actor_role = getattr(request, 'user_role', 'Admin')
    data = SafetyComplianceBO.list_drills(tenant_id=request.tenant_id)
    return JsonResponse(build_response(data=data, tenant_id=request.tenant_id, role=actor_role), status=200)


@router.get("/safety/drills/{uuid:drill_id}", auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Vice_Principal', 'Owner')
def get_safety_drill(request, drill_id: UUID):
    drill = get_object_or_404(
        SafetyDrill,
        drill_id=drill_id,
        tenant_id=request.tenant_id,
        is_deleted=False,
    )
    actor_role = getattr(request, 'user_role', 'Admin')
    data = {
        "drill_id": str(drill.drill_id),
        "drill_type": drill.drill_type,
        "scheduled_date": drill.scheduled_date.isoformat(),
        "duration_seconds": drill.duration_seconds,
        "participation_rate": float(drill.participation_rate),
        "issues_noted": drill.issues_noted or [],
        "signed_off": drill.signed_off,
    }
    return JsonResponse(build_response(data=data, tenant_id=request.tenant_id, role=actor_role), status=200)


@router.patch("/safety/drills/{uuid:drill_id}", auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def update_safety_drill(request, drill_id: UUID, payload: SafetyDrillUpdateInput):
    drill = get_object_or_404(
        SafetyDrill.objects.select_related('tenant'),
        drill_id=drill_id,
        tenant_id=request.tenant_id,
        is_deleted=False,
    )
    actor_id = UUID(request.user_id) if getattr(request, 'user_id', None) else None
    actor_role = getattr(request, 'user_role', 'Admin')
    data = SafetyComplianceBO.update_or_signoff_drill(
        drill=drill,
        data=payload.model_dump(exclude_none=True),
        actor_id=actor_id,
    )
    return JsonResponse(build_response(data=data, tenant_id=request.tenant_id, role=actor_role), status=200)

