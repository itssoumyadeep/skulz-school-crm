import uuid
from uuid import UUID
from datetime import date
from typing import List, Dict, Any
from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from ninja import Router

from core.models import (
    Tenant, Student, StudentAttendance,
    LeaveRequest, AcademicCalendar
)
from core.auth.bearer import JWTAuthBearer
from core.auth.decorators import require_roles
from core.auth.scoping import verify_student_access
from core.schemas.base import build_response, build_error
from core.schemas.attendance_health import (
    AttendanceMarkSchema,
    AttendanceRosterBulkMarkSchema,
    AttendanceUpdateSchema,
    LeaveRequestCreateSchema,
    LeaveRequestApproveSchema,
    StaffSubstitutionSchema
)
from core.business_objects.attendance_health import (
    AttendanceSheetBO,
    DEFAULT_ATTENDANCE_CLASS_ID,
    LeaveCaseBO,
    StaffRosterBO
)
from core.business_objects.academic import AcademicCalendarBO
router = Router(tags=["Attendance (P03)"])


@router.get("/attendance/students/{att_date}", auth=JWTAuthBearer())
@require_roles('Teacher', 'Owner', 'Admin', 'Principal')
def get_student_attendance_roster(request, att_date: date):
    students = list(
        Student.objects.filter(
            tenant_id=request.tenant_id,
            is_deleted=False,
            status='Active',
        ).order_by('grade', 'name')
    )
    class_ids = {
        student.student_id: student.class_id or DEFAULT_ATTENDANCE_CLASS_ID
        for student in students
    }
    records = StudentAttendance.objects.filter(
        tenant_id=request.tenant_id,
        student_id__in=[student.student_id for student in students],
        date=att_date,
        period='Full_Day',
        is_deleted=False,
    ).select_related('student')
    records_by_student = {
        record.student_id: record
        for record in records
        if class_ids.get(record.student_id) == record.class_id
    }

    data = [
        {
            'student_id': str(student.student_id),
            'student_number': student.student_number,
            'name': student.name,
            'grade': student.grade,
            'class_id': str(class_ids[student.student_id]),
            'attendance_id': (
                str(records_by_student[student.student_id].att_id)
                if student.student_id in records_by_student
                else None
            ),
            'status': (
                records_by_student[student.student_id].status
                if student.student_id in records_by_student
                else None
            ),
            'notified_parent': (
                records_by_student[student.student_id].notified_parent
                if student.student_id in records_by_student
                else False
            ),
        }
        for student in students
    ]
    return JsonResponse(
        build_response(
            data=data,
            tenant_id=request.tenant_id,
            role=getattr(request, 'user_role', 'Teacher'),
        ),
        status=200,
    )


@router.post("/attendance/bulk-mark", auth=JWTAuthBearer())
@require_roles('Teacher', 'Owner', 'Admin', 'Principal')
def mark_attendance_roster(request, payload: AttendanceRosterBulkMarkSchema):
    student_ids = [record.student_id for record in payload.records]
    if len(student_ids) != len(set(student_ids)):
        return JsonResponse(
            build_error(
                errors=[{
                    'code': 'DUPLICATE_STUDENT',
                    'message': 'Each student can only appear once in an attendance update.',
                }],
                tenant_id=request.tenant_id,
                role=getattr(request, 'user_role', 'Teacher'),
            ),
            status=422,
        )

    students = Student.objects.filter(
        tenant_id=request.tenant_id,
        is_deleted=False,
        status='Active',
        student_id__in=student_ids,
    ).in_bulk(field_name='student_id')
    if len(students) != len(student_ids):
        return JsonResponse(
            build_error(
                errors=[{
                    'code': 'STUDENT_NOT_FOUND',
                    'message': 'One or more active students could not be found.',
                }],
                tenant_id=request.tenant_id,
                role=getattr(request, 'user_role', 'Teacher'),
            ),
            status=404,
        )

    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    actor_id = UUID(request.user_id) if getattr(request, 'user_id', None) else uuid.uuid4()
    actor_role = getattr(request, 'user_role', 'Teacher')
    attendance_records = AttendanceSheetBO.mark_roster(
        tenant=tenant,
        records=[
            (students[item.student_id], item.status)
            for item in payload.records
        ],
        att_date=payload.date,
        marked_by=actor_id,
        actor_role=actor_role,
    )
    return JsonResponse(
        build_response(
            data={
                'date': payload.date.isoformat(),
                'records': [
                    {
                        'attendance_id': str(record.att_id),
                        'student_id': str(record.student_id),
                        'class_id': str(record.class_id),
                        'status': record.status,
                        'notified_parent': record.notified_parent,
                    }
                    for record in attendance_records
                ],
            },
            tenant_id=request.tenant_id,
            role=actor_role,
        ),
        status=200,
    )


@router.post("/attendance/mark", auth=JWTAuthBearer())
@require_roles('Teacher', 'CareGiver', 'Admin', 'Principal')
def mark_attendance(request, payload: AttendanceMarkSchema):
    """
    P03: Marks attendance for a student, enforcing 24-hr lock (BR-03-01) and unexcused absence alert (BR-03-02).
    """
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    student = get_object_or_404(
        Student,
        student_id=payload.student_id,
        tenant_id=request.tenant_id,
        is_deleted=False
    )
    actor_id = UUID(request.user_id) if getattr(request, 'user_id', None) else uuid.uuid4()
    actor_role = getattr(request, 'user_role', 'Teacher')

    record = AttendanceSheetBO.mark_attendance(
        tenant=tenant,
        student=student,
        class_id=payload.class_id,
        att_date=payload.date,
        status=payload.status,
        marked_by=actor_id,
        method=payload.method,
        period=payload.period,
        actor_role=actor_role
    )

    bo = AttendanceSheetBO(record=record, actor_role=actor_role)
    return JsonResponse(bo.to_response(tenant_id=request.tenant_id, role=actor_role), status=200)


@router.patch("/attendance/{att_id}", auth=JWTAuthBearer())
@require_roles('Teacher', 'CareGiver', 'Admin', 'Principal', 'Vice_Principal', 'Owner')
def update_attendance_record(request, att_id: UUID, payload: AttendanceUpdateSchema):
    """
    P03: Allows teachers to update an existing StudentAttendance record, including correcting an absence.
    """
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    record = get_object_or_404(
        StudentAttendance,
        att_id=att_id,
        tenant=tenant,
        is_deleted=False
    )

    if getattr(request, 'user_role', 'Teacher') in {'Teacher', 'CareGiver', 'Admin', 'Principal', 'Vice_Principal', 'Owner'}:
        if payload.status is not None:
            record.status = payload.status
        if payload.method is not None:
            record.method = payload.method
        if payload.period is not None:
            record.period = payload.period
        if payload.notified_parent is not None:
            record.notified_parent = payload.notified_parent

        record.marked_by = UUID(request.user_id) if getattr(request, 'user_id', None) else record.marked_by
        record.save()

        if payload.status == 'Present' and record.notified_parent:
            record.notified_parent = False
            record.save(update_fields=['notified_parent', 'updated_at'])

        bo = AttendanceSheetBO(record=record, actor_role=getattr(request, 'user_role', 'Teacher'))
        return JsonResponse(bo.to_response(tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Teacher')), status=200)

    return JsonResponse(
        build_error(
            errors=[{"code": "ACCESS_DENIED", "message": "You are not authorized to update attendance records."}],
            tenant_id=request.tenant_id,
            role=getattr(request, 'user_role', 'Teacher')
        ),
        status=403
    )


@router.get("/classes/{class_id}/attendance/{att_date}", auth=JWTAuthBearer())
def get_class_attendance(request, class_id: UUID, att_date: date):
    """
    P03: Retrieves attendance records for an entire class on a given date.
    """
    records = StudentAttendance.objects.filter(
        tenant_id=request.tenant_id,
        class_id=class_id,
        date=att_date,
        is_deleted=False
    ).select_related('student')

    data = [
        {
            "att_id": str(r.att_id),
            "student_id": str(r.student.student_id),
            "student_number": r.student.student_number,
            "student_name": r.student.name,
            "status": r.status,
            "method": r.method,
            "notified_parent": r.notified_parent
        }
        for r in records
    ]
    return JsonResponse(
        build_response(data=data, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Teacher')),
        status=200
    )


@router.get("/students/{student_id}/attendance-summary", auth=JWTAuthBearer())
def get_student_attendance_summary(request, student_id: UUID):
    """
    P03: Returns student's attendance summary with counselor flag (BR-03-05).
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
                errors=[{"code": "ACCESS_DENIED", "message": "You are not authorized to view this attendance summary."}],
                tenant_id=request.tenant_id,
                role=getattr(request, 'user_role', 'Parent')
            ),
            status=403
        )
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    summary = AttendanceSheetBO.compute_student_summary(tenant=tenant, student=student)

    return JsonResponse(
        build_response(data=summary, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Parent')),
        status=200
    )


@router.post("/leave-requests", auth=JWTAuthBearer())
def create_leave_request(request, payload: LeaveRequestCreateSchema):
    """
    P03: Submits a student or staff leave request, checking blackout dates (BR-03-04).
    """
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    actor_role = getattr(request, 'user_role', 'Staff')

    calendar = AcademicCalendar.objects.filter(tenant=tenant, is_deleted=False).order_by('-academic_year').first()
    cal_bo = AcademicCalendarBO(calendar=calendar) if calendar else None

    leave = LeaveCaseBO.create_leave_request(
        tenant=tenant,
        requester_id=payload.requester_id,
        requester_type=payload.requester_type,
        leave_type=payload.leave_type,
        start_date=payload.start_date,
        end_date=payload.end_date,
        days=payload.days,
        reason=payload.reason,
        calendar_bo=cal_bo,
        actor_role=actor_role,
    )
    bo = LeaveCaseBO(leave_request=leave, calendar_bo=cal_bo, actor_role=actor_role)
    return JsonResponse(bo.to_response(tenant_id=request.tenant_id, role=actor_role), status=201)


@router.put("/leave-requests/{leave_id}/approve", auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Vice_Principal', 'Owner')
def approve_leave_request(request, leave_id: UUID, payload: LeaveRequestApproveSchema):
    """
    P03: Approves or rejects a leave request.
    """
    leave = get_object_or_404(
        LeaveRequest,
        leave_id=leave_id,
        tenant_id=request.tenant_id,
        is_deleted=False
    )
    actor_id = UUID(request.user_id) if getattr(request, 'user_id', None) else uuid.uuid4()
    actor_role = getattr(request, 'user_role', 'Admin')

    calendar = AcademicCalendar.objects.filter(tenant=leave.tenant, is_deleted=False).order_by('-academic_year').first()
    cal_bo = AcademicCalendarBO(calendar=calendar) if calendar else None

    bo = LeaveCaseBO(leave_request=leave, calendar_bo=cal_bo, actor_role=actor_role)
    if payload.status == 'Approved':
        bo.approve(approver_id=actor_id, actor_role=actor_role)
    else:
        bo.reject()

    return JsonResponse(bo.to_response(tenant_id=request.tenant_id, role=actor_role), status=200)


@router.get("/staff/roster/{roster_date}", auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Vice_Principal')
def get_staff_roster(request, roster_date: date):
    """
    P03: Retrieves daily staff roster overview and cover alerts (BR-03-03).
    """
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    bo = StaffRosterBO(tenant=tenant, roster_date=roster_date, actor_role=getattr(request, 'user_role', 'Admin'))
    return JsonResponse(bo.to_response(tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)


@router.post("/substitutions", auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Vice_Principal')
def assign_substitution(request, payload: StaffSubstitutionSchema):
    """
    P03: Assigns substitute staff, validating availability (BR-03-06).
    """
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    bo = StaffRosterBO(tenant=tenant, roster_date=payload.date, actor_role=getattr(request, 'user_role', 'Admin'))
    att = bo.assign_substitution(
        absent_staff_id=payload.absent_staff_id,
        substitute_id=payload.substitute_id
    )
    return JsonResponse(bo.to_response(tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)


@router.get("/attendance/reports/{report_type}", auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Vice_Principal', 'Owner')
def get_attendance_reports(request, report_type: str):
    """
    P03: Summary attendance report.
    """
    records = StudentAttendance.objects.filter(
        tenant_id=request.tenant_id,
        is_deleted=False
    )
    total = records.count()
    present = records.filter(status__in=['Present', 'Late']).count()
    pct = float(round((present / total) * 100, 2)) if total > 0 else 100.0

    data = {
        "report_type": report_type,
        "total_records": total,
        "overall_attendance_rate": pct
    }
    return JsonResponse(build_response(data=data, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)
