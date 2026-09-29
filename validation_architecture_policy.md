# The Purple Cubby — Validation Architecture & Policy Guide

> **Applies to:** All engineers, AI coding agents (Google Jules / Gemini Code Assist), and contributors working on the Purple Cubby CRM codebase.  
> **Stack:** Django 5.x · Django Ninja · PostgreSQL 16+ RLS · Pydantic v2 · Celery  
> **Architecture:** Strict 3-Layer — Presentation ↔ Business Object ↔ Data Entity  
> **Version:** 1.0

---

## Why This Document Exists

The Purple Cubby handles child health records, financial transactions, school safety compliance, and multi-tenant institutional data. Validation is not a feature — it is a safety boundary. A missed validation in the wrong place can allow cross-tenant data leakage, financial fraud, an unauthorised medication administration log, or a child's report card being published before marks are moderated.

This document defines:
1. **The four classes of validation** and exactly where each one lives in the architecture
2. **The rule naming convention** so every validation is traceable from spec to code to test
3. **The enforcement hierarchy** — what happens when layers conflict
4. **Implementation patterns** for each class with concrete code examples
5. **The policy every engineer and AI agent must follow** — non-negotiable rules

---

## Part 1 — The Four Validation Classes

Every validation in the system belongs to exactly one of four classes. Misclassifying a validation — putting a Business Rule in the database, or putting a Data Integrity constraint in the BO layer — is an architecture violation.

```
┌──────────────────────────────────────────────────────────────────────┐
│  CLASS 1: INPUT VALIDATION                                           │
│  Layer: Presentation (Pydantic schemas at API boundary)              │
│  Answers: "Is this request well-formed enough to process at all?"    │
├──────────────────────────────────────────────────────────────────────┤
│  CLASS 2: BUSINESS RULES                                             │
│  Layer: Business Object (BO) layer                                   │
│  Answers: "Is this operation permitted given the domain context?"    │
├──────────────────────────────────────────────────────────────────────┤
│  CLASS 3: DATA INTEGRITY                                             │
│  Layer: Data Entity layer (Django models + PostgreSQL constraints)   │
│  Answers: "Would this change corrupt the relational data model?"     │
├──────────────────────────────────────────────────────────────────────┤
│  CLASS 4: SECURITY & TENANT ISOLATION                                │
│  Layer: Middleware + PostgreSQL RLS (enforced at both)               │
│  Answers: "Is this actor allowed to touch this data at all?"         │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Part 2 — Class 1: Input Validation

### Where it lives
`core/schemas/` — Pydantic v2 models used by Django Ninja at the API boundary. This is the **outermost gate**. It fires before any BO or entity is touched.

### What it covers
- Required fields are present
- Field types are correct (string, UUID, date, decimal)
- Format rules (email format, phone format, date not in past where required)
- Length constraints (max_length, min_length)
- Enum membership (status must be one of the allowed values)
- Numeric ranges (marks between 0 and max_marks)

### What it does NOT cover
- Business logic ("can this student be enrolled?") — that is Class 2
- Cross-entity checks ("does this date conflict with an exam?") — that is Class 2
- Referential integrity ("does this student_id exist?") — that is Class 3

### Naming convention
Input schema classes are named `{Resource}{Action}Schema`. There is no rule ID for input validation — it is structural, not domain logic.

```python
# core/schemas/enrollment.py

from pydantic import BaseModel, field_validator, UUID4
from datetime import date
from typing import Literal

class EnrollmentCreateSchema(BaseModel):
    """Input validation for POST /api/v1/enrollments"""

    first_name: str
    last_name: str
    dob: date
    grade: str
    desired_start_date: date
    parent_name: str
    parent_email: str        # pydantic validates email format automatically with EmailStr
    parent_phone: str

    @field_validator('dob')
    @classmethod
    def dob_not_future(cls, v: date) -> date:
        if v >= date.today():
            raise ValueError('Date of birth cannot be today or in the future')
        return v

    @field_validator('grade')
    @classmethod
    def grade_is_valid(cls, v: str) -> str:
        valid_grades = ['Nursery', 'KG1', 'KG2', 'Grade 1', 'Grade 2',
                        'Grade 3', 'Grade 4', 'Grade 5']
        if v not in valid_grades:
            raise ValueError(f'Grade must be one of: {valid_grades}')
        return v


class MarksEntrySchema(BaseModel):
    """Input validation for POST /api/v1/exams/{id}/marks"""

    student_id: UUID4
    marks_obtained: float
    max_marks: float

    @field_validator('marks_obtained')
    @classmethod
    def marks_not_negative(cls, v: float) -> float:
        if v < 0:
            raise ValueError('Marks cannot be negative')
        return v

    def model_post_init(self, __context) -> None:
        if self.marks_obtained > self.max_marks:
            raise ValueError('marks_obtained cannot exceed max_marks')
```

### Response on failure
HTTP `422 Unprocessable Entity` with structured Pydantic error detail. Django Ninja handles this automatically.

---

## Part 3 — Class 2: Business Rules

### Where it lives
`core/business_objects/` — inside each BO class, in a method named `validate_{rule_id}()`, called by the BO's `enforce_rules()` orchestrator before any state change is committed.

### What it covers
- Domain state machine transitions ("application cannot advance to Offered without verified documents")
- Cross-entity checks that require querying multiple tables ("exam cannot be scheduled on a holiday")
- Computed threshold checks ("attendance below 75% blocks report card publication")
- Approval gate checks ("discount above threshold requires Owner role, not just Principal")
- Temporal rules ("seat confirmation payment must arrive before hold_expiry")
- Role-contextual permission checks beyond raw RBAC ("only the teacher of this class can enter marks for it")

### Rule naming convention

Every business rule has a unique, permanent identifier in the format:

```
BR-{P_NUMBER}-{SEQ:02d}
```

Where `P_NUMBER` is the two-digit process number and `SEQ` is a two-digit sequence within that process.

| Example | Meaning |
|---|---|
| `BR-01-01` | Process P01 (Enrollment), Rule 1 |
| `BR-02-03` | Process P02 (Billing), Rule 3 |
| `BR-04-07` | Process P04 (Academics), Rule 7 |

Rule IDs are permanent. If a rule is removed, its ID is retired — never reused. Retired rule IDs are recorded in `docs/retired_rules.md`.

### Implementation pattern

```python
# core/business_objects/base.py

from dataclasses import dataclass, field
from typing import Any
import logging

logger = logging.getLogger(__name__)

@dataclass
class RuleViolation:
    rule_id: str          # e.g. "BR-01-02"
    message: str          # human-readable, safe to return in API response
    field: str | None = None   # optional: the field most relevant to the violation


class BusinessRuleError(Exception):
    """Raised when one or more business rules are violated."""

    def __init__(self, violations: list[RuleViolation]):
        self.violations = violations
        super().__init__(str(violations))


class BaseBusinessObject:
    """
    Every BO inherits from this class.
    Call self.enforce_rules() before committing any state change.
    """

    def enforce_rules(self) -> None:
        """
        Collect and run all rule validators.
        Each method named validate_BR_* is called in declaration order.
        Raises BusinessRuleError if any rule is violated.
        """
        violations: list[RuleViolation] = []
        for name in dir(self):
            if name.startswith('validate_BR_'):
                method = getattr(self, name)
                result = method()
                if result is not None:
                    violations.append(result)
        if violations:
            logger.warning(
                'Business rule violations in %s: %s',
                self.__class__.__name__,
                [v.rule_id for v in violations],
            )
            raise BusinessRuleError(violations)
```

```python
# core/business_objects/enrollment.py

from .base import BaseBusinessObject, RuleViolation, BusinessRuleError
from core.models.student import Application, Document, Student, EmergencyContact
from core.business_objects.academic import AcademicCalendarBO


class EnrollmentCaseBO(BaseBusinessObject):
    """
    BO-02 — EnrollmentCase
    Governs the admission lifecycle from inquiry through to active enrollment.
    """

    def __init__(self, application: Application, actor_role: str):
        self.application = application
        self.actor_role  = actor_role

    # ── BR-01-01 ─────────────────────────────────────────────────────────────
    def validate_BR_01_01(self) -> RuleViolation | None:
        """
        BR-01-01: Application cannot advance to 'Offered' status
        without all required document types being marked verified.
        """
        if self.application.status != 'Offered':
            return None  # rule only applies on transition to Offered

        required_types = {'birth_certificate', 'previous_school_records', 'photo'}
        verified_types = set(
            Document.objects
            .filter(application=self.application, verified=True)
            .values_list('doc_type', flat=True)
        )
        missing = required_types - verified_types
        if missing:
            return RuleViolation(
                rule_id='BR-01-01',
                message=(
                    f'Cannot advance to Offered: the following document types '
                    f'are not yet verified: {sorted(missing)}'
                ),
                field='documents',
            )
        return None

    # ── BR-01-02 ─────────────────────────────────────────────────────────────
    def validate_BR_01_02(self) -> RuleViolation | None:
        """
        BR-01-02: Seat confirmation requires a payment receipt.
        Enrollment status cannot be set to Active until payment is confirmed.
        """
        if self.application.status != 'Active':
            return None

        if not self.application.payment_confirmed:
            return RuleViolation(
                rule_id='BR-01-02',
                message='Cannot activate enrollment: seat confirmation payment not yet confirmed.',
                field='payment_confirmed',
            )
        return None

    # ── BR-01-03 ─────────────────────────────────────────────────────────────
    def validate_BR_01_03(self) -> RuleViolation | None:
        """
        BR-01-03: At least one emergency contact must exist
        before enrollment can be marked Active.
        """
        if self.application.status != 'Active':
            return None

        count = EmergencyContact.objects.filter(
            student=self.application.student
        ).count()
        if count < 1:
            return RuleViolation(
                rule_id='BR-01-03',
                message='Cannot activate enrollment: at least one emergency contact is required.',
                field='emergency_contacts',
            )
        return None

    # ── BR-01-04 ─────────────────────────────────────────────────────────────
    def validate_BR_01_04(self) -> RuleViolation | None:
        """
        BR-01-04: Admission decision (Approved/Waitlisted/Rejected) is immutable
        once a notification has been dispatched.
        Only the Owner role can override an immutable decision.
        """
        is_decision_status = self.application.status in ('Offered', 'Rejected', 'Waitlisted')
        if not is_decision_status:
            return None

        if self.application.notification_dispatched and self.actor_role != 'Owner':
            return RuleViolation(
                rule_id='BR-01-04',
                message=(
                    'Admission decision is immutable after notification has been sent. '
                    'Contact the network Owner to override.'
                ),
            )
        return None

    def advance_status(self, new_status: str) -> None:
        """Public method called by API handler. Validates rules then saves."""
        old_status = self.application.status
        self.application.status = new_status
        self.enforce_rules()                    # raises BusinessRuleError if any rule fails
        self.application.save()
        # emit audit log, trigger downstream events
```

### Handling the error in the API layer

```python
# core/api/v1/enrollments.py

from django_ninja import Router
from core.business_objects.enrollment import EnrollmentCaseBO
from core.business_objects.base import BusinessRuleError
from core.schemas.enrollment import EnrollmentDecisionSchema
from core.schemas.responses import error_response

router = Router()

@router.put('/enrollments/{enrollment_id}/decision')
def update_enrollment_decision(request, enrollment_id: str, payload: EnrollmentDecisionSchema):
    application = get_object_or_404(Application, id=enrollment_id,
                                    tenant_id=request.tenant_id)   # RLS + app-layer guard
    bo = EnrollmentCaseBO(application=application, actor_role=request.user.role)
    try:
        bo.advance_status(payload.new_status)
    except BusinessRuleError as exc:
        return 422, error_response(exc.violations)   # structured 422 with rule IDs

    return 200, {'data': bo.to_dict(), 'meta': request.meta, 'errors': None}
```

### Cross-BO rule checks

When a rule requires data from another BO (e.g. checking the AcademicCalendar), inject the dependency at construction time:

```python
class LeaveCaseBO(BaseBusinessObject):

    def __init__(self, leave_request, calendar_bo: AcademicCalendarBO, actor_role: str):
        self.leave_request = leave_request
        self.calendar       = calendar_bo
        self.actor_role     = actor_role

    def validate_BR_03_04(self) -> RuleViolation | None:
        """
        BR-03-04: Leave clash with exam week or blackout date
        requires explicit Principal override.
        """
        if self.calendar.is_blackout_date(self.leave_request.start_date):
            if self.actor_role not in ('Principal', 'Vice_Principal', 'Owner'):
                return RuleViolation(
                    rule_id='BR-03-04',
                    message=(
                        f'{self.leave_request.start_date} falls in a calendar '
                        f'blackout period. Only Principal or above can approve.'
                    ),
                    field='start_date',
                )
        return None
```

---

## Part 4 — Class 3: Data Integrity

### Where it lives
`core/models/*.py` — Django model constraints, plus PostgreSQL `CHECK` constraints and `UNIQUE` constraints declared via `Meta.constraints`.

### What it covers
- NOT NULL on required foreign keys and critical fields
- UNIQUE constraints (e.g. student_number is unique per tenant)
- FOREIGN KEY referential integrity (CASCADE, PROTECT, SET_NULL as appropriate)
- CHECK constraints for database-enforced value ranges and enum membership
- Numeric precision for financial fields (`DecimalField(max_digits=12, decimal_places=2)`)

### What it does NOT cover
- Business logic — this layer does not know about business state ("application is in Offered status")
- Cross-request state — this layer validates one row at a time

### Naming convention
Django `CheckConstraint` names follow the pattern: `chk_{table}_{field}_{description}`.

```python
# core/models/billing.py

from django.db import models
from .base import TenantScopedModel


class Invoice(TenantScopedModel):
    student       = models.ForeignKey('Student',      on_delete=models.PROTECT)
    parent        = models.ForeignKey('Parent',        on_delete=models.PROTECT)
    fee_structure = models.ForeignKey('FeeStructure',  on_delete=models.PROTECT)
    invoice_date  = models.DateField()
    due_date      = models.DateField()
    total_due     = models.DecimalField(max_digits=12, decimal_places=2)
    status        = models.CharField(max_length=20, default='Draft')
    invoice_type  = models.CharField(max_length=20, default='Regular')

    class Meta:
        constraints = [
            # Data integrity: due_date must be on or after invoice_date
            models.CheckConstraint(
                check=models.Q(due_date__gte=models.F('invoice_date')),
                name='chk_invoice_due_date_gte_invoice_date',
            ),
            # Data integrity: total_due must be >= 0
            models.CheckConstraint(
                check=models.Q(total_due__gte=0),
                name='chk_invoice_total_due_non_negative',
            ),
            # Data integrity: status must be one of the allowed values
            models.CheckConstraint(
                check=models.Q(status__in=[
                    'Draft', 'Sent', 'Paid', 'Partially_Paid', 'Overdue', 'Waived'
                ]),
                name='chk_invoice_status_enum',
            ),
        ]


class Payment(TenantScopedModel):
    invoice   = models.ForeignKey('Invoice', on_delete=models.PROTECT)
    amount    = models.DecimalField(max_digits=12, decimal_places=2)
    method    = models.CharField(max_length=20)

    class Meta:
        constraints = [
            # Data integrity: payment amount must be > 0
            models.CheckConstraint(
                check=models.Q(amount__gt=0),
                name='chk_payment_amount_positive',
            ),
        ]


class StudentAttendance(TenantScopedModel):
    student    = models.ForeignKey('Student', on_delete=models.PROTECT)
    att_class  = models.ForeignKey('Class',   on_delete=models.PROTECT)
    att_date   = models.DateField()
    period     = models.CharField(max_length=20)
    status     = models.CharField(max_length=20)

    class Meta:
        constraints = [
            # Data integrity: one record per student per class per date per period
            models.UniqueConstraint(
                fields=['tenant', 'student', 'att_class', 'att_date', 'period'],
                name='uq_attendance_student_class_date_period',
            ),
        ]
```

### Financial fields rule — always use DecimalField

```python
# CORRECT
total_due = models.DecimalField(max_digits=12, decimal_places=2)

# WRONG — never use FloatField for money
total_due = models.FloatField()   # floating-point errors will corrupt financial data
```

---

## Part 5 — Class 4: Security & Tenant Isolation

### Where it lives
**Two enforced simultaneously — both are required:**
1. **PostgreSQL RLS** — database-layer enforcement via `current_setting('app.current_tenant_id')`
2. **Django middleware** — application-layer `TenantMiddleware` injects `tenant_id` into every request and validates JWT claims

Neither layer alone is sufficient. If RLS is bypassed (a bug in middleware), the database still enforces isolation. If a raw query bypasses the ORM, RLS still enforces isolation.

### RLS policy template

```sql
-- Applied to every table via migration helper

ALTER TABLE core_student ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON core_student
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Superuser / migration connections are exempt
ALTER TABLE core_student FORCE ROW LEVEL SECURITY;
```

### Migration helper (apply to all 46 tables)

```python
# core/migrations/utils/rls.py

def apply_rls_to_table(table_name: str) -> str:
    """Returns SQL to enable RLS on a table. Call from a RunSQL migration."""
    return f"""
        ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;
        ALTER TABLE {table_name} FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_policy ON {table_name};
        CREATE POLICY tenant_isolation_policy ON {table_name}
            USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
    """
```

### Middleware tenant injection

```python
# core/middleware/tenant.py

from django.http import JsonResponse
import jwt

class TenantMiddleware:
    """
    Extracts tenant_id from the JWT bearer token,
    sets it on the request, and injects it into the
    PostgreSQL session for RLS enforcement.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        token = self._extract_token(request)
        if token:
            try:
                claims        = jwt.decode(token, options={'verify_signature': True}, ...)
                tenant_id     = claims['tenant_id']
                request.tenant_id = tenant_id
                # Set for PostgreSQL RLS
                from django.db import connection
                with connection.cursor() as cursor:
                    cursor.execute(
                        "SELECT set_config('app.current_tenant_id', %s, TRUE)",
                        [str(tenant_id)]
                    )
            except (jwt.InvalidTokenError, KeyError):
                return JsonResponse({'errors': [{'code': 'INVALID_TOKEN'}]}, status=401)
        return self.get_response(request)
```

### RBAC enforcement — decorator pattern

```python
# core/auth/decorators.py

from functools import wraps
from django.http import JsonResponse

def require_roles(*allowed_roles: str):
    """
    Decorator for Django Ninja endpoint functions.
    Raises 403 if the authenticated user's role is not in allowed_roles.
    """
    def decorator(func):
        @wraps(func)
        def wrapper(request, *args, **kwargs):
            if request.user.role not in allowed_roles:
                return 403, {
                    'data': None,
                    'meta': {},
                    'errors': [{'code': 'RBAC_DENIED',
                                'message': f'Role {request.user.role!r} is not permitted for this action.'}]
                }
            return func(request, *args, **kwargs)
        return wrapper
    return decorator

# Usage in API handler:
@router.put('/enrollments/{id}/decision')
@require_roles('Admin', 'Principal', 'Vice_Principal', 'Owner')
def update_decision(request, id: str, payload: EnrollmentDecisionSchema):
    ...
```

---

## Part 6 — The Validation Enforcement Hierarchy

When the same concern could be validated at multiple layers, this hierarchy determines where it must live. Lower numbers = higher authority.

```
Priority 1 — PostgreSQL RLS           (cannot be bypassed from application code)
Priority 2 — Django model constraints (enforced at every ORM save/create)
Priority 3 — BO business rules        (enforced on every BO state change)
Priority 4 — Pydantic input schemas   (enforced at API boundary)
```

**Key rule:** If a validation is placed at Priority 4 only (Pydantic), it can be bypassed by calling a BO directly from a Celery task, a management command, or a test fixture. Any validation that must not be bypassable must be at Priority 2 or lower.

### Decision table — where does this validation go?

| Validation concern | Class | Layer |
|---|---|---|
| Required field is present | 1 — Input | Pydantic schema |
| Email is well-formed | 1 — Input | Pydantic schema |
| Date is not in the past | 1 — Input | Pydantic schema |
| Marks not negative, not above max | 1 — Input | Pydantic schema + model CheckConstraint |
| Status must be one of N values | 1 — Input AND 3 — Integrity | Pydantic enum AND model CheckConstraint |
| Amount must be > 0 | 1 — Input AND 3 — Integrity | Pydantic AND model CheckConstraint |
| Application cannot advance to Offered without verified docs | 2 — Business Rule | BO enforce_rules() |
| Exam cannot fall on a holiday | 2 — Business Rule | BO (queries AcademicCalendarBO) |
| Attendance below 75% blocks report card | 2 — Business Rule | BO enforce_rules() |
| Discount above threshold requires Owner | 2 — Business Rule | BO enforce_rules() |
| Marks locked after deadline | 2 — Business Rule | BO enforce_rules() |
| Payment amount positive | 3 — Integrity | Django model CheckConstraint |
| One attendance record per student per class per period per day | 3 — Integrity | Django UniqueConstraint |
| Invoice due_date >= invoice_date | 3 — Integrity | Django CheckConstraint |
| Total financial figures stored as Decimal not Float | 3 — Integrity | Django DecimalField |
| Cross-tenant data access | 4 — Security | PostgreSQL RLS + middleware |
| Role cannot access endpoint | 4 — Security | RBAC decorator |
| tenant_id in JWT matches payload | 4 — Security | Middleware |

---

## Part 7 — Rule Registry

Every Business Rule (Class 2) must be registered in `docs/rule_registry.md` before it is implemented. The registry is the single source of truth. Tests reference rule IDs. API error responses include rule IDs.

### Registry format

```markdown
## BR-{PROCESS}-{SEQ}: {Short title}

| Field       | Value |
|-------------|-------|
| Rule ID     | BR-{PROCESS}-{SEQ} |
| Process     | P{nn} — {Process Name} |
| BO          | BO-{id} {Name} |
| Status      | Active | Retired |
| Added       | {YYYY-MM-DD} |
| Retired     | {YYYY-MM-DD or —} |
| Description | Full rule statement — testable, unambiguous |
| Trigger     | When is this rule evaluated? |
| Violation   | What HTTP status and message does the client receive? |
| Test ref    | test_br_{process}_{seq}() in {test file} |
```

### Example entries

```markdown
## BR-01-01: Offered status requires all documents verified

| Field       | Value |
|-------------|-------|
| Rule ID     | BR-01-01 |
| Process     | P01 — Enrollment & Admissions |
| BO          | BO-02 EnrollmentCase |
| Status      | Active |
| Added       | 2025-08-25 |
| Retired     | — |
| Description | Application cannot advance to 'Offered' status unless all required
|             | document types (birth_certificate, previous_school_records, photo)
|             | are marked verified by an Admin or above. |
| Trigger     | On every call to EnrollmentCaseBO.advance_status('Offered') |
| Violation   | HTTP 422 — { "code": "RULE_VIOLATION", "rule": "BR-01-01",
|             |   "message": "Cannot advance to Offered: documents not verified: ['photo']" } |
| Test ref    | test_br_01_01_blocks_offered_without_verified_docs() in
|             | tests/enrollment/test_bo_enrollment_case.py |

---

## BR-02-03: Discount above threshold requires Owner approval

| Field       | Value |
|-------------|-------|
| Rule ID     | BR-02-03 |
| Process     | P02 — Billing & Fee Management |
| BO          | BO-10 FeeAccount |
| Status      | Active |
| Added       | 2025-08-25 |
| Retired     | — |
| Description | Discount or waiver requests where the discount amount exceeds the
|             | tenant-configured high_value_discount_threshold require the approving
|             | user to hold the Owner role. Principal approval is sufficient below
|             | the threshold. |
| Trigger     | On DISCOUNT_WAIVER creation or approval |
| Violation   | HTTP 422 — { "code": "RULE_VIOLATION", "rule": "BR-02-03",
|             |   "message": "Discounts above [threshold] require Owner approval." } |
| Test ref    | test_br_02_03_high_value_discount_requires_owner() in
|             | tests/billing/test_bo_fee_account.py |
```

---

## Part 8 — Celery Async Task Validation

Background tasks (invoice generation, late fee computation, payroll computation, notification dispatch) must validate through the BO layer — not by calling ORM models directly.

```python
# core/tasks/billing.py

from celery import shared_task
from core.business_objects.billing import FeeAccountBO
from core.business_objects.base import BusinessRuleError
import logging

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=3)
def apply_late_fee_task(self, invoice_id: str, tenant_id: str):
    """
    Celery task: apply late fee to an overdue invoice.
    Validates through BO layer — not direct ORM update.
    """
    try:
        from core.models.billing import Invoice
        invoice = Invoice.objects.get(id=invoice_id, tenant_id=tenant_id)
        bo = FeeAccountBO(invoice=invoice, actor_role='System')
        bo.apply_late_fee()              # enforce_rules() is called inside
    except BusinessRuleError as exc:
        logger.error(
            'Late fee task failed rule validation for invoice %s: %s',
            invoice_id,
            [v.rule_id for v in exc.violations],
        )
        # Do not retry on rule violation — the data state is the cause
    except Exception as exc:
        logger.exception('Late fee task error for invoice %s', invoice_id)
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))
```

---

## Part 9 — Testing Policy

Every business rule (Class 2) must have a corresponding test that:
1. Tests the **passing case** (rule is satisfied, state change succeeds)
2. Tests the **failing case** (rule is violated, `BusinessRuleError` is raised with correct `rule_id`)
3. Is named `test_br_{process}_{seq}_{description}()`

```python
# tests/enrollment/test_bo_enrollment_case.py

import pytest
from core.business_objects.enrollment import EnrollmentCaseBO
from core.business_objects.base import BusinessRuleError
from tests.factories import ApplicationFactory, DocumentFactory

class TestBR_01_01:
    """BR-01-01: Cannot advance to Offered without all docs verified."""

    def test_passes_when_all_docs_verified(self, db):
        application = ApplicationFactory(status='Applied')
        DocumentFactory(application=application, doc_type='birth_certificate', verified=True)
        DocumentFactory(application=application, doc_type='previous_school_records', verified=True)
        DocumentFactory(application=application, doc_type='photo', verified=True)

        bo = EnrollmentCaseBO(application=application, actor_role='Admin')
        bo.advance_status('Offered')  # should not raise

        assert application.status == 'Offered'

    def test_fails_when_photo_not_verified(self, db):
        application = ApplicationFactory(status='Applied')
        DocumentFactory(application=application, doc_type='birth_certificate', verified=True)
        DocumentFactory(application=application, doc_type='previous_school_records', verified=True)
        DocumentFactory(application=application, doc_type='photo', verified=False)  # not verified

        bo = EnrollmentCaseBO(application=application, actor_role='Admin')

        with pytest.raises(BusinessRuleError) as exc_info:
            bo.advance_status('Offered')

        violations = exc_info.value.violations
        assert any(v.rule_id == 'BR-01-01' for v in violations)
        assert any('photo' in v.message for v in violations)

    def test_fails_when_photo_missing_entirely(self, db):
        application = ApplicationFactory(status='Applied')
        DocumentFactory(application=application, doc_type='birth_certificate', verified=True)
        # no photo uploaded at all

        bo = EnrollmentCaseBO(application=application, actor_role='Admin')

        with pytest.raises(BusinessRuleError) as exc_info:
            bo.advance_status('Offered')

        assert any(v.rule_id == 'BR-01-01' for v in exc_info.value.violations)
```

---

## Part 10 — Policy for Google Jules / AI Coding Agents

This section is written specifically for AI coding agents (Google Jules, Gemini Code Assist, GitHub Copilot, or any other agent) working on this codebase. These rules are non-negotiable. Deviating from them will cause the PR to be rejected.

---

### Rule A — Never query ORM models from API handlers

```python
# ❌ WRONG — API handler touching ORM directly
@router.get('/students/{id}/fee-account')
def get_fee_account(request, id: str):
    invoices = Invoice.objects.filter(student_id=id)   # direct ORM — violation
    return {'total': sum(i.total_due for i in invoices)}

# ✅ CORRECT — API handler uses BO
@router.get('/students/{id}/fee-account')
def get_fee_account(request, id: str):
    student = get_object_or_404(Student, id=id, tenant_id=request.tenant_id)
    bo = FeeAccountBO(student=student, actor_role=request.user.role)
    return 200, bo.to_response(request.meta)
```

---

### Rule B — Never hardcode business logic in migrations, management commands, or Celery tasks

Business rules live in BOs. If a Celery task needs to enforce a rule, it instantiates the BO and calls the method. It does not re-implement the rule inline.

```python
# ❌ WRONG — rule re-implemented in Celery task
@shared_task
def lock_attendance_task(att_id):
    att = StudentAttendance.objects.get(id=att_id)
    if (timezone.now().date() - att.att_date).days >= 1:   # rule re-implemented here
        att.locked = True
        att.save()

# ✅ CORRECT — task calls BO
@shared_task
def lock_attendance_task(att_id):
    att = StudentAttendance.objects.get(id=att_id)
    bo = AttendanceSheetBO(record=att, actor_role='System')
    bo.lock()   # BO enforces the 24-hour rule internally
```

---

### Rule C — Every new business rule must be registered first

Before writing any `validate_BR_*` method, add the rule entry to `docs/rule_registry.md`. The PR cannot be approved if a `validate_BR_*` method exists in the code but has no corresponding registry entry.

---

### Rule D — Never use FloatField for money

All monetary amounts use `DecimalField(max_digits=12, decimal_places=2)`. If you generate a model with a `FloatField` for any field that represents currency, the review will reject it.

---

### Rule E — All new entities must include the standard audit columns

Every new Django model that inherits from `TenantScopedModel` automatically gets these. If you create a model that does not inherit `TenantScopedModel`, it must still explicitly declare:

```python
tenant     = models.ForeignKey('Tenant', on_delete=models.CASCADE, db_index=True)
created_at = models.DateTimeField(auto_now_add=True)
updated_at = models.DateTimeField(auto_now=True)
created_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True)
is_deleted = models.BooleanField(default=False, db_index=True)
```

---

### Rule F — Never use `filter()` without tenant scoping in application code

Every ORM query must scope to the authenticated tenant. The RLS policy is the safety net, not the primary guard.

```python
# ❌ WRONG — no tenant scoping
students = Student.objects.filter(grade='Grade 3')

# ✅ CORRECT — always scope to tenant
students = Student.objects.filter(
    tenant_id=request.tenant_id,
    grade='Grade 3',
)
```

---

### Rule G — Never raise HTTP 500 for a business rule violation

Business rule violations return HTTP `422`. Unexpected errors return HTTP `500`. If you find yourself catching `BusinessRuleError` and returning `500`, that is a bug.

```python
# ❌ WRONG
try:
    bo.advance_status('Offered')
except BusinessRuleError:
    return 500, {'error': 'Something went wrong'}

# ✅ CORRECT
try:
    bo.advance_status('Offered')
except BusinessRuleError as exc:
    return 422, error_response(exc.violations)
```

---

### Rule H — RLS must be applied to every new table in the same migration that creates it

```python
# In the Django migration file:
from django.db import migrations
from core.migrations.utils.rls import apply_rls_to_table

class Migration(migrations.Migration):
    operations = [
        migrations.CreateModel(name='NewEntity', fields=[...]),
        migrations.RunSQL(
            sql=apply_rls_to_table('core_newentity'),
            reverse_sql=f"DROP POLICY IF EXISTS tenant_isolation_policy ON core_newentity;",
        ),
    ]
```

---

### Rule I — API error responses must always use the standard envelope

```python
# ❌ WRONG
return JsonResponse({'error': 'Not allowed'}, status=403)

# ✅ CORRECT
return 403, {
    'data': None,
    'meta': build_meta(request),
    'errors': [{'code': 'RBAC_DENIED', 'message': 'Role not permitted for this action.'}]
}
```

---

### Rule J — Validation class placement is reviewable

When raising a PR, every new validation must be justified in the PR description using this table:

| Validation | Class | Layer | Justification |
|---|---|---|---|
| e.g. due_date >= invoice_date | 3 — Integrity | Django CheckConstraint | Structural data constraint, not business logic. Must hold even in migrations and fixtures. |
| e.g. Offered requires verified docs | 2 — Business Rule | BO-02 enforce_rules() | Domain state machine rule, requires querying Document table, contextual to admission flow. |

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────────┐
│  VALIDATION QUICK REFERENCE                                         │
├────────────────────┬────────────────┬───────────────────────────────┤
│  "Is this value    │  Class 1       │  Pydantic schema              │
│   well-formed?"    │  Input         │  core/schemas/                │
├────────────────────┼────────────────┼───────────────────────────────┤
│  "Is this action   │  Class 2       │  BO.validate_BR_*()           │
│   permitted?"      │  Business Rule │  core/business_objects/       │
│                    │                │  Rule ID: BR-{P}-{NN}         │
│                    │                │  Must be in rule_registry.md  │
├────────────────────┼────────────────┼───────────────────────────────┤
│  "Would this       │  Class 3       │  Django model constraints     │
│   corrupt the DB?" │  Integrity     │  CheckConstraint/Unique       │
│                    │                │  DecimalField for money       │
├────────────────────┼────────────────┼───────────────────────────────┤
│  "Is this actor    │  Class 4       │  PostgreSQL RLS (always on)   │
│   allowed here?"   │  Security      │  + RBAC decorator             │
│                    │                │  + TenantMiddleware           │
└────────────────────┴────────────────┴───────────────────────────────┘

HTTP STATUS CODES FOR VALIDATION FAILURES
  Class 1 (Pydantic input error)    →  422  (automatic via Django Ninja)
  Class 2 (Business rule violated)  →  422  with rule_id in error body
  Class 3 (DB constraint violated)  →  500  (should never reach client;
                                             caught and translated in BO)
  Class 4 (Not authenticated)       →  401
  Class 4 (RBAC denied)             →  403
  Class 4 (Tenant mismatch)         →  403
```

---

*This document is maintained in `docs/validation_architecture_policy.md` and is part of the Purple Cubby engineering handbook. All PRs that add or modify validation logic must reference this document.*
