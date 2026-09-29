# The Purple Cubby — Master Sprint Development Document & Implementation Roadmap

> **Reference Architecture**: `Artefacts/purple_cubby_architecture.pdf` (v2.0 Consolidated) & `Artefacts/purple_cubby_erd.html`  
> **System Architecture**: 10 Portals · 23 Business Objects · 46 Base Entities · 10 Processes · Strict 3-Layer Architecture  
> **Roadmap Strategy**: 8 Sprints (Backend domain completeness, Entity model alignment & Business Objects first $\rightarrow$ UI Portals & Analytics in later sprints)

---

## Modern Capabilities, Tech Stack & Architecture Patterns

| Capability / Layer | Modern Tech & Frameworks | Architecture Role & Application |
|---|---|---|
| **Backend & API Engine** | Python 3.12+, **Django 5.x**, **Django Ninja** (Pydantic v2) | High-throughput asynchronous REST API (`/api/v1/`), standard envelope `{data, meta, errors}`, auto OpenAPI spec generation. |
| **Data & Isolation** | **PostgreSQL 16+** with **Native Row-Level Security (RLS)** | Tenant isolation at database boundary (`current_setting('app.current_tenant_id')`), JSONB fields for dynamic configs/rules, UUIDv7 / Sequences for human-readable IDs. |
| **Asynchronous & Scheduled Tasks** | **Celery + Redis** / Django Q2 | Background payroll computation, automated late-fee calculation, scheduled notification queues, snapshot generation, webhook dispatch. |
| **Frontend & UI Portals** | **Next.js 15 (App Router)**, React 19, TypeScript, **Tailwind CSS** | Role-based portal routing for 10 user roles, server components, optimistic mutations, semantic design tokens (`--background`, `--card`, `--foreground`). |
| **Offline-First Attendance** | **Service Workers, Workbox & IndexedDB (PWA)** | Teacher and Caregiver offline attendance capture with background sync upon network reconnection. |
| **AI & Generative Capabilities** | **Google GenAI / Claude / Gemini API Integration** | Automated incident severity escalation suggestions, student progress summary drafting for report cards, natural language custom report queries. |
| **Security & Compliance** | **JWT with asymmetric keys (Ed25519/RS256)**, RBAC Engine, OWASP Top 10 | Immutable audit trail, FERPA/GDPR safeguarding with 12-month message retention, PCI-DSS compliant payment tokenization, 2FA for privileged roles. |

---

## 3-Layer Architecture & Core Data Model Principles

1. **Strict 3-Layer Separation**:
   $$\text{Presentation Layer (Portals, REST API, Webhooks)} \longleftrightarrow \text{Business Object (BO) Layer} \longleftrightarrow \text{Data Entity Layer (46 Tables)}$$
   *No endpoint in the presentation layer may directly read or write database models without passing through a Business Object.*
2. **Deterministic Human-Readable Student ID Generator**:
   In addition to the database UUID primary key (`student_id`), every student record must be assigned a tenant-scoped, atomic, formatted identifier (`student_number` / `admission_no`, e.g., `STU-2026-0001` or `{TENANT_PREFIX}-{YYYY}-{SEQ:04d}`).
3. **Standard API Response Envelope**:
   ```json
   {
     "data": { "bo": "FeeAccount", "student_id": "...", ... },
     "meta": { "tenant_id": "...", "role": "parent", "version": "v1" },
     "errors": null
   }
   ```

---

## Current State & Audit of Existing Codebase

- **Scaffolding**: Django project initialized with `config/settings.py` and `manage.py`.
- **Initial Models (`core/models.py`)**: `Tenant`, `TenantScopedModel`, `Student`, `Application`, `Parent`, `EmergencyContact`, `Document`, `AuditLog`.
- **Current Deficiencies**:
  - `Student` lacks the tenant-scoped student number / ID generator logic.
  - `EmergencyContact` is missing `TenantScopedModel` inheritance (tenant FK leakage risk).
  - Business Object (BO) abstraction layer is missing; API routes in `core/api.py` query ORM models directly.
  - Remaining 38 entities and 21 Business Objects from the 46-entity catalogue are yet to be implemented.
  - Standard response envelope and error schemas are not standardized.

---

# Detailed 8-Sprint Roadmap & Developer Prompts

---

## Sprint 1: Multi-Tenant Foundation, Student Identity & Admissions (P01)

### Scope
- Multi-tenant PostgreSQL database layer with Row-Level Security (RLS) enforcement on all tables.
- JWT authentication with tenant-claim injection and 2FA capability for Owner/Admin/Board.
- Fix Entity Model violations:
  - Add tenant-scoped atomic `StudentNumberGenerator` engine (`student_number` format `{PREFIX}-{YYYY}-{SEQ:04d}`).
  - Fix `EmergencyContact` to inherit `TenantScopedModel`.
  - Add missing audit columns (`tenant_id`, `created_at`, `updated_at`, `created_by`, `is_deleted`).
- Implement BO layer architecture: `StudentProfile` (BO-01) and `EnrollmentCase` (BO-02).
- Full API surface for **Process P01 (Enrollment & Admissions)** with standard response envelope.
- Immutable Audit Logging for all write operations.

### Security Goals
- **RLS Boundary**: PostgreSQL RLS policies must strictly reject queries missing `app.current_tenant_id` session setting.
- **Tenant Spoofing Prevention**: Reject any incoming request trying to override `tenant_id` via payload or query params.
- **RBAC Gating**: Only Admin/Registrar roles can update admission decisions. Admission decisions (Approved/Waitlisted/Rejected) are immutable once notification is dispatched.
- **Audit Trail**: Every student creation, update, and application status transition must write an immutable audit log entry.

### Deliverables
1. `core/models.py`: Reconciled models with `TenantSequence` for student ID generation, `Tenant`, `Student`, `Application`, `Parent`, `EmergencyContact`, `Document`, `AuditLog`.
2. `core/business_objects/`: Base BO class, `BO01StudentProfile`, `BO02EnrollmentCase`.
3. `core/api/v1/enrollments.py`: Full P01 API surface (`POST /enrollments`, `GET /enrollments/{id}/status`, `PUT /enrollments/{id}/decision`, `POST /enrollments/{id}/documents`, `GET /enrollments/pipeline`, `GET /students/{id}/profile`).
4. Unit & Integration test suite for tenant isolation, Student ID generation, and admissions workflow.

---

### Sprint 1 Execution Prompts

#### Prompt 1.1: Tenant Isolation, Sequence Generator & Core Entity Reconcile
```markdown
You are an expert Django & PostgreSQL backend engineer.
Task: Refactor and complete the core entity models in `core/models.py` strictly according to the Purple Cubby Architecture reference:
1. Ensure all tenant models inherit from `TenantScopedModel` (tenant FK, created_at, updated_at, created_by, is_deleted soft delete flag).
2. Implement a `TenantSequence` model and an atomic helper function `generate_student_number(tenant, year=None)` that generates monotonic, human-readable student identifiers (e.g. "STU-2026-0001" or customized per tenant config prefix).
3. Update `Student` model:
   - Add `student_number` (CharField, unique per tenant, db_index=True).
   - Ensure primary key is `student_id` (UUIDv4).
   - Add fields: `name`, `dob`, `grade`, `status` (Inquiry, Applied, Offered, Active, Withdrawn), `enrolled_date`.
4. Fix `EmergencyContact` to inherit from `TenantScopedModel`.
5. Ensure `Application`, `Parent`, `Document`, and `AuditLog` models conform to the 3NF ERD specifications.
6. Create and run database migrations ensuring PostgreSQL RLS policies are applied across all tables.
Write clean, documented Python code with type annotations and docstrings.
```

#### Prompt 1.2: Business Object Layer & P01 Admissions API
```markdown
You are an expert backend engineer building the 3-layer architecture for Purple Cubby CRM.
Task:
1. Create a `core/business_objects/` module with a generic `BaseBusinessObject` providing:
   - To/From dict serialization.
   - Standard envelope formatting: `{ "data": <bo_payload>, "meta": { "tenant_id", "role", "version" }, "errors": null }`.
   - Business rule validation pipeline.
2. Implement `BO-01 StudentProfile` assembling STUDENT, PARENT, EMERGENCY_CONTACT, and STUDENT_HEALTH entities with computed properties (e.g., `primary_contact`, `is_profile_complete`).
3. Implement `BO-02 EnrollmentCase` managing application state machine (`Pending` -> `Under_Review` -> `Offered` -> `Accepted` / `Waitlisted` / `Rejected`):
   - Rule BR-01: Application cannot advance to Offered without all required documents verified.
   - Rule BR-02: Seat confirmation requires payment verification before marking Active.
   - Rule BR-03: At least one emergency contact required before enrollment is marked Active.
   - Rule BR-04: Auto-generate `student_number` upon transition to Applied/Active.
4. Implement Django Ninja endpoints under `/api/v1/` for P01:
   - POST /api/v1/enrollments
   - GET /api/v1/enrollments/{id}/status
   - PUT /api/v1/enrollments/{id}/decision
   - POST /api/v1/enrollments/{id}/documents
   - GET /api/v1/enrollments/pipeline
   - GET /api/v1/students/{id}/profile
5. Write full pytest unit and integration tests checking tenant isolation, decision immutability, and document verification gates.
```

---

## Sprint 2: Academic Management & Assessment Engine (P04)

### Scope
- Implement Academic entities: `CURRICULUM`, `ACADEMIC_CALENDAR`, `LESSON_PLAN`, `ASSIGNMENT`, `EXAM`, `MARKS_RECORD`, `REPORT_CARD`.
- Implement Academic Business Objects:
  - `BO-03 AcademicCalendar`: Single source of truth for date validation across all 10 processes (terms, holidays, exam weeks, blackout dates).
  - `BO-04 AcademicRecord`: Marks aggregation, grade calculations, student report card assembly.
  - `BO-05 ClassroomPlan`: Lesson plans mapped to curriculum learning outcomes, assignment tracking.
  - `BO-06 ExamPackage`: Timetabling, hall tickets, invigilator assignments, marks moderation.
- Full API surface for **Process P04 (Academic Management)**.

### Security Goals
- **Assessment Integrity**: Marks records are permanently locked after the moderation deadline. Retroactive marks alterations require Principal/VP sign-off with reason and immutable audit log entry.
- **Publication Gate**: Report cards cannot be released before the published date configured in `ACADEMIC_CALENDAR`. Students with attendance below threshold are blocked from automated report card release.

### Deliverables
1. `core/models_academic.py`: Academic entity DDLs with tenant isolation and FK constraints.
2. `core/business_objects/academic.py`: `BO-03`, `BO-04`, `BO-05`, `BO-06` implementations.
3. `core/api/v1/academics.py`: Complete P04 endpoints.
4. Test suite validating holiday clash prevention, marks moderation lock, and report card publication rules.

---

### Sprint 2 Execution Prompts

#### Prompt 2.1: Academic Entities & BO-03 Calendar Engine
```markdown
You are building the Academic domain for Purple Cubby CRM.
Task:
1. Define Django models in `core/models/academic.py`:
   - `Curriculum`: grade, subjects (JSONB), learning_outcomes (JSONB), version, approved_by.
   - `AcademicCalendar`: year, terms (JSONB), holidays (JSONB), exam_weeks (JSONB), blackout_dates (JSONB).
   - `LessonPlan`: teacher_id, class_id, curriculum_id, week, topic, status, reviewed_by.
   - `Assignment`: teacher_id, class_id, title, due_date, max_marks, submission_tracking (JSONB).
   - `Exam`: class_id, calendar_id, name, type, date, duration, room, invigilator_id, max_marks.
   - `MarksRecord`: student_id, exam_id, teacher_id, marks, grade, locked (bool), moderated_by.
   - `ReportCard`: student_id, term, year, overall_grade, published_date, parent_ack.
2. Implement `BO-03 AcademicCalendar`:
   - Methods to validate date windows (`is_holiday(date)`, `is_blackout_date(date)`, `validate_exam_schedule(class_id, date)`).
   - Ensure two exams for the same class cannot overlap.
3. Apply database migrations and set up RLS policies for all academic entities.
```

#### Prompt 2.2: Academic Assessment BOs & P04 API Surface
```markdown
You are building the assessment and marks management engine for Purple Cubby CRM.
Task:
1. Implement `BO-04 AcademicRecord`:
   - Aggregate marks per subject, compute GPA / weighted grades according to grading schema.
   - Enforce rule: student attendance below configured minimum (e.g. 75%) flags report card as publication-blocked.
2. Implement `BO-05 ClassroomPlan` and `BO-06 ExamPackage`:
   - Validate lesson plan mapping to current curriculum version topics.
   - Generate hall ticket payloads and invigilator rosters.
3. Implement P04 API endpoints with Django Ninja:
   - GET /api/v1/calendar/current
   - POST /api/v1/lesson-plans
   - GET /api/v1/classes/{id}/plan/{week}
   - POST /api/v1/assignments
   - POST /api/v1/exams
   - POST /api/v1/exams/{id}/marks
   - GET /api/v1/students/{id}/academic-record/{term}
   - POST /api/v1/academic-records/{id}/publish
   - GET /api/v1/exams/{id}/hall-tickets
4. Write tests verifying marks locking, holiday schedule validation, and publication gating.
```

---

## Sprint 3: Attendance, Staff Rostering & Health/Safety Core (P03, P07)

### Scope
- Attendance Entities: `STUDENT_ATTENDANCE`, `STAFF_ATTENDANCE`, `LEAVE_REQUEST`, `ATTENDANCE_ROSTER`.
- Health & Safety Entities: `STUDENT_HEALTH`, `HEALTH_OBSERVATION`, `MEDICATION_LOG`, `INCIDENT`, `SAFETY_DRILL`.
- Business Objects:
  - `BO-07 AttendanceSheet`: Student attendance aggregation, 24-hour edit lock, unapproved absence notification triggers.
  - `BO-08 LeaveCase`: Student & Staff leave request lifecycle, blackout date validation, leave balance adjustment.
  - `BO-09 StaffRoster`: Daily class coverage, substitute staff scheduling.
  - `BO-17 HealthRecord`: Allergy records, dietary flags, medication logs with mandatory parental consent.
  - `BO-18 SafetyCompliance`: Incident reporting, 1-hour admin SLA, automatic principal escalation, safety drill logs.
- Full API surfaces for **Process P03 (Attendance)** and **Process P07 (Health & Safety)**.

### Security Goals
- **Safeguarding & Health Privacy**: Medical and allergy records are encrypted at rest and restricted to Caregiver/Principal/Medical staff.
- **Attendance Audit Integrity**: Attendance records are permanently locked 24 hours after the session date.
- **Incident Escalation SLA**: High-severity incidents automatically escalate to the Principal and trigger immediate immutable logging.

### Deliverables
1. Attendance & Health entity models and migrations.
2. `BO-07`, `BO-08`, `BO-09`, `BO-17`, `BO-18` Business Objects.
3. P03 & P07 REST endpoints in `core/api/v1/`.
4. Automated tests for attendance locking, geofence validation, and medication consent validation.

---

### Sprint 3 Execution Prompts

#### Prompt 3.1: Attendance & Staff Rostering (P03)
```markdown
You are implementing Attendance and Rostering for Purple Cubby CRM.
Task:
1. Create models in `core/models/attendance.py`:
   - `StudentAttendance`: student_id, class_id, date, period, status (Present/Absent/Late/Excused), method (QR/Manual/Biometric), marked_by, notified_parent (bool).
   - `StaffAttendance`: staff_id, date, check_in, check_out, method, status, substitute_id.
   - `LeaveRequest`: requester_id, requester_type, type, start_date, end_date, days, reason, status, approved_by, balance_before, balance_after.
   - `AttendanceRoster`: class_id, date, window_start, window_end.
2. Implement Business Objects:
   - `BO-07 AttendanceSheet`: Enforces attendance window, 24-hr record lock, and automated unapproved absence event dispatching.
   - `BO-08 LeaveCase`: Validates against `BO-03 AcademicCalendar` blackout dates.
   - `BO-09 StaffRoster`: Detects unassigned classes and assigns verified substitute teachers.
3. Build API routes for P03:
   - POST /api/v1/attendance/mark
   - GET /api/v1/classes/{id}/attendance/{date}
   - GET /api/v1/students/{id}/attendance-summary
   - POST /api/v1/leave-requests
   - PUT /api/v1/leave-requests/{id}/approve
   - GET /api/v1/staff/roster/{date}
   - POST /api/v1/substitutions
   - GET /api/v1/attendance/reports/{type}
4. Write test cases for attendance lock enforcement and unexcused absence parent alerts.
```

#### Prompt 3.2: Health, Medication & Safety Compliance (P07)
```markdown
You are implementing the Health & Safety domain (P07) for Purple Cubby CRM.
Task:
1. Create models in `core/models/health.py`:
   - `StudentHealth`: student_id, allergies (JSONB), conditions (JSONB), medications (JSONB), vaccinations (JSONB), doctor_contact, consent_flag.
   - `HealthObservation`: student_id, staff_id, date, mood, appetite, nap_duration, feeding_notes.
   - `MedicationLog`: student_id, staff_id, medicine, dose, time_administered, parent_notified (bool).
   - `Incident`: type, date, location, students (JSONB), staff (JSONB), description, actions_taken, escalated_to_principal (bool).
   - `SafetyDrill`: type, scheduled_date, duration, participation_rate, issues (JSONB), completed_by.
2. Implement Business Objects:
   - `BO-17 HealthRecord`: Enforces that medication cannot be logged without signed parent consent (`consent_flag=True`).
   - `BO-18 SafetyCompliance`: Enforces 1-hour admin categorization SLA, auto-escalation of severe incidents, and month-end compliance calculation.
3. Build API routes for P07:
   - GET /api/v1/students/{id}/health-record
   - POST /api/v1/health/observations
   - POST /api/v1/health/medication-log
   - POST /api/v1/incidents
   - GET /api/v1/incidents/{id}
   - POST /api/v1/safety/drills
   - GET /api/v1/safety/compliance-report/{period}
4. Write comprehensive tests for medication consent and incident escalation.
```

---

## Sprint 4: Billing, Finance & Fee Lifecycle (P02)

### Scope
- Finance Entities: `FEE_STRUCTURE`, `INVOICE`, `PAYMENT`, `DISCOUNT_WAIVER`, `RECONCILIATION`.
- Business Objects:
  - `BO-10 FeeAccount`: Student balance calculation, term fee calculation, automatic late-fee application with grace period.
  - `BO-11 PaymentTransaction`: Payment gateway processing (Card/UPI/Bank Transfer), receipt generation, refund approval limits.
  - `BO-12 FinancialStatement`: Period reconciliation, income vs vendor spend, ledger balance verification.
- Full API surface for **Process P02 (Billing & Fee Management)**.
- Cross-Domain Hook: Automatic invoice generation when an admission is confirmed (P01 $\rightarrow$ P02).

### Security Goals
- **Financial Ledger Immutability**: Invoices and completed payments cannot be deleted. Any adjustment must occur via an approved `DISCOUNT_WAIVER` or credit note with approver ID and timestamp.
- **Refund Authorization Matrix**: Refunds exceeding configured threshold (e.g. >$500) require Owner role sign-off.
- **PCI-DSS Compliance**: No raw credit card numbers or CVVs stored in the database; use gateway tokenization.

### Deliverables
1. Billing entity models, migrations, and PostgreSQL decimal precision configurations.
2. `BO-10`, `BO-11`, `BO-12` Business Objects with late fee and discount rules.
3. Complete P02 REST API surface.
4. Integration tests for the full billing cycle: Fee Structure $\rightarrow$ Bulk Invoicing $\rightarrow$ Payment $\rightarrow$ Reconciliation.

---

### Sprint 4 Execution Prompts

#### Prompt 4.1: Fee Structures, Invoicing & Late Fee Engine
```markdown
You are building the Billing and Fee Management engine (P02) for Purple Cubby CRM.
Task:
1. Create models in `core/models/billing.py`:
   - `FeeStructure`: grade, term, components (JSONB), discount_rules (JSONB), penalty_rules (JSONB), version.
   - `Invoice`: student_id, parent_id, fee_struct_id, date, due_date, line_items (JSONB), total, status (Draft/Issued/Partial/Paid/Overdue/Cancelled), type.
   - `Payment`: invoice_id, parent_id, amount, date, method, txn_ref, status (Pending/Success/Failed/Refunded), receipt_id.
   - `DiscountWaiver`: invoice_id, student_id, type, amount, reason, approved_by, approval_date.
   - `Reconciliation`: period, total_invoiced, total_collected, outstanding, discrepancies (JSONB), status.
2. Implement `BO-10 FeeAccount`:
   - Bulk invoice generation for all active students in a grade/term.
   - Automatic late fee calculation: `due_date + grace_period_days < current_date`.
   - Rule: An invoice cannot be marked `Paid` if outstanding balance > 0.
3. Apply migrations and RLS policies for billing tables.
```

#### Prompt 4.2: Payment Processing, Reconciliation & P02 API Surface
```markdown
You are building payment processing and financial reconciliation for Purple Cubby CRM.
Task:
1. Implement `BO-11 PaymentTransaction` and `BO-12 FinancialStatement`:
   - Process payments, generate unique receipt IDs, and update invoice status atomically using database transactions (`transaction.atomic`).
   - High-value discount/waiver approval gating: Principal approval for < $200, Owner approval for $\ge$ $200.
   - Month-end reconciliation calculation combining student fee revenue and vendor spend.
2. Implement Django Ninja endpoints for P02:
   - GET /api/v1/students/{id}/fee-account
   - POST /api/v1/invoices
   - POST /api/v1/invoices/bulk-generate
   - POST /api/v1/payments
   - GET /api/v1/payments/{id}/receipt
   - POST /api/v1/payments/{id}/refund
   - POST /api/v1/discounts
   - GET /api/v1/financials/reconciliation/{period}
   - GET /api/v1/financials/statement/{period}
3. Write test cases verifying bulk invoice generation for 500 students in < 5 seconds and PCI-compliant payment flows.
```

---

## Sprint 5: HR, Payroll, Procurement, Events & Comms (P05, P08, P09, P06)

### Scope
- Entities:
  - HR: `STAFF`, `CONTRACT`, `PAYROLL_RUN`, `APPRAISAL`, `CPD_RECORD`, `SCHEDULE`.
  - Procurement: `VENDOR`, `REQUISITION`, `PURCHASE_ORDER`, `DELIVERY_RECORD`, `VENDOR_INVOICE`, `INVENTORY`.
  - Events: `EVENT`, `EVENT_REGISTRATION`, `EVENT_VOLUNTEER`, `EVENT_REPORT`.
  - Comms: `MESSAGE`, `NOTIFICATION_RULE`.
- Business Objects:
  - `BO-13 StaffMember`, `BO-14 RecruitmentCase`, `BO-15 PayrollRun`, `BO-16 PerformanceRecord`.
  - `BO-19 ProcurementOrder`, `BO-20 VendorAccount`.
  - `BO-21 SchoolEvent`.
  - `BO-22 CommunicationBundle` & `NotificationRuleSet`.
- Full API surfaces for **P05 (HR)**, **P08 (Vendor)**, **P09 (Events)**, and **P06 (Comms)**.

### Security Goals
- **DBS & Staff Safeguarding**: Staff cannot be assigned to teach if DBS/background check is expired or missing.
- **Procurement 3-Way Match**: Vendor payments are blocked if Requisition, Delivery Record, and Vendor Invoice amounts do not match.
- **Emergency Notification Integrity**: Emergency broadcasts bypass user opt-out settings and require delivery confirmation logs.

### Deliverables
1. Models, migrations, and BOs for HR, Procurement, Events, and Comms.
2. API endpoints for P05, P06, P08, P09.
3. Event fee auto-invoice hook into P02.
4. Notification queue worker for SMS, Email, and Push notifications.

---

### Sprint 5 Execution Prompts

#### Prompt 5.1: Staff, HR & Automated Payroll (P05)
```markdown
You are building the HR and Payroll engine (P05) for Purple Cubby CRM.
Task:
1. Create models in `core/models/hr.py`:
   - `Staff`: name, role, dept, employment_type, start_date, salary, certifications (JSONB), dbs_ref, dbs_expiry.
   - `Contract`: staff_id, type, start_date, end_date, esigned_at, renewal_alert_sent.
   - `PayrollRun`: staff_id, period, base_salary, allowances (JSONB), deductions (JSONB), gross, net, status (Draft/Approved/Disbursed), approved_by.
   - `Appraisal`: staff_id, appraiser_id, cycle, self_score, manager_score, outcome, status.
   - `CPDRecord`: staff_id, activity, type, hours, mandatory, completion_status.
2. Implement BOs:
   - `BO-13 StaffMember`: Validates DBS expiry against teaching schedule.
   - `BO-15 PayrollRun`: Computes payroll with automatic deductions for unpaid leaves pulled from `BO-08 LeaveCase`.
3. Implement P05 APIs:
   - POST /api/v1/staff, GET /api/v1/staff/{id}, GET /api/v1/staff/{id}/compliance-status
   - POST /api/v1/payroll/compute/{period}, PUT /api/v1/payroll/{id}/approve, GET /api/v1/staff/{id}/payslip/{period}
   - POST /api/v1/appraisals, GET /api/v1/staff/{id}/performance-history
```

#### Prompt 5.2: Procurement, Events & Notification Engine (P08, P09, P06)
```markdown
You are implementing Procurement (P08), Events (P09), and Comms (P06) for Purple Cubby CRM.
Task:
1. Create models for Vendor/Procurement (`Vendor`, `Requisition`, `PurchaseOrder`, `DeliveryRecord`, `VendorInvoice`, `Inventory`), Events (`Event`, `EventRegistration`, `EventVolunteer`, `EventReport`), and Comms (`Message`, `NotificationRule`).
2. Implement Business Objects:
   - `BO-19 ProcurementOrder`: Implements strict 3-way match validation before vendor invoice approval.
   - `BO-21 SchoolEvent`: Validates permission slip deadlines (min 48h before event) and auto-generates invoice line items for event fees.
   - `BO-22 CommunicationBundle`: Manages notification rule evaluation across 12 system trigger events and queues emergency broadcasts.
3. Build API routes for P08, P09, and P06.
4. Write integration tests for the 3-way match and emergency broadcast delivery tracking.
```

---

## Sprint 6: Core Operational Portals & Design System (UI Phase 1)

### Scope
- Set up **Next.js 15 App Router** frontend architecture with TypeScript, Tailwind CSS, and semantic design tokens (`--background`, `--card`, `--foreground`, `--primary`, `--border`).
- Build **Admin Console**:
  - Tenant onboarding, configuration, and subscription tier settings.
  - Admissions pipeline queue, document viewer, and decision workflows (P01).
  - Academic calendar manager and curriculum planner (P04).
  - Fee structure manager and invoice dashboards (P02).
  - Process registry and audit log inspector.
- Build **Principal & Vice Principal Portal**:
  - Daily school operational summary, staff substitutions, leave approvals, and exam moderation sign-offs.
- Build **Teacher & Caregiver Portals (PWA)**:
  - Daily roster, offline-capable attendance marking with IndexedDB and background sync, marks entry, care observations, medication logs.

### Security Goals
- **Role-Based Routing & Session Isolation**: Frontend routing strictly gated by JWT claims (`role`, `tenant_id`). Unauthorized view access redirected immediately.
- **XSS & CSP Enforcement**: Strict Content Security Policy (CSP) blocking untrusted inline scripts and external CDN origins.

### Deliverables
1. Frontend application under `frontend/` with shared UI component library (Design System tokens).
2. Operational portals: Admin Console, Principal Portal, Teacher Portal (PWA), Caregiver Portal (PWA).
3. Service worker with IndexedDB sync for offline attendance.

---

### Sprint 6 Execution Prompts

#### Prompt 6.1: Next.js 15 Design System & Admin Console
```markdown
You are an expert full-stack engineer building the frontend for Purple Cubby CRM.
Task:
1. Initialize the frontend in `frontend/` using Next.js 15 (App Router), TypeScript, and Tailwind CSS.
2. Configure semantic design tokens matching the Purple Cubby theme:
   - Surfaces: `--background`, `--card`, `--surface2`, `--border`
   - Typography & Accents: `--foreground`, `--muted`, `--purple`, `--purple-dark`, `--accent`
3. Implement the Admin Console:
   - Admissions Pipeline: Kanban/table view of applications with document preview modal, decision triggers, and student ID display.
   - Academic Calendar UI: Term dates, holidays, exam weeks scheduler.
   - Fee Management UI: Fee structure builder and invoice overview table.
4. Connect all UI screens to the backend `/api/v1/` endpoints with React Query / SWR, optimistic updates, and JWT session handling.
```

#### Prompt 6.2: Teacher & Caregiver PWA with Offline Attendance
```markdown
You are building the offline-capable Teacher and Caregiver portals for Purple Cubby CRM.
Task:
1. Build the Teacher Portal:
   - Class roster view with quick-tap attendance marking (Present, Absent, Late, Excused).
   - Lesson plan weekly planner and assignment creator.
   - Exam marks entry grid with auto-save and submission for moderation.
2. Build the Caregiver Portal:
   - Daily health observations (mood, appetite, nap, feeding notes).
   - Medication logging modal with allergy warnings and consent checks.
3. Configure PWA service worker (Workbox) and IndexedDB:
   - Allow teachers to record attendance without internet connectivity.
   - Auto-sync attendance marks with `/api/v1/attendance/mark` once connectivity is restored.
```

---

## Sprint 7: Self-Service & External Portals (UI Phase 2)

### Scope
- Build **Parent Portal (Responsive Web & Mobile PWA)**:
  - Multi-child switcher for parents with multiple enrolled students.
  - Student Profile & Academic Progress: Report card downloads, assignment tracker, attendance timeline.
  - Financial Self-Service: Outstanding balance view, online fee payments, download receipt PDFs, discount applications.
  - Daily updates from Caregiver (naps, meals, observations), health consent management.
  - Event registration, digital permission slip signing, and direct messaging with teachers.
- Build **Vendor Portal**:
  - Purchase order tracking, delivery record submission, electronic invoice upload, payment status tracking.
- Build **Governance Portals (Owner, Board Member, Trustee)**:
  - Owner: Multi-branch analytics, network-wide payroll approval, emergency broadcast trigger.
  - Board Member & Trustee: Read-only financial dashboards, fund utilization, compliance summaries.

### Security Goals
- **Strict Tenant & Student Scoping**: Parents can only access records where their `parent_id` is linked to the student in the database.
- **Digital Signatures**: Digital permission slips and consent records captured with timestamp, IP address, and parent authentication signature.

### Deliverables
1. Parent Portal, Vendor Portal, and Governance Portals.
2. PDF generation service for receipts and report cards.
3. Real-time direct messaging interface with notification badges.

---

### Sprint 7 Execution Prompts

#### Prompt 7.1: Parent Self-Service Portal
```markdown
You are building the Parent Portal for Purple Cubby CRM.
Task:
1. Create responsive Parent Portal views in Next.js 15:
   - Child Overview Dashboard: Attendance status, recent marks, daily caregiver observations.
   - Fee Payment Center: Line-item breakdown, Stripe/Razorpay payment gateway integration, receipt PDF download.
   - Permission Slips & Events: Interactive digital consent signing with 48h deadline countdown.
   - Messaging Inbox: Direct thread with assigned classroom teachers.
2. Connect views to `/api/v1/` endpoints with strict parent JWT authentication.
3. Add multi-student tab switcher for families with more than one child enrolled.
```

#### Prompt 7.2: Vendor Portal & Governance Dashboards
```markdown
You are building the Vendor and Governance Portals for Purple Cubby CRM.
Task:
1. Build the Vendor Portal:
   - Purchase Order view with status tags (Issued, In Delivery, Completed).
   - Invoice submission form with line-item matching against PO items.
   - Payment status tracker with remittance receipts.
2. Build Governance Portals:
   - Owner Console: Multi-branch high-level KPI cards, payroll approval modal, emergency broadcast composer.
   - Board & Trustee Portal: Read-only financial statements, compliance drill audits, and enrollment funnel KPIs.
3. Ensure strict RBAC enforcement across all routes.
```

---

## Sprint 8: Cross-Domain Analytics, Webhooks, Compliance & Launch Hardening

### Scope
- Implement `BO-23 AnalyticsDashboard` aggregating data across all 22 Business Objects.
- Full API surface and dashboard for **Process P10 (Reports & Analytics)**:
  - Pre-computed scheduled KPI snapshot worker (enrollment funnel, revenue vs outstanding, attendance rates).
  - Custom report builder with field selector, filters, grouping, and exports (PDF/Excel/CSV).
- Webhook Framework: 14 tenant-subscribable system events (`student.enrolled`, `invoice.generated`, `incident.escalated`, etc.).
- GDPR & Safeguarding Compliance Tooling: Data export audit trail, automated erasure workflow, 12-month message archiving.
- Production Hardening, Performance Tuning, and End-to-End Regression Suite.

### Security Goals
- **Cross-Tenant Comparative Isolation**: Comparative multi-school data is restricted exclusively to Network Owner roles.
- **OWASP Top 10 & Penetration Hardening**: SQL injection prevention (parameterized ORM/RLS), Rate limiting (1000 req/min Standard, 5000 req/min Enterprise), CSRF protection, secure cookie flags.
- **Disaster Recovery (DR)**: Automated database backups with verified RPO < 1 hour and RTO < 4 hours.

### Deliverables
1. `BO-23 AnalyticsDashboard` and P10 API endpoints.
2. Webhook engine with signature verification and retry backoff.
3. Custom report builder UI in Admin Console.
4. Complete test suite: Unit, Cross-domain Integration (P01 $\rightarrow$ P02, P03 $\rightarrow$ P05, P09 $\rightarrow$ P02), Performance (< 200ms p95), and UAT sign-off documentation.

---

### Sprint 8 Execution Prompts

#### Prompt 8.1: BO-23 Analytics Dashboard, Webhooks & P10 Engine
```markdown
You are building the Analytics Engine (P10) and Webhook System for Purple Cubby CRM.
Task:
1. Implement `BO-23 AnalyticsDashboard`:
   - Pre-computed KPI snapshots for role-based dashboards (Admin, Principal, Owner).
   - Custom report builder: Dynamic query builder supporting filters, grouping, and aggregations across BOs without raw entity exposure.
2. Implement Webhook Dispatch Engine:
   - Support 14 event types: `student.enrolled`, `invoice.generated`, `payment.completed`, `attendance.marked.absent`, `incident.created`, `incident.escalated`, `exam.published`, `report_card.published`, `staff.contract.expiring`, `procurement.po.approved`, `vendor.invoice.matched`, `event.registration.closed`, `compliance.report.generated`.
   - Sign payloads with HMAC-SHA256 and implement exponential backoff retry.
3. Build API routes for P10:
   - GET /api/v1/analytics/dashboard
   - GET /api/v1/analytics/kpis/{role}
   - POST /api/v1/reports/custom
   - GET /api/v1/reports/{id}
   - POST /api/v1/reports/{id}/schedule
   - GET /api/v1/analytics/enrollment-funnel
   - GET /api/v1/analytics/financial/{period}
4. Write test cases for webhook delivery and report generation.
```

#### Prompt 8.2: System Hardening, Penetration Testing & Launch Readiness
```markdown
You are leading the final launch hardening and compliance verification for Purple Cubby CRM.
Task:
1. Security & Compliance:
   - Verify PostgreSQL RLS isolation under 50 simultaneous cross-tenant penetration attempts.
   - Implement data export and GDPR erasure tools with immutable audit logging.
   - Ensure rate limiting (1000 req/min Standard / 5000 req/min Enterprise) via Redis throttling.
2. Performance Optimization:
   - Add database indexes for all foreign keys, tenant sequences, and date query fields.
   - Benchmark all P01–P10 endpoints ensuring < 200ms p95 latency under 100 concurrent requests.
3. End-to-End Regression Test:
   - Execute full lifecycle integration tests: Enrollment P01 -> Invoice P02 -> Attendance P03 -> Academic Assessment P04 -> HR Payroll P05 -> Analytics P10.
4. Prepare production Docker compose, environment checklist, and launch documentation.
```

---

## Roadmap Quality & Governance Checklist

- [x] **Strict 3-Layer Compliance**: Presentation $\leftrightarrow$ Business Objects $\leftrightarrow$ Data Entities.
- [x] **Student ID Numbering Engine**: Tenant-scoped, atomic sequence generator in addition to UUID.
- [x] **Full 46 Entities & 23 BOs Mapped**: Distributed logically across Sprints 1–5 and 8.
- [x] **Full 10 Processes (P01–P10) Defined**: Clear business rules, state machines, and API endpoints.
- [x] **10 Role-Based Portals Scheduled**: Admin/Principal/Teacher/Caregiver in Sprint 6; Parent/Vendor/Governance in Sprint 7.
- [x] **Actionable Developer Prompts**: Copy-pasteable prompts provided for every sprint task.
- [x] **Comprehensive Security Goals**: RLS, PCI-DSS, FERPA/GDPR safeguarding, and audit logging included.

