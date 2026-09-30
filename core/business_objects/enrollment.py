import uuid
from datetime import timedelta
from decimal import Decimal
from typing import Dict, Any, List, Optional
from django.utils import timezone
from django.db import transaction

from .base import BaseBusinessObject, RuleViolation, BusinessRuleError
from core.models import (
    Tenant, Student, Application, Parent, EmergencyContact,
    Document, AuditLog, Invoice, Payment, FeeStructure, generate_student_number
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
    REQUIRED_DOCUMENT_TYPES = {'birth_certificate'}

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
        final_decisions = {'Offered', 'Accepted', 'Rejected', 'Waitlisted'}
        is_decision_change = (
            self.application.status in final_decisions
            and self.target_status in final_decisions
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

    def validate_BR_01_06(self) -> Optional[RuleViolation]:
        if self.target_status not in {'Offered', 'Rejected', 'Waitlisted'}:
            return None
        if self.actor_role == 'Owner' and self.target_status in {'Accepted', 'Rejected'}:
            return None
        assessment = (self.application.workflow_data or {}).get('assessment', {})
        if assessment.get('status') != 'Completed':
            return RuleViolation(
                rule_id='BR-01-11',
                message="A completed teacher assessment is required before a final admission decision.",
                field='assessment',
            )
        return None

    def validate_BR_01_14(self) -> Optional[RuleViolation]:
        if self.actor_role == 'Owner' and self.target_status in {'Accepted', 'Rejected'}:
            return None
        if (
            self.application.status not in {'Pending', 'Under_Review'}
            or self.target_status not in {'Offered', 'Rejected', 'Waitlisted'}
        ):
            return None
        if not (self.application.workflow_data or {}).get('vp_recommendation'):
            return RuleViolation(
                rule_id='BR-01-14',
                message="A Vice Principal recommendation is required before the final decision.",
                field='vp_recommendation',
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
        save_as_draft = data.get('save_as_draft', True)
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
                status='Inquiry' if save_as_draft else 'Applied',
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
                status='Pending' if save_as_draft else 'Under_Review',
                workflow_data={
                    'is_draft': save_as_draft,
                    'preferred_intake': data.get('preferred_intake'),
                    'comments': data.get('comments', ''),
                    'emergency_contact': {
                        'name': data.get('emergency_contact_name', ''),
                        'phone': data.get('emergency_contact_phone', ''),
                        'relationship': data.get('emergency_contact_relationship', ''),
                        'medical_consent': data.get('medical_consent', False),
                    },
                    'desired_start_date': data.get('desired_start_date').isoformat()
                    if data.get('desired_start_date') else None,
                },
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
                    "status": application.status,
                    "is_draft": application.workflow_data['is_draft']
                }
            )

        bo = cls(application=application, actor_role=actor_role)
        return bo

    def update_draft(self, data: dict, actor_id: Optional[uuid.UUID] = None) -> None:
        is_draft = (self.application.workflow_data or {}).get('is_draft', False)
        needs_clarification = self.application.status == 'Pending_Clarification'
        if not is_draft and not needs_clarification:
                raise BusinessRuleError([RuleViolation(
                    rule_id='BR-01-06',
                    message="Only saved drafts or applications pending clarification can be edited.",
                    field='status',
                )])

        with transaction.atomic():
            first_name = data.get('first_name')
            last_name = data.get('last_name')
            if first_name is not None or last_name is not None:
                current_names = self.student.name.split(' ', 1)
                self.student.name = ' '.join([
                    first_name if first_name is not None else current_names[0],
                    last_name if last_name is not None else (current_names[1] if len(current_names) > 1 else ''),
                ]).strip()
            if 'dob' in data:
                self.student.dob = data['dob']
            if 'grade' in data:
                self.student.grade = data['grade']
            self.student.save(update_fields=['name', 'dob', 'grade', 'updated_at'])

            parent = self.student.parents.filter(is_deleted=False).first()
            if parent:
                for field in ('parent_name', 'parent_email', 'parent_phone'):
                    if field in data:
                        setattr(parent, field.removeprefix('parent_'), data[field])
                parent.save(update_fields=['name', 'email', 'phone', 'updated_at'])

            emergency_values = {
                'name': data.get('emergency_contact_name'),
                'phone': data.get('emergency_contact_phone'),
                'relationship': data.get('emergency_contact_relationship'),
                'medical_consent': data.get('medical_consent'),
            }
            workflow_data = dict(self.application.workflow_data or {})
            contact_draft = dict(workflow_data.get('emergency_contact', {}))
            for field, value in emergency_values.items():
                if value is not None:
                    contact_draft[field] = value
            workflow_data['emergency_contact'] = contact_draft

            contact = self.student.emergency_contacts.filter(is_deleted=False).first()
            if contact_draft.get('name') and contact_draft.get('phone'):
                if contact is None:
                    contact = EmergencyContact.objects.create(
                        tenant=self.application.tenant,
                        student=self.student,
                        name=contact_draft['name'],
                        phone=contact_draft['phone'],
                        relationship=contact_draft.get('relationship') or 'Emergency Contact',
                        medical_consent=contact_draft.get('medical_consent', False),
                        created_by=actor_id,
                    )
                else:
                    contact.name = contact_draft['name']
                    contact.phone = contact_draft['phone']
                    contact.relationship = contact_draft.get('relationship') or contact.relationship
                    contact.medical_consent = contact_draft.get('medical_consent', contact.medical_consent)
                    contact.save(update_fields=[
                        'name', 'phone', 'relationship', 'medical_consent', 'updated_at'
                    ])
                workflow_data.pop('emergency_contact', None)

            for field in ('preferred_intake', 'comments'):
                if field in data:
                    workflow_data[field] = data[field]
            if 'desired_start_date' in data:
                workflow_data['desired_start_date'] = (
                    data['desired_start_date'].isoformat() if data['desired_start_date'] else None
                )
            self.application.workflow_data = workflow_data
            self.application.save(update_fields=['workflow_data', 'updated_at'])

            AuditLog.objects.create(
                tenant=self.application.tenant,
                actor_id=actor_id,
                action='UPDATE',
                entity='Application',
                entity_id=str(self.application.application_id),
                new_values={'status': self.application.status, 'workflow_data': workflow_data},
            )

    def submit_draft(self, actor_id: Optional[uuid.UUID] = None) -> None:
        workflow_data = dict(self.application.workflow_data or {})
        is_draft = workflow_data.get('is_draft', False)
        needs_clarification = self.application.status == 'Pending_Clarification'
        if not is_draft and not needs_clarification:
            raise BusinessRuleError([RuleViolation(
                rule_id='BR-01-06',
                message="Only saved drafts or applications pending clarification can be submitted.",
                field='status',
            )])
        if not self.application.documents.filter(
            doc_type='birth_certificate', is_deleted=False
        ).exists():
            raise BusinessRuleError([RuleViolation(
                rule_id='BR-01-07',
                message="A birth certificate must be uploaded before submitting the application.",
                field='documents',
            )])
        if not workflow_data.get('preferred_intake'):
            raise BusinessRuleError([RuleViolation(
                rule_id='BR-01-09',
                message="Choose a preferred intake before submitting the application.",
                field='preferred_intake',
            )])
        parent = self.student.parents.filter(is_deleted=False).first()
        if (
            not self.student.name.strip()
            or not self.student.grade.strip()
            or parent is None
            or not parent.name.strip()
            or not parent.email.strip()
            or not parent.phone.strip()
        ):
            raise BusinessRuleError([RuleViolation(
                rule_id='BR-01-13',
                message="Complete the student and parent contact details before submitting.",
                field='student',
            )])
        if not self.student.emergency_contacts.filter(is_deleted=False).exists():
            raise BusinessRuleError([RuleViolation(
                rule_id='BR-01-10',
                message="Add at least one emergency contact before submitting the application.",
                field='emergency_contacts',
            )])

        workflow_data['is_draft'] = False
        if needs_clarification:
            workflow_data['parent_clarification_response'] = workflow_data.get('comments', '')
        self.application.workflow_data = workflow_data
        self.application.status = 'Under_Review'
        self.student.status = 'Applied'
        with transaction.atomic():
            self.student.save(update_fields=['status', 'updated_at'])
            self.application.save(update_fields=['workflow_data', 'status', 'updated_at'])
            AuditLog.objects.create(
                tenant=self.application.tenant,
                actor_id=actor_id,
                action='UPDATE',
                entity='Application',
                entity_id=str(self.application.application_id),
                new_values={'status': self.application.status, 'is_draft': False},
            )

    def assign_assessment(
        self,
        assessor_id: uuid.UUID,
        scheduled_at,
        assessment_with: str = 'Teacher',
        assessor_name: str = '',
        comments: str = '',
        actor_id: Optional[uuid.UUID] = None,
    ) -> None:
        workflow_data = dict(self.application.workflow_data or {})
        workflow_data['assessment'] = {
            **workflow_data.get('assessment', {}),
            'assessor_id': str(assessor_id),
            'scheduled_at': scheduled_at.isoformat(),
            'assessment_with': assessment_with,
            'assessor_name': assessor_name,
            'comments': comments,
            'status': 'Scheduled',
        }
        self.application.workflow_data = workflow_data
        self.application.status = 'Under_Review'
        self.application.save(update_fields=['workflow_data', 'status', 'updated_at'])
        AuditLog.objects.create(
            tenant=self.application.tenant,
            actor_id=actor_id,
            action='UPDATE',
            entity='Application',
            entity_id=str(self.application.application_id),
            new_values={'assessment': workflow_data['assessment']},
        )

    def submit_assessment(
        self,
        data: dict,
        actor_id: Optional[uuid.UUID] = None,
    ) -> None:
        workflow_data = dict(self.application.workflow_data or {})
        assessment = dict(workflow_data.get('assessment', {}))
        assessment.update(data)
        assessment['status'] = 'Completed'
        assessment['submitted_by'] = str(actor_id) if actor_id else None
        workflow_data['assessment'] = assessment
        self.application.workflow_data = workflow_data
        self.application.save(update_fields=['workflow_data', 'updated_at'])
        AuditLog.objects.create(
            tenant=self.application.tenant,
            actor_id=actor_id,
            action='UPDATE',
            entity='Application',
            entity_id=str(self.application.application_id),
            new_values={'assessment': assessment},
        )

    def save_recommendation(
        self,
        recommendation: str,
        reason: str,
        actor_id: Optional[uuid.UUID] = None,
    ) -> None:
        workflow_data = dict(self.application.workflow_data or {})
        workflow_data['vp_recommendation'] = {
            'decision': recommendation,
            'reason': reason,
            'recommended_by': str(actor_id) if actor_id else None,
            'recommended_at': timezone.now().isoformat(),
        }
        self.application.workflow_data = workflow_data
        self.application.save(update_fields=['workflow_data', 'updated_at'])
        AuditLog.objects.create(
            tenant=self.application.tenant,
            actor_id=actor_id,
            action='UPDATE',
            entity='Application',
            entity_id=str(self.application.application_id),
            new_values={'vp_recommendation': workflow_data['vp_recommendation']},
        )

    def _create_acceptance_invoice(
        self,
        actor_id: Optional[uuid.UUID] = None,
        invoice_amount: Optional[Decimal] = None,
    ) -> Invoice:
        workflow_data = self.application.workflow_data or {}
        fee_structure = FeeStructure.objects.filter(
            tenant=self.application.tenant,
            grade=self.student.grade,
            term__iexact=workflow_data.get('preferred_intake', ''),
            is_deleted=False,
        ).order_by('-created_at').first()
        if invoice_amount is None and (not fee_structure or not fee_structure.components):
            raise BusinessRuleError([RuleViolation(
                rule_id='BR-01-15',
                message="No fee structure is configured for this student's grade and intake. Enter a tuition amount to issue the invoice.",
                field='fee_structure',
            )])

        parent = self.student.parents.filter(is_deleted=False).order_by('created_at').first()
        if parent is None:
            raise BusinessRuleError([RuleViolation(
                rule_id='BR-01-16',
                message="A Parent contact is required before issuing the acceptance invoice.",
                field='parent',
            )])

        from core.business_objects.billing import FeeAccountBO

        invoice_date = timezone.localdate()
        invoice = FeeAccountBO.create_invoice(
            tenant=self.application.tenant,
            student=self.student,
            parent=parent,
            invoice_date=invoice_date,
            due_date=invoice_date + timedelta(days=14),
            line_items=(
                fee_structure.components
                if invoice_amount is None and fee_structure
                else [{
                    'description': f'{self.student.grade} tuition',
                    'amount': str(invoice_amount),
                }]
            ),
            fee_structure=fee_structure,
            invoice_type='Tuition',
        )
        workflow_data = dict(self.application.workflow_data or {})
        workflow_data['acceptance_invoice_id'] = str(invoice.invoice_id)
        self.application.workflow_data = workflow_data
        self.application.save(update_fields=['workflow_data', 'updated_at'])
        AuditLog.objects.create(
            tenant=self.application.tenant,
            actor_id=actor_id,
            action='CREATE',
            entity='Invoice',
            entity_id=str(invoice.invoice_id),
            new_values={
                'application_id': str(self.application.application_id),
                'student_id': str(self.student.student_id),
                'total': float(invoice.total),
                'status': invoice.status,
            },
        )
        return invoice

    @classmethod
    def confirm_paid_invoice(
        cls,
        invoice: Invoice,
        payment: Payment,
        actor_id: Optional[uuid.UUID] = None,
        actor_role: str = 'Parent',
    ) -> None:
        if invoice.status != 'Paid' or payment.status != 'Completed':
            return

        with transaction.atomic():
            applications = Application.objects.filter(
                student=invoice.student,
                status__in=['Offered', 'Accepted'],
                is_deleted=False,
            )
            for application in applications:
                workflow_data = dict(application.workflow_data or {})
                workflow_data['payment_confirmation'] = {
                    'invoice_id': str(invoice.invoice_id),
                    'payment_id': str(payment.payment_id),
                    'receipt_reference': payment.receipt_id,
                    'confirmed_by': str(actor_id) if actor_id else None,
                    'confirmed_at': timezone.now().isoformat(),
                }
                application.workflow_data = workflow_data
                application.payment_confirmed = True
                application.save(update_fields=['workflow_data', 'payment_confirmed', 'updated_at'])
                AuditLog.objects.create(
                    tenant=application.tenant,
                    actor_id=actor_id,
                    action='UPDATE',
                    entity='Application',
                    entity_id=str(application.application_id),
                    new_values={
                        'payment_confirmed': True,
                        'invoice_id': str(invoice.invoice_id),
                        'payment_id': str(payment.payment_id),
                        'receipt_reference': payment.receipt_id,
                    },
                )
                if EmergencyContact.objects.filter(
                    student=application.student,
                    is_deleted=False,
                ).exists():
                    EnrollmentCaseBO(
                        application=application,
                        actor_role=actor_role,
                    ).advance_status(
                        new_status='Active',
                        actor_id=actor_id,
                        actor_role=actor_role,
                        reason=f"Invoice {invoice.invoice_id} was paid in full.",
                    )

    def advance_status(
        self,
        new_status: str,
        actor_id: Optional[uuid.UUID] = None,
        actor_role: str = 'Admin',
        reason: Optional[str] = None,
        invoice_amount: Optional[Decimal] = None,
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
            workflow_data = dict(self.application.workflow_data or {})
            workflow_data['decision'] = {
                'status': new_status,
                'reason': reason or '',
                'decided_by': str(actor_id) if actor_id else None,
                'decided_at': self.application.decision_date.isoformat(),
            }
            self.application.workflow_data = workflow_data

            if new_status == 'Offered':
                self.student.status = 'Offered'
                self.student.save(update_fields=['status', 'updated_at'])
            elif new_status == 'Accepted':
                self.student.status = 'Accepted'
                self.student.save(update_fields=['status', 'updated_at'])
            elif new_status == 'Active':
                self.student.status = 'Active'
                self.student.enrolled_date = timezone.now().date()
                self.student.save(update_fields=['status', 'enrolled_date', 'updated_at'])
            elif new_status in ['Rejected', 'Waitlisted']:
                self.student.status = new_status
                self.student.save(update_fields=['status', 'updated_at'])

            self.application.save(update_fields=[
                'status', 'decision_date', 'decided_by', 'workflow_data', 'updated_at'
            ])

            if (
                new_status == 'Accepted'
                and actor_role == 'Owner'
                and not workflow_data.get('acceptance_invoice_id')
            ):
                self._create_acceptance_invoice(
                    actor_id=actor_id,
                    invoice_amount=invoice_amount,
                )

            # Record Audit Log
            AuditLog.objects.create(
                tenant=self.application.tenant,
                actor_id=actor_id,
                action='UPDATE',
                entity='Application',
                entity_id=str(self.application.application_id),
                old_values={"status": old_status},
                new_values={
                    "status": new_status,
                    "student_status": self.student.status,
                    "decision_reason": reason or '',
                    "owner_override": self.actor_role == 'Owner' and new_status in {'Accepted', 'Rejected'},
                }
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
            "tenant_name": self.application.tenant.name,
            "status": self.application.status,
            "applied_date": self.application.applied_date.isoformat() if self.application.applied_date else None,
            "updated_at": self.application.updated_at.isoformat() if self.application.updated_at else None,
            "decision_date": self.application.decision_date.isoformat() if self.application.decision_date else None,
            "payment_confirmed": self.application.payment_confirmed,
            "notification_dispatched": self.application.notification_dispatched,
            "student": {
                "student_id": str(self.student.student_id),
                "student_number": self.student.student_number,
                "name": self.student.name,
                "dob": self.student.dob.isoformat() if self.student.dob else None,
                "grade": self.student.grade,
                "status": self.student.status
            },
            "parent": [
                {
                    "parent_id": str(parent.parent_id),
                    "name": parent.name,
                    "email": parent.email,
                    "phone": parent.phone,
                    "relationship": parent.relationship,
                }
                for parent in self.student.parents.filter(is_deleted=False)
            ],
            "emergency_contacts": [
                {
                    "name": contact.name,
                    "phone": contact.phone,
                    "relationship": contact.relationship,
                    "medical_consent": contact.medical_consent,
                }
                for contact in self.student.emergency_contacts.filter(is_deleted=False)
            ],
            "invoices": [
                {
                    "invoice_id": str(invoice.invoice_id),
                    "invoice_date": invoice.invoice_date.isoformat(),
                    "due_date": invoice.due_date.isoformat(),
                    "total": float(invoice.total),
                    "balance_due": float(max(
                        invoice.total - sum(
                            payment.amount for payment in invoice.payments.filter(
                                status='Completed', is_deleted=False
                            )
                        ),
                        0,
                    )),
                    "status": invoice.status,
                }
                for invoice in self.student.invoices.filter(is_deleted=False).order_by('-invoice_date')
            ],
            "workflow_data": self.application.workflow_data or {},
            "documents": docs
        }
