"""API v1 endpoints for student medical records, medication consent/administration logs, incident escalation, and safety drills."""

import uuid
from uuid import UUID
from datetime import date
from typing import List, Dict, Any, Optional
from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from django.utils import timezone
from ninja import Router

from core.models import (
    Tenant, Student, StudentAttendance, HealthObservation, MedicationLog, Incident, SafetyDrill
)
from core.auth.bearer import JWTAuthBearer
from core.auth.decorators import require_roles
from core.auth.scoping import verify_student_access, get_student_queryset
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
    PickupVerifySchema,
)
from core.business_objects.attendance_health import (
    HealthRecordBO,
    SafetyComplianceBO,
    PickupVerificationBO,
    PickupVerificationError,
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


@router.get("/health/classroom-alerts", auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Vice_Principal', 'Teacher', 'CareGiver', 'Owner')
def get_classroom_health_alerts(request):
    """
    Returns classroom medical alerts and Sabrina's Law action plans from StudentHealth.
    """
    students = get_student_queryset(request).filter(
        status='Active',
    ).select_related('health_profile').order_by('name')

    alerts = []
    for s in students:
        h = getattr(s, 'health_profile', None)
        if not h:
            continue
        allergies = h.allergies if isinstance(h.allergies, list) else []
        conditions = h.conditions if isinstance(h.conditions, list) else []
        if not allergies and not conditions:
            continue

        primary_condition = conditions[0] if conditions else "Medical Alert"
        severity = "Medium"
        triggers = []
        if allergies:
            first_allergy = allergies[0]
            if isinstance(first_allergy, dict):
                primary_condition = f"{first_allergy.get('name', 'Allergy')} — {primary_condition}"
                severity = first_allergy.get('severity', 'High')
                triggers = [first_allergy.get('name', 'Allergen')]
            else:
                primary_condition = f"{first_allergy} — {primary_condition}"
                severity = "High"
                triggers = [str(first_allergy)]

        emergency_med = (
            "EpiPen Jr (0.15mg)"
            if severity == "Critical"
            else ("Salbutamol Inhaler 100mcg" if "Asthma" in str(primary_condition) else "Classroom First Aid Kit")
        )
        med_location = "Red Emergency Waist Pouch" if severity == "Critical" else "Homeroom Medical Cabinet"

        alerts.append({
            "student_id": str(s.student_id),
            "student_name": s.name,
            "grade": s.grade,
            "condition_title": primary_condition,
            "severity": severity,
            "triggers": triggers,
            "emergency_medication": emergency_med,
            "storage_location": med_location,
            "protocol_steps": [
                "Recognize acute symptoms immediately",
                f"Administer {emergency_med} without delay",
                "Call 911 / emergency EMS immediately",
                "Contact household guardians and Principal",
            ],
            "parent_consent_on_file": bool(h.consent_flag),
            "guardian_phone": "+1 (416) 555-0199",
        })

    return JsonResponse(
        build_response(data=alerts, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Teacher')),
        status=200,
    )


@router.get("/health/classroom-medications", auth=JWTAuthBearer())
@require_roles('CareGiver', 'Caregiver', 'Teacher', 'Admin', 'Principal', 'Owner')
def get_classroom_medications(request):
    """
    US-CG-04 / DEF-023: Returns today's room medication schedule from StudentHealth,
    cross-referenced with today's MedicationLog and StudentAttendance.
    """
    today = timezone.localdate()
    students = list(
        get_student_queryset(request).filter(
            status='Active',
        ).select_related('health_profile').order_by('name')
    )
    student_ids = [s.student_id for s in students]

    today_logs = MedicationLog.objects.filter(
        tenant_id=request.tenant_id,
        student_id__in=student_ids,
        time_administered__date=today,
        is_deleted=False,
    ).order_by('-time_administered')
    logs_by_key = {}
    for log in today_logs:
        key = (log.student_id, (log.medicine_name or '').strip().lower())
        if key not in logs_by_key:
            logs_by_key[key] = log

    absent_ids = set(
        StudentAttendance.objects.filter(
            tenant_id=request.tenant_id,
            student_id__in=student_ids,
            date=today,
            status='Absent',
            is_deleted=False,
        ).values_list('student_id', flat=True)
    )

    schedule = []
    for s in students:
        h = getattr(s, 'health_profile', None)
        if not h:
            continue
        meds = h.medications if isinstance(h.medications, list) else []
        for idx, med in enumerate(meds):
            if isinstance(med, dict):
                med_name = med.get('name', 'Medication')
                dosage = med.get('dosage', '')
                scheduled_time = med.get('scheduled_time', '')
                consent_note = med.get('consent', '')
            else:
                med_name = str(med)
                dosage = ''
                scheduled_time = ''
                consent_note = ''

            log = logs_by_key.get((s.student_id, med_name.strip().lower()))
            actor_role = getattr(request, 'user_role', 'CareGiver')
            if s.student_id in absent_ids:
                status = 'Skipped (absent)'
                administered_at = None
                if not bool(h.consent_flag) and actor_role in ('CareGiver', 'Caregiver', 'Teacher'):
                    dosage = 'Restricted until parental consent is on file'
            elif not bool(h.consent_flag):
                status = 'Blocked (Consent Missing)'
                administered_at = None
                consent_note = 'Parent Share & Medication Consent Not On File'
                if actor_role in ('CareGiver', 'Caregiver', 'Teacher'):
                    dosage = 'Restricted until parental consent is on file'
            elif log:
                status = 'Administered'
                administered_at = log.time_administered.isoformat()
            else:
                status = 'Pending'
                administered_at = None

            schedule.append({
                "id": f"{s.student_id}-{idx}",
                "med_log_id": str(log.med_log_id) if log else None,
                "student_id": str(s.student_id),
                "student_name": s.name,
                "grade": s.grade,
                "medicine_name": med_name,
                "dosage": dosage,
                "scheduled_time": scheduled_time,
                "consent_flag": bool(h.consent_flag),
                "consent_date": h.consent_date.isoformat() if h.consent_date else None,
                "consent_note": consent_note,
                "status": status,
                "administered_at": administered_at,
            })

    return JsonResponse(
        build_response(data=schedule, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'CareGiver')),
        status=200,
    )


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
@require_roles('CareGiver', 'Caregiver', 'Teacher', 'Admin', 'Principal', 'Owner', 'Staff')
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
    if not verify_student_access(request, student):
        return JsonResponse(
            build_error(
                errors=[{"code": "ACCESS_DENIED", "message": "Access denied to this student's room."}],
                tenant_id=request.tenant_id,
                role=getattr(request, 'user_role', 'CareGiver'),
            ),
            status=403,
        )
    actor_id = UUID(request.user_id) if getattr(request, 'user_id', None) else uuid.uuid4()
    actor_role = getattr(request, 'user_role', 'CareGiver')

    bo = HealthRecordBO(student=student, actor_role=actor_role)
    med_log = bo.log_medication(
        staff_id=actor_id,
        medicine_name=payload.medicine_name,
        dose=payload.dose,
        notes=payload.notes or "",
        force=payload.force,
        time_administered=payload.time_administered,
        parent_notified=payload.parent_notified,
        actor_id=actor_id,
    )

    resp = bo.to_response(tenant_id=request.tenant_id, role=actor_role)
    if isinstance(resp.get("data"), dict):
        resp["data"]["created_med_log_id"] = str(med_log.med_log_id)
    return JsonResponse(resp, status=201)


@router.post("/incidents", auth=JWTAuthBearer())
@require_roles('Teacher', 'CareGiver', 'Admin', 'Staff')
def report_incident(request, payload: IncidentCreateSchema):
    """
    P07: Logs incident with auto-escalation (BR-07-03) and 1-hr SLA tracking (BR-07-02).
    """
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    actor_id = UUID(request.user_id) if getattr(request, 'user_id', None) else None
    actor_role = getattr(request, 'user_role', 'Staff')

    for raw_sid in payload.students:
        try:
            sid_uuid = UUID(str(raw_sid))
        except (ValueError, TypeError):
            continue
        target_student = get_object_or_404(
            Student, student_id=sid_uuid, tenant_id=request.tenant_id, is_deleted=False
        )
        if not verify_student_access(request, target_student):
            return JsonResponse(
                build_error(
                    errors=[{"code": "ACCESS_DENIED", "message": "Access denied to student in another room."}],
                    tenant_id=request.tenant_id,
                    role=actor_role,
                ),
                status=403,
            )

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
        actor_id=actor_id,
        body_part=payload.body_part,
        incident_time=payload.time,
    )

    data = {
        "bo": "Incident",
        "incident_id": str(incident.incident_id),
        "incident_type": incident.incident_type,
        "severity": incident.severity,
        "date": incident.date.isoformat(),
        "time": incident.time,
        "location": incident.location,
        "body_part": incident.body_part,
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


@router.put("/students/{student_id}/health-record", auth=JWTAuthBearer())
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

@router.get("/health/medication-logs", auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Vice_Principal', 'Teacher', 'CareGiver', 'Owner')
def list_classroom_medication_logs(request, log_date: Optional[date] = None):
    """Return tenant/room-scoped chronological MedicationLog audit trail rows."""
    scoped_students = get_student_queryset(request)
    qs = MedicationLog.objects.filter(
        tenant_id=request.tenant_id,
        student__in=scoped_students,
        is_deleted=False,
    ).select_related('student').order_by('-time_administered', '-created_at')
    if log_date is not None:
        qs = qs.filter(time_administered__date=log_date)

    rows = [
        {
            "med_log_id": str(log.med_log_id),
            "student_id": str(log.student_id),
            "student_name": log.student.name,
            "grade": log.student.grade,
            "medicine_name": log.medicine_name,
            "dose": log.dose,
            "time_administered": log.time_administered.isoformat(),
            "parent_notified": bool(log.parent_notified),
            "notes": log.notes,
            "staff_id": str(log.staff_id),
        }
        for log in qs[:100]
    ]
    return JsonResponse(
        build_response(data=rows, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')),
        status=200,
    )


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
@require_roles('CareGiver', 'Caregiver', 'Teacher', 'Admin', 'Principal', 'Owner')
def update_medication_log(request, med_log_id: UUID, payload: MedicationLogUpdateInput):
    med_log = get_object_or_404(
        MedicationLog.objects.select_related('student', 'student__health_profile', 'tenant'),
        med_log_id=med_log_id,
        tenant_id=request.tenant_id,
        is_deleted=False,
    )
    actor_role = getattr(request, 'user_role', 'CareGiver')
    if not verify_student_access(request, med_log.student):
        return JsonResponse(
            build_error(
                errors=[{"code": "ACCESS_DENIED", "message": "You are not authorized to update this medication log."}],
                tenant_id=request.tenant_id,
                role=actor_role,
            ),
            status=403,
        )
    actor_id = UUID(request.user_id) if getattr(request, 'user_id', None) else None
    bo = HealthRecordBO(student=med_log.student, actor_role=actor_role)
    data = bo.update_medication_log(med_log=med_log, data=payload.model_dump(exclude_none=True), actor_id=actor_id)
    return JsonResponse(build_response(data=data, tenant_id=request.tenant_id, role=actor_role), status=200)


@router.delete("/health/medication-log/{uuid:med_log_id}", auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def delete_medication_log(request, med_log_id: UUID):
    med_log = get_object_or_404(
        MedicationLog.objects.select_related('student', 'tenant'),
        med_log_id=med_log_id,
        tenant_id=request.tenant_id,
        is_deleted=False,
    )
    actor_id = UUID(request.user_id) if getattr(request, 'user_id', None) else None
    actor_role = getattr(request, 'user_role', 'Admin')
    data = HealthRecordBO.delete_medication_log(med_log=med_log, actor_id=actor_id)
    return JsonResponse(build_response(data=data, tenant_id=request.tenant_id, role=actor_role), status=200)

@router.get("/incidents", auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Vice_Principal', 'Teacher', 'CareGiver', 'Owner')
def list_incidents(request, severity: str = None):
    actor_role = getattr(request, 'user_role', 'Admin')
    data = SafetyComplianceBO.list_incidents(tenant_id=request.tenant_id, severity=severity)
    return JsonResponse(build_response(data=data, tenant_id=request.tenant_id, role=actor_role), status=200)

@router.patch("/incidents/{incident_id}", auth=JWTAuthBearer())
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


@router.delete("/incidents/{incident_id}", auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def delete_incident(request, incident_id: UUID):
    incident = get_object_or_404(
        Incident.objects.select_related('tenant'),
        incident_id=incident_id,
        tenant_id=request.tenant_id,
        is_deleted=False,
    )
    actor_id = UUID(request.user_id) if getattr(request, 'user_id', None) else None
    actor_role = getattr(request, 'user_role', 'Admin')
    data = SafetyComplianceBO.delete_incident(incident=incident, actor_id=actor_id)
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


@router.get("/students/{student_id}/pickup-contacts", auth=JWTAuthBearer())
@require_roles('CareGiver', 'Caregiver', 'Teacher', 'Admin', 'Principal', 'Owner')
def list_student_pickup_contacts(request, student_id: UUID):
    """US-CG-02: Return pickup contacts for a student (strictly omitting pickup_pin_hash)."""
    student = get_object_or_404(
        Student,
        student_id=student_id,
        tenant_id=request.tenant_id,
        is_deleted=False,
    )
    actor_role = getattr(request, 'user_role', 'CareGiver')
    if not verify_student_access(request, student):
        return JsonResponse(
            build_error(
                errors=[{"code": "ACCESS_DENIED", "message": "Access denied to this student's room."}],
                tenant_id=request.tenant_id,
                role=actor_role,
            ),
            status=403,
        )
    contacts = PickupVerificationBO.list_pickup_contacts(student)
    return JsonResponse(
        build_response(data=contacts, tenant_id=request.tenant_id, role=actor_role),
        status=200,
    )


@router.post("/students/{student_id}/pickup-verify", auth=JWTAuthBearer())
@require_roles('CareGiver', 'Caregiver', 'Teacher', 'Admin', 'Principal', 'Owner')
def verify_student_pickup(request, student_id: UUID, payload: PickupVerifySchema):
    """US-CG-02: Verify pickup adult PIN / ID / custody restriction."""
    student = get_object_or_404(
        Student,
        student_id=student_id,
        tenant_id=request.tenant_id,
        is_deleted=False,
    )
    actor_role = getattr(request, 'user_role', 'CareGiver')
    if not verify_student_access(request, student):
        return JsonResponse(
            build_error(
                errors=[{"code": "ACCESS_DENIED", "message": "Access denied to this student's room."}],
                tenant_id=request.tenant_id,
                role=actor_role,
            ),
            status=403,
        )
    allow_override = bool(
        payload.admin_override and actor_role in ('Admin', 'Administrator', 'Principal', 'Vice_Principal', 'Owner')
    )
    if payload.admin_override and not allow_override:
        return JsonResponse(
            build_error(
                errors=[{"code": "FORBIDDEN", "message": "Admin or Principal role required for pickup override."}],
                tenant_id=request.tenant_id,
                role=actor_role,
            ),
            status=403,
        )
    actor_id = UUID(request.user_id) if getattr(request, 'user_id', None) else None
    try:
        result = PickupVerificationBO.verify_pickup(
            student=student,
            contact_id=payload.contact_id,
            pin=payload.pin,
            id_verified=payload.id_verified,
            admin_override=allow_override,
            actor_id=actor_id,
        )
    except PickupVerificationError as exc:
        return JsonResponse(
            build_error(
                errors=[v.to_dict() for v in exc.violations],
                tenant_id=request.tenant_id,
                role=actor_role,
            ),
            status=exc.status_code,
        )
    return JsonResponse(
        build_response(data=result, tenant_id=request.tenant_id, role=actor_role),
        status=200,
    )

