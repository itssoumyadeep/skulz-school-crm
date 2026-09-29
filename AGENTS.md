# AGENTS.md

## Project overview

This repository is a multi-tenant School CRM platform built with:

- Django backend
- Django Ninja API
- PostgreSQL-friendly model layer
- Next.js frontend with App Router
- JWT-based role-aware access control

The goal is to manage a school operation across student lifecycle, admissions, academics, attendance, health and safety, billing, analytics, HR/payroll, procurement, and governance.

## Operating principles for AI agents

- Read this file first and use it as the single source of truth for project context.
- Prefer minimal, targeted edits over broad refactors.
- Keep changes aligned to tenant-scoped and role-scoped architecture.
- Follow the existing patterns in the `core/business_objects` layer and `core/api/v1` route modules.
- Do not invent new database tables or bypass tenant checks unless the task explicitly requires it.
- Preserve the Django + Django Ninja structure; do not replace it with ad hoc logic.

## Repository map

### Root

- `manage.py` – Django project entrypoint
- `requirements.txt` – Python dependencies
- `pytest.ini` – pytest config
- `seed_test_data.py` – test data seeding script
- `config/` – Django settings and URL config
- `core/` – primary backend app
- `tests/` – backend test suite
- `frontend/` – Next.js app
- `Artefacts/` and `docs/` – design and documentation assets

### Backend core areas

- `core/models.py` – primary shared domain model for Tenant, Student, Application, Parent, Staff, Invoice, etc.
- `core/api/__init__.py` – central API registry and router mounting
- `core/api/v1/` – domain-specific Django Ninja routers
- `core/business_objects/` – BO layer containing business rules and workflows
- `core/schemas/` – request/response schema definitions
- `core/auth/` – JWT auth, roles, scoping, access checks
- `core/migrations/` – schema migration history

### Frontend areas

- `frontend/app/` – app router pages and portal screens
- `frontend/app/components/` – reusable UI widgets and role portals
- `frontend/app/lib/` – session/auth helpers

## Core architecture

### Backend model pattern

The model layer is built around `TenantScopedModel`, which all tenant-bound entities inherit from. This enforces tenant isolation and supports multi-tenant operations.

Main domain groups in `core/models.py` include:

- Student lifecycle and admissions
  - `Tenant`, `TenantSequence`, `Student`, `Application`, `Parent`, `EmergencyContact`, `Document`, `AuditLog`
- Academics
  - `Curriculum`, `AcademicCalendar`, `LessonPlan`, `Assignment`, `Exam`, `MarksRecord`, `ReportCard`
- Attendance / health
  - `StudentAttendance`, `LeaveRequest`, `StudentHealth`, `HealthObservation`, `MedicationLog`, `Incident`, `SafetyDrill`
- Billing / finance
  - `FeeStructure`, `Invoice`, `Payment`, `DiscountWaiver`, `Reconciliation`
- HR / procurement / events
  - `Staff`, `PayrollRun`, `Appraisal`, `Vendor`, `Requisition`, `PurchaseOrder`, `DeliveryRecord`, `VendorInvoice`, `Event`, `EventVolunteer`
- Reporting / integration
  - `CustomReport`, `ReportSchedule`, `WebhookSubscription`

### API pattern

All API routes are registered in `core/api/__init__.py` and mounted under `/api`.

Key router files:

- `core/api/v1/enrollments.py` – admissions and student profile flows
- `core/api/v1/academics.py` – curriculum, lesson plans, exams, marks
- `core/api/v1/attendance.py` – attendance, leave, staffing coverage
- `core/api/v1/health.py` – health records, medication, incident logs, safety
- `core/api/v1/billing.py` – invoices, payments, discounts, reconciliation
- `core/api/v1/analytics.py` – dashboards, reports, webhooks
- `core/api/v1/sprint5.py` – HR, payroll, vendor, events, communication, procurement

All routes typically follow this pattern:

- JWT auth through `JWTAuthBearer()`
- role enforcement through `@require_roles(...)`
- tenant lookup from `request.tenant_id`
- object-level guard using `verify_student_access`, `verify_application_access`, etc.
- JSON response via `build_response(...)` or `build_error(...)`

### Frontend pattern

The frontend is a Next.js app using App Router.

Important UI flow:

- [frontend/app/page.tsx](frontend/app/page.tsx) loads the landing screen
- [frontend/app/components/session-switcher.tsx](frontend/app/components/session-switcher.tsx) creates a mock JWT session and routes to a role portal
- role pages render dashboard screens and usually include the student widget
- [frontend/app/components/student-widget.tsx](frontend/app/components/student-widget.tsx) is the reusable student summary widget
- Parent-specific widget behavior is wrapped in [frontend/app/components/student-widget-parent-wrapper.tsx](frontend/app/components/student-widget-parent-wrapper.tsx)

UI: use only /components/ui and /components/pc. Never hardcode colours. If a component is missing, add it to /components/pc first.

## Core business logic layers

Follow the repository split:

- `core/models.py` – persistence model
- `core/business_objects/` – enforce business rules
- `core/api/v1/*.py` – API entrypoints
- `core/schemas/*.py` – validating request payloads and response shapes

Do not place business rule validation directly in route handlers unless the task is extremely small and local. Reuse existing BO patterns.

## Key conventions

- Use tenant-aware queries in all reads and writes.
- Respect `is_deleted` soft-deletion patterns.
- Prefer explicit `get_object_or_404(..., tenant_id=request.tenant_id, is_deleted=False)` patterns.
- Use UUID-based lookups for domain identifiers.
- Build responses in the project’s response envelope format; do not return raw payloads when the existing API structure expects `build_response(...)`.
- Keep Pydantic/Ninja schema names consistent with existing file naming conventions.

## Build and validation commands

From the repo root:

- `python manage.py test` – run Django tests
- `pytest` – run test suite if configured in project

From `frontend/`:

- `npm install`
- `npm run dev` – local frontend development
- `npm run build` – production build validation

## Important files to review before change

These are the highest-signal files for onboarding and feature work:

- `config/urls.py`
- `core/api/__init__.py`
- `core/models.py`
- `core/auth/bearer.py`
- `core/auth/decorators.py`
- `core/auth/scoping.py`
- `core/api/v1/enrollments.py`
- `core/api/v1/attendance.py`
- `core/api/v1/billing.py`
- `core/api/v1/analytics.py`
- `core/api/v1/sprint5.py`
- `frontend/app/components/session-switcher.tsx`
- `frontend/app/components/student-widget.tsx`

## Development guidance for new tasks

When implementing new features:

1. Identify the correct domain and router file.
2. Determine whether the change belongs in `core/models.py`, `core/business_objects`, or `core/schemas`.
3. Add/adjust the route only after the BO and schema logic are in place.
4. Keep tenant and role checks explicit.
5. Cover the behavior with tests in `tests/` when the change affects backend domain logic.

## Known implementation notes

- The app uses session-emulated role portal access in the frontend rather than direct URL state for core access flows.
- Student widget visibility depends on the selected role and linked student claims in the JWT session.
- The backend is designed around strong access-control and tenant isolation; avoid bypassing those guarantees.

## Output expectations

When making code changes:

- Keep modifications narrowly scoped.
- Prefer consistent naming with current project patterns.
- Update tests when business rules or API contracts change.
- Validate relevant commands before concluding the task.

## One-sentence summary

This repository is a tenant-aware school CRM with a Django + Django Ninja backend, role-based access control, and a Next.js portal front end; new work should follow existing domain, BO, schema, and route conventions rather than introducing parallel patterns.
