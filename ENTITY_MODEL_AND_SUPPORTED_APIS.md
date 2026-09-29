# School CRM: Entity Model and Supported APIs

## 1. Purpose

This document captures the implemented domain model and the supported HTTP API surface for the School CRM platform. It is intended as a reusable design attachment for future development, backlog generation, and implementation planning.

## 2. Architectural framing

The backend is a Django + Django Ninja implementation with a multi-tenant data model. Core business logic is organized around tenant-scoped domain models and business-object classes. API routers are mounted centrally in `core/api/__init__.py`.

The system exposes the following v1 router groups:

- Admissions / Enrollment
- Academics
- Attendance
- Health & Safety
- Billing
- Sprint 5 Operations
- Analytics & Reporting

All routes are protected by JWT bearer authentication and tenant-aware access checks.

## 3. Core entity model

### 3.1 Tenant and access control

- `Tenant`
  - Primary tenant container for school/institution data
  - Fields include tenant metadata, subscription tier, region, config, and audit data
- `TenantScopedModel`
  - Abstract base model used by all tenant-bound records
  - Adds `tenant`, `created_at`, `updated_at`, `created_by`, and `is_deleted`
- `TenantSequence`
  - Atomic sequence generator per tenant and domain type
  - Supports monotonic tenant-safe numbering

### 3.2 Student lifecycle and admissions

- `Student`
  - Student identity record with `student_id`, `student_number`, `class_id`, `name`, `dob`, `grade`, `status`, and `enrolled_date`
- `Application`
  - Admission application for a student
  - Tracks status transitions, decision metadata, payment confirmation, and notification dispatch
- `Parent`
  - Student-linked parent or guardian record with contact details and notification preferences
- `EmergencyContact`
  - Medical / safety emergency contact linked to the student
- `Document`
  - Application document with verification state and metadata
- `AuditLog`
  - Event log for create/update/delete actions across entities

### 3.3 Academic domain

- `Curriculum`
- `AcademicCalendar`
- `LessonPlan`
- `Assignment`
- `Exam`
- `MarksRecord`
- `ReportCard`

### 3.4 Attendance and leave

- `StudentAttendance`
- `StaffAttendance`
- `LeaveRequest`
- `AttendanceRoster`

### 3.5 Student health and safety

- `StudentHealth`
- `HealthObservation`
- `MedicationLog`
- `Incident`
- `SafetyDrill`

### 3.6 Billing and financials

- `FeeStructure`
- `Invoice`
- `Payment`
- `DiscountWaiver`
- `Reconciliation`

### 3.7 Staffing, payroll, procurement, and events

- `Staff`
- `PayrollRun`
- `Appraisal`
- `Vendor`
- `Requisition`
- `PurchaseOrder`
- `DeliveryRecord`
- `VendorInvoice`
- `CustomReport`
- `ReportSchedule`
- `WebhookSubscription`
- `Event`
- `EventRegistration`
- `EventVolunteer`

## 4. Supported API surface

The API is mounted under `/api` and `/api/v1` through the central registry in `core/api/__init__.py`.

### 4.1 Admissions and enrollment API

Defined in `core/api/v1/enrollments.py`

- `POST /enrollments`
- `GET /enrollments/{application_id}/status`
- `PUT /enrollments/{application_id}/decision`
- `POST /enrollments/{application_id}/documents`
- `PUT /enrollments/{application_id}/documents/{document_id}/verify`
- `GET /enrollments/my-applications`

### 4.2 Academic API

Defined in `core/api/v1/academics.py`

- `GET /calendar/current`
- `POST /lesson-plans`
- `GET /classes/{class_id}/plan/{week}`
- `POST /assignments`
- `POST /exams`
- `POST /exams/{exam_id}/marks`

### 4.3 Attendance API

Defined in `core/api/v1/attendance.py`

- `POST /attendance/mark`
- `GET /classes/{class_id}/attendance/{att_date}`
- `GET /students/{student_id}/attendance-summary`
- `POST /leave-requests`
- `PUT /leave-requests/{leave_id}/approve`
- `GET /staff/roster/{roster_date}`
- `POST /substitutions`
- `GET /attendance/reports/{report_type}`

### 4.4 Health & safety API

Defined in `core/api/v1/health.py`

- `GET /students/{student_id}/health-record`
- `POST /health/observations`
- `POST /health/medication-log`
- `POST /incidents`
- `GET /incidents/{incident_id}`
- `POST /safety/drills`
- `GET /safety/compliance-report/{period}`
- `GET /safety/compliance-dashboard`

### 4.5 Billing API

Defined in `core/api/v1/billing.py`

- `GET /students/{student_id}/fee-account`
- `POST /invoices`
- `POST /invoices/bulk-generate`
- `POST /payments`
- `GET /payments/{payment_id}/receipt`
- `POST /payments/{payment_id}/refund`
- `POST /discounts`
- `GET /financials/reconciliation/{period}`
- `GET /financials/statement/{period}`

### 4.6 Analytics & reporting API

Defined in `core/api/v1/analytics.py`

- `GET /analytics/dashboard`
- `GET /analytics/kpis/{role}`
- `POST /reports/custom`
- `GET /reports/{report_id}`
- `POST /reports/{report_id}/schedule`
- `GET /analytics/enrollment-funnel`
- `GET /analytics/financial/{period}`
- `POST /webhooks/subscriptions`
- `POST /webhooks/dispatch`

### 4.7 Sprint 5 operations API

Defined in `core/api/v1/sprint5.py`

- `POST /staff`
- `GET /staff/{staff_id}`
- `GET /staff/{staff_id}/compliance-status`
- `POST /payroll/compute/{period}`
- `PUT /payroll/{payroll_id}/approve`
- `GET /staff/{staff_id}/payslip/{period}`
- `POST /appraisals`
- `GET /staff/{staff_id}/performance-history`
- `POST /vendors`
- `POST /requisitions`
- `POST /purchase-orders`
- `POST /delivery-records`
- `POST /vendor-invoices`

## 5. Role and access pattern

The platform uses a JWT-authenticated session model with role-specific scope. The access logic is layered as follows:

- `JWTAuthBearer` attaches user identity and tenant context.
- `require_roles` constrains endpoint access by role.
- `verify_student_access` and `verify_application_access` enforce object-level permission rules.
- `TenantScopedModel` enforces tenant isolation in the data layer.

Typical roles supported include:

- Admin
- Principal
- Vice_Principal
- Teacher
- CareGiver
- Parent
- Staff
- Vendor
- Owner
- Board
- Trustee

## 6. Design implications for future development

1. Add new domain entities by extending `TenantScopedModel`.
2. Add domain logic in the `core/business_objects` layer rather than in route code.
3. Keep API contracts in the `core/api/v1` routers and schemas under `core/schemas`.
4. For new role-based functionality, apply access checks at both route-level and object-level.
5. Use tenant + user-role filters consistently when returning data.

## 7. Summary

The codebase reflects a full school CRM domain model with admissions, academics, attendance, health, billing, staffing, procurement, analytics, and governance workflows. The API is already organized around clear router domains and can be extended without breaking the tenant-scoped and role-scoped architecture.
