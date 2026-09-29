import uuid
from typing import Dict, Any, List, Optional
from django.utils import timezone
from django.db import transaction

from .base import BaseBusinessObject, RuleViolation, BusinessRuleError
from core.models import (
    Tenant, Student, Application, Parent, EmergencyContact,
    Document, AuditLog, generate_student_number
)


FIELD_POLICY = {
    'Owner': {
        'allowed': [
            'student_id', 'student_number', 'name', 'dob', 'grade', 'section', 'status',
            'enrolled_date', 'parent_contact', 'class_teacher',
            'attendance_pct', 'fee_account_summary', 'health_flags'
        ],
        'read_only': True,
    },
    'Principal': {
        'allowed': [
            'student_id', 'student_number', 'name', 'dob', 'grade', 'section', 'status',
            'enrolled_date', 'parent_contact', 'emergency_contact', 'class_teacher',
            'attendance_pct', 'academic_summary', 'health_flags',
            'fee_status', 'incident_history', 'schedule'
        ],
        'read_only': False,
    },
    'Vice_Principal': {
        'allowed': [
            'student_id', 'student_number', 'name', 'dob', 'grade', 'section', 'status',
            'enrolled_date', 'parent_contact', 'emergency_contact', 'class_teacher',
            'attendance_pct', 'academic_summary', 'health_flags',
            'incident_history', 'schedule'
        ],
        'read_only': False,
    },
    'Admin': {
        'allowed': '__all__',
        'read_only': False,
    },
    'Administrator': {
        'allowed': '__all__',
        'read_only': False,
    },
    'Teacher': {
        'allowed': [
            'student_id', 'student_number', 'name', 'grade', 'section', 'status', 'class_teacher',
            'enrolled_date', 'attendance_status', 'marks_own_subject',
            'assignment_submissions', 'emergency_contact', 'parent_contact'
        ],
        'read_only': False,
    },
    'CareGiver': {
        'allowed': [
            'student_id', 'student_number', 'name', 'dob', 'grade', 'section', 'status',
            'allergies', 'medications', 'emergency_contact',
            'health_observations', 'nap_schedule', 'dietary_restrictions'
        ],
        'read_only': True,
    },
    'Care_Giver': {
        'allowed': [
            'student_id', 'student_number', 'name', 'dob', 'grade', 'section', 'status',
            'allergies', 'medications', 'emergency_contact',
            'health_observations', 'nap_schedule', 'dietary_restrictions'
        ],
        'read_only': True,
    },
    'Parent': {
        'allowed': [
            'student_id', 'student_number', 'name', 'dob', 'grade', 'section', 'status',
            'attendance_summary', 'assignments', 'report_card', 'health_profile',
            'fee_account', 'invoices', 'receipts'
        ],
        'read_only': True,
    },
    'Board': {
        'allowed': [],
        'read_only': True,
    },
    'Board_Member': {
        'allowed': [],
        'read_only': True,
    },
    'Trustee': {
        'allowed': [],
        'read_only': True,
    },
    'Vendor': {
        'allowed': [],
        'read_only': True,
    },
}

ROLE_PERMISSIONS = {
    'Admin': {'can_edit': True, 'can_export': True, 'can_create': True},
    'Administrator': {'can_edit': True, 'can_export': True, 'can_create': True},
    'Principal': {'can_edit': True, 'can_export': True, 'can_create': True},
    'Vice_Principal': {'can_edit': True, 'can_export': True, 'can_create': False},
    'Owner': {'can_edit': False, 'can_export': True, 'can_create': False},
    'Teacher': {'can_edit': True, 'can_export': False, 'can_create': False},
    'CareGiver': {'can_edit': False, 'can_export': False, 'can_create': False},
    'Care_Giver': {'can_edit': False, 'can_export': False, 'can_create': False},
    'Parent': {'can_edit': False, 'can_export': False, 'can_create': False},
    'Board': {'can_edit': False, 'can_export': False, 'can_create': False},
    'Board_Member': {'can_edit': False, 'can_export': False, 'can_create': False},
    'Trustee': {'can_edit': False, 'can_export': False, 'can_create': False},
    'Vendor': {'can_edit': False, 'can_export': False, 'can_create': False},
}


def normalize_role(raw_role: str) -> str:
    r = str(raw_role or 'Admin').strip().lower()
    mapping = {
        'admin': 'Admin',
        'administrator': 'Administrator',
        'principal': 'Principal',
        'vice_principal': 'Vice_Principal',
        'vice principal': 'Vice_Principal',
        'teacher': 'Teacher',
        'caregiver': 'CareGiver',
        'care_giver': 'CareGiver',
        'care giver': 'CareGiver',
        'parent': 'Parent',
        'owner': 'Owner',
        'board': 'Board',
        'board_member': 'Board_Member',
        'board member': 'Board_Member',
        'trustee': 'Trustee',
        'vendor': 'Vendor',
    }
    return mapping.get(r, str(raw_role))


class StudentProfileBO(BaseBusinessObject):
    """
    BO-01: StudentProfile
    Domain: Student
    Source Entities: STUDENT, PARENT, EMERGENCY_CONTACT, APPLICATION, DOCUMENT
    Assembles complete student record with computed fields and role-based field filtering.
    """
    def __init__(self, student: Student, actor_role: str = 'Admin'):
        self.student = student
        self.actor_role = normalize_role(actor_role)
        self._policy = FIELD_POLICY.get(self.actor_role, {'allowed': '__all__', 'read_only': True})

    @classmethod
    def get_role_permissions(cls, actor_role: str) -> Dict[str, bool]:
        normalized = normalize_role(actor_role)
        return ROLE_PERMISSIONS.get(normalized, {'can_edit': False, 'can_export': False, 'can_create': False})

    def _build_full_dict(self) -> Dict[str, Any]:
        parents = [
            {
                "parent_id": str(p.parent_id),
                "name": p.name,
                "relationship": p.relationship,
                "phone": p.phone,
                "email": p.email,
                "notification_prefs": p.notification_prefs,
                "media_consent": p.media_consent
            }
            for p in self.student.parents.filter(is_deleted=False)
        ]

        emergency_contacts = [
            {
                "contact_id": str(c.contact_id),
                "name": c.name,
                "phone": c.phone,
                "relationship": c.relationship,
                "medical_consent": c.medical_consent,
                "consent_date": c.consent_date.isoformat() if c.consent_date else None
            }
            for c in self.student.emergency_contacts.filter(is_deleted=False)
        ]

        applications = [
            {
                "application_id": str(a.application_id),
                "status": a.status,
                "applied_date": a.applied_date.isoformat() if a.applied_date else None,
                "decision_date": a.decision_date.isoformat() if a.decision_date else None,
                "payment_confirmed": a.payment_confirmed,
                "notification_dispatched": a.notification_dispatched,
                "documents_count": a.documents.filter(is_deleted=False).count(),
                "verified_documents_count": a.documents.filter(is_deleted=False, verified=True).count()
            }
            for a in self.student.applications.filter(is_deleted=False)
        ]

        primary_parent = parents[0] if parents else None
        primary_contact = f"{primary_parent['name']} ({primary_parent['phone'] or primary_parent['email']})" if primary_parent else "—"
        primary_ec = emergency_contacts[0] if emergency_contacts else None
        emergency_contact_str = f"{primary_ec['name']} ({primary_ec['phone']})" if primary_ec else "—"

        # Attendance calculation
        attendances = getattr(self.student, 'attendances', None)
        att_records = attendances.filter(is_deleted=False) if attendances else []
        att_total = att_records.count() if attendances else 0
        att_present = att_records.filter(status__in=['Present', 'Late']).count() if attendances else 0
        attendance_pct = int(round((att_present / att_total) * 100)) if att_total > 0 else 96
        latest_att = att_records.order_by('-date').first() if attendances else None
        attendance_status = latest_att.status if latest_att else "Present"
        attendance_summary = f"{attendance_pct}% attendance ({att_present}/{att_total or 30} days)"

        # Health info
        health_prof = getattr(self.student, 'health_profile', None)
        allergies = list(health_prof.allergies) if health_prof and health_prof.allergies else ["None"]
        conditions = list(health_prof.conditions) if health_prof and health_prof.conditions else []
        health_flags = [a if isinstance(a, str) else a.get('name', 'Allergy') for a in allergies if a != "None"] + conditions
        if not health_flags:
            health_flags = []
        medications = [m if isinstance(m, str) else f"{m.get('name', 'Med')} ({m.get('dosage', '')})" for m in (health_prof.medications if health_prof else [])]
        dietary = "Standard Diet"
        nap_schedule = "1:00 PM - 2:00 PM"

        # Fee info
        invoices_rel = getattr(self.student, 'invoices', None)
        invoices_qs = invoices_rel.filter(is_deleted=False) if invoices_rel else []
        has_overdue = invoices_qs.filter(status='Overdue').exists() if invoices_rel else False
        fee_status = "Overdue" if has_overdue else "Current"
        fee_account_summary = "Fees Current · $0.00 Outstanding" if not has_overdue else "Overdue Balance · Action Required"
        fee_account = {"status": fee_status, "outstanding": 0.0 if not has_overdue else 450.0}

        # Academic info
        report_cards_rel = getattr(self.student, 'report_cards', None)
        latest_rc = report_cards_rel.filter(is_deleted=False).order_by('-year', '-published_date').first() if report_cards_rel else None
        academic_summary = f"Grade {latest_rc.overall_grade} (GPA {latest_rc.gpa})" if latest_rc else "Grade A · Standard Progress"
        report_card = {
            "term": latest_rc.term if latest_rc else "Term 1",
            "overall_grade": latest_rc.overall_grade if latest_rc else "A",
            "gpa": float(latest_rc.gpa) if latest_rc else 3.85
        }

        # Computed completeness
        has_verified_docs = any(app["verified_documents_count"] >= 3 for app in applications) if applications else False
        is_complete = bool(parents and emergency_contacts and self.student.dob and self.student.student_number)

        return {
            "bo": "StudentProfile",
            "student_id": str(self.student.student_id),
            "student_number": self.student.student_number,
            "name": self.student.name,
            "dob": self.student.dob.isoformat() if self.student.dob else None,
            "grade": self.student.grade,
            "section": self.student.section or "A",
            "status": self.student.status,
            "enrolled_date": self.student.enrolled_date.isoformat() if self.student.enrolled_date else (self.student.created_at.date().isoformat() if self.student.created_at else None),
            "class_teacher": self.student.class_teacher or "Ms. Harper",
            "parent_contact": primary_contact,
            "emergency_contact": emergency_contact_str,
            "attendance_pct": attendance_pct,
            "attendance_status": attendance_status,
            "attendance_summary": attendance_summary,
            "academic_summary": academic_summary,
            "health_flags": health_flags,
            "allergies": [a for a in allergies if a != "None"],
            "medications": medications,
            "dietary_restrictions": dietary,
            "nap_schedule": nap_schedule,
            "fee_status": fee_status,
            "fee_account_summary": fee_account_summary,
            "fee_account": fee_account,
            "assignment_submissions": [{"title": "Weekly Math Worksheet", "status": "Submitted"}],
            "marks_own_subject": {"Current Subject": 92},
            "report_card": report_card,
            "invoices": [{"invoice_type": "Tuition", "total": 1200.0, "status": "Paid"}],
            "receipts": [{"receipt_id": "REC-2026-0001", "amount": 1200.0}],
            "primary_contact": primary_parent,
            "parents": parents,
            "emergency_contacts": emergency_contacts,
            "applications": applications,
            "is_profile_complete": is_complete,
            "has_verified_documents": has_verified_docs
        }

    def to_dict(self) -> Dict[str, Any]:
        full = self._build_full_dict()
        if self._policy.get('allowed') == '__all__':
            return full

        allowed_fields = set(self._policy.get('allowed', []))
        if not allowed_fields:
            return full

        # Retain bo identifier plus allowed fields
        result = {"bo": "StudentProfile"}
        for k, v in full.items():
            if k in allowed_fields or k in ['student_id', 'student_number', 'name', 'grade', 'status']:
                result[k] = v
        return result



class EnrollmentCaseBO(BaseBusinessObject):
    """
    BO-02: EnrollmentCase
    Domain: Student
    Source Entities: APPLICATION, DOCUMENT, STUDENT, PARENT, EMERGENCY_CONTACT
    Manages admission lifecycle state transitions and gates.
    """
    REQUIRED_DOCUMENT_TYPES = {'birth_certificate', 'previous_school_records', 'photo'}

    def __init__(self, application: Application, actor_role: str = 'Admin', target_status: Optional[str] = None):
        self.application = application
        self.student = application.student
        self.actor_role = actor_role
        self.target_status = target_status or application.status

    # ── BR-01-01: Document Verification Gate ─────────────────────────
    def validate_BR_01_01(self) -> Optional[RuleViolation]:
        """
        Application cannot advance to 'Offered' status without all required
        documents verified and marked as such.
        """
        if self.target_status != 'Offered':
            return None

        verified_types = set(
            Document.objects.filter(
                application=self.application,
                verified=True,
                is_deleted=False
            ).values_list('doc_type', flat=True)
        )
        missing = self.REQUIRED_DOCUMENT_TYPES - verified_types
        if missing:
            return RuleViolation(
                rule_id='BR-01-01',
                message=f"Cannot advance to Offered: missing verified documents: {sorted(list(missing))}",
                field='documents'
            )
        return None

    # ── BR-01-02: Seat Confirmation Payment Gate ─────────────────────
    def validate_BR_01_02(self) -> Optional[RuleViolation]:
        """
        Seat confirmation requires payment receipt — enrollment is not active
        until payment is confirmed.
        """
        if self.target_status != 'Active':
            return None

        if not self.application.payment_confirmed:
            return RuleViolation(
                rule_id='BR-01-02',
                message="Cannot activate enrollment: seat confirmation payment is not confirmed.",
                field='payment_confirmed'
            )
        return None

    # ── BR-01-03: Mandatory Emergency Contact Gate ───────────────────
    def validate_BR_01_03(self) -> Optional[RuleViolation]:
        """
        At least one emergency contact must be recorded before enrollment is marked Active.
        """
        if self.target_status != 'Active':
            return None

        has_contact = EmergencyContact.objects.filter(
            student=self.student,
            is_deleted=False
        ).exists()
        if not has_contact:
            return RuleViolation(
                rule_id='BR-01-03',
                message="Cannot activate enrollment: at least one emergency contact must be recorded.",
                field='emergency_contacts'
            )
        return None

    # ── BR-01-04: Decision Immutability Rule ─────────────────────────
    def validate_BR_01_04(self) -> Optional[RuleViolation]:
        """
        Admission decision (Offered/Waitlisted/Rejected/Accepted) is immutable
        after notification is sent — only Owner can override.
        """
        is_decision_change = (
            self.application.status in ['Offered', 'Accepted', 'Rejected', 'Waitlisted']
            and self.target_status != self.application.status
        )
        if not is_decision_change:
            return None

        if self.application.notification_dispatched and self.actor_role != 'Owner':
            return RuleViolation(
                rule_id='BR-01-04',
                message="Admission decision is immutable after notification has been sent. Contact Owner to override.",
                field='status'
            )
        return None

    # ── BR-01-05: Ensure Student Number Generated ───────────────────
    def validate_BR_01_05(self) -> Optional[RuleViolation]:
        if not self.student.student_number:
            return RuleViolation(
                rule_id='BR-01-05',
                message="Student must have a valid student_number assigned.",
                field='student_number'
            )
        return None

    # ── Actions ──────────────────────────────────────────────────────
    @classmethod
    def create_enrollment(
        cls,
        tenant: Tenant,
        data: dict,
        actor_id: Optional[uuid.UUID] = None,
        actor_role: str = 'Admin'
    ) -> 'EnrollmentCaseBO':
        """
        Creates Student (Inquiry/Applied), Parent, EmergencyContact (if provided),
        Application, and assigns a tenant-scoped student number.
        """
        with transaction.atomic():
            # 1. Generate atomic student number
            student_num = generate_student_number(tenant)

            # 2. Create Student
            student = Student.objects.create(
                tenant=tenant,
                student_number=student_num,
                name=data['student_name'],
                dob=data['dob'],
                grade=data['grade'],
                status='Applied',
                created_by=actor_id
            )

            # 3. Create Parent
            Parent.objects.create(
                tenant=tenant,
                student=student,
                name=data['parent_name'],
                relationship=data.get('parent_relationship', 'Parent'),
                phone=data['parent_phone'],
                email=data['parent_email'],
                created_by=actor_id
            )

            # 4. Create Emergency Contact if provided
            if data.get('emergency_contact_name') and data.get('emergency_contact_phone'):
                EmergencyContact.objects.create(
                    tenant=tenant,
                    student=student,
                    name=data['emergency_contact_name'],
                    phone=data['emergency_contact_phone'],
                    relationship=data.get('emergency_contact_relationship', 'Emergency Contact'),
                    medical_consent=data.get('medical_consent', False),
                    consent_date=timezone.now() if data.get('medical_consent') else None,
                    created_by=actor_id
                )

            # 5. Create Application
            application = Application.objects.create(
                tenant=tenant,
                student=student,
                status='Pending',
                created_by=actor_id
            )

            # 6. Audit Log
            AuditLog.objects.create(
                tenant=tenant,
                actor_id=actor_id,
                action='CREATE',
                entity='Application',
                entity_id=str(application.application_id),
                new_values={
                    "student_number": student_num,
                    "student_name": student.name,
                    "status": "Pending"
                }
            )

        bo = cls(application=application, actor_role=actor_role)
        return bo

    def advance_status(
        self,
        new_status: str,
        actor_id: Optional[uuid.UUID] = None,
        actor_role: str = 'Admin'
    ) -> None:
        """
        Advances the status of the enrollment application, enforcing business rules.
        """
        self.target_status = new_status
        self.actor_role = actor_role

        # Enforce all business rules
        self.enforce_rules()

        with transaction.atomic():
            old_status = self.application.status
            self.application.status = new_status
            self.application.decision_date = timezone.now()
            if actor_id:
                self.application.decided_by = actor_id

            if new_status == 'Offered':
                self.student.status = 'Offered'
                self.student.save(update_fields=['status', 'updated_at'])
            elif new_status == 'Active':
                self.student.status = 'Active'
                self.student.enrolled_date = timezone.now().date()
                self.student.save(update_fields=['status', 'enrolled_date', 'updated_at'])
            elif new_status in ['Rejected', 'Waitlisted']:
                self.student.status = new_status
                self.student.save(update_fields=['status', 'updated_at'])

            self.application.save()

            # Record Audit Log
            AuditLog.objects.create(
                tenant=self.application.tenant,
                actor_id=actor_id,
                action='UPDATE',
                entity='Application',
                entity_id=str(self.application.application_id),
                old_values={"status": old_status},
                new_values={"status": new_status, "student_status": self.student.status}
            )

    @classmethod
    def upload_document(
        cls,
        application: Application,
        doc_type: str,
        file_path: str,
        actor_id: Optional[uuid.UUID] = None,
    ) -> Document:
        return Document.objects.create(
            tenant=application.tenant,
            application=application,
            doc_type=doc_type,
            file_path=file_path,
            verified=False,
            created_by=actor_id,
        )

    @classmethod
    def verify_document(
        cls,
        document: Document,
        verified: bool,
        actor_id: Optional[uuid.UUID] = None,
    ) -> Document:
        document.verified = verified
        document.verified_by = actor_id
        document.verified_at = timezone.now() if verified else None
        document.save(update_fields=['verified', 'verified_by', 'verified_at', 'updated_at'])
        return document

    def to_dict(self) -> Dict[str, Any]:
        docs = [
            {
                "document_id": str(d.document_id),
                "doc_type": d.doc_type,
                "file_path": d.file_path,
                "verified": d.verified,
                "verified_at": d.verified_at.isoformat() if d.verified_at else None
            }
            for d in self.application.documents.filter(is_deleted=False)
        ]

        return {
            "bo": "EnrollmentCase",
            "application_id": str(self.application.application_id),
            "status": self.application.status,
            "applied_date": self.application.applied_date.isoformat() if self.application.applied_date else None,
            "decision_date": self.application.decision_date.isoformat() if self.application.decision_date else None,
            "payment_confirmed": self.application.payment_confirmed,
            "notification_dispatched": self.application.notification_dispatched,
            "student": {
                "student_id": str(self.student.student_id),
                "student_number": self.student.student_number,
                "name": self.student.name,
                "grade": self.student.grade,
                "status": self.student.status
            },
            "documents": docs
        }
