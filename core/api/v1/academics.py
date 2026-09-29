import uuid
from uuid import UUID
from typing import List, Dict, Any
from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from ninja import Router

from core.models import (
    Tenant, Student, Curriculum, AcademicCalendar,
    LessonPlan, Exam, ReportCard
)
from core.auth.bearer import JWTAuthBearer
from core.auth.decorators import require_roles
from core.auth.scoping import verify_student_access
from core.schemas.base import build_response, build_error
from core.schemas.academic import (
    LessonPlanCreateSchema,
    AssignmentCreateSchema,
    ExamCreateSchema,
    MarksEntrySchema,
    ReportCardGenerateSchema
)
from core.business_objects.academic import (
    AcademicCalendarBO,
    ClassroomPlanBO,
    ExamPackageBO,
    AcademicRecordBO
)
from core.business_objects.base import BusinessRuleError

router = Router(tags=["Academics (P04)"])


@router.get("/calendar/current", auth=JWTAuthBearer())
def get_current_calendar(request):
    """
    P04: Returns current BO-03 AcademicCalendar for the tenant.
    """
    calendar = AcademicCalendar.objects.filter(
        tenant_id=request.tenant_id,
        is_deleted=False
    ).order_by('-academic_year').first()

    if not calendar:
        return JsonResponse(
            build_error(
                errors=[{"code": "NOT_FOUND", "message": "No active academic calendar found for tenant."}],
                tenant_id=request.tenant_id,
                role=getattr(request, 'user_role', 'Admin')
            ),
            status=404
        )

    bo = AcademicCalendarBO(calendar=calendar, actor_role=getattr(request, 'user_role', 'Admin'))
    return JsonResponse(bo.to_response(tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)


@router.post("/lesson-plans", auth=JWTAuthBearer())
@require_roles('Teacher', 'Admin', 'Principal')
def create_lesson_plan(request, payload: LessonPlanCreateSchema):
    """
    P04: Creates a lesson plan mapped to curriculum outcomes (Rule BR-04-01).
    """
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    curriculum = get_object_or_404(
        Curriculum,
        curriculum_id=payload.curriculum_id,
        tenant_id=request.tenant_id,
        is_deleted=False
    )
    actor_id = UUID(request.user_id) if getattr(request, 'user_id', None) else uuid.uuid4()
    actor_role = getattr(request, 'user_role', 'Teacher')

    plan = ClassroomPlanBO.create_lesson_plan(
        tenant=tenant,
        teacher_id=actor_id,
        curriculum=curriculum,
        class_id=payload.class_id,
        week=payload.week,
        topic=payload.topic,
        learning_outcomes=payload.learning_outcomes,
        actor_role=actor_role,
    )
    bo = ClassroomPlanBO(lesson_plan=plan, actor_role=actor_role)
    return JsonResponse(bo.to_response(tenant_id=request.tenant_id, role=actor_role), status=201)


@router.get("/classes/{class_id}/plan/{week}", auth=JWTAuthBearer())
def get_classroom_plan(request, class_id: UUID, week: int):
    """
    P04: Retrieves lesson plans for a class on a given week.
    """
    plan = LessonPlan.objects.filter(
        tenant_id=request.tenant_id,
        class_id=class_id,
        week=week,
        is_deleted=False
    ).select_related('curriculum').first()

    if not plan:
        return JsonResponse(
            build_error(
                errors=[{"code": "NOT_FOUND", "message": f"No lesson plan found for class {class_id} on week {week}."}],
                tenant_id=request.tenant_id,
                role=getattr(request, 'user_role', 'Teacher')
            ),
            status=404
        )

    bo = ClassroomPlanBO(lesson_plan=plan, actor_role=getattr(request, 'user_role', 'Teacher'))
    return JsonResponse(bo.to_response(tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Teacher')), status=200)


@router.post("/assignments", auth=JWTAuthBearer())
@require_roles('Teacher', 'Admin', 'Principal')
def create_assignment(request, payload: AssignmentCreateSchema):
    """
    P04: Creates an assignment, validating due date against holiday/blackout dates (Rule BR-04-02).
    """
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    actor_id = UUID(request.user_id) if getattr(request, 'user_id', None) else uuid.uuid4()
    actor_role = getattr(request, 'user_role', 'Teacher')

    calendar = AcademicCalendar.objects.filter(tenant=tenant, is_deleted=False).order_by('-academic_year').first()
    assignment = ClassroomPlanBO.create_assignment(
        tenant=tenant,
        teacher_id=actor_id,
        class_id=payload.class_id,
        subject=payload.subject,
        title=payload.title,
        description=payload.description,
        due_date=payload.due_date,
        max_marks=payload.max_marks,
        calendar=calendar,
        actor_role=actor_role,
    )

    bo = ClassroomPlanBO(assignment=assignment, actor_role=actor_role)
    return JsonResponse(bo.to_response(tenant_id=request.tenant_id, role=actor_role), status=201)


@router.post("/exams", auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Vice_Principal')
def create_exam(request, payload: ExamCreateSchema):
    """
    P04: Creates/schedules an exam, validating against calendar holidays & class overlaps (Rule BR-04-03).
    """
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    calendar = get_object_or_404(
        AcademicCalendar,
        calendar_id=payload.calendar_id,
        tenant_id=request.tenant_id,
        is_deleted=False
    )
    actor_role = getattr(request, 'user_role', 'Admin')

    exam = ExamPackageBO.create_exam(
        tenant=tenant,
        calendar=calendar,
        class_id=payload.class_id,
        name=payload.name,
        exam_type=payload.exam_type,
        exam_date=payload.date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        duration_mins=payload.duration_mins,
        room=payload.room,
        max_marks=payload.max_marks,
        actor_role=actor_role,
    )
    bo = ExamPackageBO(exam=exam, actor_role=actor_role)
    return JsonResponse(bo.to_response(tenant_id=request.tenant_id, role=actor_role), status=201)


@router.post("/exams/{exam_id}/marks", auth=JWTAuthBearer())
@require_roles('Teacher', 'Admin', 'Principal')
def record_exam_marks(request, exam_id: UUID, payload: MarksEntrySchema):
    """
    P04: Records or updates exam marks. Enforces immutability rule BR-04-07.
    """
    exam = get_object_or_404(
        Exam,
        exam_id=exam_id,
        tenant_id=request.tenant_id,
        is_deleted=False
    )
    student = get_object_or_404(
        Student,
        student_id=payload.student_id,
        tenant_id=request.tenant_id,
        is_deleted=False
    )
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    actor_id = UUID(request.user_id) if getattr(request, 'user_id', None) else uuid.uuid4()
    actor_role = getattr(request, 'user_role', 'Teacher')

    record = AcademicRecordBO.record_marks(
        tenant=tenant,
        student=student,
        exam=exam,
        teacher_id=actor_id,
        subject=payload.subject,
        marks=payload.marks,
        max_marks=payload.max_marks,
        actor_role=actor_role
    )

    data = {
        "bo": "MarksRecord",
        "marks_id": str(record.marks_id),
        "student_id": str(student.student_id),
        "student_name": student.name,
        "exam_id": str(exam.exam_id),
        "subject": record.subject,
        "marks": float(record.marks),
        "max_marks": float(record.max_marks),
        "grade": record.grade,
        "locked": record.locked
    }
    return JsonResponse(build_response(data=data, tenant_id=request.tenant_id, role=actor_role), status=200)


@router.get("/students/{student_id}/academic-record/{term}", auth=JWTAuthBearer())
def get_academic_record(request, student_id: UUID, term: str):
    """
    P04: Returns student's BO-04 AcademicRecord for a specific term.
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
                errors=[{"code": "ACCESS_DENIED", "message": "You are not authorized to view this academic record."}],
                tenant_id=request.tenant_id,
                role=getattr(request, 'user_role', 'Parent')
            ),
            status=403
        )

    calendar = AcademicCalendar.objects.filter(tenant=student.tenant, is_deleted=False).order_by('-academic_year').first()
    if not calendar:
        return JsonResponse(
            build_error(
                errors=[{"code": "NOT_FOUND", "message": "No academic calendar available."}],
                tenant_id=request.tenant_id,
                role=getattr(request, 'user_role', 'Parent')
            ),
            status=404
        )

    report_card = ReportCard.objects.filter(
        student=student,
        calendar=calendar,
        term=term,
        is_deleted=False
    ).first()

    bo = AcademicRecordBO(
        student=student,
        calendar=calendar,
        report_card=report_card,
        actor_role=getattr(request, 'user_role', 'Parent')
    )
    return JsonResponse(bo.to_response(tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Parent')), status=200)


@router.post("/academic-records/{report_id}/publish", auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Vice_Principal', 'Owner')
def publish_report_card(request, report_id: UUID):
    """
    P04: Publishes report card, enforcing moderation gate (BR-04-04), release date gate (BR-04-05), and attendance gate (BR-04-06).
    """
    report_card = get_object_or_404(
        ReportCard.objects.select_related('student', 'calendar'),
        report_id=report_id,
        tenant_id=request.tenant_id,
        is_deleted=False
    )
    actor_id = UUID(request.user_id) if getattr(request, 'user_id', None) else None
    actor_role = getattr(request, 'user_role', 'Admin')

    bo = AcademicRecordBO(
        student=report_card.student,
        calendar=report_card.calendar,
        report_card=report_card,
        actor_role=actor_role
    )
    bo.publish(actor_id=actor_id, actor_role=actor_role)

    return JsonResponse(bo.to_response(tenant_id=request.tenant_id, role=actor_role), status=200)


@router.get("/exams/{exam_id}/hall-tickets", auth=JWTAuthBearer())
@require_roles('Teacher', 'Admin', 'Principal', 'Staff')
def get_exam_hall_tickets(request, exam_id: UUID):
    """
    P04: Generates hall tickets for an exam package.
    """
    exam = get_object_or_404(
        Exam.objects.select_related('calendar', 'tenant'),
        exam_id=exam_id,
        tenant_id=request.tenant_id,
        is_deleted=False
    )
    bo = ExamPackageBO(exam=exam, actor_role=getattr(request, 'user_role', 'Admin'))
    tickets = bo.generate_hall_tickets()

    return JsonResponse(
        build_response(data=tickets, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')),
        status=200
    )
