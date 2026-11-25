"""Business objects for Caregiver MVP-2: CareEvent, CareMedia, EXIF stripping, and Parent Feed."""

import hashlib
import hmac
import json
import os
import struct
import time
import uuid
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional
from uuid import UUID

from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from core.business_objects.base import BusinessRuleError, RuleViolation
from core.models import (
    AuditLog,
    CareEvent,
    CareMedia,
    HealthObservation,
    Incident,
    LearningFramework,
    LearningObservation,
    MedicationLog,
    Message,
    Student,
    StudentAttendance,
    StudentHealth,
    Tenant,
)

DAILY_HYDRATION_TARGET_ML = 500
UNDO_WINDOW_SECONDS = 300  # 5 minutes


def get_media_storage_root() -> Path:
    configured = getattr(settings, "MEDIA_ROOT", "")
    if configured:
        return Path(configured)
    return Path(settings.BASE_DIR) / "media"


def strip_image_metadata(raw_bytes: bytes, mime: str) -> bytes:
    """
    Strip EXIF/XMP/comment metadata from JPEG, PNG, and WebP images using pure Python
    so GPS coordinates and camera metadata are never persisted.
    """
    mime_lower = (mime or "").lower()
    if mime_lower in ("image/jpeg", "image/jpg") or raw_bytes[:2] == b"\xff\xd8":
        return _strip_jpeg_exif(raw_bytes)
    if mime_lower == "image/png" or raw_bytes[:8] == b"\x89PNG\r\n\x1a\n":
        return _strip_png_metadata(raw_bytes)
    if mime_lower == "image/webp" or (raw_bytes[:4] == b"RIFF" and raw_bytes[8:12] == b"WEBP"):
        return _strip_webp_metadata(raw_bytes)
    return raw_bytes


def _strip_jpeg_exif(data: bytes) -> bytes:
    if len(data) < 4 or data[:2] != b"\xff\xd8":
        return data
    out = bytearray(b"\xff\xd8")
    pos = 2
    length = len(data)
    while pos < length:
        if data[pos] != 0xFF:
            out.extend(data[pos:])
            break
        while pos < length and data[pos] == 0xFF:
            pos += 1
        if pos >= length:
            break
        marker = data[pos]
        pos += 1
        # EOI or standalone markers
        if marker == 0xD9:
            out.extend(b"\xff\xd9")
            break
        if marker == 0x00 or (0xD0 <= marker <= 0xD7) or marker == 0x01:
            out.extend(bytes([0xFF, marker]))
            continue
        # SOS: rest of stream is entropy-coded image data until EOI
        if marker == 0xDA:
            out.extend(b"\xff\xda")
            out.extend(data[pos:])
            break
        if pos + 2 > length:
            break
        seg_len = struct.unpack(">H", data[pos : pos + 2])[0]
        if seg_len < 2 or pos + seg_len > length:
            break
        # Drop APP1..APP15 (0xE1..0xEF, includes EXIF/XMP/IPTC/ICC) and COM (0xFE)
        if (0xE1 <= marker <= 0xEF) or marker == 0xFE:
            pos += seg_len
            continue
        out.extend(bytes([0xFF, marker]))
        out.extend(data[pos : pos + seg_len])
        pos += seg_len
    return bytes(out)


def _strip_png_metadata(data: bytes) -> bytes:
    sig = b"\x89PNG\r\n\x1a\n"
    if not data.startswith(sig):
        return data
    out = bytearray(sig)
    pos = 8
    drop_chunks = {b"eXIf", b"tEXt", b"iTXt", b"zTXt"}
    while pos + 8 <= len(data):
        chunk_len = struct.unpack(">I", data[pos : pos + 4])[0]
        chunk_type = data[pos + 4 : pos + 8]
        total_len = 12 + chunk_len
        if pos + total_len > len(data):
            break
        if chunk_type not in drop_chunks:
            out.extend(data[pos : pos + total_len])
        pos += total_len
        if chunk_type == b"IEND":
            break
    return bytes(out)


def _strip_webp_metadata(data: bytes) -> bytes:
    if len(data) < 12 or data[:4] != b"RIFF" or data[8:12] != b"WEBP":
        return data
    chunks = bytearray()
    pos = 12
    drop_fourcc = {b"EXIF", b"XMP "}
    while pos + 8 <= len(data):
        fourcc = data[pos : pos + 4]
        chunk_size = struct.unpack("<I", data[pos + 4 : pos + 8])[0]
        padded = chunk_size + (chunk_size % 2)
        if pos + 8 + padded > len(data):
            break
        if fourcc not in drop_fourcc:
            chunks.extend(data[pos : pos + 8 + padded])
        pos += 8 + padded
    riff_size = 4 + len(chunks)
    return b"RIFF" + struct.pack("<I", riff_size) + b"WEBP" + bytes(chunks)


def sign_media_url(media_id: UUID, tenant_id: UUID, ttl_seconds: int = 3600) -> str:
    exp = int(time.time()) + ttl_seconds
    secret = str(settings.SECRET_KEY).encode("utf-8")
    msg = f"{media_id}:{tenant_id}:{exp}".encode("utf-8")
    sig = hmac.new(secret, msg, hashlib.sha256).hexdigest()
    return f"/api/v1/care-media/{media_id}/file?exp={exp}&sig={sig}"


def verify_media_signature(media_id: UUID, tenant_id: UUID, exp: int, sig: str) -> bool:
    if exp < int(time.time()):
        return False
    secret = str(settings.SECRET_KEY).encode("utf-8")
    msg = f"{media_id}:{tenant_id}:{exp}".encode("utf-8")
    expected = hmac.new(secret, msg, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, sig)


class CareEventBO:
    @staticmethod
    def _requires_topical_consent(payload: Dict[str, Any]) -> bool:
        if not isinstance(payload, dict):
            return False
        for key in ("barrier_cream", "sunscreen", "topical", "diaper_cream"):
            if payload.get(key):
                return True
        note_text = str(payload.get("note", "") or "").lower()
        return any(term in note_text for term in ("barrier cream", "sunscreen"))

    @staticmethod
    def _serialize(ev: CareEvent) -> Dict[str, Any]:
        return {
            "event_id": str(ev.event_id),
            "student_id": str(ev.student_id),
            "student_name": ev.student.name if ev.student_id else "",
            "event_type": ev.event_type,
            "occurred_at": ev.occurred_at.isoformat(),
            "created_at": ev.created_at.isoformat(),
            "payload": ev.payload or {},
            "logged_by": str(ev.logged_by),
            "parent_visible": ev.parent_visible,
            "is_hidden": ev.is_hidden,
        }

    @classmethod
    @transaction.atomic
    def create_events(
        cls,
        tenant: Tenant,
        actor_id: UUID,
        items: List[Dict[str, Any]],
        students_by_id: Dict[UUID, Student],
    ) -> List[Dict[str, Any]]:
        student_ids = list(students_by_id.keys())
        health_map = {
            h.student_id: h
            for h in StudentHealth.objects.filter(
                tenant=tenant,
                student_id__in=student_ids,
                is_deleted=False,
            )
        }

        created: List[CareEvent] = []
        now = timezone.now()
        for item in items:
            sid = item["student_id"]
            student = students_by_id[sid]
            payload = item.get("payload") or {}
            if cls._requires_topical_consent(payload):
                hp = health_map.get(sid)
                if not hp or not hp.topical_consent:
                    raise BusinessRuleError([
                        RuleViolation(
                            "BR-07-01",
                            f"Topical consent (barrier cream / sunscreen) is not on file for {student.name}.",
                            field="payload",
                        )
                    ])

            ev = CareEvent.objects.create(
                tenant=tenant,
                student=student,
                event_type=item["event_type"],
                occurred_at=item.get("occurred_at") or now,
                payload=payload,
                logged_by=actor_id,
                parent_visible=item.get("parent_visible", True),
                created_by=actor_id,
            )
            created.append(ev)

        return [cls._serialize(ev) for ev in created]

    @classmethod
    def update_event(
        cls,
        event: CareEvent,
        data: Dict[str, Any],
        actor_id: Optional[UUID] = None,
    ) -> Dict[str, Any]:
        payload = data.get("payload")
        if payload is not None and cls._requires_topical_consent(payload):
            hp = StudentHealth.objects.filter(
                tenant=event.tenant,
                student=event.student,
                is_deleted=False,
            ).first()
            if not hp or not hp.topical_consent:
                raise BusinessRuleError([
                    RuleViolation(
                        "BR-07-01",
                        f"Topical consent (barrier cream / sunscreen) is not on file for {event.student.name}.",
                        field="payload",
                    )
                ])
        old_vals = cls._serialize(event)
        with transaction.atomic():
            if data.get("event_type") is not None:
                event.event_type = data["event_type"]
            if payload is not None:
                event.payload = payload
            if data.get("parent_visible") is not None:
                event.parent_visible = bool(data["parent_visible"])
            if data.get("occurred_at") is not None:
                event.occurred_at = data["occurred_at"]
            event.save()
            AuditLog.objects.create(
                tenant=event.tenant,
                actor_id=actor_id,
                action="UPDATE",
                entity="CareEvent",
                entity_id=str(event.event_id),
                old_values={"event_type": old_vals["event_type"], "payload": old_vals["payload"]},
                new_values={"event_type": event.event_type, "payload": event.payload},
            )
        return cls._serialize(event)

    @classmethod
    def hide_event(cls, event: CareEvent, actor_role: str, actor_id: Optional[UUID] = None) -> Dict[str, Any]:
        elapsed = (timezone.now() - event.created_at).total_seconds()
        if elapsed > UNDO_WINDOW_SECONDS and actor_role not in ("Admin", "Principal", "Owner"):
            raise BusinessRuleError([
                RuleViolation(
                    "UNDO_WINDOW_EXPIRED",
                    "Care event undo/hide window (5 minutes) has expired.",
                )
            ])
        with transaction.atomic():
            event.is_hidden = True
            update_fields = ["is_hidden", "updated_at"]
            if actor_role in ("Admin", "Principal", "Owner"):
                event.is_deleted = True
                update_fields.append("is_deleted")
            event.save(update_fields=update_fields)
            AuditLog.objects.create(
                tenant=event.tenant,
                actor_id=actor_id,
                action="DELETE",
                entity="CareEvent",
                entity_id=str(event.event_id),
                new_values={
                    "is_hidden": True,
                    "is_deleted": bool(event.is_deleted),
                    "event_type": event.event_type,
                },
            )
        return cls._serialize(event)

    @classmethod
    def compute_room_summary(
        cls,
        tenant_id: UUID,
        students: List[Student],
        target_date: date,
        events: List[CareEvent],
    ) -> Dict[str, Any]:
        student_ids = [s.student_id for s in students]
        present_att = set(
            StudentAttendance.objects.filter(
                tenant_id=tenant_id,
                student_id__in=student_ids,
                date=target_date,
                period="Full_Day",
                status__in=["Present", "Late"],
                is_deleted=False,
            ).values_list("student_id", flat=True)
        )
        # If no attendance marked yet, fall back to active students count as denominator
        denominator_ids = list(present_att) if present_att else student_ids
        denom_count = max(len(denominator_ids), 1)

        per_student: Dict[str, Dict[str, Any]] = {}
        for s in students:
            per_student[str(s.student_id)] = {
                "mood": None,
                "hydration_ml": 0,
                "last_diaper": None,
                "next_diaper_due": None,
                "meal_status": None,
                "nap_status": None,
                "is_sleeping": False,
                "sleep_since": None,
                "events": [],
            }

        # Events sorted chronologically ascending for state folding
        sorted_events = sorted(events, key=lambda e: (e.occurred_at, e.created_at))
        meal_students = set()
        diaper_students = set()
        now = timezone.now()

        for ev in sorted_events:
            sid_str = str(ev.student_id)
            if sid_str not in per_student:
                continue
            st_state = per_student[sid_str]
            st_state["events"].append(cls._serialize(ev))
            p = ev.payload or {}
            local_time_str = timezone.localtime(ev.occurred_at).strftime("%I:%M %p").lstrip("0")

            if ev.event_type == "mood":
                st_state["mood"] = p.get("mood") or p.get("value") or st_state["mood"]
            elif ev.event_type == "water":
                ml = int(p.get("amount_ml") or p.get("ml") or 0)
                st_state["hydration_ml"] += max(ml, 0)
            elif ev.event_type in ("meal", "bottle"):
                meal_students.add(ev.student_id)
                label = p.get("label") or p.get("portion") or p.get("meal_type") or "Logged"
                if ev.event_type == "bottle" and p.get("amount_ml"):
                    label = f"{p['amount_ml']} mL bottle"
                st_state["meal_status"] = f"{label} ({local_time_str})"
            elif ev.event_type == "diaper":
                diaper_students.add(ev.student_id)
                dtype = p.get("type") or p.get("status") or "Checked"
                note = p.get("note") or ""
                due_dt = timezone.localtime(ev.occurred_at + timedelta(hours=2))
                st_state["last_diaper"] = {
                    "time": local_time_str,
                    "type": dtype,
                    "note": note or dtype,
                    "occurred_at": ev.occurred_at.isoformat(),
                    "next_due_time": due_dt.strftime("%I:%M %p").lstrip("0"),
                }
                st_state["next_diaper_due"] = due_dt.strftime("%I:%M %p").lstrip("0")
            elif ev.event_type == "nap_start":
                st_state["is_sleeping"] = True
                st_state["sleep_since"] = ev.occurred_at.isoformat()
                st_state["nap_status"] = f"Asleep since {local_time_str}"
            elif ev.event_type == "nap_end":
                st_state["is_sleeping"] = False
                st_state["sleep_since"] = None
                st_state["nap_status"] = f"Awake ({local_time_str})"

        # Compute aggregate metrics dynamically
        total_hydration_ml = sum(
            min(per_student[str(sid)]["hydration_ml"], DAILY_HYDRATION_TARGET_ML)
            for sid in denominator_ids
            if str(sid) in per_student
        )
        hydration_pct = round((total_hydration_ml / (denom_count * DAILY_HYDRATION_TARGET_ML)) * 100)
        snack_pct = round((len([sid for sid in meal_students if sid in denominator_ids]) / denom_count) * 100)
        asleep_count = sum(
            1 for sid in denominator_ids if per_student.get(str(sid), {}).get("is_sleeping")
        )
        diapers_due_count = 0
        for sid in denominator_ids:
            last_d = per_student.get(str(sid), {}).get("last_diaper")
            if not last_d:
                diapers_due_count += 1
            else:
                try:
                    last_dt = datetime.fromisoformat(last_d["occurred_at"])
                    if (now - last_dt).total_seconds() >= 7200:
                        diapers_due_count += 1
                except ValueError:
                    pass

        return {
            "date": target_date.isoformat(),
            "present_count": len(present_att),
            "enrolled_count": len(students),
            "hydration_pct": min(hydration_pct, 100),
            "snack_pct": min(snack_pct, 100),
            "asleep_count": asleep_count,
            "diapers_logged_count": len(diaper_students),
            "diapers_due_count": diapers_due_count,
            "per_student": per_student,
        }


class CareMediaBO:
    ALLOWED_MIME_TYPES = {
        "image/jpeg": "jpg",
        "image/jpg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "video/mp4": "mp4",
    }

    @classmethod
    @transaction.atomic
    def create_media(
        cls,
        tenant: Tenant,
        actor_id: UUID,
        file_obj,
        mime: str,
        students: List[Student],
        caption: str = "",
    ) -> Dict[str, Any]:
        mime_norm = (mime or "").lower().strip()
        if mime_norm not in cls.ALLOWED_MIME_TYPES:
            raise BusinessRuleError([
                RuleViolation(
                    "INVALID_MEDIA_TYPE",
                    f"Unsupported media type '{mime}'. Allowed: JPEG, PNG, WebP, MP4.",
                    field="file",
                )
            ])
        if not students:
            raise BusinessRuleError([
                RuleViolation(
                    "MISSING_STUDENTS",
                    "At least one student must be tagged in the classroom moment.",
                    field="student_ids",
                )
            ])

        student_ids = [s.student_id for s in students]
        health_map = {
            h.student_id: h
            for h in StudentHealth.objects.filter(
                tenant=tenant,
                student_id__in=student_ids,
                is_deleted=False,
            )
        }
        blocked = [
            s.name
            for s in students
            if not health_map.get(s.student_id) or not health_map[s.student_id].photo_consent
        ]
        if blocked:
            raise BusinessRuleError([
                RuleViolation(
                    "PHOTO_CONSENT_REQUIRED",
                    f"Photo consent is not on file for: {', '.join(blocked)}.",
                    field="student_ids",
                )
            ])

        raw_bytes = file_obj.read()
        cleaned_bytes = strip_image_metadata(raw_bytes, mime_norm)

        media_id = uuid.uuid4()
        ext = cls.ALLOWED_MIME_TYPES[mime_norm]
        rel_path = f"care_media/{tenant.tenant_id}/{media_id}.{ext}"
        abs_path = get_media_storage_root() / rel_path
        abs_path.parent.mkdir(parents=True, exist_ok=True)
        abs_path.write_bytes(cleaned_bytes)

        media = CareMedia.objects.create(
            media_id=media_id,
            tenant=tenant,
            file_ref=rel_path,
            mime=mime_norm,
            caption=caption or "",
            consent_checked=True,
            captured_by=actor_id,
            captured_at=timezone.now(),
            parent_visible=True,
            created_by=actor_id,
        )
        media.students.set(students)

        return cls.serialize(media, tenant.tenant_id)

    @staticmethod
    def serialize(media: CareMedia, tenant_id: UUID) -> Dict[str, Any]:
        return {
            "media_id": str(media.media_id),
            "student_ids": [str(s.student_id) for s in media.students.all()],
            "mime": media.mime,
            "caption": media.caption,
            "consent_checked": media.consent_checked,
            "captured_at": media.captured_at.isoformat(),
            "signed_url": sign_media_url(media.media_id, tenant_id),
        }

    @staticmethod
    def delete_media(media: CareMedia) -> None:
        abs_path = get_media_storage_root() / media.file_ref
        media.is_deleted = True
        media.save(update_fields=["is_deleted", "updated_at"])
        if abs_path.exists():
            try:
                os.remove(abs_path)
            except OSError:
                pass


def build_parent_child_feed(
    tenant_id: UUID,
    student: Student,
    target_date: date,
) -> List[Dict[str, Any]]:
    """Build chronological daily-report feed of CareEvents, Messages, CareMedia, and MedicationLogs."""
    items: List[Dict[str, Any]] = []

    events = CareEvent.objects.filter(
        tenant_id=tenant_id,
        student=student,
        is_deleted=False,
        is_hidden=False,
        parent_visible=True,
        occurred_at__date=target_date,
    ).order_by("occurred_at")

    for ev in events:
        items.append({
            "item_id": str(ev.event_id),
            "kind": "care_event",
            "event_type": ev.event_type,
            "timestamp": ev.occurred_at.isoformat(),
            "payload": ev.payload or {},
            "title": _care_event_title(ev),
            "detail": _care_event_detail(ev),
        })

    messages = Message.objects.filter(
        tenant_id=tenant_id,
        is_deleted=False,
        created_at__date=target_date,
    ).filter(
        Q(recipient_id=student.student_id) | Q(payload__student_id=str(student.student_id))
    ).order_by("created_at")

    for msg in messages:
        items.append({
            "item_id": str(msg.message_id),
            "kind": "note",
            "event_type": "note",
            "timestamp": msg.created_at.isoformat(),
            "title": msg.subject or "Caregiver Note",
            "detail": msg.body,
            "delivery_status": msg.delivery_status,
            "channel": msg.channel,
        })

    media_items = (
        CareMedia.objects.filter(
            tenant_id=tenant_id,
            is_deleted=False,
            parent_visible=True,
            students=student,
            captured_at__date=target_date,
        )
        .prefetch_related("students")
        .order_by("captured_at")
    )
    for m in media_items:
        items.append({
            "item_id": str(m.media_id),
            "kind": "media",
            "event_type": "media",
            "timestamp": m.captured_at.isoformat(),
            "title": m.caption or "Classroom Moment",
            "detail": m.caption or "Shared from Room 1A",
            "mime": m.mime,
            "signed_url": sign_media_url(m.media_id, tenant_id),
        })

    med_logs = MedicationLog.objects.filter(
        tenant_id=tenant_id,
        student=student,
        is_deleted=False,
        time_administered__date=target_date,
    ).order_by("time_administered")
    for ml in med_logs:
        items.append({
            "item_id": str(ml.med_log_id),
            "kind": "medication",
            "event_type": "medication",
            "timestamp": ml.time_administered.isoformat(),
            "title": f"Medication: {ml.medicine_name}",
            "detail": f"{ml.dose}" + (f" — {ml.notes}" if ml.notes else ""),
        })

    observations = LearningObservation.objects.filter(
        tenant_id=tenant_id,
        student=student,
        is_deleted=False,
        shared_with_family=True,
        observed_on=target_date,
    ).order_by("created_at")
    for obs in observations:
        domain_str = ", ".join(obs.domains or [])
        items.append({
            "item_id": str(obs.observation_id),
            "kind": "learning_observation",
            "event_type": "learning_observation",
            "timestamp": obs.created_at.isoformat(),
            "title": f"Learning Milestone ({obs.framework}): {domain_str}" if domain_str else f"Learning Milestone ({obs.framework})",
            "detail": obs.note,
            "framework": obs.framework,
            "domains": obs.domains or [],
        })

    items.sort(key=lambda x: x["timestamp"])
    return items


class HealthScreenBO:
    VALID_SYMPTOMS = {"fever", "rash", "cough", "vomiting", "exposure"}
    SUPERVISOR_ROLES = {"Admin", "Administrator", "Principal", "Vice_Principal", "Owner", "Supervisor"}

    @classmethod
    def process_screen(
        cls,
        tenant: Tenant,
        student: Student,
        actor_id: UUID,
        actor_role: str,
        symptoms: Optional[List[str]] = None,
        temperature_c: Optional[float] = None,
        supervisor_override: bool = False,
        override_reason: str = "",
    ) -> Dict[str, Any]:
        clean_symptoms = [
            s.strip().lower()
            for s in (symptoms or [])
            if s and s.strip().lower() in cls.VALID_SYMPTOMS
        ]
        temp_flagged = temperature_c is not None and float(temperature_c) >= 38.0
        if temp_flagged and "fever" not in clean_symptoms:
            clean_symptoms.append("fever")

        positive = len(clean_symptoms) > 0 or temp_flagged

        if positive and supervisor_override and actor_role not in cls.SUPERVISOR_ROLES:
            raise BusinessRuleError([
                RuleViolation(
                    "SUPERVISOR_OVERRIDE_REQUIRED",
                    "Only Admin, Principal, Vice Principal, or Supervisor can override a positive symptom screen.",
                    field="supervisor_override",
                )
            ])

        payload = {
            "symptoms": clean_symptoms,
            "temperature_c": float(temperature_c) if temperature_c is not None else None,
            "positive": positive,
            "supervisor_override": bool(positive and supervisor_override),
            "override_reason": override_reason or "",
        }
        ev = CareEvent.objects.create(
            tenant=tenant,
            student=student,
            event_type="health_screen",
            occurred_at=timezone.now(),
            payload=payload,
            logged_by=actor_id,
            parent_visible=True,
            created_by=actor_id,
        )

        if positive and not supervisor_override:
            Message.objects.create(
                tenant=tenant,
                recipient_role="Admin",
                channel="In_App",
                subject=f"Do Not Admit Alert: {student.name}",
                body=f"Positive drop-off symptom screen ({', '.join(clean_symptoms) or 'Elevated Temp'}). Director review required.",
                trigger_event="Health_Screen_Flagged",
                payload={"student_id": str(student.student_id), **payload},
                delivery_status="Delivered",
                delivery_confirmed_at=timezone.now(),
            )
            raise BusinessRuleError([
                RuleViolation(
                    "BR-07-02",
                    f"Do Not Admit / Notify Director: {student.name} flagged for {', '.join(clean_symptoms) or 'elevated temperature'}. Supervisor override required.",
                    field="symptoms",
                )
            ])

        if positive and supervisor_override:
            AuditLog.objects.create(
                tenant=tenant,
                actor_id=actor_id,
                action="CREATE",
                entity="HealthScreenOverride",
                entity_id=str(student.student_id),
                old_values={"positive_symptoms": clean_symptoms, "temperature_c": payload["temperature_c"]},
                new_values={"admitted": True, "override_reason": override_reason or "Supervisor cleared at door", "actor_role": actor_role},
            )

        return CareEventBO._serialize(ev)


class LearningObservationBO:
    DEFAULT_FRAMEWORKS = [
        {
            "code": "ELECT",
            "name": "Early Learning for Every Child Today (ELECT)",
            "domains": ["Fine Motor", "Gross Motor", "Language", "Social-Emotional", "Cognitive", "Sensory"],
            "is_default": True,
        },
        {
            "code": "HDLH",
            "name": "How Does Learning Happen? (HDLH)",
            "domains": ["Belonging", "Well-Being", "Engagement", "Expression"],
            "is_default": False,
        },
        {
            "code": "EYFS",
            "name": "Early Years Foundation Stage (EYFS)",
            "domains": ["Communication & Language", "Physical Development", "Personal, Social & Emotional", "Literacy", "Mathematics"],
            "is_default": False,
        },
    ]

    @classmethod
    def ensure_default_frameworks(cls, tenant: Tenant) -> List[Dict[str, Any]]:
        existing = list(
            LearningFramework.objects.filter(tenant=tenant, is_deleted=False).order_by("-is_default", "code")
        )
        if not existing:
            created = []
            for fw in cls.DEFAULT_FRAMEWORKS:
                created.append(
                    LearningFramework.objects.create(
                        tenant=tenant,
                        code=fw["code"],
                        name=fw["name"],
                        domains=fw["domains"],
                        is_default=fw["is_default"],
                    )
                )
            existing = created
        return [
            {
                "framework_id": str(f.framework_id),
                "code": f.code,
                "name": f.name,
                "domains": f.domains or [],
                "is_default": f.is_default,
            }
            for f in existing
        ]

    @staticmethod
    def serialize(obs: LearningObservation) -> Dict[str, Any]:
        return {
            "observation_id": str(obs.observation_id),
            "student_id": str(obs.student_id),
            "student_name": obs.student.name if obs.student_id else "",
            "framework": obs.framework,
            "domains": obs.domains or [],
            "note": obs.note,
            "media_ids": [str(mid) for mid in (obs.media_ids or [])],
            "shared_with_family": obs.shared_with_family,
            "observed_on": obs.observed_on.isoformat(),
            "logged_by": str(obs.logged_by),
            "activity_plan_id": str(obs.activity_plan_id) if obs.activity_plan_id else None,
            "created_at": obs.created_at.isoformat(),
        }

    @classmethod
    def create_observation(
        cls,
        tenant: Tenant,
        student: Student,
        actor_id: UUID,
        data: Dict[str, Any],
    ) -> Dict[str, Any]:
        note = str(data.get("note") or "").strip()
        domains = [str(d).strip() for d in (data.get("domains") or []) if str(d).strip()]
        if not note:
            raise BusinessRuleError([
                RuleViolation("VALIDATION_ERROR", "Observation note is required.", field="note")
            ])
        if not domains:
            raise BusinessRuleError([
                RuleViolation("VALIDATION_ERROR", "Select at least one developmental domain.", field="domains")
            ])
        obs = LearningObservation.objects.create(
            tenant=tenant,
            student=student,
            framework=data.get("framework") or "ELECT",
            domains=domains,
            note=note,
            media_ids=[str(mid) for mid in (data.get("media_ids") or [])],
            shared_with_family=bool(data.get("shared_with_family", False)),
            observed_on=data.get("observed_on") or timezone.localdate(),
            logged_by=actor_id,
            activity_plan_id=data.get("activity_plan_id"),
            created_by=actor_id,
        )
        return cls.serialize(obs)

    @classmethod
    def compute_developmental_summary(
        cls,
        tenant_id: UUID,
        student: Student,
        shared_only: bool = False,
    ) -> Dict[str, Any]:
        qs = LearningObservation.objects.filter(
            tenant_id=tenant_id,
            student=student,
            is_deleted=False,
        )
        if shared_only:
            qs = qs.filter(shared_with_family=True)

        domain_counts: Dict[str, int] = {}
        framework_counts: Dict[str, int] = {}
        total = 0
        for obs in qs:
            total += 1
            fw = obs.framework or "ELECT"
            framework_counts[fw] = framework_counts.get(fw, 0) + 1
            for d in (obs.domains or []):
                domain_counts[d] = domain_counts.get(d, 0) + 1

        return {
            "student_id": str(student.student_id),
            "student_name": student.name,
            "total_observations": total,
            "domain_counts": domain_counts,
            "framework_counts": framework_counts,
        }


def _care_event_title(ev: CareEvent) -> str:
    p = ev.payload or {}
    mapping = {
        "diaper": f"Diaper / Potty: {p.get('type') or p.get('status') or 'Checked'}",
        "meal": f"Meal: {p.get('meal_type') or 'Snack / Meal'}",
        "bottle": "Bottle Feeding",
        "nap_start": "Nap Started",
        "nap_end": "Woke Up from Nap",
        "water": f"Hydration (+{p.get('amount_ml') or p.get('ml') or 0} mL)",
        "mood": f"Mood: {p.get('mood') or p.get('value') or 'Happy'}",
        "note": "Caregiver Note",
        "health_screen": "Health Check",
        "sleep_check": "15-min Sleep Check",
    }
    return mapping.get(ev.event_type, ev.event_type.replace("_", " ").title())


def _care_event_detail(ev: CareEvent) -> str:
    p = ev.payload or {}
    parts = []
    if p.get("portion"):
        parts.append(f"Portion: {p['portion']}")
    if p.get("amount_ml") and ev.event_type != "water":
        parts.append(f"{p['amount_ml']} mL")
    if p.get("barrier_cream"):
        parts.append("Barrier cream applied")
    if p.get("sunscreen"):
        parts.append("Sunscreen applied")
    if p.get("note"):
        parts.append(str(p["note"]))
    return " • ".join(parts) if parts else "Logged by Caregiver"


class ChildCareHistoryBO:
    """Comprehensive child day care history aggregator across attendance, care events, media, meds, observations, and incidents."""

    @classmethod
    def get_child_day_history(
        cls,
        tenant_id: UUID,
        student: Student,
        target_date: date,
        include_hidden: bool = True,
    ) -> Dict[str, Any]:
        att = (
            StudentAttendance.objects.filter(
                tenant_id=tenant_id,
                student=student,
                date=target_date,
                period="Full_Day",
                is_deleted=False,
            )
            .order_by("-updated_at")
            .first()
        )
        attendance_payload = (
            {
                "attendance_id": str(att.att_id),
                "status": att.status,
                "method": att.method,
                "check_in_at": att.check_in_at.isoformat() if att.check_in_at else None,
                "check_out_at": att.check_out_at.isoformat() if att.check_out_at else None,
                "late_reason": att.late_reason,
                "locked": bool(att.locked),
            }
            if att
            else None
        )

        timeline: List[Dict[str, Any]] = []
        if att and att.check_in_at:
            reason_note = f" — Reason: {att.late_reason}" if att.late_reason else ""
            timeline.append({
                "item_id": f"{att.att_id}-in",
                "kind": "attendance",
                "event_type": "check_in",
                "timestamp": att.check_in_at.isoformat(),
                "title": f"Checked In ({att.status})",
                "detail": f"Method: {att.method}{reason_note}",
                "parent_visible": True,
                "is_hidden": False,
            })
        if att and att.check_out_at:
            timeline.append({
                "item_id": f"{att.att_id}-out",
                "kind": "attendance",
                "event_type": "check_out",
                "timestamp": att.check_out_at.isoformat(),
                "title": "Checked Out / Released",
                "detail": f"Method: {att.method}",
                "parent_visible": True,
                "is_hidden": False,
            })

        care_qs = CareEvent.objects.filter(
            tenant_id=tenant_id,
            student=student,
            is_deleted=False,
            occurred_at__date=target_date,
        ).order_by("occurred_at")
        if not include_hidden:
            care_qs = care_qs.filter(is_hidden=False, parent_visible=True)

        care_count = 0
        for ev in care_qs:
            care_count += 1
            timeline.append({
                "item_id": str(ev.event_id),
                "kind": "care_event",
                "event_type": ev.event_type,
                "timestamp": ev.occurred_at.isoformat(),
                "title": _care_event_title(ev),
                "detail": _care_event_detail(ev),
                "payload": ev.payload or {},
                "parent_visible": bool(ev.parent_visible),
                "is_hidden": bool(ev.is_hidden),
            })

        media_qs = (
            CareMedia.objects.filter(
                tenant_id=tenant_id,
                is_deleted=False,
                students=student,
                captured_at__date=target_date,
            )
            .order_by("captured_at")
        )
        if not include_hidden:
            media_qs = media_qs.filter(parent_visible=True)

        media_count = 0
        for m in media_qs:
            media_count += 1
            timeline.append({
                "item_id": str(m.media_id),
                "kind": "media",
                "event_type": "media",
                "timestamp": m.captured_at.isoformat(),
                "title": m.caption or "Classroom Moment",
                "detail": f"{m.mime} • Consent Checked: {'Yes' if m.consent_checked else 'No'}",
                "mime": m.mime,
                "signed_url": sign_media_url(m.media_id, tenant_id),
                "parent_visible": bool(m.parent_visible),
                "is_hidden": False,
            })

        med_qs = MedicationLog.objects.filter(
            tenant_id=tenant_id,
            student=student,
            is_deleted=False,
            time_administered__date=target_date,
        ).order_by("time_administered")
        meds_count = 0
        for ml in med_qs:
            meds_count += 1
            timeline.append({
                "item_id": str(ml.med_log_id),
                "kind": "medication",
                "event_type": "medication",
                "timestamp": ml.time_administered.isoformat(),
                "title": f"Medication: {ml.medicine_name}",
                "detail": f"Dose: {ml.dose}" + (f" • {ml.notes}" if ml.notes else ""),
                "parent_visible": bool(ml.parent_notified),
                "is_hidden": False,
            })

        obs_qs = LearningObservation.objects.filter(
            tenant_id=tenant_id,
            student=student,
            is_deleted=False,
            observed_on=target_date,
        ).order_by("created_at")
        if not include_hidden:
            obs_qs = obs_qs.filter(shared_with_family=True)

        obs_count = 0
        for obs in obs_qs:
            obs_count += 1
            domain_str = ", ".join(obs.domains or [])
            timeline.append({
                "item_id": str(obs.observation_id),
                "kind": "learning_observation",
                "event_type": "learning_observation",
                "timestamp": obs.created_at.isoformat(),
                "title": f"Learning Observation ({obs.framework})" + (f": {domain_str}" if domain_str else ""),
                "detail": obs.note,
                "framework": obs.framework,
                "domains": obs.domains or [],
                "parent_visible": bool(obs.shared_with_family),
                "is_hidden": False,
            })

        student_id_str = str(student.student_id)
        incidents_qs = Incident.objects.filter(
            tenant_id=tenant_id,
            date=target_date,
            is_deleted=False,
        ).order_by("time", "created_at")
        incidents_count = 0
        for inc in incidents_qs:
            involved = [str(x) for x in (inc.students or [])]
            if student_id_str not in involved:
                continue
            incidents_count += 1
            inc_ts = f"{inc.date.isoformat()}T{inc.time or '12:00'}:00"
            timeline.append({
                "item_id": str(inc.incident_id),
                "kind": "incident",
                "event_type": "incident",
                "timestamp": inc.created_at.isoformat() if inc.created_at else inc_ts,
                "title": f"{inc.incident_type} Incident ({inc.severity})",
                "detail": f"{inc.location}: {inc.description}" + (f" • Actions: {inc.actions_taken}" if inc.actions_taken else ""),
                "parent_visible": bool(inc.parent_notified),
                "is_hidden": False,
            })

        health_obs_qs = HealthObservation.objects.filter(
            tenant_id=tenant_id,
            student=student,
            date=target_date,
            is_deleted=False,
        ).order_by("created_at")
        for ho in health_obs_qs:
            timeline.append({
                "item_id": str(ho.obs_id),
                "kind": "health_observation",
                "event_type": "health_observation",
                "timestamp": ho.created_at.isoformat(),
                "title": f"Daily Health Observation (Mood: {ho.mood}, Appetite: {ho.appetite})",
                "detail": ho.general_notes or ho.feeding_notes or f"Nap: {ho.nap_duration_mins} mins",
                "parent_visible": True,
                "is_hidden": False,
            })

        timeline.sort(key=lambda item: item["timestamp"])
        return {
            "student_id": student_id_str,
            "student_name": student.name,
            "student_number": student.student_number,
            "grade": student.grade,
            "date": target_date.isoformat(),
            "attendance": attendance_payload,
            "summary": {
                "total_items": len(timeline),
                "care_events": care_count,
                "media": media_count,
                "medications": meds_count,
                "learning_observations": obs_count,
                "incidents": incidents_count,
            },
            "timeline": timeline,
        }
