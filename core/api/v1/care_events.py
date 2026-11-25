"""API v1 endpoints for Caregiver MVP-2: CareEvents, CareMedia (EXIF-stripped + consent gate), and Parent Feed."""

import json
import uuid
from datetime import date
from typing import Optional
from uuid import UUID

from django.http import FileResponse, HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from ninja import File, Form, Router, UploadedFile

from core.auth.bearer import JWTAuthBearer
from core.auth.decorators import require_roles
from core.auth.scoping import get_student_queryset, verify_student_access
from core.business_objects.care_events import (
    CareEventBO,
    CareMediaBO,
    ChildCareHistoryBO,
    HealthScreenBO,
    LearningObservationBO,
    build_parent_child_feed,
    get_media_storage_root,
    verify_media_signature,
)
from core.models import CareEvent, CareMedia, LearningObservation, Student, Tenant
from core.schemas.base import build_error, build_response
from core.schemas.care_events import (
    CareEventCreateSchema,
    CareEventUpdateSchema,
    LearningObservationCreateSchema,
    LearningObservationUpdateSchema,
)

router = Router(tags=["Caregiver Daily Care & Media (MVP-2)"])


@router.post("/care-events", auth=JWTAuthBearer())
@require_roles("CareGiver", "Caregiver", "Teacher", "Admin", "Principal", "Owner")
def create_care_events(request, payload: CareEventCreateSchema):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    actor_role = getattr(request, "user_role", "CareGiver")
    actor_id = UUID(str(request.user_id)) if getattr(request, "user_id", None) else uuid.uuid4()

    items = []
    if payload.events:
        items = [ev.model_dump() for ev in payload.events]
    elif payload.student_ids and payload.event_type:
        for sid in payload.student_ids:
            items.append({
                "student_id": sid,
                "event_type": payload.event_type,
                "occurred_at": payload.occurred_at,
                "payload": payload.payload,
                "parent_visible": payload.parent_visible,
            })
    elif payload.student_id and payload.event_type:
        items.append({
            "student_id": payload.student_id,
            "event_type": payload.event_type,
            "occurred_at": payload.occurred_at,
            "payload": payload.payload,
            "parent_visible": payload.parent_visible,
        })
    else:
        return JsonResponse(
            build_error(
                errors=[{"code": "VALIDATION_ERROR", "message": "Provide student_id + event_type, student_ids + event_type, or events."}],
                tenant_id=request.tenant_id,
                role=actor_role,
            ),
            status=422,
        )

    target_sids = list({item["student_id"] for item in items})
    students = list(
        Student.objects.filter(
            tenant_id=request.tenant_id,
            student_id__in=target_sids,
            is_deleted=False,
        )
    )
    students_by_id = {s.student_id: s for s in students}
    if len(students_by_id) != len(target_sids):
        return JsonResponse(
            build_error(
                errors=[{"code": "NOT_FOUND", "message": "One or more students not found in tenant."}],
                tenant_id=request.tenant_id,
                role=actor_role,
            ),
            status=404,
        )

    for s in students:
        if not verify_student_access(request, s):
            return JsonResponse(
                build_error(
                    errors=[{"code": "ACCESS_DENIED", "message": f"Access denied to student {s.name}."}],
                    tenant_id=request.tenant_id,
                    role=actor_role,
                ),
                status=403,
            )

    created = CareEventBO.create_events(
        tenant=tenant,
        actor_id=actor_id,
        items=items,
        students_by_id=students_by_id,
    )

    return JsonResponse(
        build_response(
            data={"events": created, "count": len(created)},
            tenant_id=request.tenant_id,
            role=actor_role,
        ),
        status=201,
    )


@router.get("/care-events", auth=JWTAuthBearer())
@require_roles("CareGiver", "Caregiver", "Teacher", "Admin", "Principal", "Owner", "Parent")
def list_care_events(
    request,
    date_filter: Optional[date] = None,
    student_id: Optional[UUID] = None,
    event_type: Optional[str] = None,
):
    target_date = date_filter or timezone.localdate()
    actor_role = getattr(request, "user_role", "CareGiver")

    scoped_students = list(get_student_queryset(request).filter(status="Active").order_by("name"))
    scoped_ids = [s.student_id for s in scoped_students]

    if student_id:
        student = get_object_or_404(
            Student,
            student_id=student_id,
            tenant_id=request.tenant_id,
            is_deleted=False,
        )
        if not verify_student_access(request, student):
            return JsonResponse(
                build_error(
                    errors=[{"code": "ACCESS_DENIED", "message": "Access denied to this student's care events."}],
                    tenant_id=request.tenant_id,
                    role=actor_role,
                ),
                status=403,
            )
        scoped_ids = [student.student_id]

    qs = CareEvent.objects.filter(
        tenant_id=request.tenant_id,
        student_id__in=scoped_ids,
        is_deleted=False,
        is_hidden=False,
        occurred_at__date=target_date,
    ).select_related("student")

    if actor_role == "Parent":
        qs = qs.filter(parent_visible=True)
    if event_type:
        qs = qs.filter(event_type=event_type)

    events = list(qs.order_by("-occurred_at", "-created_at"))
    summary = CareEventBO.compute_room_summary(
        tenant_id=request.tenant_id,
        students=scoped_students,
        target_date=target_date,
        events=events if not event_type else list(
            CareEvent.objects.filter(
                tenant_id=request.tenant_id,
                student_id__in=[s.student_id for s in scoped_students],
                is_deleted=False,
                is_hidden=False,
                occurred_at__date=target_date,
            ).select_related("student")
        ),
    )

    return JsonResponse(
        build_response(
            data={
                "events": [CareEventBO._serialize(ev) for ev in events],
                "summary": summary,
            },
            tenant_id=request.tenant_id,
            role=actor_role,
        ),
        status=200,
    )


@router.patch("/care-events/{event_id}", auth=JWTAuthBearer())
@require_roles("CareGiver", "Caregiver", "Teacher", "Admin", "Principal", "Owner")
def update_care_event(request, event_id: UUID, payload: CareEventUpdateSchema):
    actor_role = getattr(request, "user_role", "CareGiver")
    actor_id = UUID(str(request.user_id)) if getattr(request, "user_id", None) else None
    ev = get_object_or_404(
        CareEvent.objects.select_related("student", "tenant"),
        event_id=event_id,
        tenant_id=request.tenant_id,
        is_deleted=False,
    )
    if not verify_student_access(request, ev.student):
        return JsonResponse(
            build_error(
                errors=[{"code": "ACCESS_DENIED", "message": "Access denied to this care event."}],
                tenant_id=request.tenant_id,
                role=actor_role,
            ),
            status=403,
        )
    serialized = CareEventBO.update_event(ev, data=payload.model_dump(exclude_none=True), actor_id=actor_id)
    return JsonResponse(
        build_response(data=serialized, tenant_id=request.tenant_id, role=actor_role),
        status=200,
    )


@router.delete("/care-events/{event_id}", auth=JWTAuthBearer())
@require_roles("CareGiver", "Caregiver", "Teacher", "Admin", "Principal", "Owner")
def undo_care_event(request, event_id: UUID):
    actor_role = getattr(request, "user_role", "CareGiver")
    actor_id = UUID(str(request.user_id)) if getattr(request, "user_id", None) else None
    ev = get_object_or_404(
        CareEvent.objects.select_related("student", "tenant"),
        event_id=event_id,
        tenant_id=request.tenant_id,
        is_deleted=False,
    )
    if not verify_student_access(request, ev.student):
        return JsonResponse(
            build_error(
                errors=[{"code": "ACCESS_DENIED", "message": "Access denied to this care event."}],
                tenant_id=request.tenant_id,
                role=actor_role,
            ),
            status=403,
        )
    serialized = CareEventBO.hide_event(ev, actor_role=actor_role, actor_id=actor_id)
    return JsonResponse(
        build_response(data=serialized, tenant_id=request.tenant_id, role=actor_role),
        status=200,
    )


@router.get("/parent/children/{student_id}/feed", auth=JWTAuthBearer())
@require_roles("Parent", "CareGiver", "Caregiver", "Teacher", "Admin", "Principal", "Owner")
def get_parent_child_feed(request, student_id: UUID, date: Optional[date] = None):
    actor_role = getattr(request, "user_role", "Parent")
    student = get_object_or_404(
        Student,
        student_id=student_id,
        tenant_id=request.tenant_id,
        is_deleted=False,
    )
    if not verify_student_access(request, student):
        return JsonResponse(
            build_error(
                errors=[{"code": "ACCESS_DENIED", "message": "You are not authorized to view this child's feed."}],
                tenant_id=request.tenant_id,
                role=actor_role,
            ),
            status=403,
        )

    target_date = date or timezone.localdate()
    feed = build_parent_child_feed(
        tenant_id=request.tenant_id,
        student=student,
        target_date=target_date,
    )
    return JsonResponse(
        build_response(
            data={
                "student_id": str(student.student_id),
                "student_name": student.name,
                "date": target_date.isoformat(),
                "feed": feed,
            },
            tenant_id=request.tenant_id,
            role=actor_role,
        ),
        status=200,
    )


def _parse_student_ids(raw_ids: str) -> list[UUID]:
    raw_ids = (raw_ids or "").strip()
    if not raw_ids:
        return []
    if raw_ids.startswith("["):
        parsed = json.loads(raw_ids)
        return [UUID(str(x)) for x in parsed]
    return [UUID(x.strip()) for x in raw_ids.split(",") if x.strip()]


@router.post("/care-media", auth=JWTAuthBearer())
@require_roles("CareGiver", "Caregiver", "Teacher", "Admin", "Principal", "Owner")
def upload_care_media(
    request,
    file: UploadedFile = File(...),
    student_ids: str = Form(""),
    student_id: str = Form(""),
    caption: str = Form(""),
):
    actor_role = getattr(request, "user_role", "CareGiver")
    actor_id = UUID(str(request.user_id)) if getattr(request, "user_id", None) else uuid.uuid4()
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)

    try:
        parsed_ids = _parse_student_ids(student_ids) or _parse_student_ids(student_id)
    except (ValueError, json.JSONDecodeError):
        return JsonResponse(
            build_error(
                errors=[{"code": "VALIDATION_ERROR", "message": "Invalid student_ids format."}],
                tenant_id=request.tenant_id,
                role=actor_role,
            ),
            status=422,
        )

    students = list(
        Student.objects.filter(
            tenant_id=request.tenant_id,
            student_id__in=parsed_ids,
            is_deleted=False,
        )
    )
    if not parsed_ids or len(students) != len(set(parsed_ids)):
        return JsonResponse(
            build_error(
                errors=[{"code": "NOT_FOUND", "message": "One or more tagged students were not found."}],
                tenant_id=request.tenant_id,
                role=actor_role,
            ),
            status=404,
        )

    for s in students:
        if not verify_student_access(request, s):
            return JsonResponse(
                build_error(
                    errors=[{"code": "ACCESS_DENIED", "message": f"Access denied to student {s.name}."}],
                    tenant_id=request.tenant_id,
                    role=actor_role,
                ),
                status=403,
            )

    mime = getattr(file, "content_type", "") or ""
    if not mime:
        name_lower = (getattr(file, "name", "") or "").lower()
        if name_lower.endswith((".jpg", ".jpeg")):
            mime = "image/jpeg"
        elif name_lower.endswith(".png"):
            mime = "image/png"
        elif name_lower.endswith(".webp"):
            mime = "image/webp"
        elif name_lower.endswith(".mp4"):
            mime = "video/mp4"

    result = CareMediaBO.create_media(
        tenant=tenant,
        actor_id=actor_id,
        file_obj=file,
        mime=mime,
        students=students,
        caption=caption,
    )
    return JsonResponse(
        build_response(data=result, tenant_id=request.tenant_id, role=actor_role),
        status=201,
    )


@router.get("/care-media/{media_id}/file")
def serve_care_media_file(
    request,
    media_id: UUID,
    exp: Optional[int] = None,
    sig: Optional[str] = None,
):
    media = CareMedia.objects.filter(media_id=media_id, is_deleted=False).first()
    if not media:
        return HttpResponse(status=404)

    authorized = False
    if exp is not None and sig:
        authorized = verify_media_signature(media.media_id, media.tenant_id, exp, sig)
    else:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1].strip()
            bearer = JWTAuthBearer()
            user = bearer.authenticate(request, token)
            if user and str(getattr(request, "tenant_id", "")) == str(media.tenant_id):
                authorized = any(verify_student_access(request, s) for s in media.students.all())

    if not authorized:
        return HttpResponse(status=403)

    abs_path = get_media_storage_root() / media.file_ref
    if not abs_path.exists():
        return HttpResponse(status=404)

    return FileResponse(open(abs_path, "rb"), content_type=media.mime)


@router.delete("/care-media/{media_id}", auth=JWTAuthBearer())
@require_roles("CareGiver", "Caregiver", "Teacher", "Admin", "Principal", "Owner")
def delete_care_media(request, media_id: UUID):
    actor_role = getattr(request, "user_role", "CareGiver")
    media = get_object_or_404(
        CareMedia,
        media_id=media_id,
        tenant_id=request.tenant_id,
        is_deleted=False,
    )
    for s in media.students.all():
        if not verify_student_access(request, s):
            return JsonResponse(
                build_error(
                    errors=[{"code": "ACCESS_DENIED", "message": "Access denied to delete this media."}],
                    tenant_id=request.tenant_id,
                    role=actor_role,
                ),
                status=403,
            )
    CareMediaBO.delete_media(media)
    return JsonResponse(
        build_response(
            data={"media_id": str(media_id), "deleted": True},
            tenant_id=request.tenant_id,
            role=actor_role,
        ),
        status=200,
    )


# =========================================================================
# US-CG-10: Learning Frameworks, Learning Observations & Developmental Summary
# =========================================================================


@router.get("/learning-frameworks", auth=JWTAuthBearer())
@require_roles("CareGiver", "Caregiver", "Teacher", "Admin", "Principal", "Owner", "Parent")
def list_learning_frameworks(request):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    frameworks = LearningObservationBO.ensure_default_frameworks(tenant)
    return JsonResponse(
        build_response(
            data={"frameworks": frameworks},
            tenant_id=request.tenant_id,
            role=getattr(request, "user_role", "CareGiver"),
        ),
        status=200,
    )


@router.post("/learning-observations", auth=JWTAuthBearer())
@require_roles("CareGiver", "Caregiver", "Teacher", "Admin", "Principal", "Owner")
def create_learning_observation(request, payload: LearningObservationCreateSchema):
    actor_role = getattr(request, "user_role", "CareGiver")
    actor_id = UUID(str(request.user_id)) if getattr(request, "user_id", None) else uuid.uuid4()
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    student = get_object_or_404(
        Student,
        student_id=payload.student_id,
        tenant_id=request.tenant_id,
        is_deleted=False,
    )
    if not verify_student_access(request, student):
        return JsonResponse(
            build_error(
                errors=[{"code": "ACCESS_DENIED", "message": "Access denied to this student."}],
                tenant_id=request.tenant_id,
                role=actor_role,
            ),
            status=403,
        )
    obs = LearningObservationBO.create_observation(
        tenant=tenant,
        student=student,
        actor_id=actor_id,
        data=payload.model_dump(),
    )
    return JsonResponse(
        build_response(data=obs, tenant_id=request.tenant_id, role=actor_role),
        status=201,
    )


@router.get("/learning-observations", auth=JWTAuthBearer())
@require_roles("CareGiver", "Caregiver", "Teacher", "Admin", "Principal", "Owner", "Parent")
def list_learning_observations(
    request,
    student_id: Optional[UUID] = None,
    framework: Optional[str] = None,
    domain: Optional[str] = None,
):
    actor_role = getattr(request, "user_role", "CareGiver")
    scoped_students = list(get_student_queryset(request).filter(status="Active").order_by("name"))
    scoped_ids = [s.student_id for s in scoped_students]

    target_student = None
    if student_id:
        target_student = get_object_or_404(
            Student,
            student_id=student_id,
            tenant_id=request.tenant_id,
            is_deleted=False,
        )
        if not verify_student_access(request, target_student):
            return JsonResponse(
                build_error(
                    errors=[{"code": "ACCESS_DENIED", "message": "Access denied to this student's observations."}],
                    tenant_id=request.tenant_id,
                    role=actor_role,
                ),
                status=403,
            )
        scoped_ids = [target_student.student_id]

    qs = LearningObservation.objects.filter(
        tenant_id=request.tenant_id,
        student_id__in=scoped_ids,
        is_deleted=False,
    ).select_related("student")

    if actor_role == "Parent":
        qs = qs.filter(shared_with_family=True)
    if framework:
        qs = qs.filter(framework__iexact=framework)

    obs_list = list(qs.order_by("-observed_on", "-created_at"))
    if domain:
        obs_list = [o for o in obs_list if any(d.lower() == domain.lower() for d in (o.domains or []))]

    summary = (
        LearningObservationBO.compute_developmental_summary(
            tenant_id=request.tenant_id,
            student=target_student,
            shared_only=(actor_role == "Parent"),
        )
        if target_student
        else None
    )

    return JsonResponse(
        build_response(
            data={
                "observations": [LearningObservationBO.serialize(o) for o in obs_list],
                "developmental_summary": summary,
            },
            tenant_id=request.tenant_id,
            role=actor_role,
        ),
        status=200,
    )


@router.patch("/learning-observations/{observation_id}", auth=JWTAuthBearer())
@require_roles("CareGiver", "Caregiver", "Teacher", "Admin", "Principal", "Owner")
def update_learning_observation(request, observation_id: UUID, payload: LearningObservationUpdateSchema):
    actor_role = getattr(request, "user_role", "CareGiver")
    obs = get_object_or_404(
        LearningObservation.objects.select_related("student"),
        observation_id=observation_id,
        tenant_id=request.tenant_id,
        is_deleted=False,
    )
    if not verify_student_access(request, obs.student):
        return JsonResponse(
            build_error(
                errors=[{"code": "ACCESS_DENIED", "message": "Access denied."}],
                tenant_id=request.tenant_id,
                role=actor_role,
            ),
            status=403,
        )
    data = payload.model_dump(exclude_unset=True)
    for field in ("framework", "domains", "note", "shared_with_family"):
        if field in data and data[field] is not None:
            setattr(obs, field, data[field])
    if "media_ids" in data and data["media_ids"] is not None:
        obs.media_ids = [str(mid) for mid in data["media_ids"]]
    obs.save()
    return JsonResponse(
        build_response(
            data=LearningObservationBO.serialize(obs),
            tenant_id=request.tenant_id,
            role=actor_role,
        ),
        status=200,
    )


@router.delete("/learning-observations/{observation_id}", auth=JWTAuthBearer())
@require_roles("CareGiver", "Caregiver", "Teacher", "Admin", "Principal", "Owner")
def delete_learning_observation(request, observation_id: UUID):
    actor_role = getattr(request, "user_role", "CareGiver")
    obs = get_object_or_404(
        LearningObservation.objects.select_related("student"),
        observation_id=observation_id,
        tenant_id=request.tenant_id,
        is_deleted=False,
    )
    if not verify_student_access(request, obs.student):
        return JsonResponse(
            build_error(
                errors=[{"code": "ACCESS_DENIED", "message": "Access denied."}],
                tenant_id=request.tenant_id,
                role=actor_role,
            ),
            status=403,
        )
    obs.is_deleted = True
    obs.save(update_fields=["is_deleted", "updated_at"])
    return JsonResponse(
        build_response(
            data={"observation_id": str(observation_id), "deleted": True},
            tenant_id=request.tenant_id,
            role=actor_role,
        ),
        status=200,
    )


@router.get("/students/{student_id}/developmental-summary", auth=JWTAuthBearer())
@require_roles("CareGiver", "Caregiver", "Teacher", "Admin", "Principal", "Owner", "Parent")
def get_student_developmental_summary(request, student_id: UUID):
    actor_role = getattr(request, "user_role", "CareGiver")
    student = get_object_or_404(
        Student,
        student_id=student_id,
        tenant_id=request.tenant_id,
        is_deleted=False,
    )
    if not verify_student_access(request, student):
        return JsonResponse(
            build_error(
                errors=[{"code": "ACCESS_DENIED", "message": "Access denied."}],
                tenant_id=request.tenant_id,
                role=actor_role,
            ),
            status=403,
        )
    summary = LearningObservationBO.compute_developmental_summary(
        tenant_id=request.tenant_id,
        student=student,
        shared_only=(actor_role == "Parent"),
    )
    return JsonResponse(
        build_response(data=summary, tenant_id=request.tenant_id, role=actor_role),
        status=200,
    )


@router.get("/students/{student_id}/care-history", auth=JWTAuthBearer())
@require_roles("Admin", "Principal", "Owner", "Teacher", "CareGiver", "Caregiver", "Parent")
def get_student_care_history(request, student_id: UUID, target_date: Optional[date] = None):
    """Unified child daily care audit log combining attendance, care events, media, meds, learning observations, and incidents."""
    actor_role = getattr(request, "user_role", "Admin")
    student = get_object_or_404(
        Student,
        student_id=student_id,
        tenant_id=request.tenant_id,
        is_deleted=False,
    )
    if not verify_student_access(request, student):
        return JsonResponse(
            build_error(
                errors=[{"code": "ACCESS_DENIED", "message": "Access denied to this child's care history."}],
                tenant_id=request.tenant_id,
                role=actor_role,
            ),
            status=403,
        )
    history = ChildCareHistoryBO.get_child_day_history(
        tenant_id=request.tenant_id,
        student=student,
        target_date=target_date or timezone.localdate(),
        include_hidden=(actor_role != "Parent"),
    )
    return JsonResponse(
        build_response(data=history, tenant_id=request.tenant_id, role=actor_role),
        status=200,
    )
