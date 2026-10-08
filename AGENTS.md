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
- Use same code styling, similar nomenclature, and same pattern while writing new code

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

### Mandatory frontend UI rules

These rules apply to every UI change, including dashboards, portals, forms, tables, menus, dialogs, empty states, and responsive states. They take precedence over one-off visual implementations.

1. Reuse the design system. Before writing UI, inspect the relevant page, `frontend/styles/tokens.css`, and existing components under `frontend/components/ui` and `frontend/components/pc`. Use those components and their established APIs. Do not create a second button, input, select, panel, status badge, modal, table, or other primitive when an equivalent already exists.
2. Do not build a parallel component system. Do not add page-local or feature-local copies of shared UI components. If a genuinely missing reusable primitive is required, add it under `frontend/components/pc`, export it through the existing barrel, and add or update its Storybook story. Keep route-specific composition in the route or its existing feature component.
3. Do not build interfaces from ad hoc raw HTML. Use the shared UI components for interactive or styled controls, and `frontend/components/pc/data-table` for data tables. Raw semantic elements such as `main`, `section`, `form`, headings, and descriptive text are appropriate for structure; do not hand-build styled controls or replace shared components with raw elements.
4. Do not use static HTML documents as application UI. HTML mockups belong only in `Artefacts/UX Designs` folder. when a task explicitly requests a static mockup, create accordingly using component designed already as mentioned above. Product workflows belong in the Next.js App Router and must use the existing components and API/session patterns.
5. Never hardcode colors. Use semantic Tailwind utilities backed by the design tokens or CSS variables from `frontend/styles/tokens.css` and the existing theme files. Do not use hex, RGB/HSL literals, named-color utilities, arbitrary color values, inline color styles, or new one-off color variables. If a semantic color is missing, add a named design token first and use it consistently.
6. Preserve the established visual language and responsive behavior. Use stable layout dimensions, accessible labels and keyboard behavior, and the existing icon library. Do not add explanatory UI copy or decorative styling that conflicts with the current product patterns.
7. Before adding any component, search for an existing equivalent. Before finishing a UI change, run focused ESLint on changed frontend files and `npm run build` from `frontend/`; report any pre-existing lint failures separately instead of adding suppressions.

For a quick reference, application code should import UI primitives from `frontend/components/ui` and shared product components from `frontend/components/pc`; design values belong in `frontend/styles/tokens.css` or the established theme files, never in page-local literals.

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
2. Determine whether the change belongs in `core/models.py`, `core/business_objects`, or `core/schemas`. If there's a confusion ask.
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
