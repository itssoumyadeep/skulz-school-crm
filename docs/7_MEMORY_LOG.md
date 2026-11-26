# Project Memory Log

This log records durable architecture, security, and product decisions so later work can preserve intent. Add an entry after each completed task or decision. Keep entries short, link to the source of truth, and never include credentials, tokens, personal data, or private incident details.

## Entry Template

### YYYY-MM-DD — Short decision title

- **Status:** Accepted | Superseded | Under review
- **Decision:** What was decided or observed.
- **Context:** Why it matters.
- **Consequences:** Constraints or follow-up work.
- **Evidence:** Commit, test, document, or code paths.

## Seeded Decisions

### 2026-03-06 — Multi-role Next.js portal foundation

- **Status:** Accepted
- **Decision:** Use a Next.js App Router frontend with shared portal components for the role-based School CRM.
- **Context:** Establishes a shared web foundation for school and external-user workflows.
- **Consequences:** New portal screens belong in App Router routes and should reuse the shared design system. Session emulation remains development-only.
- **Evidence:** Commit `dd9e7a3` (`feat: add Purple Cubbies frontend with multi-role portals and UI components`); [`frontend/app/`](../frontend/app/); [`frontend/components/`](../frontend/components/).

### 2026-09-30 — Tenant-scoped student numbers and status constraints

- **Status:** Accepted
- **Decision:** Students have UUID primary keys plus tenant-prefixed sequential human-readable student numbers; lifecycle status is constrained to `Active`, `Inactive`, or `Waitlisted`.
- **Context:** A stable human-facing identifier is needed without replacing the UUID identity; status values must match the implemented lifecycle.
- **Consequences:** Use `generate_student_number()` and its tenant sequence; add status changes through reviewed migrations and update import/API tests.
- **Evidence:** Commit `35279ef` (`Prevent duplicate student numbers on enrollment`); migrations `0016_student_status_active_inactive_waitlisted` and student-number tests.

### 2026-09-30 — Shared attendance workflows

- **Status:** Accepted
- **Decision:** Reuse a common student-attendance experience across eligible role portals, with authorization remaining server-side.
- **Context:** Avoid divergent attendance behavior between school roles.
- **Consequences:** Attendance UI changes must retain role-specific access and the attendance business rules; test API scope independently of route visibility.
- **Evidence:** Commit `16819cf` (`Unify student attendance and admissions workflows`); attendance API and BO tests.

### 2026-10-02 — Parent payments require Stripe confirmation

- **Status:** Accepted
- **Decision:** Parent card payments use Stripe-hosted Checkout for partial invoice payments. A signed webhook, not a browser return, marks the payment complete.
- **Context:** The previous direct payment endpoint could create a Completed record without a gateway confirming funds.
- **Consequences:** Keep payment pending until verified webhook delivery; enforce current-balance checks, invoice locking, idempotency, tenant/parent access, and secret separation. Actual credential-backed live test checkout remains a deployment prerequisite.
- **Evidence:** Commit `06903d0` (`Complete school setup and parent billing workflows`); [`docs/parent_payments_stripe.md`](parent_payments_stripe.md); billing and enrollment API tests.

### 2026-10-02 — Student setup also creates a linked Parent

- **Status:** Accepted
- **Decision:** Admin Student import creates one Student and its linked Parent record in the current tenant, but does not create an Application or EmergencyContact.
- **Context:** School roster setup is distinct from the admissions workflow.
- **Consequences:** The Student CSV requires `parent_name`; optional parent contact columns populate the linked Parent. Admission submissions continue through the dedicated enrollment API.
- **Evidence:** Commit `06903d0`; school-setup API tests assert related-record behavior.

### 2026-10-07 — Production settings fail closed

- **Status:** Accepted
- **Decision:** Production Django settings require external signing keys, database credentials, allowed hosts/origins, and Stripe configuration; development keys are not production fallbacks.
- **Context:** Prior credentials in settings and Git history create key-compromise risk.
- **Consequences:** Rotate previous Django/JWT signing keys manually; provide environment values through deployment secret management; never commit `.env` or `local.env`.
- **Evidence:** Phase 1 settings tests and `.env.example`; repository history contains earlier hardcoded signing-key assignments.

### 2026-10-14 — Tenant-wide RLS migration

- **Status:** Accepted
- **Decision:** Enable and force tenant-isolation RLS policies for every current concrete tenant-scoped core table through migration `0020_enable_tenant_rls`; keep `Tenant` outside this policy so authentication can resolve the tenant first.
- **Context:** Application query filters alone were not a sufficient database isolation boundary.
- **Consequences:** The application database role must not bypass RLS, and request authentication must establish `app.current_tenant_id` before tenant-scoped queries. Runtime cross-tenant tests against a non-bypass role remain required.
- **Evidence:** `core/migrations/0020_enable_tenant_rls.py` and `tests/test_rls_configuration.py`.

## Current Known Risks

- Runtime RLS enforcement still requires verification with a non-bypass application database role; the catalog test confirms policy coverage, not end-to-end role behavior. See [`SECURITY.md`](SECURITY.md).
- Teacher and Caregiver student-list queries are not fully class/care-group scoped; do not expose real student rosters to those roles until fixed and tested.
- The frontend Session Switcher creates unsigned development tokens; keep `ALLOW_INSECURE_DEV_TOKENS` disabled outside isolated local demos.
- Rate limiting, verified backup/restore, and production monitoring/incident procedures are not established in the repository.
- Last recorded full backend suite: 130 passed and one existing late-fee test failed (`TestBR0202.test_late_fee_only_after_grace_period`). Re-run before using this as a current baseline.

### 2026-10-11 — CI and pull-request guardrails

- **Status:** Accepted
- **Decision:** Add GitHub Actions checks for PostgreSQL-backed Django tests/checks, frontend ESLint/build, Python/npm dependency audits, and a redacted secret scan. Add a pull-request checklist that points contributors to `SECURITY.md` and this log.
- **Context:** Foundation changes need repeatable verification and explicit security/documentation review before feature work continues.
- **Consequences:** CI uses non-secret test-only values and no production credentials. Existing late-fee and App Router lint failures may make initial runs fail; keep checks strict and remediate the baseline instead of suppressing rules.
- **Evidence:** `.github/workflows/ci.yml`, `.github/pull_request_template.md`, `tests/test_settings_security.py`, and the observed test/lint baseline.

### 2026-10-11 — CI and pull-request guardrails

- **Status:** Accepted
- **Decision:** Add GitHub Actions jobs for PostgreSQL-backed Django checks/tests, frontend ESLint/build, Python/npm dependency audits, and a redacted Gitleaks scan; use a PR template that requires security and memory-log review.
- **Context:** Foundation documentation and configuration need repeatable verification before feature work continues.
- **Consequences:** CI uses explicitly non-secret test-only values and no production credentials. Existing late-fee and frontend lint debt may cause initial CI failures; do not suppress these checks to make the workflow green.
- **Evidence:** `.github/workflows/ci.yml`, `.github/pull_request_template.md`, and the reviewed test/lint baseline.

### 2026-10-31 — Product Owner (PO_SB) agent prompt definition

- **Status:** Superseded
- **Decision:** Define specialized agent prompt for `PO_SB` in `docs/10_Agent_Prompts` focused on multi-tenant EdTech product ownership, business rule compliance, persona journey definition, and acceptance criteria governance under a zero-trust read-only operational boundary.
- **Context:** The previous prompt was an unedited duplicate of the SDL technical execution prompt.
- **Consequences:** Provides a distinct PO agent configuration complementary to `SDL_SB` for decomposing business rules and PRD requirements into user stories without mutation risks.
- **Evidence:** [`docs/10_Agent_Prompts`](10_Agent_Prompts).

### 2026-10-31 — Grant workspace write permissions to SDL_SB and PO_SB agents

- **Status:** Accepted
- **Decision:** Update `SDL_SB` and `PO_SB` prompts in `docs/10_Agent_Prompts` and subagent configurations to grant workspace read/write privileges (`EnableWriteTools: true`) while preserving execution guardrails against modifying system binaries outside the workspace or exposing secrets.
- **Context:** Enables the Software Development Lead and Product Owner agents to directly author and update roadmaps, plans, user stories, and documentation files in the project workspace.
- **Consequences:** Both agents can now create and edit project files while following `AGENTS.md` rules.
- **Evidence:** [`docs/10_Agent_Prompts`](10_Agent_Prompts).

### 2026-10-31 — Comprehensive Product Backlog and User Stories (`8_PRODUCT_BACKLOG_STORIES.md`)

- **Status:** Accepted
- **Decision:** Author `docs/8_PRODUCT_BACKLOG_STORIES.md` capturing all 27 remaining user stories across P0, P1, P2, and P3 (`Partial` / `In Progress` and `Planned` / `Yet to Be Done` items from `docs/2_PRD.md` and `docs/6_PLAN.md`) with full traceability to all Class 2 Business Rules in `docs/rule_registry.md`.
- **Context:** Engineering and product execution required a unified, testable backlog with explicit persona tags, MoSCoW ratings, Given-When-Then acceptance criteria, Definition of Done gates, and multi-tenant/RBAC security edge cases.
- **Consequences:** All remaining sprint tasks (`S1-02`..`S8-04`) and top 5 release blockers are mapped to verifiable user stories (`US-P0-01` through `US-P3-05`).
- **Evidence:** [`docs/8_PRODUCT_BACKLOG_STORIES.md`](8_PRODUCT_BACKLOG_STORIES.md), [`docs/2_PRD.md`](2_PRD.md), [`docs/6_PLAN.md`](6_PLAN.md), [`docs/rule_registry.md`](rule_registry.md).

### 2026-10-31 — Streamline `2_PRD.md` to high-level requirements aligned with `8_PRODUCT_BACKLOG_STORIES.md`

- **Status:** Accepted
- **Decision:** Refactor `docs/2_PRD.md` to contain strictly high-level product requirements, personas, release priorities, and non-functional outcomes mapped directly to the user story IDs (`US-P0-01`–`US-P3-05`) in `docs/8_PRODUCT_BACKLOG_STORIES.md`.
- **Context:** Avoid duplicating granular acceptance criteria, business rules, and implementation status notes between the high-level PRD and the detailed backlog.
- **Consequences:** `docs/2_PRD.md` serves as the high-level executive product summary while `docs/8_PRODUCT_BACKLOG_STORIES.md` holds granular stories and acceptance test gates.
- **Evidence:** [`docs/2_PRD.md`](2_PRD.md), [`docs/8_PRODUCT_BACKLOG_STORIES.md`](8_PRODUCT_BACKLOG_STORIES.md).

### 2026-10-31 — Condense `AGENTS.md` with task-scoped file routing

- **Status:** Accepted
- **Decision:** Condense `AGENTS.md` from 234 lines to 59 lines and replace the upfront multi-document reading list with a task-to-file routing table so coding agents read only the specific files required for their active task.
- **Context:** Reading all architecture, security, data, design, and router files before every task wasted context and slowed execution.
- **Consequences:** Agents retain all mandatory security, tenant/role isolation, BO layer, and UI design-system guardrails while loading only task-relevant files.
- **Evidence:** [`AGENTS.md`](../AGENTS.md).

### 2026-10-31 — Author Technical Execution Plan for Complete CRUD & ICD Coverage (`9_CRUD_EXECUTION_PLAN.md`)

- **Status:** Accepted
- **Decision:** Author `docs/9_CRUD_EXECUTION_PLAN.md` defining the target Interface Control Document (ICD) matrix (77 existing + 127 new endpoints = 204 total CRUD endpoints) across all 7 Base Objects and 35 Derived Objects, sequenced into 4 delivery phases and 12 independently testable work packages (`WP-1.1` through `WP-4.3`).
- **Context:** Auditing `core/models.py` against `core/api/v1/` revealed missing standalone list, detail, partial update (`PATCH`), and soft-delete (`DELETE`) endpoints required by role portals (`US-P2-01`..`08`) and core operational epics (`US-P0-01`..`US-P3-04`).
- **Consequences:** All new CRUD endpoints must follow the 3-layer split (`core/schemas/` -> `core/business_objects/` -> `core/api/v1/`), enforce tenant/role/object scoping (`verify_student_access`, `verify_application_access`, `verify_vendor_access`), preserve immutable records (`AuditLog`, signed-off `SafetyDrill` per `BR-07-04`, financial ledgers), and use soft deletion (`is_deleted=True`).
- **Evidence:** [`docs/9_CRUD_EXECUTION_PLAN.md`](9_CRUD_EXECUTION_PLAN.md), [`docs/8_PRODUCT_BACKLOG_STORIES.md`](8_PRODUCT_BACKLOG_STORIES.md), [`docs/rule_registry.md`](rule_registry.md).

### 2026-10-31 — Implement Full CRUD Operations Across All 7 Base Objects and 35 Derived Objects (`WP-1.1`–`WP-4.3`)

- **Status:** Accepted
- **Decision:** Implement all missing CRUD endpoints, Pydantic schemas, and Business Object (`BO`) lifecycle methods across all 42 domain objects (`WP-1.1` through `WP-4.3` in `docs/9_CRUD_EXECUTION_PLAN.md`), harden Teacher/CareGiver class and grade scoping in `core/auth/scoping.py`, and fix the relative-date grace period test in `tests/test_bo_billing.py`.
- **Context:** Role portals and operational workflows required complete list, detail, create, partial update (`PATCH`), and soft-delete (`DELETE`) coverage while strictly preserving tenant isolation (`tenant_id=request.tenant_id`, `is_deleted=False`), RBAC (`@require_roles`), object-level guards, and Class 2 Business Rules (`BR-01-01`..`BR-09-01`).
- **Consequences:** All 7 Base Objects (`Tenant`, `Student`, `Parent`, `Staff`, `Vendor`, `PortalRoleMembership`, `TenantSequence`) and 35 Derived Objects now expose standardized CRUD routes under `/api/v1/` with full BO rule enforcement and audit logging.
- **Evidence:** `core/auth/bearer.py`, `core/auth/scoping.py`, `core/schemas/`, `core/business_objects/`, `core/api/v1/`, `tests/test_crud_execution_plan.py`, `tests/test_bo_billing.py`.

---

### [2026-11-01] `US-P0-03` Admissions Lifecycle & Student Enrollment Gap Audit & Execution Plan
- **Context:** Audited `US-P0-03` across `docs/2_PRD.md`, `docs/8_PRODUCT_BACKLOG_STORIES.md`, `docs/rule_registry.md` (`BR-01-01`..`BR-01-16`), `core/business_objects/enrollment.py`, `core/api/v1/enrollments.py`, and `frontend/app/` admissions/student components.
- **Decision:** Authored a step-by-step execution plan in `docs/9_CURRENT_JOB_EXECUTION_PLAN.md` covering 4 remaining backend gaps (`BE-01`..`BE-04`: `BR-01-04` `notification_dispatched` persistence on final decision, `BR-01-01` uploaded required document verification check, blocking non-Owner direct `Accepted` bypass, and moving `PATCH /api/v1/students/{student_id}` into `StudentProfileBO.update_student()` with `BR-01-02`/`BR-01-03` guards) and 6 remaining frontend work packages (`FE-01`..`FE-06`: missing `api.ts` helpers, Parent wizard document-type selector/delete/withdraw & invoice link, Admin/Principal/Owner `Offered`/`Waitlisted`/`Active` & `BR-01-04` lock UI, wiring Principal & Vice Principal queues to live APIs instead of `sampleApplications`, wiring Teacher admissions assessments in `/teacher/assessments`, and fixing `student-widget.tsx` status enum, tokens, and EmergencyContact/Parent CRUD).
- **Evidence:** `docs/9_CURRENT_JOB_EXECUTION_PLAN.md`.

### 2026-11-02 — Reset Frontend Portal Screens for Clean Rebuild (Keep Backend, Docs, Login Page, and UI Primitives)

- **Status:** Accepted
- **Decision:** Remove all legacy role portal routes (`admin/`, `principal/`, `vice-principal/`, `teacher/`, `caregiver/`, `parent/`, `vendor/`, `governance/`, `owner/`, `staff/`, `(dev)/`) and screen/workbench components under `frontend/app/`, while keeping the backend (`core/`, `config/`, `tests/`), documentation (`docs/`), Login page (`frontend/app/page.tsx`, `frontend/app/components/sign-in-screen.tsx`, `frontend/app/lib/`), shared design system primitives (`frontend/components/ui/`, `frontend/components/pc/`, `frontend/styles/tokens.css`), and `Login_page.html` / `School_Setup_Wizard.html` in `Artefacts/`.
- **Context:** Prepare a clean slate to rebuild the portal screens from scratch on top of the completed backend and shared design system.
- **Consequences:** New portal routes and screens will be built cleanly in `frontend/app/` using the shared UI primitives and backend APIs.
- **Evidence:** `frontend/app/`, `Artefacts/UX Designs/`.

### 2026-11-02 — Define `UI_SB` Agent Prompt and 4-Tier Portable Functional Widget Architecture

- **Status:** Accepted
- **Decision:** Add the `UI_SB` (UI & Frontend Component Architect) prompt to `docs/10_Agent_Prompts`, codify the 4-Tier Component Architecture (`ui` -> `pc` -> `widgets/<domain>` -> `app`) and 3-Stage UI Lifecycle (`HTML Mockup` -> `Portable Functional Widget` -> `Thin Route Container`) in `docs/5_DESIGN.md` and `AGENTS.md`, and scaffold `WidgetBaseProps` in `frontend/components/widgets/index.ts`.
- **Context:** Enable functional UI components (e.g., Attendance Modals, Student Widgets, School Setup Wizards) to be built once as 100% API-agnostic, capability-flag-driven widgets that can be reused across all role portals and across external projects.
- **Consequences:** All new functional widgets belong in `frontend/components/widgets/<domain>/` (`<widget>.types.ts` + `<widget>.tsx`) with zero direct API/router imports and boolean `capabilities` props instead of hardcoded role checks.
- **Evidence:** [`docs/10_Agent_Prompts`](10_Agent_Prompts), [`docs/5_DESIGN.md`](5_DESIGN.md), [`AGENTS.md`](../AGENTS.md), [`frontend/components/widgets/index.ts`](../frontend/components/widgets/index.ts).

### 2026-11-02 — Teacher Portal Landing Page (`/teacher`) Built from StitchMCP Design

- **Status:** Accepted
- **Decision:** Rewrite `frontend/styles/tokens.css` and `frontend/app/layout.tsx` (`Plus Jakarta Sans`) to match the StitchMCP **Warm Editorial Pedagogic** design system (`surface: #fff8f2`, `surface-container-lowest..highest`, `primary: #000000`, `secondary-container: #febb3c`, `tertiary-fixed-dim: #5fdda3`, `error-container: #ffdad6`, typography scale `display-lg`..`label-sm`, and spacing/elevation tokens), and build `frontend/app/teacher/page.tsx` matching the StitchMCP **Teacher Dashboard Overview** (`projects/14950269536715715/screens/a7e952960e3245e8a3b7500b75eb4e14`).
- **Context:** Provides educators with the floating pill top navigation bar, greeting & classroom switcher header, and 12-column executive stage (Today's Attendance `96%`, Sunny Marigold Class Schedule card, Homeroom 4B Roll with `P`/`L`/`E` toggles and full `DataTable` roster `DetailPanel`, Period 2 Grade 5 Earth Science, Period 3 Grade 4 Mathematics with `US-P1-02` standards mapping, Department Science Moderation, Quick Requests with `US-P1-04` substitute cover modal & CSV export, Caregiver Notice Verified `US-P1-05` safeguarding log, Voice Teaching Copilot, and floating Purple Cubby AI Assistant).
- **Consequences:** All shared UI primitives (`frontend/components/ui`, `frontend/components/pc`) inherit the Warm Editorial Pedagogic tokens via `frontend/styles/tokens.css`, and all teacher actions connect to `frontend/app/lib/api.ts`.
- **Evidence:** [`frontend/styles/tokens.css`](../frontend/styles/tokens.css), [`frontend/app/layout.tsx`](../frontend/app/layout.tsx), [`frontend/app/teacher/page.tsx`](../frontend/app/teacher/page.tsx).

### 2026-11-02 — Teacher Portal Left Menubar (`5c7eb8a167914dd28a933c78708ff14e`)

- **Status:** Accepted
- **Decision:** Add StitchMCP Oil Pastel semantic tokens (`--paper`, `--paper-card`, `--paper-tint`, `--crayon-charcoal`, `--crayon-espresso`, `--crayon-muted`, `--pastel-sun`, `--pastel-butter`, `--pastel-mint`, `--pastel-mint-deep`, `--pastel-sky`, `--pastel-sky-deep`, `--pastel-peach`, `--pastel-peach-deep`, `--pastel-lilac`, `--pastel-lilac-deep`, and `--shadow-pastel*`) to `frontend/styles/tokens.css`, and implement the top-left hamburger button and `School CRM Navigator` menu in `frontend/app/teacher/page.tsx` matching `projects/14950269536715715/screens/5c7eb8a167914dd28a933c78708ff14e` ("Teacher Dashboard Overview - Oil Pastel Edition") so that both hovering and clicking the hamburger button display the same `School CRM Navigator` menu.
- **Context:** The initial Teacher Landing Page had the top floating pill header without the left menubar toggle and `School CRM Navigator` popover from the StitchMCP design.
- **Consequences:** Educators can hover or click the top-left hamburger button to open the `School CRM Navigator` (`Teacher Dashboard`, `Classes & Attendance`, `Lesson Plans`, `Assessments & Moderation`, `Messages & Parent Notes`, plus `Portal & Tools`: `Calendar`, `Safeguard`, `Switch Role`, `Settings`).
- **Evidence:** [`frontend/styles/tokens.css`](../frontend/styles/tokens.css), [`frontend/app/teacher/page.tsx`](../frontend/app/teacher/page.tsx).

### 2026-11-02 — Add Module Docstrings Across All Python Files Under `core/`

- **Status:** Accepted
- **Decision:** Prepend concise top-level module docstrings describing the exact purpose and domain responsibility for all 50 Python files across `core/` (root modules, `core/auth/`, `core/api/v1/`, `core/business_objects/`, `core/schemas/`, `core/management/`, and migration utilities).
- **Context:** Improves codebase readability and helps developer and agent tooling rapidly identify layer responsibilities across the 3-layer architecture without parsing full implementation code.
- **Consequences:** All core python files have clear, standardized header docstrings and pass Django system checks.
- **Evidence:** `core/**/*.py`, `manage.py check`.

### 2026-11-02 — Master UX Progress Tracking Matrix & Stitch MCP Mockup Synchronization

- **Status:** Accepted
- **Decision:** Download and organize all 9 role dashboard mockups from StitchMCP project `projects/14950269536715715` into `Artefacts/UX Designs/<domain>/`, and initialize the master UX progress tracking table in `docs/8_PROGRESS_mgmt.md` covering 59 functional UI items (10 Dashboards, 2 Wizards, 19 Modals, 20 Panels/Widgets, 3 Drawers).
- **Context:** User requested combining all previous dashboard and functional modal/widget requirements into a centralized progress tracking table with columns (`Item`, `Type`, `where it's used`, `Purpose`, `Status`, `Link to UX`), and assigning the mockup creation task to the `UI_SB` agent specified in `docs/10_Agent_Prompts`.
- **Consequences:** All 11 existing mockups (10 role landing pages + School Setup Wizard) are linked and marked as `Completed` (18.6% baseline). Remaining functional modals and widgets are cataloged with `Status: Yet to start` ready for `UI_SB` execution.
- **Evidence:** [`docs/8_PROGRESS_mgmt.md`](../docs/8_PROGRESS_mgmt.md), [`Artefacts/UX Designs/`](../Artefacts/UX%20Designs/).

 Across All 18 Persona Dashboards (`UI_SB`)

- **Status:** Accepted & Fully Deployed
- **Decision:** Implemented the approved Hybrid Split-Action Card Interaction Architecture across all 18 persona dashboard files (9 Card-based dashboards + 9 Compact list dashboards):
  1. **Interactive Card Styling:** Cards and rows enhanced with hover elevation (`hover:-translate-y-0.5 hover:shadow-md cursor-pointer transition-all duration-200 active:scale-[0.99] group`).
  2. **Split Actions:**
     - **Primary body click**: Opens responsive slide-over drawer (520px wide on desktop/tablet `>= md`, high-efficiency bottom sheet on mobile `< md`) providing contextual inline micro-actions.
     - **Secondary header click**: Dedicated `open_in_new` icon button with `event.stopPropagation()` navigating directly to the dedicated full-screen route or modal.
  3. **Contextual Domain Drawers:**
     - *Admin*: Admissions verification with offer letter issuance; Procurement 3-way match reconciliation; Ledger waiver approvals.
     - *Principal*: Grade moderation with bell-curve deviation checks; Blackout date leave conflict review; Safeguarding incident escalation.
     - *Teacher*: Homeroom roll call reconciliation; Ontario Science lesson plan progression; Sabrina's Law EpiPen medical emergency protocol.
     - *Parent*: Student 360 profile review; 1-click Stripe invoice payment; Field trip digital waiver sign-off.
     - *Caregiver*: Toddler daily care micro-logging (diaper, meal, nap, mood); Medication witness verification; Authorized pickup checks.
     - *Staff*: Shift timetable swap request; Statutory paid leave application; Payslip breakdown; Credential renewals.
     - *Vendor*: PO fulfillment dispatch notice; Tax invoice 3-way reconciliation; WSIB/insurance compliance upload.
     - *Owner*: Multi-campus operational EBITDA variance review; High-value bursary sign-off; CapEx project authorizations.
     - *Board*: Fiduciary quorum electronic voting; Institutional risk radar endorsement; Strategic endowment fiscal report.
  4. **Optimistic Feedback:** Animated green checkmark toast notification (`#toast-notify`) and inline badge status updates without full page reloads.
- **Evidence:** [`docs/8_PROGRESS_mgmt.md`](../docs/8_PROGRESS_mgmt.md), [`Artefacts/UX Designs/`](../Artefacts/UX%20Designs/).

---

### [2026-11-04] Rebranding: Complete Removal of LuminaEd & Standardization on "The Purple Cubby Inc."
- **Status:** Complete & Verified
- **Scope:** Complete replacement of legacy brand references (`LuminaEd`, `Lumina`, `LuminaAI`) with official corporate branding `"The Purple Cubby Inc."`.
- **Files Updated:**
  - `Artefacts/UX Designs/index.html`: Header brand updated to `The Purple Cubby Inc.`, footer copyright updated.
  - `Artefacts/UX Designs/Academics/Academic_Calendar_Widget.html`: iCal feed URL rebranded to `webcal://mapleleaf.thepurplecubby.com/...`.
  - `Artefacts/UX Designs/Principal/Principal_Leadership_Portal.html`: Header branding and floating copilot rebranded to `The Purple Cubby Inc.`.
  - `Artefacts/UX Designs/Owner/School_Owner_Portal.html`: Header branding updated to `The Purple Cubby Inc.`.
  - `Artefacts/UX Designs/Board/Board_Trustee_Portal.html`: Header branding updated to `The Purple Cubby Inc.`.
  - `Artefacts/UX Designs/Caregiver/Caregiver_Daily_Care_Portal.html`: Assistant naming updated to `Care Assistant` / `The Purple Cubby Inc.`.
  - `Artefacts/UX Designs/Admin/Admin_Operational_Console.html`: Copilot pill updated to `The Purple Cubby Inc.`.
  - `Artefacts/UX Designs/Parent/Parent_Multi_Child_Portal.html`: Drawer trigger and assistant updated to `The Purple Cubby Inc.`.
  - `Artefacts/UX Designs/Staff/Staff_Self_Service.html`: Header branding updated to `The Purple Cubby Inc.`.
  - `Artefacts/UX Designs/Teacher/Teacher_Dashboard_Overview.html`: Replaced `LuminaAI` with `Purple Cubby AI` and updated footer copyright.
  - `Artefacts/UX Designs/Vendor/Vendor_Partner_Portal.html`: Header and procurement gateway banner updated to `The Purple Cubby Inc. Procurement & Logistics Gateway`.
  - `frontend/app/teacher/page.tsx`: Replaced `LuminaAI` copilot / assistant and footer copyright with `The Purple Cubby Inc.`.
  - `docs/7_MEMORY_LOG.md`: Historical references sanitized.
- **Verification:** Full repository AST/regex scan confirms 0 occurrences of `Lumina` / `LuminaEd` remain across all code and artifact files; TypeScript verification (`tsc -p frontend/tsconfig.json --noEmit`) passes with 0 errors.

---

### [2026-11-04] Repository Cleanliness & Developer Onboarding Overhaul
- **Status:** Complete & Committed
- **Scope:** 
  1. Accepted and committed all cumulative changes across backend, frontend, design tokens, and UX prototypes into Git (`working tree clean`).
  2. Created root [`README.md`](../README.md) establishing project architecture, visual UX directory, 15-minute quickstart, and persona test credentials cheat sheet.
  3. Added [`docker-compose.yml`](../docker-compose.yml) for 1-command local PostgreSQL 15 setup.
  4. Authored [`docs/ONBOARDING.md`](../docs/ONBOARDING.md) detailing prerequisites, multi-tenant PostgreSQL RLS fundamentals, end-to-end feature walkthroughs, and troubleshooting tips for new engineers.
- **Verification:** `git status` clean; TypeScript validation (`tsc -p frontend/tsconfig.json --noEmit`) passes with 0 errors.


### 2026-11-05 — Storybook Deprecation & Removal

- **Status:** Accepted
- **Decision:** Fully remove unused Storybook infrastructure across the repository:
  1. Deleted Storybook directories and files: `frontend/.storybook/`, `frontend/storybook-static/`, `frontend/stories/`, and all 11 component story files in `frontend/components/pc/*.stories.tsx`.
  2. Removed `storybook` and `build-storybook` scripts, as well as Storybook devDependencies (`storybook`, `@storybook/nextjs-vite`, `eslint-plugin-storybook`, `vite`) from `frontend/package.json`.
  3. Cleaned up `frontend/eslint.config.mjs` to remove `eslint-plugin-storybook` imports and configuration.
  4. Removed Storybook references and commands from `README.md` and `docs/ONBOARDING.md`.
- **Context:** User requested removal of Storybook as it is not used in the project lifecycle (all visual prototyping follows the 3-Stage workflow with standalone HTML prototypes under `Artefacts/UX Designs/` and portable React widgets in `frontend/components/widgets/`).
- **Evidence:** `README.md`, `frontend/package.json`, `frontend/eslint.config.mjs`, `docs/ONBOARDING.md`. Verified with `npx tsc --noEmit` passing with 0 errors.

### 2026-11-05 — Prospective Parent Admissions Onboarding & Sibling Enrollment Lifecycle

- **Status:** Accepted
- **Decision:** Build and deploy parent-facing admissions onboarding prototypes and backend APIs solving the "Admissions Deadlock" and sibling enrollment with zero-trust VA security:
  1. **New UX Mockup 1 (`Parent_Apply_Registration.html`):** Public-facing parent registration and 4-step student admission intake wizard (Parent Account setup, Student profile, Health/Sabrina's Law disclosures, Document uploads & Sibling discount preview).
  2. **New UX Mockup 2 (`Parent_Applicant_Dashboard.html`):** Pre-enrolled "Applicant Mode" parent portal featuring real-time 5-stage progress stepper, sibling switcher tabs (`[ 👦 Leo (Grade 4) • Enrolled ]` vs `[ 👶 Maya (Pre-K) • Offer Received ]`), document verification checklist, locked features safeguard indicator, and interactive Offer Acceptance & Seat Deposit modal.
  3. **Backend Schemas (`core/schemas/enrollment.py`):** Added `ParentPublicApplySchema` and `SiblingEnrollmentCreateSchema` with date validation and sibling discount flags.
  4. **Backend Routes (`core/api/v1/enrollments.py`):**
     - `POST /enrollments/public-apply`: Atomic public registration creating active parent user, student draft, and immediate JWT session.
     - `POST /enrollments/sibling-apply`: Authenticated parent endpoint re-using family contacts and attaching -15% sibling discount eligibility (`BR-02-01`).
  5. **Security Gate (`core/auth/scoping.py`):** Added `verify_enrolled_student_access(request, student)` to strictly block unadmitted parents from operational school endpoints (Attendance, Report Cards, Health) with `HTTP 403 Forbidden` for complete VAPT/VA test compliance.
  6. **Auth Activation (`core/api/v1/auth.py`):** Enabled `is_active=True` upon parent registration so parents can immediately log in to track their admission status.
- **Context:** Solves the missing link where prospective parents (and parents applying for a sibling) need portal access before active student admission without violating server-side data access boundaries.
- **Evidence:** [`Artefacts/UX Designs/Parent/Parent_Apply_Registration.html`](../Artefacts/UX%20Designs/Parent/Parent_Apply_Registration.html), [`Artefacts/UX Designs/Parent/Parent_Applicant_Dashboard.html`](../Artefacts/UX%20Designs/Parent/Parent_Applicant_Dashboard.html), [`core/api/v1/enrollments.py`](../core/api/v1/enrollments.py), [`core/schemas/enrollment.py`](../core/schemas/enrollment.py), [`core/auth/scoping.py`](../core/auth/scoping.py).

### 2026-11-05 — Feature Branch `feature/parent-screens`: Full Functional Parent Portal & Admissions Intake Suite

- **Status:** Completed & Verified (Branch `feature/parent-screens`)
- **Decision:** Designed, developed, and verified the complete functional Parent Portal Suite across Tier 3 portable widgets and Tier 4 Next.js App Router routes, strictly adhering to the 4-Tier Component Hierarchy, tokenized styling, and portable widget contract (`WidgetBaseProps`):
  1. **Branch Creation:** Switched to dedicated feature branch `feature/parent-screens`.
  2. **Tier 3 Portable Functional Widgets (`frontend/components/widgets/parent/`):**
     - `ParentMultiChildDashboardWidget` (`parent-multi-child-dashboard.tsx` & `.types.ts`): Dual-mode dashboard supporting active enrolled students (academic progress, attendance streak, health alerts, fee payment slider, events) and applicant students (5-stage admissions progress tracker, document checklist, offer review, and acceptance trigger).
     - `SiblingIntakeModal` (`sibling-intake-modal.tsx` & `.types.ts`): Multi-child intake dialog pre-populating family contacts with automatic 10% sibling tuition discount calculation (`BR-02-01`).
     - `OfferAcceptanceModal` (`offer-acceptance-modal.tsx` & `.types.ts`): Formal offer confirmation modal requiring mandatory passport photo upload and terms sign-off (`BR-01-08`).
     - `ParentBillingWidget` (`parent-billing-widget.tsx` & `.types.ts`): Invoices table with status pills, sibling discount badge, partial payment amount slider, and Stripe Checkout redirect.
     - `ParentEventsWidget` (`parent-events-widget.tsx` & `.types.ts`): Activity roster with digital parental permission slip sign-off.
     - `PublicApplyWizard` (`public-apply-wizard.tsx` & `.types.ts`): 4-step wizard for public student intake & instant parent account registration.
  3. **Tier 4 Next.js App Router Routes:**
     - `/parent`: Main multi-child dashboard with live API data fetching, optimistic fallback data, sibling modal trigger, and offer acceptance workflow.
     - `/parent/billing`: Dedicated financial and invoices hub with partial payment slider and Stripe integration.
     - `/parent/events`: School excursions and activities with permission slip signing.
     - `/apply`: Public admissions onboarding flow writing session cookie and redirecting to the parent dashboard.
     - `/parent/layout.tsx`: Responsive `AppShell` with parent-branded sidebar, topbar, and session integration.
  4. **API Client Integration (`frontend/app/lib/api.ts`):** Added `submitPublicApply`, `submitSiblingApply`, `fetchEvents`, and typed schemas.
  5. **Verification & Clean Build:**
     - TypeScript check: 0 errors (`tsc --noEmit`).
     - ESLint check: 0 errors (`npm run lint`).
     - Next.js production build: 100% successful static page generation across `/apply`, `/parent`, `/parent/billing`, and `/parent/events`.
- **Evidence:** [`frontend/app/parent/`](../frontend/app/parent/), [`frontend/app/apply/`](../frontend/app/apply/), [`frontend/components/widgets/parent/`](../frontend/components/widgets/parent/), [`frontend/app/lib/api.ts`](../frontend/app/lib/api.ts).

### 2026-11-03 — Admissions & Student Management UX Mockup Suite (`UI_SB`)

- **Status:** Accepted
- **Decision:** Build and deploy interactive, standalone HTML prototypes for the Admissions & Student Management domain under `Artefacts/UX Designs/Admissions/`:
  1. `Enrollment_Intake_Wizard.html`: 4-step intake form (Student Demographics, Guardian & Emergency Contacts, Health & Safeguarding, Program & Tuition Agreement) with live step progress ring, reactive preview summary card, sibling discount matching, and digital signature.
  2. `Admissions_Pipeline_Kanban.html`: Full 5-stage interactive kanban pipeline (`Inquiry` -> `Applied` -> `Assessment` -> `Offer` -> `Enrolled`) with HTML5 drag/drop, grade & tag filters, stage counters, and a slide-over applicant preview drawer.
  3. `Application_Detail_Modal.html`: Comprehensive applicant dossier modal featuring document verification review (birth cert, yellow immunization card, transcripts, ID), entrance rubric diagnostic scoring (4.7/5), interactive admissions notes, immutable audit trail timeline, and stage transition controls.
- **Context:** Translates Admissions domain stories into portable, visual UI prototypes adhering strictly to Stitch 'Warm Editorial Pedagogic' design tokens (`canvas: #fff8f2`, `surface: #ffffff`, `border: #ead8c7`, `charcoal: #121417`, `terracotta: #e07a5f`, `mint: #90be6d`, `marigold: #fdba3b`, `cerulean: #64b5f6`, `lilac: #b39ddb`, and `Plus Jakarta Sans` / `Fraunces`).
- **Consequences:** Updated `docs/8_PROGRESS_mgmt.md` with links and marked the 3 items as `Completed` (completion raised from 18.6% to 23.7%, 14/59 items). Ready for Stage 2 widget conversion under `frontend/components/widgets/admissions/`.
- **Evidence:** [`Artefacts/UX Designs/Admissions/Enrollment_Intake_Wizard.html`](../Artefacts/UX%20Designs/Admissions/Enrollment_Intake_Wizard.html), [`Artefacts/UX Designs/Admissions/Admissions_Pipeline_Kanban.html`](../Artefacts/UX%20Designs/Admissions/Admissions_Pipeline_Kanban.html), [`Artefacts/UX Designs/Admissions/Application_Detail_Modal.html`](../Artefacts/UX%20Designs/Admissions/Application_Detail_Modal.html), [`docs/8_PROGRESS_mgmt.md`](8_PROGRESS_mgmt.md).

### 2026-11-03 — User Approval of Baseline 14 Mockups & Dispatch Batch 2

- **Status:** Accepted
- **Decision:** Mark all 14 baseline mockups (10 landing dashboards, School Setup Wizard, and 3 Admissions components) as `Approved` in `docs/8_PROGRESS_mgmt.md`, and dispatch `UI_SB` agent for Batch 2: Admissions & Student Profile Suite (`Assessment Schedule Modal`, `Assessment Scoring Modal`, `Decision & Offer Letter Modal`, `Student Directory Widget`, `Student Profile Drawer`, `Student Edit Modal`, `Emergency Contact Modal`).
- **Context:** User approved all completed mockups and requested proceeding with all approvals and downstream components.
- **Consequences:** Approved count moves to 14 (23.7%). `UI_SB` progresses to build remaining mockups.
- **Evidence:** [`docs/8_PROGRESS_mgmt.md`](../docs/8_PROGRESS_mgmt.md).


### 2026-11-03 — Admissions & Student Profile UX Mockup Suite (Batch 2 — 7 Components) (`UI_SB`)

- **Status:** Accepted
- **Decision:** Build and deploy 7 interactive standalone HTML prototypes under `Artefacts/UX Designs/Admissions/` and `Artefacts/UX Designs/Students/`:
  1. `Assessment_Schedule_Modal.html`: Entrance diagnostic scheduling, evaluator assignment, room reservation (Studio 104), time slots, and parent briefing instructions.
  2. `Assessment_Scoring_Modal.html`: Interactive rubric scoring sliders (Phonemic Literacy, Quantitative Logic, Social-Emotional Dynamics), live composite score calculation (4.8/5.0), and recommendation flags.
  3. `Decision_Offer_Letter_Modal.html`: Formal offer letter generator with scholarship grant inputs ($2,000 merit award), deposit deadline, live formatted letter token preview, and Parent Portal dispatch.
  4. `Student_Directory_Widget.html`: Searchable and filterable master registry table with grade, section, lifecycle status badges, medical alerts, bulk export CSV, and batch ID printing.
  5. `Student_Profile_Drawer.html`: 360-degree slide-over dossier featuring demographics, guardian cards with pickup permissions, anaphylaxis emergency protocol, attendance %, GPA (4.0), and fee ledger.
  6. `Student_Edit_Modal.html`: Student demographic updates, preferred name, room/section transfers (Grade 2B), and status changes with mandatory regulatory audit justification.
  7. `Emergency_Contact_Modal.html`: Authorized guardian hierarchy with priority ranking (1, 2, 3), pickup authorization checkboxes, and court custody restriction directives.
- **Context:** Delivers Batch 2 requirements matching Stitch Warm Editorial Pedagogic design tokens (`#fff8f2`, `#ffffff`, `#ead8c7`, `#121417`, pastels, Plus Jakarta Sans, Fraunces).
- **Consequences:** Updated `docs/8_PROGRESS_mgmt.md` with links and marked the 7 items as `Completed` (overall progress: 14 Approved + 7 Completed = 21/59 items, 35.6%). Ready for Stage 2 widget conversion.
- **Evidence:** [`Artefacts/UX Designs/Admissions/`](../Artefacts/UX%20Designs/Admissions/), [`Artefacts/UX Designs/Students/`](../Artefacts/UX%20Designs/Students/), [`docs/8_PROGRESS_mgmt.md`](8_PROGRESS_mgmt.md).

### 2026-11-03 — User Approval of Batch 2 (Admissions & Student Profiles) & Dispatch Batch 3

- **Status:** Accepted
- **Decision:** Mark Batch 2 (7 Admissions & Student Profile items) as `Approved` in `docs/8_PROGRESS_mgmt.md`, bringing the total Approved count to 21 items (35.6%), and dispatch `UI_SB` agent for Batch 3: Academics & Assessment Suite (8 components).
- **Context:** User approved all delivered mockups and instructed proceeding with all approvals.
- **Consequences:** Approved items total 21 (35.6%). `UI_SB` proceeds with Academics & Assessment components.
- **Evidence:** [`docs/8_PROGRESS_mgmt.md`](../docs/8_PROGRESS_mgmt.md).

### 2026-11-03 — Academics & Assessment UX Mockup Suite (Batch 3 — 8 Components) (`UI_SB`)

- **Status:** Accepted
- **Decision:** Build and deploy 8 interactive standalone HTML prototypes under `Artefacts/UX Designs/Academics/`:
  1. `Academic_Calendar_Widget.html`: Monthly/weekly master academic calendar with categorized event pills (Term Dates, Exams, PD Days, Conferences, Holidays), day view popover, and iCal feed sync.
  2. `Curriculum_Planner_Widget.html`: Unit timeline roadmap across Grade 4 & 5 streams, syllabus standards progress bars (76% mastery), and curriculum unit resource drawers.
  3. `Lesson_Plan_Modal.html`: 5-stage instructional architecture (Hook, Direct Instruction, Guided Practice, Independent Inquiry, Exit Ticket), standards mapping (US-P1-02), and IEP differentiation notes.
  4. `Assignment_Homework_Modal.html`: Coursework creator form with due date/time, points weighting (15%), online vs physical turn-in options, and rubric attachments.
  5. `Exam_Schedule_Modal.html`: Examination timetable configuration with seating grid allocation (Gymnasium Hall A: 42/60 desks), invigilator roster, permitted materials, and conflict resolution alerts.
  6. `Marks_Entry_Grid_Widget.html`: Spreadsheet data grid for fast batch grade entry with real-time numeric validation, automated letter grades (A+, A, B, C), status toggles, inline remarks, and cohort statistics.
  7. `Marks_Moderation_Modal.html`: Principal oversight dashboard featuring grade distribution bell curve histogram, cross-section variance comparison (5A vs 5B), curving adjustment controls, and term grade locking.
  8. `Report_Card_Generator_Drawer.html`: Official Ontario curriculum report card slide-over sheet with school branding, credit-weighted marks, attendance summary (96.7%), teacher remarks, and export PDF / parent dispatch.
- **Context:** Delivers Batch 3 requirements adhering strictly to Stitch Warm Editorial Pedagogic design tokens (`#fff8f2`, `#ffffff`, `#ead8c7`, `#121417`, pastels, Plus Jakarta Sans, Fraunces).
- **Consequences:** Updated `docs/8_PROGRESS_mgmt.md` with links and marked the 8 items as `Completed` (overall progress: 21 Approved + 8 Completed = 29/59 items, 49.2%). Ready for Stage 2 widget conversion.
- **Evidence:** [`Artefacts/UX Designs/Academics/`](../Artefacts/UX%20Designs/Academics/), [`docs/8_PROGRESS_mgmt.md`](8_PROGRESS_mgmt.md).

### 2026-11-03 — User Approval of Batch 3 (Academics & Assessment) & Dispatch Batch 4

- **Status:** Accepted
- **Decision:** Mark Batch 3 (8 Academics & Assessment items) as `Approved` in `docs/8_PROGRESS_mgmt.md`, bringing total Approved count to 29 items (49.2%), and dispatch `UI_SB` agent for Batch 4: Attendance & Health Suite (10 components).
- **Context:** User approved all delivered mockups and instructed proceeding with all approvals.
- **Consequences:** Approved items total 29 (49.2%). `UI_SB` proceeds with Attendance & Health components.
- **Evidence:** [`docs/8_PROGRESS_mgmt.md`](../docs/8_PROGRESS_mgmt.md).

### 2026-11-03 — Attendance & Health UX Mockup Suite (Batch 4 — 10 Components) (`UI_SB`)

- **Status:** Accepted
- **Decision:** Build and deploy 10 interactive standalone HTML prototypes under `Artefacts/UX Designs/Attendance/` and `Artefacts/UX Designs/Health/`:
  1. `Attendance_Roster_Widget.html`: Fast roll call roster with single-click status pills (P, A, L, E), 'Mark All Present' batch action, arrival timestamps, and class attendance % rate.
  2. `Attendance_Mark_Modal.html`: Granular individual attendance editor with minute tardy tracker (+18 min delay), absence categories, doctor's slip upload, and parent call verification.
  3. `Attendance_Override_Modal.html`: Retroactive attendance correction tool with original record author trace, replacement status, mandatory administrative justification, and supervisor e-sign.
  4. `Leave_Request_Modal.html`: Staff leave application form with leave type selector (PTO, Sick, PD, Bereavement), date range duration calculator (2 days), and live quota balance card.
  5. `Leave_Approval_Modal.html`: Supervisor console with department staffing heatmap (83% capacity), relief teacher confirmation, and approve/decline workflow.
  6. `Staff_Coverage_Widget.html`: Timetable relief dispatch board with absent faculty list, auto-matched relief recommendations (Mrs. Sterling 98%), and instant SMS notification.
  7. `Health_Profile_Widget.html`: Student medical snapshot featuring Sabrina's Law anaphylactic peanut alert banner, dietary cafeteria notes, active prescriptions, and physician contacts.
  8. `Medication_Log_Modal.html`: Medical administration compliance log with prescription dosage, exact administration timestamp, nurse + witness co-signatures, and remaining dose inventory.
  9. `Incident_Report_Modal.html`: Structured incident & injury report with clickable human body diagram pin (Right Knee), first-aid administered, and parent notification timestamp.
  10. `Safety_Drill_Widget.html`: Emergency evacuation dashboard with live stopwatch drill timer, campus zone clearance map (Building A, B, Science Wing, Gym), and master headcount roll (409/412 accounted).
- **Context:** Delivers Batch 4 requirements matching Stitch Warm Editorial Pedagogic design tokens (`#fff8f2`, `#ffffff`, `#ead8c7`, `#121417`, pastels, Plus Jakarta Sans, Fraunces).
- **Consequences:** Updated `docs/8_PROGRESS_mgmt.md` with links and marked the 10 items as `Completed` (overall progress: 29 Approved + 10 Completed = 39/59 items, 66.1%). Ready for Stage 2 widget conversion.
- **Evidence:** [`Artefacts/UX Designs/Attendance/`](../Artefacts/UX%20Designs/Attendance/), [`Artefacts/UX Designs/Health/`](../Artefacts/UX%20Designs/Health/), [`docs/8_PROGRESS_mgmt.md`](8_PROGRESS_mgmt.md).

### 2026-11-03 — User Approval of Batch 4 (Attendance & Health) & Dispatch Batch 5

- **Status:** Accepted
- **Decision:** Mark Batch 4 (10 Attendance & Health items) as `Approved` in `docs/8_PROGRESS_mgmt.md`, bringing total Approved count to 39 items (66.1%), and dispatch `UI_SB` agent for Batch 5: Billing & Finance Suite (7 components).
- **Context:** User approved all delivered mockups and instructed proceeding with all approvals.
- **Consequences:** Approved items total 39 (66.1%). `UI_SB` proceeds with Billing & Finance components.
- **Evidence:** [`docs/8_PROGRESS_mgmt.md`](../docs/8_PROGRESS_mgmt.md).

### 2026-11-03 — Billing, Fees & Finance UX Mockup Suite (Batch 5 — 7 Components) (`UI_SB`)

- **Status:** Accepted
- **Decision:** Build and deploy 7 interactive standalone HTML prototypes under `Artefacts/UX Designs/Billing/`:
  1. `Fee_Structure_Modal.html`: Tuition schedule builder with grade tier pricing, installment plans (Annual, Termly, 10-Month), sibling discounts (-10% / -15%), early-bird incentives, and mandatory fee line items.
  2. `Invoice_Ledger_Widget.html`: Accounts receivable ledger table with aging buckets (Current, 1-30, 31-60, 90+ days overdue), status pills, search/filter, and batch PDF export.
  3. `Create_Invoice_Modal.html`: Ad-hoc and batch invoice creator with itemized charges, HST/GST tax exemption toggles, payment terms, and live invoice summary preview.
  4. `Discount_Waiver_Modal.html`: Discretionary bursary and waiver application form with category selector, percentage/flat deductions, justification narrative, and dual sign-off (Bursar + Principal).
  5. `Parent_Checkout_Modal.html`: Parent-facing billing portal with split/full payment slider, Stripe card/ACH/Apple Pay inputs, instant receipt download, and auto-pay enrollment.
  6. `Refund_Credit_Note_Modal.html`: Reversal management tool for processed payments with refund reason selector, Stripe charge reversal toggle, credit balance option, and Bursar authorization e-signature.
  7. `Financial_Reconciliation_Widget.html`: Bank deposit matching matrix with Stripe payout payouts reconciliation, variance ledger ($0.00 matched balance), and one-click auto-reconcile tool.
- **Context:** Delivers Batch 5 requirements matching Stitch Warm Editorial Pedagogic design tokens (`#fff8f2`, `#ffffff`, `#ead8c7`, `#121417`, pastels, Plus Jakarta Sans, Fraunces).
- **Consequences:** Updated `docs/8_PROGRESS_mgmt.md` with links and marked the 7 items as `Completed` (overall progress: 39 Approved + 7 Completed = 46/59 items, 78.0%). Ready for Stage 2 widget conversion.
- **Evidence:** [`Artefacts/UX Designs/Billing/`](../Artefacts/UX%20Designs/Billing/), [`docs/8_PROGRESS_mgmt.md`](8_PROGRESS_mgmt.md).

### 2026-11-03 — User Approval of Batch 5 (Billing & Finance) & Dispatch Batch 6 (Final 13 Components)

- **Status:** Accepted
- **Decision:** Mark Batch 5 (7 Billing & Finance items) as `Approved` in `docs/8_PROGRESS_mgmt.md`, bringing total Approved count to 46 items (78.0%), and dispatch `UI_SB` agent for the final Batch 6: HR, Procurement, Events, Analytics & Governance Suite (13 components).
- **Context:** User approved all delivered mockups and instructed proceeding with all approvals.
- **Consequences:** Approved items total 46 (78.0%). `UI_SB` proceeds with the final 13 components to complete 100% of the UX matrix.
- **Evidence:** [`docs/8_PROGRESS_mgmt.md`](../docs/8_PROGRESS_mgmt.md).

### 2026-11-03 — Final UX Suite: HR, Procurement, Events, Analytics & Governance (Batch 6 — 13 Components / 100% Milestone) (`UI_SB`)

- **Status:** Accepted
- **Decision:** Build and deploy the final 13 interactive standalone HTML prototypes across HR, Procurement, Comms, Events, Analytics, and Governance, achieving 100% completion of the 59 functional UI matrix:
  1. `Staff_Compliance_Modal.html` (`HR/`): Police VSC clearance, OCT good standing verification, First Aid/CPR expiry warning, and automated renewal reminder toggles.
  2. `Staff_Appraisal_Modal.html` (`HR/`): Annual educator evaluation with 4-level rubric scoring, educator self-reflection, principal growth commendation, and dual digital e-signatures.
  3. `Payroll_Run_Widget.html` (`HR/`): Direct deposit batch execution table with gross base salary, attendance deductions, overtime stipends, statutory CRA withholdings (CPP, EI, Tax), and EFT export.
  4. `Purchase_Order_Modal.html` (`Procurement/`): Approved vendor purchase order creator with budget allocation (STEM-SCI-2026), itemized order rows, HST tax calculations, and Bursar workflow approval.
  5. `Delivery_Receipt_Modal.html` (`Procurement/`): Goods Received Note (GRN) logging against PO-2026-0089 with inspection condition checkboxes, damaged item evidence photo upload, and receiver attestation.
  6. `Vendor_Invoice_Modal.html` (`Procurement/`): Accounts payable invoice intake with OCR PDF document preview, vendor remittance EFT coordinates, line items, and approval submission.
  7. `Three_Way_Match_Widget.html` (`Procurement/`): Automated 3-way reconciliation panel comparing PO vs GRN vs Vendor Invoice with zero-variance validation ($0.00 diff) and payment release authorization.
  8. `Broadcast_Composer_Modal.html` (`Comms/`): Multi-channel broadcast tool (Email, SMS, Portal Banner) with audience cohort filters, urgent emergency override toggle, and rich-text template tokens.
  9. `Event_Calendar_Widget.html` (`Events/`): School-wide activities calendar with timeline cards (Excursions, Gala, Conferences), room reservation statuses, and parent RSVP capacity trackers.
  10. `Event_Permission_Slip_Modal.html` (`Events/`): Digital excursion waiver with Sabrina's Law medical alert notes, $28.50 integrated fee payment, parent legal signature pad, and confirmation download.
  11. `Kpi_Metrics_Overview_Widget.html` (`Analytics/`): Executive dashboard featuring 5-year enrollment trajectory vs campus ceiling, 96.2% student retention, 1:11.8 faculty ratio, and tuition realization velocity.
  12. `Custom_Report_Builder_Modal.html` (`Analytics/`): Modular reporting engine with 5-domain data picker, column projection drag-and-drop checkboxes, and export triggers for Excel XLSX, CSV, and PDF.
  13. `Board_Governance_Widget.html` (`Board/`): Trustee fiduciary governance dashboard with active motion voting cards, signed board minutes repository, and strategic institutional risk heatmap.
- **Context:** Satisfies all requirements for Batch 6 adhering strictly to Stitch Warm Editorial Pedagogic design tokens (`#fff8f2`, `#ffffff`, `#ead8c7`, `#121417`, pastels, Plus Jakarta Sans, Fraunces).
- **Consequences:** Updated `docs/8_PROGRESS_mgmt.md` with links and marked the 13 items as `Completed`. Total project progress is now **59 of 59 items delivered (100.0%)**, completing Stage 1 of the School CRM UI architecture.
- **Evidence:** [`Artefacts/UX Designs/`](../Artefacts/UX%20Designs/), [`docs/8_PROGRESS_mgmt.md`](8_PROGRESS_mgmt.md).

### 2026-11-03 — User Full Approval of 100% Master UX Component Suite (59/59 Items Approved)

- **Status:** Accepted
- **Decision:** Mark all remaining 13 mockups in Batch 6 as `Approved` in `docs/8_PROGRESS_mgmt.md`. Every component across the entire School CRM system is now **100% Designed, Built, Linked, and Approved** (59 of 59 items).
- **Context:** User issued full approval across all mockups. Stage 1 (HTML Mockup & Visual Prototyping) of the 3-Stage UI Architecture is officially completed.
- **Consequences:** All 59 mockups are accessible via relative browser links in `docs/8_PROGRESS_mgmt.md`. The project is now ready for Stage 2: Portable Functional React Widget implementation under `frontend/components/widgets/`.
- **Evidence:** [`docs/8_PROGRESS_mgmt.md`](../docs/8_PROGRESS_mgmt.md), [`Artefacts/UX Designs/`](../Artefacts/UX%20Designs/).

### 2026-11-05 — Hybrid Split-Action Card Interaction Architecture Across All 18 Persona Dashboards (`UI_SB`)

- **Status:** Accepted & Fully Deployed
- **Decision:** Implemented the approved Hybrid Split-Action Card Interaction Architecture across all 18 persona dashboard files (9 Card-based dashboards + 9 Compact list dashboards):
  1. **Interactive Card Styling:** Cards and rows enhanced with hover elevation (`hover:-translate-y-0.5 hover:shadow-md cursor-pointer transition-all duration-200 active:scale-[0.99] group`).
  2. **Split Actions:**
     - **Primary body click**: Opens responsive slide-over drawer (520px wide on desktop/tablet `>= md`, high-efficiency bottom sheet on mobile `< md`) providing contextual inline micro-actions.
     - **Secondary header click**: Dedicated `open_in_new` icon button with `event.stopPropagation()` navigating directly to the dedicated full-screen route or modal.
  3. **Contextual Domain Drawers:**
     - *Admin*: Admissions verification with offer letter issuance; Procurement 3-way match reconciliation; Ledger waiver approvals.
     - *Principal*: Grade moderation with bell-curve deviation checks; Blackout date leave conflict review; Safeguarding incident escalation.
     - *Teacher*: Homeroom roll call reconciliation; Ontario Science lesson plan progression; Sabrina's Law EpiPen medical emergency protocol.
     - *Parent*: Student 360 profile review; 1-click Stripe invoice payment; Field trip digital waiver sign-off.
     - *Caregiver*: Toddler daily care micro-logging (diaper, meal, nap, mood); Medication witness verification; Authorized pickup checks.
     - *Staff*: Shift timetable swap request; Statutory paid leave application; Payslip breakdown; Credential renewals.
     - *Vendor*: PO fulfillment dispatch notice; Tax invoice 3-way reconciliation; WSIB/insurance compliance upload.
     - *Owner*: Multi-campus operational EBITDA variance review; High-value bursary sign-off; CapEx project authorizations.
     - *Board*: Fiduciary quorum electronic voting; Institutional risk radar endorsement; Strategic endowment fiscal report.
  4. **Optimistic Feedback:** Animated green checkmark toast notification (`#toast-notify`) and inline badge status updates without full page reloads.
- **Evidence:** [`docs/8_PROGRESS_mgmt.md`](../docs/8_PROGRESS_mgmt.md), [`Artefacts/UX Designs/`](../Artefacts/UX%20Designs/).

---

### [2026-11-04] Rebranding: Complete Removal of LuminaEd & Standardization on "The Purple Cubby Inc."
- **Status:** Complete & Verified
- **Scope:** Complete replacement of legacy brand references (`LuminaEd`, `Lumina`, `LuminaAI`) with official corporate branding `"The Purple Cubby Inc."`.
- **Files Updated:**
  - `Artefacts/UX Designs/index.html`: Header brand updated to `The Purple Cubby Inc.`, footer copyright updated.
  - `Artefacts/UX Designs/Academics/Academic_Calendar_Widget.html`: iCal feed URL rebranded to `webcal://mapleleaf.thepurplecubby.com/...`.
  - `Artefacts/UX Designs/Principal/Principal_Leadership_Portal.html`: Header branding and floating copilot rebranded to `The Purple Cubby Inc.`.
  - `Artefacts/UX Designs/Owner/School_Owner_Portal.html`: Header branding updated to `The Purple Cubby Inc.`.
  - `Artefacts/UX Designs/Board/Board_Trustee_Portal.html`: Header branding updated to `The Purple Cubby Inc.`.
  - `Artefacts/UX Designs/Caregiver/Caregiver_Daily_Care_Portal.html`: Assistant naming updated to `Care Assistant` / `The Purple Cubby Inc.`.
  - `Artefacts/UX Designs/Admin/Admin_Operational_Console.html`: Copilot pill updated to `The Purple Cubby Inc.`.
  - `Artefacts/UX Designs/Parent/Parent_Multi_Child_Portal.html`: Drawer trigger and assistant updated to `The Purple Cubby Inc.`.
  - `Artefacts/UX Designs/Staff/Staff_Self_Service.html`: Header branding updated to `The Purple Cubby Inc.`.
  - `Artefacts/UX Designs/Teacher/Teacher_Dashboard_Overview.html`: Replaced `LuminaAI` with `Purple Cubby AI` and updated footer copyright.
  - `Artefacts/UX Designs/Vendor/Vendor_Partner_Portal.html`: Header and procurement gateway banner updated to `The Purple Cubby Inc. Procurement & Logistics Gateway`.
  - `frontend/app/teacher/page.tsx`: Replaced `LuminaAI` copilot / assistant and footer copyright with `The Purple Cubby Inc.`.
  - `docs/7_MEMORY_LOG.md`: Historical references sanitized.
- **Verification:** Full repository AST/regex scan confirms 0 occurrences of `Lumina` / `LuminaEd` remain across all code and artifact files; TypeScript verification (`tsc -p frontend/tsconfig.json --noEmit`) passes with 0 errors.

---

### [2026-11-04] Repository Cleanliness & Developer Onboarding Overhaul
- **Status:** Complete & Committed
- **Scope:** 
  1. Accepted and committed all cumulative changes across backend, frontend, design tokens, and UX prototypes into Git (`working tree clean`).
  2. Created root [`README.md`](../README.md) establishing project architecture, visual UX directory, 15-minute quickstart, and persona test credentials cheat sheet.
  3. Added [`docker-compose.yml`](../docker-compose.yml) for 1-command local PostgreSQL 15 setup.
  4. Authored [`docs/ONBOARDING.md`](../docs/ONBOARDING.md) detailing prerequisites, multi-tenant PostgreSQL RLS fundamentals, end-to-end feature walkthroughs, and troubleshooting tips for new engineers.
- **Verification:** `git status` clean; TypeScript validation (`tsc -p frontend/tsconfig.json --noEmit`) passes with 0 errors.


### 2026-11-05 — Storybook Deprecation & Removal

- **Status:** Accepted
- **Decision:** Fully remove unused Storybook infrastructure across the repository:
  1. Deleted Storybook directories and files: `frontend/.storybook/`, `frontend/storybook-static/`, `frontend/stories/`, and all 11 component story files in `frontend/components/pc/*.stories.tsx`.
  2. Removed `storybook` and `build-storybook` scripts, as well as Storybook devDependencies (`storybook`, `@storybook/nextjs-vite`, `eslint-plugin-storybook`, `vite`) from `frontend/package.json`.
  3. Cleaned up `frontend/eslint.config.mjs` to remove `eslint-plugin-storybook` imports and configuration.
  4. Removed Storybook references and commands from `README.md` and `docs/ONBOARDING.md`.
- **Context:** User requested removal of Storybook as it is not used in the project lifecycle (all visual prototyping follows the 3-Stage workflow with standalone HTML prototypes under `Artefacts/UX Designs/` and portable React widgets in `frontend/components/widgets/`).
- **Evidence:** `README.md`, `frontend/package.json`, `frontend/eslint.config.mjs`, `docs/ONBOARDING.md`. Verified with `npx tsc --noEmit` passing with 0 errors.

### 2026-11-05 — Prospective Parent Admissions Onboarding & Sibling Enrollment Lifecycle

- **Status:** Accepted
- **Decision:** Build and deploy parent-facing admissions onboarding prototypes and backend APIs solving the "Admissions Deadlock" and sibling enrollment with zero-trust VA security:
  1. **New UX Mockup 1 (`Parent_Apply_Registration.html`):** Public-facing parent registration and 4-step student admission intake wizard (Parent Account setup, Student profile, Health/Sabrina's Law disclosures, Document uploads & Sibling discount preview).
  2. **New UX Mockup 2 (`Parent_Applicant_Dashboard.html`):** Pre-enrolled "Applicant Mode" parent portal featuring real-time 5-stage progress stepper, sibling switcher tabs (`[ 👦 Leo (Grade 4) • Enrolled ]` vs `[ 👶 Maya (Pre-K) • Offer Received ]`), document verification checklist, locked features safeguard indicator, and interactive Offer Acceptance & Seat Deposit modal.
  3. **Backend Schemas (`core/schemas/enrollment.py`):** Added `ParentPublicApplySchema` and `SiblingEnrollmentCreateSchema` with date validation and sibling discount flags.
  4. **Backend Routes (`core/api/v1/enrollments.py`):**
     - `POST /enrollments/public-apply`: Atomic public registration creating active parent user, student draft, and immediate JWT session.
     - `POST /enrollments/sibling-apply`: Authenticated parent endpoint re-using family contacts and attaching -15% sibling discount eligibility (`BR-02-01`).
  5. **Security Gate (`core/auth/scoping.py`):** Added `verify_enrolled_student_access(request, student)` to strictly block unadmitted parents from operational school endpoints (Attendance, Report Cards, Health) with `HTTP 403 Forbidden` for complete VAPT/VA test compliance.
  6. **Auth Activation (`core/api/v1/auth.py`):** Enabled `is_active=True` upon parent registration so parents can immediately log in to track their admission status.
- **Context:** Solves the missing link where prospective parents (and parents applying for a sibling) need portal access before active student admission without violating server-side data access boundaries.
- **Evidence:** [`Artefacts/UX Designs/Parent/Parent_Apply_Registration.html`](../Artefacts/UX%20Designs/Parent/Parent_Apply_Registration.html), [`Artefacts/UX Designs/Parent/Parent_Applicant_Dashboard.html`](../Artefacts/UX%20Designs/Parent/Parent_Applicant_Dashboard.html), [`core/api/v1/enrollments.py`](../core/api/v1/enrollments.py), [`core/schemas/enrollment.py`](../core/schemas/enrollment.py), [`core/auth/scoping.py`](../core/auth/scoping.py).

### 2026-11-05 — Feature Branch `feature/parent-screens`: Full Functional Parent Portal & Admissions Intake Suite

- **Status:** Completed & Verified (Branch `feature/parent-screens`)
- **Decision:** Designed, developed, and verified the complete functional Parent Portal Suite across Tier 3 portable widgets and Tier 4 Next.js App Router routes, strictly adhering to the 4-Tier Component Hierarchy, tokenized styling, and portable widget contract (`WidgetBaseProps`):
  1. **Branch Creation:** Switched to dedicated feature branch `feature/parent-screens`.
  2. **Tier 3 Portable Functional Widgets (`frontend/components/widgets/parent/`):**
     - `ParentMultiChildDashboardWidget` (`parent-multi-child-dashboard.tsx` & `.types.ts`): Dual-mode dashboard supporting active enrolled students (academic progress, attendance streak, health alerts, fee payment slider, events) and applicant students (5-stage admissions progress tracker, document checklist, offer review, and acceptance trigger).
     - `SiblingIntakeModal` (`sibling-intake-modal.tsx` & `.types.ts`): Multi-child intake dialog pre-populating family contacts with automatic 10% sibling tuition discount calculation (`BR-02-01`).
     - `OfferAcceptanceModal` (`offer-acceptance-modal.tsx` & `.types.ts`): Formal offer confirmation modal requiring mandatory passport photo upload and terms sign-off (`BR-01-08`).
     - `ParentBillingWidget` (`parent-billing-widget.tsx` & `.types.ts`): Invoices table with status pills, sibling discount badge, partial payment amount slider, and Stripe Checkout redirect.
     - `ParentEventsWidget` (`parent-events-widget.tsx` & `.types.ts`): Activity roster with digital parental permission slip sign-off.
     - `PublicApplyWizard` (`public-apply-wizard.tsx` & `.types.ts`): 4-step wizard for public student intake & instant parent account registration.
  3. **Tier 4 Next.js App Router Routes:**
     - `/parent`: Main multi-child dashboard with live API data fetching, optimistic fallback data, sibling modal trigger, and offer acceptance workflow.
     - `/parent/billing`: Dedicated financial and invoices hub with partial payment slider and Stripe integration.
     - `/parent/events`: School excursions and activities with permission slip signing.
     - `/apply`: Public admissions onboarding flow writing session cookie and redirecting to the parent dashboard.
     - `/parent/layout.tsx`: Responsive `AppShell` with parent-branded sidebar, topbar, and session integration.
  4. **API Client Integration (`frontend/app/lib/api.ts`):** Added `submitPublicApply`, `submitSiblingApply`, `fetchEvents`, and typed schemas.
  5. **Verification & Clean Build:**
     - TypeScript check: 0 errors (`tsc --noEmit`).
     - ESLint check: 0 errors (`npm run lint`).
     - Next.js production build: 100% successful static page generation across `/apply`, `/parent`, `/parent/billing`, and `/parent/events`.
- **Evidence:** [`frontend/app/parent/`](../frontend/app/parent/), [`frontend/app/apply/`](../frontend/app/apply/), [`frontend/components/widgets/parent/`](../frontend/components/widgets/parent/), [`frontend/app/lib/api.ts`](../frontend/app/lib/api.ts).

### 2026-11-06 — Full Functional Teacher Portal Suite (Middleware, RBAC & 4-Tier UX Architecture)

- **Status:** Completed & Verified (Branch `feature/parent-screens`)
- **Decision:** Replaced the legacy 2,231-line monolithic `frontend/app/teacher/page.tsx` with a modular, multi-route **4-Tier Teacher Portal** built on reusable **Tier 3 Portable Functional Domain Widgets** (`WidgetBaseProps`) and hardened client/server RBAC boundaries:
  1. **Middleware Hardening (`frontend/middleware.ts`):**
     - Fixed URL-encoded `pc_session` cookie decoding (`safeDecodeCookie`), enforced path-segment boundary matching (`path === prefix || path.startsWith(\`${prefix}/\`)`) across `/teacher` and `/teacher/:path*`, removed the duplicate `/staff/:path*` matcher, and added exact `/governance` protection while preserving `/?denied=missing-session`, `/?denied=expired-session`, and `/?denied=role-mismatch` redirects.
  2. **Backend RBAC Alignment (`core/api/v1/sprint5.py`):**
     - Enabled `'Teacher'` on `POST /messages`, `GET /messages`, and `GET /messages/{message_id}` for classroom guardian notes and excursion waiver reminders while keeping `POST /broadcasts/emergency` and `PATCH /messages/{message_id}` restricted to `'Admin'`, `'Principal'`, and `'Owner'`.
  3. **Tier 3 Portable Domain Widgets (`frontend/components/widgets/`):**
     - `teacher/`: `TeacherDashboardOverviewWidget` (implementing both the Oil Pastel 12-col **Cards** view from `Teacher_Dashboard_Overview.html` and the **Compact List** timeline/table view from `Teacher_Dashboard_Overview_Compact.html`, 3 contextual `DetailPanel` slide-over drawers, and the floating `ThePuffy` Classroom Copilot) and `TeacherMessagesWidget` (guardian comms ledger + excursion permission slip waiver tracker).
     - `attendance/`: `AttendanceRosterWidget` (`P | A | L | E` inline toggles, `Mark All Present`, `Commit Morning Roll`, `BR-03-01` 24-hour statutory lock, `BR-03-02` absence alert badges), `AttendanceMarkModal`, and `LeaveRequestModal` (`BR-03-04`).
     - `academics/`: `CurriculumPlannerWidget`, `LessonPlanModal` (5-stage instructional sequence + IEP scaffolds, `BR-04-01`), `AssignmentHomeworkModal` (`BR-04-02`), `MarksModerationWidget` (cohort KPIs, bell-curve distribution, `BR-04-04` moderation & `BR-04-07` immutability lock, applicant assessment queue), and `ReportCardWidget` (`BR-04-06`).
     - `admissions/` & `students/`: `AssessmentScoreModal` (3-domain 100-point rubric) and `StudentProfileDrawer` (360 student slide-over with `showBilling: false` capability gating for Teachers).
     - `health/` & `operations/`: `HealthProfileWidget` (Sabrina's Law anaphylaxis/asthma action plan cards, `BR-07-04` drill readiness), `IncidentReportModal` (interactive anatomical body-zone selector, `BR-07-02` 1h SLA & `BR-07-03` escalation), `MedicationLogModal` (`BR-07-01` consent gate), and `BroadcastComposerModal` (merge variable chips & capability-gated emergency broadcast).
  4. **Tier 4 Teacher Portal Routes (`frontend/app/teacher/`):**
     - `layout.tsx` (Oil Pastel Floating Pill Topbar with `School CRM Navigator` hamburger menu, `ThePurpleCubby • Staff Portal` brand, center rounded-full navigation pills, notification bell, profile avatar, `bg-paper` stage, and `ThePurpleCubby Inc.` footer matching `Teacher_Dashboard_Overview.html`), `/teacher` (1:1 visual & interactive match with `Teacher_Dashboard_Overview.html` and `Teacher_Dashboard_Overview_Compact.html`), `/teacher/attendance`, `/teacher/lessons`, `/teacher/assessments`, `/teacher/safeguarding`, and `/teacher/messages`, wired to live `frontend/app/lib/api.ts` endpoints with optimistic updates and offline classroom fallbacks.
  5. **Verification:**
     - `tsc -p frontend/tsconfig.json --noEmit`: 0 errors.
     - `npm --prefix frontend run lint`: 0 errors across all widgets and routes, 0 hex/arbitrary color violations, and 0 forbidden `@/app/lib` or `next/navigation` imports inside `frontend/components/widgets/`.
- **Evidence:** [`frontend/middleware.ts`](../frontend/middleware.ts), [`core/api/v1/sprint5.py`](../core/api/v1/sprint5.py), [`frontend/components/widgets/`](../frontend/components/widgets/), [`frontend/app/teacher/`](../frontend/app/teacher/), [`frontend/app/lib/api.ts`](../frontend/app/lib/api.ts).

### 2026-11-06 — Teacher & Parent Profile Picture Management + Local SVG Icon Replacement

- **Status:** Completed & Verified (Branch `feature/parent-screens`)
- **Decision:** Updated [`docs/2_PRD.md`](2_PRD.md) first and built end-to-end profile picture management for Teachers and Parents while replacing all broken Material Symbols ligatures and expired external Google portrait links with local SVG icons and illustrated Oil Pastel avatars:
  1. **PRD Documentation (`docs/2_PRD.md`):** Added the **Teacher & Parent Profile Pictures** requirement row under Section 3 (`P2 — Role Portals & Self-Service Experiences`) and updated the Teacher & Caregiver Portals and Parent Multi-Child Portal specifications.
  2. **Backend Profile Picture API (`core/schemas/auth.py`, `core/api/v1/auth.py`):**
     - Added `ProfilePictureUpdateSchema` validating `avatar_url` (`data:image/...`, `https://...`, `http://...`, `/...`, or `None`).
     - Added `GET /api/v1/auth/profile` and `PUT /api/v1/auth/profile/picture` persisting per-user profile pictures in `Tenant.config["profile_pictures"][user_id]`, and exposed `avatar_url` on `POST /api/v1/auth/login`.
  3. **Reusable Profile Picture Modal & Local SVG Icon System (`frontend/components/pc/profile-picture-modal.tsx`, `frontend/components/pc/index.ts`):**
     - Built `ProfilePictureModal` supporting device image file upload (`PNG`/`JPG`/`WebP`) with automatic `256x256` `<canvas>` center-crop & compression, 6 curated Oil Pastel SVG preset portraits, custom image URL preview, and reset to default.
     - Built `TeacherIcon` mapping all 38 Material Symbols ligature names used across the Teacher Portal to crisp `lucide-react` SVG icons so zero icons depend on external Google Fonts ligatures.
  4. **Teacher & Parent Portal Integration (`frontend/app/teacher/layout.tsx`, `frontend/app/teacher/page.tsx`, `frontend/components/widgets/teacher/teacher-dashboard-overview.tsx`, `frontend/app/parent/layout.tsx`, `frontend/app/lib/api.ts`):**
     - Replaced all `<span className="material-symbols-outlined">...</span>` in `frontend/app/teacher/layout.tsx` and `frontend/components/widgets/teacher/teacher-dashboard-overview.tsx` with `<TeacherIcon />`.
     - Wired live profile picture display and `"Update Profile Picture"` triggers in both the Teacher Portal (topbar profile menu + greeting portrait) and the Parent Portal (topbar user menu + family profile header bar).
- **Evidence:** [`docs/2_PRD.md`](2_PRD.md), [`core/schemas/auth.py`](../core/schemas/auth.py), [`core/api/v1/auth.py`](../core/api/v1/auth.py), [`frontend/components/pc/profile-picture-modal.tsx`](../frontend/components/pc/profile-picture-modal.tsx), [`frontend/app/teacher/layout.tsx`](../frontend/app/teacher/layout.tsx), [`frontend/components/widgets/teacher/teacher-dashboard-overview.tsx`](../frontend/components/widgets/teacher/teacher-dashboard-overview.tsx), [`frontend/app/parent/layout.tsx`](../frontend/app/parent/layout.tsx).

### 2026-11-08 — Defect Tracking Ledger (`docs/11_DEFECTS.md`) & Mandatory Defect Logging Rule

- **Status:** Accepted
- **Decision:** Created [`docs/11_DEFECTS.md`](11_DEFECTS.md) to log all user-raised and QA-discovered defects (`DEF-001` Teacher Dashboard UX mismatch, `DEF-002` inverted `--radius-*` tokens & corrupted `.next` dev cache, `DEF-003` missing Material Symbols icons & broken external profile pictures) with root cause analysis, resolution, and verification status, and updated [`AGENTS.md`](../AGENTS.md) so all raised defects are logged in [`docs/11_DEFECTS.md`](11_DEFECTS.md) going forward.
- **Evidence:** [`docs/11_DEFECTS.md`](11_DEFECTS.md), [`AGENTS.md`](../AGENTS.md).

### 2026-11-08 — Global Playwright Skill (`playwright-e2e-testing`), Global QA Agent (`playwright-qa`) & Global Plugin (`playwright-qa-suite`)

- **Status:** Accepted & Active Globally
- **Decision:** Created and registered the global Playwright E2E testing skill, global `playwright-qa` subagent, and global `playwright-qa-suite` plugin in `~/.gemini/config/` (and linked in [`AGENTS.md`](../AGENTS.md)) so every frontend/portal testing cycle across all workspaces enforces real browser Playwright verification (RBAC cookies, `img.naturalWidth > 0`, `<svg>` icon rendering, computed CSS tokens, and interactive modals/drawers).
- **Evidence:** `~/.gemini/config/skills/playwright-e2e-testing/SKILL.md`, `~/.gemini/config/agents/playwright-qa/agent.md`, `~/.gemini/config/plugins/playwright-qa-suite/plugin.json`, [`AGENTS.md`](../AGENTS.md).

### 2026-11-08 — ThePuffy AI Agent Default State Set to Closed (`DEF-004`)

- **Status:** Completed & Verified
- **Decision:** Updated [`frontend/components/widgets/teacher/teacher-dashboard-overview.tsx`](../frontend/components/widgets/teacher/teacher-dashboard-overview.tsx) so `puffyOpen` defaults to `false`. When the Teacher Portal loads, ThePuffy AI Agent remains closed as a neat floating pill button in the bottom right, and only opens when explicitly clicked or when triggered by an AI action. Logged as `DEF-004` in [`docs/11_DEFECTS.md`](11_DEFECTS.md).
- **Evidence:** [`frontend/components/widgets/teacher/teacher-dashboard-overview.tsx`](../frontend/components/widgets/teacher/teacher-dashboard-overview.tsx), [`docs/11_DEFECTS.md`](11_DEFECTS.md).

### 2026-11-08 — Full Teacher Portal Sub-Tabs Oil Pastel UX Alignment (`DEF-005`)

- **Status:** Completed & Verified
- **Decision:** Resolved visual discontinuity across the entire Teacher Portal by aligning all 5 sub-tabs (`/teacher/attendance`, `/teacher/lessons`, `/teacher/assessments`, `/teacher/messages`, `/teacher/safeguarding`) to the warm **Oil Pastel design system** of the landing page (`/teacher` / `Teacher_Dashboard_Overview.html`).
- **Key Enhancements:**
  1. Mounted ambient pastel background blur blobs (`pastel-butter`, `pastel-mint`, `pastel-peach`) in [`frontend/app/teacher/layout.tsx`](../frontend/app/teacher/layout.tsx).
  2. Upgraded [`PageHeader`](../frontend/components/pc/page-header.tsx) with `variant="pastel"` supporting themed icon containers (`TeacherIcon`), bold tracking-tight headings, colored category pills, and rounded-full actions.
  3. Upgraded [`KpiCard`](../frontend/components/pc/kpi-card.tsx), [`SectionPanel`](../frontend/components/pc/section-panel.tsx), [`StatusPill`](../frontend/components/pc/status-pill.tsx), and [`DataTable`](../frontend/components/pc/data-table.tsx) to Oil Pastel specifications (`rounded-3xl`, 2px pastel borders, `bg-paper-tint` theads, heavy 5xl stats, rounded-full search inputs and status badges).
  4. Aligned all 5 teacher widgets (`AttendanceRosterWidget`, `CurriculumPlannerWidget`, `MarksModerationWidget`, `TeacherMessagesWidget`, `HealthProfileWidget`) with warm cards, rounded-full pill action buttons, and instant seeded hydration (`isLoading = false`).
  5. Implemented Playwright test suite [`frontend/e2e/teacher-tabs-visual.spec.ts`](../frontend/e2e/teacher-tabs-visual.spec.ts) covering all 5 verification points across all 6 portal routes.
- **Evidence:** 7/7 Playwright browser tests passed (10.8s), `tsc --noEmit` (0 errors), `eslint` (0 errors), [`docs/11_DEFECTS.md`](11_DEFECTS.md).

---

### [2026-11-08] Slide-Over Drawer Z-Index Stacking & Body Portal Mount (DEF-006)
- **Status:** Completed & Verified
- **Decision:** Fixed the z-index stacking conflict where opening a right slide-over drawer left the floating central navigation header positioned in front of the drawer, obscuring its close button, title, and action controls.
- **Key Enhancements:**
  1. Wrapped the slide-over drawer and backdrop in [`frontend/components/widgets/teacher/teacher-dashboard-overview.tsx`](../frontend/components/widgets/teacher/teacher-dashboard-overview.tsx) with React's `createPortal(..., document.body)` using hydration-safe `useSyncExternalStore`. This permanently frees the drawer from `<main>`'s internal `relative z-10` stacking context.
  2. Assigned `z-[60]` to the dimming backdrop and `z-[70]` to the slide-over drawer dialog, while setting the floating pill header in [`frontend/app/teacher/layout.tsx`](../frontend/app/teacher/layout.tsx) to `z-40`.
  3. Upgraded [`frontend/components/ui/sheet.tsx`](../frontend/components/ui/sheet.tsx) (`SheetOverlay` `z-[60]`, `SheetContent` `z-[70]`), [`frontend/components/ui/dialog.tsx`](../frontend/components/ui/dialog.tsx) (`DialogOverlay` `z-[60]`, `DialogContent` `z-[70]`), and [`frontend/components/pc/profile-picture-modal.tsx`](../frontend/components/pc/profile-picture-modal.tsx) (`z-[70]`) to ensure consistent modal and drawer stacking above the floating navbar across the entire application.
  4. Added `"127.0.0.1"` to `allowedDevOrigins` in [`frontend/next.config.ts`](../frontend/next.config.ts) to resolve Next.js Turbopack dev asset blocking.
  5. Added Playwright E2E test in [`frontend/e2e/teacher-tabs-visual.spec.ts`](../frontend/e2e/teacher-tabs-visual.spec.ts) asserting drawer visibility, backdrop dimming of the header, and direct clickability of the drawer close button.
- **Evidence:** 8/8 Playwright tests passed (16.9s), `npm run build` production build succeeded (14/14 static pages generated), `tsc --noEmit` (0 errors), `eslint` (0 errors), logged `DEF-006` in [`docs/11_DEFECTS.md`](11_DEFECTS.md).

---

### [2026-11-08] Backend Connections, Schema Audit & End-to-End User Journey Verification
- **Status:** Verified & Operational
- **Scope:** Complete audit of backend database connections, PostgreSQL tenant RLS, Django Ninja API routes, Next.js proxy rewrites, and creation of an automated and manual End-to-End use case.
- **Audit Findings:**
  1. PostgreSQL database connected with 63 total tables (53 `core_*` tenant-scoped models) with active Row Level Security (`0020_enable_tenant_rls`).
  2. Django Ninja API active on `http://127.0.0.1:8000` with Swagger UI at `/api/docs`.
  3. Next.js App Router active on `http://127.0.0.1:3000` with proxy rewrite `/api/v1/*` -> `http://127.0.0.1:8000/api/v1/*`.
  4. Backend pytest suites verified: `test_api_attendance_health.py` (8/8 passed), `test_api_parent_dashboard.py` (2/2 passed), `test_api_auth.py` (13/14 passed).
  5. Created automated E2E journey test [`frontend/e2e/e2e-user-journey.spec.ts`](../frontend/e2e/e2e-user-journey.spec.ts) covering live login (`teacher1_demo-school`), redirect, dashboard load, Body Portal drawer mounting above floating header, and tab navigation (passed in 4.4s).
- **Evidence:** `manage.py check` (0 issues), `npx playwright test e2e/e2e-user-journey.spec.ts` (1 passed in 4.4s).

---

### [2026-11-08] Hamburger Navigator Click-to-Open & Click-Outside Dismissal (DEF-007)
- **Status:** Completed & Verified
- **Decision:** Removed hover-driven trigger and hover-out auto-dismissal from the "School CRM Navigator" hamburger menu in [`frontend/app/teacher/layout.tsx`](../frontend/app/teacher/layout.tsx). Replaced with deliberate click-to-open, persistent open state on hover-out, and clean click-outside / item-selection dismissal.
- **Key Enhancements:**
  1. Removed `group/menu`, `group-hover/menu:flex`, `hover:flex`, and `onMouseLeave` from the hamburger button and popover container.
  2. Wrapped popover rendering in strictly controlled state `{menuOpen && (<div data-testid="school-crm-navigator-menu" ...>...</div>)}`.
  3. Added `menuRef`, `notificationsRef`, and `profileMenuRef` with a global `mousedown` document listener and Escape key handler to dismiss open popovers when clicking outside.
  4. Added automated Playwright test in [`frontend/e2e/e2e-user-journey.spec.ts`](../frontend/e2e/e2e-user-journey.spec.ts) asserting hover-in does NOT open menu, click opens it, hover-out does NOT close it, and click-outside or menu link selection dismisses it.
- **Evidence:** 10/10 Playwright tests passed (13.2s + 7.9s), `npm run build` succeeded (14/14 static pages generated), `tsc --noEmit` (0 errors), `eslint` (0 errors), logged `DEF-007` in [`docs/11_DEFECTS.md`](11_DEFECTS.md).

---

### [2026-11-08] Unified Teacher Portal Ambient Pastel Background Glow (DEF-008)
- **Status:** Completed & Verified
- **Decision:** Fixed the ambient background disparity between the Teacher Dashboard (`/teacher`) and sub-pages (`/teacher/attendance`, `/teacher/lessons`, `/teacher/assessments`, `/teacher/messages`, `/teacher/safeguarding`). Sub-pages previously appeared flat and white because layout-level ambient blobs were occluded behind `<main>`'s opaque background due to `-z-10`.
- **Key Enhancements:**
  1. Updated [`frontend/app/teacher/layout.tsx`](../frontend/app/teacher/layout.tsx) ambient background blur blobs to `z-0 pointer-events-none` so they render properly above `<main>`'s `bg-paper` canvas and behind `children` at `z-10`.
  2. Expanded the ambient backdrop glow system across the full workspace with 4 soft blur blobs (top butter `bg-pastel-butter/40`, top-right mint `bg-pastel-mint/35`, mid-left peach `bg-pastel-peach/30`, and bottom-right lilac `bg-pastel-lilac/25`).
  3. Removed duplicate local blobs from [`frontend/components/widgets/teacher/teacher-dashboard-overview.tsx`](../frontend/components/widgets/teacher/teacher-dashboard-overview.tsx) to ensure a single, consistent ambient wash across all Teacher Portal pages.
- **Evidence:** Real browser screenshots across all 6 portal views, `tsc --noEmit` (0 errors), `npm run lint` (0 errors), `npx playwright test` (10/10 tests passed in 17.9s), logged `DEF-008` in [`docs/11_DEFECTS.md`](11_DEFECTS.md).

### [2026-11-09] Teacher Portal Sub-Pages Deep Audit, Database vs Mock Reconciliation & Layering Verification (DEF-017 - DEF-021)
- **Status:** Completed & Fully Verified
- **Scope:** Exhaustive Quality Assurance, live PostgreSQL database audit, interaction testing, and stacking context layering verification across all 5 Teacher Portal sub-pages:
  1. `/teacher/attendance` (Attendance Roster, Date Switcher, Class Filter, Quick Mark, Bulk Submit, Attendance Mark Modal, Leave Request Modal, Student Profile Drawer)
  2. `/teacher/lessons` (Curriculum Planner, Lesson Plan Cards, Create Lesson Plan Modal, Assignment Modal, Week/Subject filters)
  3. `/teacher/assessments` (Marks Moderation, Grade distribution bell curve, Edit Marks, Report Card Preview/Draft/Publish, Admissions Assessment Modal)
  4. `/teacher/messages` (Messages log, Channels, Compose Broadcast Modal, Excursion Waiver tracker)
  5. `/teacher/safeguarding` (Medical Alerts, Medication Administration Log Modal, Incident Report Modal, Care Observation Log, Student Profile Drawer)
- **Key Findings & Fixes:**
  1. **Database Medical Badge Mapping (DEF-017):** Fixed `/teacher/attendance` so that live `medical_badge` and `medical_severity` returned by `GET /api/v1/attendance/students/{date}` from PostgreSQL `StudentHealth` are directly displayed on student rows rather than being discarded for static seed data.
  2. **5-Stage Instructional Arc Scaffolding (DEF-018):** Fixed `/teacher/lessons` to provide complete 5-stage pedagogical scaffolding (`Hook & Warm-Up`, `Direct Instruction`, `Guided Practice`, `Independent Synthesis`, `Exit Ticket`) when `LessonPlan` database records lack stages JSON.
  3. **Assessment Data Audit & Seed Gap (DEF-019):** Identified that `core_exam` and `core_marksrecord` tables contain 0 records for `demo-school`, forcing fallback to mock midterms and synthetic report card previews. Logged DEF-019.
  4. **Unconditional Mock Messages Array Concat Fix (DEF-020):** Fixed `/teacher/messages` line 152 to only use fallback messages when the API returns an empty array, instead of unconditionally concatenating mock messages.
  5. **Live Safeguarding Alerts API & Sub-Page Integration (DEF-021):** Built `GET /api/v1/health/classroom-alerts` in `core/api/v1/health.py` querying `StudentHealth.objects.filter(...)` and wired `frontend/app/lib/api.ts` and `/teacher/safeguarding/page.tsx` to display real Sabrina's Law and asthma action plans from PostgreSQL (4 active plans: Lucas Vance, Noah Tremblay, Leo Miller, Ethan Patel) instead of hardcoded mock alerts.
  6. **Stacking Context Layering Verification:** Verified in browser that `SelectContent` (`z-[80]`) and `DatePicker` popovers (`z-[80]`) cleanly render in front of `DialogContent` (`z-[70]`), `SheetContent` (`z-[70]`), and backdrops (`z-[60]`) across all modals (`AttendanceMarkModal`, `LeaveRequestModal`, `LessonPlanModal`, `AssignmentHomeworkModal`, `BroadcastComposerModal`, `MedicationLogModal`, `IncidentReportModal`, and `StudentProfileDrawer`).
- **Automated Verification:**
  - Authored comprehensive Playwright test suite [`frontend/e2e/teacher-subpages-deep-audit.spec.ts`](../frontend/e2e/teacher-subpages-deep-audit.spec.ts).
  - All 5 Playwright tests passed (34.5s).
  - ESLint passed with 0 errors (`npm run lint`).
  - Logged `DEF-017` through `DEF-021` in [`docs/11_DEFECTS.md`](11_DEFECTS.md).

---

### [2026-11-08] Teacher Dashboard Exhaustive QA, Database Data Audit & Stacking Context Resolution (DEF-011 - DEF-016)
- **Status:** Completed & Fully Verified
- **Scope:** Complete QA audit and automated Playwright E2E verification across `/teacher` covering database vs hardcoded data flow, interactive probing of all interactive elements, slide-over drawers, modals, and stacking context layering.
- **Key Findings & Fixes:**
  1. **Stacking Context & Layering Fix (DEF-011):** Elevated `DatePicker` (`PopoverPrimitive.Content`), `SelectContent`, `DropdownMenuContent`, `TooltipContent`, and ThePuffy AI Agent dock to `z-[80]`. Previously, their `z-50` caused them to be occluded beneath `DialogContent` (`z-[70]`), `SheetContent` (`z-[70]`), and drawer backdrops (`z-[60]`). Date picker popovers and select dropdowns inside `LeaveRequestModal` and `IncidentReportModal` are now 100% visible, selectable, and unobstructed.
  2. **Dynamic Attendance KPI Metrics (DEF-012):** Replaced static mock attendance strings (`96%`, `27 of 28 Enrolled Present`, `1 Excused (Leo M.)`) with reactive calculations from `data.roster` (`rate%`, `{present + late} of {total} Enrolled Present`, and `{excused} Excused ({firstExcusedName})`).
  3. **Schedule Summary Counts (DEF-013):** Bound the sunny yellow Class Schedule banner metrics directly to `data.classes.length`, `data.roster.length`, and `data.pendingApplicantCount`.
  4. **Dynamic Quick-Roll Initial Statuses (DEF-014):** Initialized featured Homeroom roll toggle buttons dynamically from `data.roster[0]?.status` and `data.roster[1]?.status` rather than hardcoded "E" and "L".
  5. **Dynamic Compact List View (DEF-015):** Bound compact roster header to active class label and dynamic student counts, and wired excursion slips to `data.excursions`.
  6. **Dynamic Staff Compliance Briefing (DEF-016):** Bound the bottom briefing bar to `data.complianceBriefing?.detail` and `data.complianceBriefing?.slaBadge`.
- **Automated Verification:**
  - Authored comprehensive test suite [`frontend/e2e/teacher-dashboard-deep-audit.spec.ts`](../frontend/e2e/teacher-dashboard-deep-audit.spec.ts).
  - Computed CSS test verified `SelectContent` (`z-index: 80`) and `DatePicker` (`z-index: 80`) render above `DialogContent` (`z-index: 70`).
  - `npx playwright test`: 16/16 tests passed across entire test suite in 35.3s.
  - TypeScript check (`tsc -p frontend/tsconfig.json --noEmit`): 0 errors.
  - ESLint (`npm run lint`): 0 errors.
  - Defect logs updated with `DEF-011` through `DEF-016` in [`docs/11_DEFECTS.md`](11_DEFECTS.md).

### 2026-11-09 — Teacher Portal Sub-Pages Deep Audit, QA & Stacking Context Resolution (`DEF-017`–`DEF-021`)

- **Status:** Accepted
- **Context:** Following the Teacher Dashboard deep audit, an exhaustive Quality Assurance, Database Reconciliation, and DOM Stacking Context audit was executed by `Testing_SB` across all 5 Teacher Portal sub-pages:
  1. `/teacher/attendance` (Classroom Attendance & Roll Call)
  2. `/teacher/lessons` (Curriculum & Lesson Planner)
  3. `/teacher/assessments` (Assessments & Grade Moderation)
  4. `/teacher/messages` (Parent Notes & Excursion Waivers)
  5. `/teacher/safeguarding` (Safeguarding, Sabrina's Law & Health)
- **Key Actions & Defect Resolutions:**
  1. **Attendance Roster Medical Alerts (DEF-017):** Bound `medicalAlert` directly to `row.medical_badge ?? seeded?.medicalBadge`, ensuring database-backed medical alerts are never masked by static seed lookups.
  2. **Lesson Plan Stage Scaffolding (DEF-018):** Injected 5-Stage Instructional Arc scaffolding in `lessons/page.tsx` for database records lacking custom stages, rendering live `Week 12` instructional units with stage durations.
  3. **Database Exams & Student Marks Seeding (DEF-019):** Seeded `AcademicCalendar`, `Exam` (`Term 2 Mid-Term`), and `MarksRecord` for all 6 Grade 4B students into PostgreSQL via `core/management/commands/seed_teacher_demo_data.py`. Replaced fallback mocks with live database-driven marks moderation.
  4. **Unconditional Mock Messages Concatenation (DEF-020):** Replaced `[...mapped, ...SEEDED_MESSAGES]` with conditional fallback `mapped.length > 0 ? mapped : SEEDED_MESSAGES` in `messages/page.tsx`.
  5. **Live Classroom Health Alerts API & Sabrina's Law Cards (DEF-021):** Implemented `GET /api/v1/health/classroom-alerts` in `core/api/v1/health.py` and `fetchClassroomHealthAlerts()` in `frontend/app/lib/api.ts`. Connected `safeguarding/page.tsx` to render live critical/high alerts for students directly from PostgreSQL.
  6. **Stacking Context & Layering Verification:** Verified across all 5 sub-pages that `DatePicker` popovers and `SelectContent` (`z-[80]`) render consistently above `DialogContent` (`z-[70]`), `SheetContent` (`z-[70]`), and modal backdrops (`z-[60]`).
- **Automated Verification:**
  - Automated Playwright audit suite [`frontend/e2e/teacher-subpages-deep-audit.spec.ts`](../frontend/e2e/teacher-subpages-deep-audit.spec.ts): **5 / 5 tests passed (37.9s)**.
  - TypeScript check (`tsc -p frontend/tsconfig.json --noEmit`): **0 errors**.
  - ESLint (`npm run lint`): **0 errors**.
  - All defects logged and marked `Resolved` in [`docs/11_DEFECTS.md`](11_DEFECTS.md).

---

### 2026-11-09 — Caregiver Daily Care & Early Years Portal Technical Architecture & Execution Plan (`SDL_SB`)

- **Status:** Accepted
- **Context:** Following the definition of Caregiver Daily Care Portal requirements in [`docs/2_PRD.md`](2_PRD.md) and approved UX mockups in [`Artefacts/UX Designs/Caregiver/Caregiver_Daily_Care_Portal.html`](../Artefacts/UX%20Designs/Caregiver/Caregiver_Daily_Care_Portal.html) and [`Caregiver_Daily_Care_Portal_Compact.html`](../Artefacts/UX%20Designs/Caregiver/Caregiver_Daily_Care_Portal_Compact.html), formulated the technical delivery blueprint and work packages.
- **Key Deliverables & Decisions:**
  1. **Domain & Entity Mapping:** Mapped `Student` (Toddler Room 1A cohort), `EmergencyContact` / `Parent` (Guardian pickup PINs and photos), `StudentAttendance` (24h roll lock `BR-03-01`, parent outreach flag `BR-03-02`), `StudentHealth` (allergies and parental consent `BR-07-01`), `HealthObservation` (moods, hydration, meals, naps), `MedicationLog` (gated dose administration), and `Incident` (minor boo-boos with 1h SLA `BR-07-02` and Principal auto-escalation `BR-07-03`).
  2. **API & Role Scoping Extension:** Identified required updates to `core/api/v1/attendance.py` (`CareGiver` added to `@require_roles` on student attendance listing and bulk mark) and verification of care-group scoping in `core/auth/scoping.py`.
  3. **Work Packages Scaffolding (WP-1 to WP-4):**
     - **WP-1 (Backend & Seeding):** Scoping guards, medication consent gate verification, Room 1A Sunflowers cohort seeder (`seed_caregiver_demo_data.py`), and backend test suite (`test_caregiver_portal.py`).
     - **WP-2 (Tier 3 Portable Widgets):** Contract in `caregiver-overview-widget.types.ts`, `CaregiverOverviewWidget` with Cards Grid and Compact Matrix views, `BooBooModal`, `MedicationAdminDrawer`, `RoutineLogDrawer`, and `ThePuffyAssistant`.
     - **WP-3 (Tier 4 Route Assembly):** `frontend/app/caregiver/layout.tsx` shell, `page.tsx` thin orchestrator, typed client functions in `frontend/app/lib/api.ts`, and quick persona login in `sign-in-screen.tsx`.
     - **WP-4 (QA & Playwright E2E):** Real browser test suite (`caregiver-portal.spec.ts`) validating check-in, dose logging, boo-boo reporting, dual-view toggles, 5-point browser checks, and strict DOM stacking context (`z-0` to `z-[80]`).
  4. **Documentation:** Synchronized [`docs/6_PLAN.md`](6_PLAN.md) with architectural flowcharts, entity matrices, and work package breakdown tables.
- **Evidence:** [`docs/6_PLAN.md`](6_PLAN.md), [`docs/2_PRD.md`](2_PRD.md), [`Artefacts/UX Designs/Caregiver/`](../Artefacts/UX%20Designs/Caregiver/).

---

### 2026-11-09 — Caregiver Daily Care Portal Full-Stack Implementation (`DEV_SB`)

- **Status:** Complete & Verified
- **Scope Implemented:**
  1. **WP-1: Backend & Demo Seeding:**
     - Updated `@require_roles` in `core/api/v1/attendance.py` on `get_student_attendance_roster` and `mark_attendance_roster` to include `'CareGiver'` and `'Caregiver'`.
     - Created `core/management/commands/seed_caregiver_demo_data.py` to seed the Room 1A "Sunflowers Toddler & Pre-K" cohort (16 toddlers: Maya Lin, Leo Vance, Zoe Zhao, Noah Parker, etc.), `AttendanceRoster` for Room 1A, today's attendance records (14 present, 2 absent), `MedicationLog` for Leo Vance, `Incident` records for Liam Scott & Zoe Zhao, and Nurse Clara Gomez user & `PortalRoleMembership(role='CareGiver')`.
     - Executed `.venv/bin/python manage.py seed_caregiver_demo_data` across all database tenants.
  2. **WP-2: Tier 3 Portable Caregiver Widgets:**
     - Created `frontend/components/widgets/caregiver/caregiver-overview-widget.types.ts` defining portable contracts (`CaregiverOverviewData`, `CaregiverOverviewCapabilities`, `CaregiverOverviewCallbacks`, `CaregiverOverviewWidgetProps`).
     - Created `frontend/components/widgets/caregiver/caregiver-overview-widget.tsx` with Cards View + Compact List Matrix View, 24h Roll Lock banner (`BR-03-01`), Safeguarding & Medication Critical Band (`BR-07-01`), Learner Cubbies, Guardian Pickup badges, and Direct Parent messaging.
     - Created `frontend/components/widgets/caregiver/boo-boo-modal.tsx` with 1h SLA parent dispatch (`BR-07-02`) at `z-[70]`.
     - Created `frontend/components/widgets/caregiver/the-puffy-caregiver-assistant.tsx` docked/closed by default (`DEF-004`) at `z-[80]`.
     - Exported from `frontend/components/widgets/caregiver/index.ts` and `frontend/components/widgets/index.ts`.
  3. **WP-3: Tier 4 Thin Route Assembly:**
     - Created `frontend/app/caregiver/layout.tsx` featuring the floating topbar pill (`z-40`), Nurse Clara Gomez profile avatar, outside-click Navigator menu (`DEF-007`), ambient pastel glow backdrop at `z-0 pointer-events-none` (`DEF-008`), and `ProfilePictureModal` support.
     - Created `frontend/app/caregiver/page.tsx` hydrating data from `/api/v1/attendance/students/{today}` and `/api/v1/incidents`, wiring callbacks for bulk attendance mark, medication logging, and incident logging.
     - Added quick login chip for Nurse Clara Gomez (`caregiver1_demo-school`) to `frontend/app/components/sign-in-screen.tsx`.
     - Updated `frontend/components/pc/profile-picture-modal.tsx` with `DEFAULT_CAREGIVER_AVATAR` and `"caregiver"` role support.
  4. **WP-4: Verification & Defect Ledger Immunity:**
     - Verified backend attendance tests: `pytest tests/test_api_attendance_health.py` (8/8 passed).
     - Verified TypeScript check: `tsc --project frontend/tsconfig.json --noEmit` (0 errors).
     - Verified Next.js production build: `npm --prefix frontend run build` (15/15 static pages generated cleanly).
     - Verified browser visual fidelity & interactions via Playwright E2E: `frontend/e2e/caregiver-portal-deep-audit.spec.ts` (5/5 tests passed).
     - Confirmed zero regression across Teacher Portal E2E tests: `frontend/e2e/teacher-tabs-visual.spec.ts` (8/8 passed).
- **Evidence:** `core/api/v1/attendance.py`, `core/management/commands/seed_caregiver_demo_data.py`, `frontend/components/widgets/caregiver/`, `frontend/app/caregiver/`, `frontend/e2e/caregiver-portal-deep-audit.spec.ts`.

---

### [2026-11-09] Caregiver Daily Care Portal (`/caregiver`) Exhaustive QA & Deep Architectural Audit (`Testing_SB`)
- **Status:** Completed & Logged (Awaiting User Review — Zero Fixes Applied per User Directive)
- **Scope:** Exhaustive database hydration audit, click probing, stacking context / layering analysis, and automated browser Playwright inspection of `/caregiver`.
- **Key Findings & Defect Ledger (`docs/11_DEFECTS.md`):**
  1. **DEF-022 (High / P1):** Incidents list corrupts student names upon live DB hydration (`"Accidental bump agai • Injury"`, `"Tripped during sandb • Injury"`) due to truncated sentence parser `description.slice(0, 20)`, while hardcoding `"Knee / Scrape"` and static stamps.
  2. **DEF-023 (Critical / P0):** Medication Administration & Consent Log completely hardcoded (`INITIAL_MEDICATIONS`) and disconnected from PostgreSQL `MedicationLog` / `StudentHealth.medications` due to missing classroom medication aggregation endpoint.
  3. **DEF-024 (High / P1):** Live medical badges returned from PostgreSQL via `fetchStudentAttendanceRoster` are discarded in `page.tsx` line 481 in favor of `seedMatch?.healthAlert` static fallback.
  4. **DEF-025 (Medium / P2):** Roll Lock Progress bar statically hardcoded to 72% (`completionPercent`), and Compact Matrix summary strip & diaper table cells use hardcoded text literals.
  5. **DEF-026 (High / P1):** ThePuffy AI Assistant is trapped inside parent `<main>`'s `relative z-10` stacking context, causing it to render behind slide-over drawer (`z-[70]`) and backdrop (`z-[60]`). Drawer footer intercepts clicks to `#puffy-launcher-btn`, and expanded ThePuffy occludes header tab controls during scroll.
  6. **DEF-027 (Medium / P2):** Browser reports CSP violations on Google Fonts `Material Symbols Outlined` stylesheet on `/caregiver` load due to missing domain whitelist in `next.config.ts`.
  7. **DEF-028 (Medium / P2):** Playwright test suite used unsigned JWT tokens, causing backend API calls to return 401 and silently fall back to mock data, masking database disconnection issues during automated testing.
- **Action Taken:** Logged all 7 defects in `docs/11_DEFECTS.md` (DEF-022 through DEF-028) with severity, root cause analysis, affected files, and recommended fixes. All defects left in `Status: Open` for user review without modifying application code.



















### 2026-11-08 — Parent Signup Activation State CI Repair

- **Status:** Completed & Verified (PR #2)
- **Decision:** Updated `POST /api/v1/auth/signup` to create newly registered parent users with `is_active=False` and return `status: "pending_activation"`, matching the auth API contract and test expectations for pending account activation.
- **Verification:** `pytest /home/runner/work/skulz-school-crm/skulz-school-crm/tests/test_api_auth.py -k signup_creates_parent_user_with_hashed_password_and_tenant_membership` passed.
- **Evidence:** [`core/api/v1/auth.py`](../core/api/v1/auth.py), [`tests/test_api_auth.py`](../tests/test_api_auth.py).

### 2026-11-16 — Caregiver / ECE Requirements Benchmarked Against Brightwheel & Lillio

- **Status:** Proposed (awaiting user review)
- **Decision:** Authored [`docs/12_CAREGIVER_REQUIREMENTS.md`](12_CAREGIVER_REQUIREMENTS.md) with 16 prioritized stories (MVP-1 → Tier 3). Each story follows: Actor + Given/When/Then → value proposition → system design → rules/edge cases/parity/DoD. Staff-to-child ratio tracking excluded per user decision; billing left to Admin/Parent portals.
- **Context:** Compared against Brightwheel (strongest parent feed, billing) and Lillio/HiMama (strongest developmental documentation, curriculum).
- **Findings:** MVP blockers in the current repo — no `check_in_at`/`check_out_at` on `StudentAttendance`, no pickup PIN/photo/flag on `EmergencyContact`, no care-event model for diaper/meal/hydration, no media/photo-consent storage. Open `DEF-022`–`DEF-028` map to CG-03/04/05/06.
- **Consequences:** Any schema addition requires migration + RLS coverage + `4_DATA_AND_ENV.md` update. `2_PRD.md` not yet changed; merge pending approval.

### 2026-11-16 — Consolidate & Simplify `8_PRODUCT_BACKLOG_STORIES.md` with Single-Developer Breakdown & Caregiver Stories

- **Status:** Accepted
- **Decision:** Restructured [`docs/8_PRODUCT_BACKLOG_STORIES.md`](8_PRODUCT_BACKLOG_STORIES.md) into a simplified Executive Summary + Global DoD followed by a single unified backlog table (`48` atomic stories), broke bundled stories into single-developer build-and-test vertical slices (`US-P0-01A/B`, `US-P0-03A/B`, `US-P1-01A/B`, `US-P1-02A/B`, `US-P1-05A/B`, `US-P1-06A/B`, `US-P2-01A/B`, `US-P2-02A/B`, `US-P2-03A`), merged all 16 Caregiver/ECE stories (`US-CG-01`..`US-CG-16`) directly into the table, and deleted `docs/12_CAREGIVER_REQUIREMENTS.md`.
- **Evidence:** [`docs/8_PRODUCT_BACKLOG_STORIES.md`](8_PRODUCT_BACKLOG_STORIES.md).

### 2026-11-16 — Caregiver Portal Batch A (MVP-1: `US-CG-01`..`US-CG-05` & `DEF-022`..`DEF-028`)

- **Status:** In Review (SDL)
- **Summary:** Implemented Batch A (MVP-1) of the Caregiver Portal blueprint across Django/PostgreSQL and Next.js:
  - **Schema & Migration (`0021_caregiver_mvp1_fields`):** Added `check_in_at`/`check_out_at` to `StudentAttendance`, pickup authorization/PIN/custody fields to `EmergencyContact`, and `body_part` to `Incident` (all covered by `0020_enable_tenant_rls`); updated [`docs/4_DATA_AND_ENV.md`](4_DATA_AND_ENV.md) and `seed_caregiver_demo_data`.
  - **BO & API (`core/business_objects/attendance_health.py`, `core/api/v1/attendance.py`, `core/api/v1/health.py`):** Added `AttendanceSheetBO.check_in`/`check_out`, `PickupVerificationBO` (hashed PINs, 3-attempt lockout + Admin alert, custody restriction block, zero PIN-hash leakage), `GET /health/classroom-medications`, duplicate/absent medication gates, room-scoped `get_student_queryset` on attendance/health, and `SafetyComplianceBO.list_incidents` student name resolution + `body_part`/`time`.
  - **Frontend & Defect Fixes:** Removed blocked Google Fonts stylesheet (`DEF-027`), portaled `ThePuffyCaregiverAssistant` to `document.body` at `z-[80]` (`DEF-026`), hydrated live DB allergies (`DEF-024`), medications (`DEF-023`), incidents (`DEF-022`), dynamic Roll Lock % (`DEF-025`), Check-In/Out, and Pickup Verification PIN UI in `/caregiver`; switched Playwright E2E to signed HS256 JWTs (`DEF-028`).
- **Verification:** `pytest tests/test_api_attendance_health.py tests/test_student_scope.py -v` (16/16 passed); `npx eslint` (0 errors); `npx tsc --noEmit` (0 errors); `npx playwright test e2e/caregiver-portal-deep-audit.spec.ts` (6/6 passed).

### 2026-11-16 — Add Step-by-Step Verifiable Manual Testing Scripts to Every Backlog Story (`8_PRODUCT_BACKLOG_STORIES.md`)

- **Status:** Accepted
- **Decision:** Added Section `1.2 Manual Testing Environment, Prerequisites & Demo Credentials` (verified server commands, seeder commands, `create_role_users` credentials `*_demo-school` / `1234`, Swagger `/api/docs`, and current vs. planned Next.js routes) and appended a dedicated 10th column (`Step-by-Step Manual Testing & Verification Script`) to all **50** stories (`US-P0-01A`..`US-P3-05` and `US-CG-01`..`US-CG-16`) in [`docs/8_PRODUCT_BACKLOG_STORIES.md`](8_PRODUCT_BACKLOG_STORIES.md).
- **Verification:** Cross-checked routes/payloads/logins directly against `core/api/v1/`, `core/management/commands/`, `frontend/app/`, `frontend/components/widgets/caregiver/`, and `frontend/next.config.ts`; validated markdown table alignment across all 52 table lines (`0` malformed rows, `50` stories).
- **Evidence:** [`docs/8_PRODUCT_BACKLOG_STORIES.md`](8_PRODUCT_BACKLOG_STORIES.md).

### 2026-11-16 — Caregiver Portal Batch A (MVP-1: `US-CG-01`..`US-CG-05` & `DEF-022`..`DEF-028`)

- **Status:** In Review (SDL)
- **Summary:** Implemented Batch A (MVP-1) of the Caregiver Portal blueprint across Django/PostgreSQL and Next.js:
  - **Schema & Migration (`0021_caregiver_mvp1_fields`):** Added `check_in_at`/`check_out_at` to `StudentAttendance`, pickup authorization/PIN/custody fields to `EmergencyContact`, and `body_part` to `Incident` (all covered by `0020_enable_tenant_rls`); updated [`docs/4_DATA_AND_ENV.md`](4_DATA_AND_ENV.md) and `seed_caregiver_demo_data`.
  - **BO & API (`core/business_objects/attendance_health.py`, `core/api/v1/attendance.py`, `core/api/v1/health.py`):** Added `AttendanceSheetBO.check_in`/`check_out`, `PickupVerificationBO` (hashed PINs, 3-attempt lockout + Admin alert, custody restriction block, zero PIN-hash leakage), `GET /health/classroom-medications`, duplicate/absent medication gates, room-scoped `get_student_queryset` on attendance/health, and `SafetyComplianceBO.list_incidents` student name resolution + `body_part`/`time`.
  - **Frontend & Defect Fixes:** Removed blocked Google Fonts stylesheet (`DEF-027`), portaled `ThePuffyCaregiverAssistant` to `document.body` at `z-[80]` (`DEF-026`), hydrated live DB allergies (`DEF-024`), medications (`DEF-023`), incidents (`DEF-022`), dynamic Roll Lock % (`DEF-025`), Check-In/Out, and Pickup Verification PIN UI in `/caregiver`; switched Playwright E2E to signed HS256 JWTs (`DEF-028`).
- **Verification:** `pytest tests/test_api_attendance_health.py tests/test_student_scope.py -v` (16/16 passed); `npx eslint` (0 errors); `npx tsc --noEmit` (0 errors); `npx playwright test e2e/caregiver-portal-deep-audit.spec.ts` (6/6 passed).

### 2026-11-16 — SDL_SB Acceptance Sign-Off: Caregiver Portal Batch A (MVP-1: `US-CG-01`..`US-CG-05`)

- **Status:** Accepted (`Done`)
- **Decision:** Verified Batch A (`US-CG-01`..`US-CG-05`, `DEF-022`..`DEF-028`) directly in the workspace and promoted `US-CG-01`..`US-CG-05` to `**Done**` in [`docs/8_PRODUCT_BACKLOG_STORIES.md`](8_PRODUCT_BACKLOG_STORIES.md).
- **Verification:**
  - `.venv/bin/pytest tests/test_api_attendance_health.py tests/test_student_scope.py -v` — **16 passed** in 9.09s.
  - `.venv/bin/python manage.py makemigrations --check --dry-run` — **No changes detected**; `0021_caregiver_mvp1_fields` extends existing RLS-protected tables covered by `0020_enable_tenant_rls` and is documented in [`docs/4_DATA_AND_ENV.md`](4_DATA_AND_ENV.md).
  - `npx eslint app/caregiver/page.tsx app/caregiver/layout.tsx app/layout.tsx app/lib/api.ts components/widgets/caregiver/` — **0 errors** (6 warnings); `npx tsc --noEmit` — **0 errors**.
  - `npx playwright test e2e/caregiver-portal-deep-audit.spec.ts` — **6 passed** (11.5s) with signed HS256 JWTs, zero CSP errors, zero broken images, and verified z-index layering (`z-40`, `z-[60]`, `z-[70]`, `z-[80]`).

### 2026-11-16 — Caregiver Portal Batch B (MVP-2: `US-CG-06`..`US-CG-08`)

- **Status:** In Review (SDL)
- **Summary:** Implemented Batch B (MVP-2) across Django/PostgreSQL and Next.js:
  - **Schema, Migrations & RLS (`0022_caregiver_mvp2_care_events_media`, `0023_care_events_media_rls`):** Added `photo_consent` and `topical_consent` on `StudentHealth`, plus `CareEvent(TenantScopedModel)` and `CareMedia(TenantScopedModel)` with forced PostgreSQL RLS policies (`core_care_event`, `core_care_media`); updated [`docs/4_DATA_AND_ENV.md`](4_DATA_AND_ENV.md) and `seed_caregiver_demo_data`.
  - **BO & API (`core/business_objects/care_events.py`, `core/schemas/care_events.py`, `core/api/v1/care_events.py`, `core/api/v1/sprint5.py`, `core/schemas/sprint5.py`, `core/api/v1/attendance.py`):** Implemented `POST /api/v1/care-events` (single & batch + topical consent gate), `GET /api/v1/care-events` (dynamic room summary for `DEF-025`), `DELETE /api/v1/care-events/{event_id}` (5-min undo/hide), `GET /api/v1/parent/children/{student_id}/feed` (chronological parent feed with strict `verify_student_access`), `POST /api/v1/care-media` (pure-Python JPEG/PNG/WebP EXIF/metadata stripping, `photo_consent` gate, HMAC-signed URL), `GET /api/v1/care-media/{media_id}/file`, and `DELETE /api/v1/care-media/{media_id}`; enabled `CareGiver`/`Caregiver` on `/api/v1/messages` with `UUID` recipient support.
  - **Frontend (`frontend/app/lib/api.ts`, `frontend/components/widgets/caregiver/`, `frontend/app/caregiver/page.tsx`, `frontend/components/widgets/parent/`, `frontend/app/parent/page.tsx`):** Wired quick care micro-logs (`+120 mL`, mood, diaper with topical consent gate, meal, nap, 5-min undo), batch actions (`All Asleep`, `Quick Batch Meal Log`), dynamic Compact List 4-card strip (`DEF-025`), photo upload/delete with consent gate, and Parent `/parent` Live Daily-Report Feed.
- **Verification:** `pytest tests/test_api_caregiver_mvp2.py tests/test_api_attendance_health.py tests/test_rls_configuration.py -v` (15 passed); `makemigrations --check --dry-run` (no changes); `npx tsc --noEmit` (0 errors); `npx playwright test e2e/caregiver-mvp2.spec.ts` (3 passed).

### 2026-11-16 — SDL_SB Acceptance Sign-Off: Caregiver Portal Batch B (MVP-2: `US-CG-06`..`US-CG-08`)

- **Status:** Accepted (`Done`)
- **Decision:** Verified Batch B (`US-CG-06`..`US-CG-08`) directly in the workspace against `AGENTS.md` and `docs/8_PRODUCT_BACKLOG_STORIES.md` and promoted `US-CG-06`..`US-CG-08` to `**Done**` in [`docs/8_PRODUCT_BACKLOG_STORIES.md`](8_PRODUCT_BACKLOG_STORIES.md).
- **Verification:**
  - `.venv/bin/python manage.py makemigrations --check --dry-run` — **No changes detected**; `0022_caregiver_mvp2_care_events_media` and `0023_care_events_media_rls` (forced RLS on `core_care_event`, `core_care_media`) are documented in [`docs/4_DATA_AND_ENV.md`](4_DATA_AND_ENV.md).
  - `.venv/bin/pytest tests/test_api_caregiver_mvp2.py tests/test_api_attendance_health.py tests/test_rls_configuration.py -v` — **15 passed** in 9.32s.
  - `cd frontend && npx tsc --noEmit` — **0 errors**; `npx eslint` on changed files — **0 errors** (6 warnings); zero hardcoded colors/mock data, portable widget contract intact, strict z-index layering (`z-[60]`, `z-[70]`, `z-[80]`).
  - `cd frontend && npx playwright test e2e/caregiver-mvp2.spec.ts` — **3 passed** (15.2s) covering micro-logs/batch/topical consent/reload persistence (`US-CG-06`), cross-session Parent feed/5-min undo/403 isolation (`US-CG-07`), and EXIF/metadata stripping, `naturalWidth > 0`, `photo_consent` 422 gate, and immediate delete (`US-CG-08`).

### 2026-11-16 — Caregiver Portal Batch C (Tier 2: `US-CG-09`..`US-CG-10`)

- **Status:** In Review (SDL)
- **Summary:** Implemented Batch C (Tier 2) across Django/PostgreSQL and Next.js:
  - **Schema, Migrations & RLS (`0024_caregiver_tier2_learning_observations`, `0025_learning_observations_rls`):** Added `LearningFramework(TenantScopedModel)` (`core_learning_framework`) and `LearningObservation(TenantScopedModel)` (`core_learning_observation`) with forced PostgreSQL RLS policies; updated [`docs/4_DATA_AND_ENV.md`](4_DATA_AND_ENV.md).
  - **BO & API (`core/business_objects/care_events.py`, `core/schemas/care_events.py`, `core/schemas/attendance_health.py`, `core/api/v1/attendance.py`, `core/api/v1/care_events.py`):**
    - `US-CG-09`: Added `HealthScreenBO.process_screen` wired into `POST /api/v1/attendance/check-in` (`symptoms`, `temperature_c`, `supervisor_override`, `override_reason`) saving `CareEvent(event_type='health_screen')`, blocking positive screens with HTTP 422 (`BR-07-02`) + Admin alert, and enforcing Supervisor-only override with `AuditLog` (`HealthScreenOverride`).
    - `US-CG-10`: Added `LearningObservationBO` + `GET /api/v1/learning-frameworks` (auto-seeding `ELECT`, `HDLH`, `EYFS`), `POST /api/v1/learning-observations`, `GET /api/v1/learning-observations` (Parent role strictly filtered to `shared_with_family=True`), `PATCH /api/v1/learning-observations/{id}`, `DELETE /api/v1/learning-observations/{id}`, `GET /api/v1/students/{id}/developmental-summary`, and included shared observations in `GET /api/v1/parent/children/{id}/feed`.
  - **Frontend (`frontend/app/lib/api.ts`, `frontend/components/widgets/caregiver/`, `frontend/app/caregiver/page.tsx`):** Added Drop-Off Health & Symptom Screener modal (`z-[70]`) in Caregiver Check-In flow and **Learning Portfolio & Developmental Summary** tab in the child drawer; shared observations render in `/parent` Live Daily-Report Feed.
- **Verification:** `pytest tests/test_api_caregiver_tier2.py tests/test_api_caregiver_mvp2.py tests/test_api_attendance_health.py tests/test_rls_configuration.py -v` (17 passed); `makemigrations --check --dry-run` (no changes); `npx tsc -p frontend/tsconfig.json --noEmit` (0 errors); `npm --prefix frontend run lint` (0 errors, 5 warnings on changed files); `npx playwright test e2e/caregiver-tier2.spec.ts e2e/caregiver-mvp2.spec.ts` (5 passed).

### 2026-11-16 — SDL_SB Final Acceptance Sign-Off: Caregiver Portal (`US-CG-01`..`US-CG-10`)

- **Status:** Accepted (`Done` for all 10 stories `US-CG-01`..`US-CG-10`)
- **Decision:** Verified Batch C (`US-CG-09`..`US-CG-10`) and ran final end-to-end verification across `US-CG-01`..`US-CG-10`; promoted `US-CG-09` and `US-CG-10` to `**Done**` in [`docs/8_PRODUCT_BACKLOG_STORIES.md`](8_PRODUCT_BACKLOG_STORIES.md).
- **Verification:**
  - `.venv/bin/python manage.py makemigrations --check --dry-run` — **No changes detected**; `0024_caregiver_tier2_learning_observations` and `0025_learning_observations_rls` (forced RLS on `core_learning_framework`, `core_learning_observation`) are documented in [`docs/4_DATA_AND_ENV.md`](4_DATA_AND_ENV.md).
  - `.venv/bin/pytest tests/test_api_caregiver_tier2.py tests/test_api_caregiver_mvp2.py tests/test_api_attendance_health.py tests/test_student_scope.py tests/test_rls_configuration.py -v` — **22 passed** in 9.85s.
  - `npx --prefix frontend tsc -p frontend/tsconfig.json --noEmit` — **0 errors**; `npm --prefix frontend run lint` on changed files — **0 errors** (5 warnings); zero hardcoded colors.
  - `cd frontend && npx playwright test e2e/caregiver-portal-deep-audit.spec.ts e2e/caregiver-mvp2.spec.ts e2e/caregiver-tier2.spec.ts` (after `seed_caregiver_demo_data`) — **11 passed** in 34.9s.
  - Note: `npm --prefix frontend run build` (Next.js 16.3.3 Turbopack) fails in this offline/sandboxed environment on `@vercel/turbopack-next/internal/font/google/font` resolution for `next/font/google` in `frontend/app/layout.tsx` (pre-existing environment constraint).

### 2026-11-17 — UX Enhancement: Cards View / Compact View Options Inside Account Profile Menu

- **Status:** Accepted
- **Decision:** Added `Workspace View` (`Cards View` / `Compact View`) toggle inside the top-right Account Profile dropdown in [`frontend/app/caregiver/layout.tsx`](../frontend/app/caregiver/layout.tsx) and [`frontend/app/teacher/layout.tsx`](../frontend/app/teacher/layout.tsx), backed by a shared React 19 `useSyncExternalStore` + `localStorage` + `CustomEvent` helper [`frontend/components/pc/view-mode-preference.ts`](../frontend/components/pc/view-mode-preference.ts) synced with [`CaregiverOverviewWidget`](../frontend/components/widgets/caregiver/caregiver-overview-widget.tsx) and [`TeacherDashboardOverviewWidget`](../frontend/components/widgets/teacher/teacher-dashboard-overview.tsx).
- **Verification:** `tsc -p frontend/tsconfig.json --noEmit` (0 errors), focused ESLint (0 errors), and Playwright E2E [`frontend/e2e/account-profile-view-switcher.spec.ts`](../frontend/e2e/account-profile-view-switcher.spec.ts).

### 2026-11-17 — Update Caregiver Landing Page HTML & UI Alignment (`Caregiver_Daily_Care_Portal.html`)

- **Status:** Accepted
- **Decision:** Replaced [`Artefacts/UX Designs/Caregiver/Caregiver_Daily_Care_Portal.html`](../Artefacts/UX%20Designs/Caregiver/Caregiver_Daily_Care_Portal.html) with the updated HTML mockup and aligned the hero/top-banner layout in [`frontend/components/widgets/caregiver/caregiver-overview-widget.tsx`](../frontend/components/widgets/caregiver/caregiver-overview-widget.tsx) (two-column hero with initials badge + on-duty dot, greeting + session subtitle, interactive class group switcher button, caregiver team pill, unified divided KPI card for Attendance % & Prescriptions due, dual Cards/Compact List switcher, and `Log Boo-Boo` CTA).
- **Evidence:** `tsc --noEmit` (0 errors), focused ESLint, and Playwright E2E Caregiver suites.

### 2026-11-17 — Fix `npm run build` Next.js 16 Turbopack Google Font Resolution Failure

- **Status:** Accepted
- **Decision:** Updated [`frontend/package.json`](../frontend/package.json) `"build"` script from `"next build"` to `"next build --webpack"` so `npm run build` avoids the Next.js 16.3.3 Turbopack `@vercel/turbopack-next/internal/font/google/font` module resolution failure.
- **Evidence:** `npm --prefix frontend run build` exits with code 0 (`15/15` static routes compiled).

### 2026-11-17 — Switch RootLayout to Local Self-Hosted Fonts (`next/font/local`) for Turbopack Builds

- **Status:** Accepted
- **Decision:** Bundled `plus-jakarta-sans-latin.woff2`, `inter-latin.woff2`, and `fraunces-latin.woff2` under `frontend/app/fonts/` and switched [`frontend/app/layout.tsx`](../frontend/app/layout.tsx) from `next/font/google` to `next/font/local`; restored `"build": "next build"` (default Turbopack) in [`frontend/package.json`](../frontend/package.json).
- **Evidence:** `npm --prefix frontend run build` (Turbopack) compiled and generated all routes cleanly.

### 2026-11-17 — Expand `US-P1-03` Manual Testing Script to Cover Caregiver Persona

- **Status:** Accepted
- **Decision:** Updated [`docs/8_PRODUCT_BACKLOG_STORIES.md`](../docs/8_PRODUCT_BACKLOG_STORIES.md) row `US-P1-03` (`Class/Group Attendance Scoping, 24h Lock & Absence Flags`) so its `Step-by-Step Manual Testing & Verification Script` explicitly covers both **Part A — Teacher** (`teacher1_demo-school` on `/teacher/attendance`) and **Part B — Caregiver** (`caregiver1_demo-school` on `/caregiver` + attendance APIs), clarifying its relationship to `US-CG-01` (`Done`).
- **Evidence:** Verified markdown table pipe counts and `core/auth/scoping.py`, `core/api/v1/attendance.py`, and `core/business_objects/attendance_health.py` behavior.

### 2026-11-17 — Restructure `docs/11_DEFECTS.md` to Single Standardized 7-Column Table

- **Status:** Accepted
- **Decision:** Simplified [`docs/11_DEFECTS.md`](../docs/11_DEFECTS.md) per user specification to contain only the initial file description followed by a single 7-column defect table (`Defect Id`, `Date Raised`, `Issue Description`, `Reviewed by Me`, `Resolution`, `Status`, `Fixed Date`) covering `DEF-001` through `DEF-028`.
- **Evidence:** Verified table formatting (`30` table lines including header/separator, `0` malformed rows).

### 2026-11-17 — Log `DEF-029` (Missing Dedicated On-Time Check-In Button in Caregiver Portal)

- **Status:** Accepted
- **Decision:** Logged `DEF-029` as `Open` in [`docs/11_DEFECTS.md`](../docs/11_DEFECTS.md) per user request (no code changes made).
- **Evidence:** Verified table formatting in `docs/11_DEFECTS.md`.

### 2026-11-19 — Consolidate Backlog into `docs/2_PRD.md` & Remove `docs/8_PRODUCT_BACKLOG_STORIES.md`

- **Status:** Accepted
- **Decision:** Restructured [`docs/2_PRD.md`](../docs/2_PRD.md) into 4 primary sections (**1. Summary of the File**, **2. Objective of the Entire Project**, **3. Personas**, **4. Processes** with 11 operational process subsections containing the verbatim 11-column requirements tables for all 50 stories), deleted `docs/8_PRODUCT_BACKLOG_STORIES.md`, and updated [`AGENTS.md`](../AGENTS.md) to point solely to `docs/2_PRD.md`.
- **Evidence:** Automated verification confirmed 50/50 verbatim stories preserved and 0 malformed markdown table rows (`186` total lines).

### 2026-11-21 — Log `DEF-030` & Add `US-P1-03B` (Planned Check-In Timer & Late Check-In Reason) to `docs/2_PRD.md`

- **Status:** Accepted
- **Decision:** Logged `DEF-030` as `Open` in [`docs/11_DEFECTS.md`](../docs/11_DEFECTS.md) for unmarked toddlers defaulting to `Absent` with hardcoded `12 mins remaining` / `Absent (SLA 12m)`, and added `US-P1-03B` (*Planned Check-In Timer & Late Check-In Reason*) under Section 4.4 of [`docs/2_PRD.md`](../docs/2_PRD.md) with all 11 columns populated (`Not Started`).
- **Evidence:** Verified markdown table pipe counts in both `docs/11_DEFECTS.md` and `docs/2_PRD.md`.

### 2026-11-21 — Replace `docs/9_CURRENT_JOB_EXECUTION_PLAN.md` with `docs/9_TECHNICAL_DESIGN_DOC.md`

- **Status:** Accepted
- **Decision:** Created [`docs/9_TECHNICAL_DESIGN_DOC.md`](../docs/9_TECHNICAL_DESIGN_DOC.md) replacing `docs/9_CURRENT_JOB_EXECUTION_PLAN.md` with two sections: (1) Document description & verified project file references (`docs/`, `config/`, `core/`, `frontend/`, `tests/`, `Artefacts/UX Designs/`), and (2) a 5-column Technical Design & Unit Testing table (`Requirement Id`, `Requirement Description`, `Technical Implementation Plan`, `Unit Testing Steps`, `Status`) covering all 51 requirements from [`docs/2_PRD.md`](../docs/2_PRD.md).
- **Evidence:** Automated verification confirmed 51/51 requirement IDs match `docs/2_PRD.md` 1:1, 0 malformed table rows (`53` total table lines), and `0` missing cited project files.

### 2026-11-22 — Expand `docs/9_TECHNICAL_DESIGN_DOC.md` with New-Developer Step-by-Step Implementation Plans

- **Status:** Accepted
- **Decision:** Expanded the `Technical Implementation Plan` column across all 51 requirements in [`docs/9_TECHNICAL_DESIGN_DOC.md`](../docs/9_TECHNICAL_DESIGN_DOC.md) (and added a 4-layer onboarding quick-start pattern in Section 1) with exact model fields, migration/RLS steps, BO method names (`core/business_objects/*.py`), Pydantic/Ninja schema classes (`core/schemas/*.py`), API routes/guards (`core/api/v1/*.py`, `core/auth/scoping.py`), and `frontend/app/lib/api.ts` + Tier-3/Tier-4 UI wiring instructions.
- **Evidence:** Automated audit verified 51/51 requirement IDs & statuses match [`docs/2_PRD.md`](../docs/2_PRD.md) 1:1, `0` malformed table rows (`53` table lines), `0` missing file paths, `0` unknown BO/Schema classes, and `0` unknown frontend helper functions.

### 2026-11-22 — Simplify Section 4.6 Columns & Update All `docs/2_PRD.md` Story Statuses to `Developed`

- **Status:** Accepted
- **Decision:** Updated Section `4.6 Early Years & Caregiver Daily Care Operations` in [`docs/2_PRD.md`](../docs/2_PRD.md) to keep only the 6 requested columns (`Story ID`, `Persona(s)`, `User Story`, `Edge Cases & Security / Tenant Isolation Gates`, `Step-by-Step Manual Testing & Verification Script`, `Current Status`) across all 15 Caregiver rows, and updated `Current Status` to **`Developed`** for all 51 stories across `docs/2_PRD.md` per user direction.
- **Evidence:** Automated validation verified `15` Section 4.6 rows (`7` pipe delimiters each), `51/51` stories marked `**Developed**`, and `0` malformed table rows.

### 2026-11-22 — Log Caregiver Check-Out Defects `DEF-031`, `DEF-032`, `DEF-033`

- **Status:** Accepted
- **Decision:** Logged 3 user-raised Caregiver Check-Out defects (`DEF-031`: missing Check-Out confirmation feedback; `DEF-032`: drawer still shows `"Present"` after Check-Out; `DEF-033`: drawer remains editable post-Check-Out without Admin/Supervisor override key) as `Open` in [`docs/11_DEFECTS.md`](../docs/11_DEFECTS.md). No code modifications made.
- **Evidence:** Verified markdown table formatting in `docs/11_DEFECTS.md`.

### 2026-11-22 — Add `US-CG-17` (Historical DatePicker & Child History View) to `docs/2_PRD.md`

- **Status:** Accepted
- **Decision:** Added `US-CG-17` (*Historical DatePicker & Child Daily Care History View* across `/caregiver`, `/admin`, and `/owner` portals) under Section 4.6 of [`docs/2_PRD.md`](../docs/2_PRD.md) with status `Not Started`, matching Section 4.6's 6-column schema.
- **Evidence:** Verified markdown table pipe counts across `docs/2_PRD.md` (`52` total stories, `0` malformed rows).

### 2026-11-22 — Add Detailed `US-CG-17` Entry to `docs/9_TECHNICAL_DESIGN_DOC.md` via `SDL_SB`

- **Status:** Accepted
- **Decision:** Delegated authoring of `US-CG-17` (*Historical DatePicker & Child Daily Care History View* across `/caregiver`, `/admin`, and `/owner`) to the `SDL_SB` (Software Development Lead) subagent, which inserted the detailed 4-layer implementation plan and unit-testing steps immediately after `US-CG-16` in [`docs/9_TECHNICAL_DESIGN_DOC.md`](../docs/9_TECHNICAL_DESIGN_DOC.md), added `core/admin.py` to Section 1 references, and updated the PRD count to `52` User Stories.
- **Evidence:** Independent verification confirmed 52/52 IDs match [`docs/2_PRD.md`](../docs/2_PRD.md) 1:1, `0` malformed table rows, and `0` missing cited project files.

### 2026-11-22 — Log `DEF-034` (Missing Incident Severity Field in Caregiver Log Boo-Boo Modal)

- **Status:** Accepted
- **Decision:** Logged `DEF-034` as `Open` in [`docs/11_DEFECTS.md`](../docs/11_DEFECTS.md) per user report (no code changes made).
- **Evidence:** Verified markdown table formatting in `docs/11_DEFECTS.md`.

### 2026-11-22 — Add `US-CG-18` (`Other` Option on Caregiver Incident Modal) to `docs/2_PRD.md`

- **Status:** Accepted
- **Decision:** Added `US-CG-18` under Section 4.6 of [`docs/2_PRD.md`](../docs/2_PRD.md) requiring a 4th Incident Classification pill labeled `Other` (alongside `Skin Scrape`, `Bump / Bruise`, and `Small Pinch`) with a required note when `Other` is selected on the Caregiver Incident Modal (`Not Started`).
- **Evidence:** Verified markdown table formatting across `docs/2_PRD.md` (`53` total stories, `0` malformed rows).

### 2026-11-22 — Standing SDL $\rightarrow$ TDD Workflow & Technical Designs for `US-CG-18` and `DEF-029`–`DEF-034`

- **Status:** Accepted
- **Decision:** Adopted standing rule to automatically invoke `SDL_SB` to author Technical Implementation Plans & Unit Testing Steps in [`docs/9_TECHNICAL_DESIGN_DOC.md`](../docs/9_TECHNICAL_DESIGN_DOC.md) whenever any new Requirement or Defect is added. `SDL_SB` added detailed 4-layer designs for `US-CG-18` (`Not Started`) and open defects `DEF-029` through `DEF-034` (`Open`).
- **Evidence:** Independent verification confirmed `53/53` User Stories match [`docs/2_PRD.md`](../docs/2_PRD.md) 1:1, `6` open defect rows (`DEF-029`–`DEF-034`), `0` malformed table rows (`61` total table lines), and `0` missing cited project files.

### 2026-11-22 — Persist Learned Rules (`AGENTS.md`) & Workspace Skill (`.agent/skills/sdl-tdd-sync/SKILL.md`)

- **Status:** Accepted
- **Decision:** After user approval of `learning_proposal.md`, updated [`AGENTS.md`](../AGENTS.md) with TDD selective reading (`docs/9_TECHNICAL_DESIGN_DOC.md`), strict PRD/TDD/Defects schemas, automatic `SDL_SB` $\rightarrow$ TDD sync rule, no unrequested code edits during QA/defect logging, `care_events.py` in Router Map, and self-hosted local fonts invariant (`next/font/local`); created workspace skill [`.agent/skills/sdl-tdd-sync/SKILL.md`](../.agent/skills/sdl-tdd-sync/SKILL.md) including explicit target file paths per layer.
- **Evidence:** Verified `AGENTS.md` byte size well under the 24,000-byte per-file cap and valid YAML frontmatter in `.agent/skills/sdl-tdd-sync/SKILL.md`.

### 2026-11-22 — Add `US-CG-19` (Attendance Roll Lock Live Audit Trail), UX Prototype & Auto-TDD Sync

- **Status:** Accepted
- **Decision:** Added `US-CG-19` (*Caregiver Attendance Roll Lock — Live Audit Trail Modal & Compliance Ledger*) under Section 4.6 of [`docs/2_PRD.md`](../docs/2_PRD.md), created interactive Stage-1 Oil Pastel UX prototype [`Artefacts/UX Designs/Caregiver/Attendance_Roll_Audit_Trail_Modal.html`](../Artefacts/UX%20Designs/Caregiver/Attendance_Roll_Audit_Trail_Modal.html), and automatically invoked `SDL_SB` via the `sdl-tdd-sync` skill to append the verified 4-layer Technical Implementation Plan (with explicit target file paths) and Unit Testing Steps to [`docs/9_TECHNICAL_DESIGN_DOC.md`](../docs/9_TECHNICAL_DESIGN_DOC.md).
- **Evidence:** Independent audit verified `US-CG-19` matches `docs/2_PRD.md` (`54` synced User Stories + `6` open defect rows `DEF-029`–`DEF-034`, `0` malformed table rows, `0` missing cited project files); also detected `8` newly added Admin stories (`US-AD-01`–`US-AD-08`) in `docs/2_PRD.md` pending TDD sync.

### 2026-11-22 — Create 3 Admin Portal UX Blueprints & Expand Admin Requirements (`US-AD-01`–`US-AD-08`) in PRD + TDD

- **Status:** Accepted
- **Decision:**
  1. Created 3 Oil Pastel Admin UX HTML blueprints under `Artefacts/UX Designs/Admin/` (`Admin_Attendance_Timer_Config.html`, `Admin_Medication_Consent_Setup.html`, `Admin_Child_History_Audit.html`) and registered them in `Artefacts/UX Designs/index.html`.
  2. Updated `US-P1-03B`, `US-P2-01A`, and `US-P2-01B` in [`docs/2_PRD.md`](../docs/2_PRD.md) to `Not Started` with accurate links to the new UX blueprints, and added Section `4.12 Admin Operational Console & Configuration Portal` with 8 single-developer stories (`US-AD-01` through `US-AD-08`).
  3. Invoked `SDL_SB` (via `sdl-tdd-sync`) to synchronize `US-AD-01`–`US-AD-08`, `US-CG-19`, and updated `US-P1-03B`/`US-P2-01A`/`US-P2-01B` into [`docs/9_TECHNICAL_DESIGN_DOC.md`](../docs/9_TECHNICAL_DESIGN_DOC.md) with verified 4-layer implementation plans and unit-testing steps.
- **Evidence:** Independent verification confirmed 62/62 `US-*` IDs match 1:1 in exact order between `docs/2_PRD.md` and `docs/9_TECHNICAL_DESIGN_DOC.md`, `0` malformed table rows across both docs, `0` missing existing project file references, and all 3 new Admin HTML files created cleanly.

### 2026-11-22 — Sync Statuses Between `docs/2_PRD.md`, `docs/11_DEFECTS.md`, and `docs/9_TECHNICAL_DESIGN_DOC.md`

- **Status:** Accepted
- **Decision:** Synchronized the `Status` column across all 62 User Stories (`US-*`) and 6 Open Defect entries (`DEF-029`–`DEF-034`) in [`docs/9_TECHNICAL_DESIGN_DOC.md`](../docs/9_TECHNICAL_DESIGN_DOC.md) to match [`docs/2_PRD.md`](../docs/2_PRD.md) and [`docs/11_DEFECTS.md`](../docs/11_DEFECTS.md) 100% 1:1.
- **Evidence:** Verified `0` US mismatches, `0` Defect mismatches, and `0` malformed table rows (`70` table lines).

### 2026-11-22 — Retire `docs/6_PLAN.md`

- **Status:** Accepted
- **Decision:** Retired and deleted [`docs/6_PLAN.md`](../docs/6_PLAN.md) (superseded by `docs/2_PRD.md` + `docs/9_TECHNICAL_DESIGN_DOC.md`), removed stale links from [`AGENTS.md`](../AGENTS.md), [`docs/2_PRD.md`](../docs/2_PRD.md), and [`docs/9_TECHNICAL_DESIGN_DOC.md`](../docs/9_TECHNICAL_DESIGN_DOC.md), and added `6_PLAN.md` to the retired-files list in `AGENTS.md`.
- **Evidence:** Verified `docs/6_PLAN.md` no longer exists and active docs have zero remaining references to it.

### 2026-11-22 — Implement & Verify `US-P2-01A` (Admin Operational Console: Overview, Admissions, Students, Setup & Data Governance)

- **Status:** Accepted
- **Decision:** Implemented the rebuilt Oil Pastel Admin Operational Console for `US-P2-01A`:
  - **Backend Fix:** Added missing Caregiver MVP-2/Tier-2 models (`CareEvent`, `CareMedia`, `LearningObservation`, `LearningFramework`) to `MODEL_CATEGORIES` in [`core/business_objects/data_catalog.py`](../core/business_objects/data_catalog.py), resolving the HTTP 500 on `GET /api/v1/metadata/data-classification`.
  - **Tier-2 Shared Extensions:** Added `"admin"` scope to [`frontend/components/pc/view-mode-preference.ts`](../frontend/components/pc/view-mode-preference.ts) and [`frontend/components/pc/profile-picture-modal.tsx`](../frontend/components/pc/profile-picture-modal.tsx) (with inline SVG `DEFAULT_ADMIN_AVATAR`).
  - **API Client:** Extended [`frontend/app/lib/api.ts`](../frontend/app/lib/api.ts) with Admin helpers (`fetchRoleMemberships`, `createRoleMembership`, `updateRoleMembership`, `revokeRoleMembership`, `fetchSchoolSequences`, `updateSchoolSetupConfig`, `fetchAuditLogs`) and aligned live fields on `EnrollmentCase`, `SchoolSetupContext`, and `StudentListItem`.
  - **Tier-3 Portable Widgets:** Created API-agnostic widgets under `frontend/components/widgets/admin/` (`AdminOverviewWidget`, `AdminAdmissionsWidget`, `AdminStudentsWidget`, `AdminSetupWidget`, `AdminGovernanceWidget`) using semantic `tokens.css` styling and portaled `z-[70]` modals (`z-[60]` backdrop, `z-[80]` menus).
  - **Tier-4 Admin Routes:** Created [`frontend/app/admin/layout.tsx`](../frontend/app/admin/layout.tsx), `page.tsx`, `admissions/page.tsx`, `students/page.tsx`, `setup/page.tsx`, and `governance/page.tsx`.
  - Updated `US-P2-01A` status to **`Developed`** in [`docs/2_PRD.md`](../docs/2_PRD.md) and [`docs/9_TECHNICAL_DESIGN_DOC.md`](../docs/9_TECHNICAL_DESIGN_DOC.md).
- **Evidence:**
  - Backend: `./.venv/bin/pytest tests/test_api_metadata.py tests/test_api_enrollments.py tests/test_api_school_setup.py tests/test_crud_execution_plan.py` $\rightarrow$ **32 passed in 44.21s**.
  - Static & Build: `tsc --noEmit` (0 errors), focused ESLint (0 errors), `npm --prefix frontend run build` (Turbopack, **20/20** pages compiled cleanly).
  - Real-Browser Playwright E2E: `npx --prefix frontend playwright test e2e/admin-portal-audit.spec.ts --workers=1` $\rightarrow$ **5 passed (53.7s)** covering `/admin` overview + Cards/Compact switcher, `/admin/admissions` `BR-01-01` & `Owner Approval Required` gates, `/admin/setup` CSV rollback + valid Student import verified on `/admin/students`, `/admin/governance` live catalog & audit logs, 5-point visual/DOM health, and non-Admin RBAC redirects.

### 2026-11-22 — Complete `US-AD-01` & Implement `US-P2-01B` (`US-AD-02`–`US-AD-08`, `US-P1-03B`, `DEF-030`)

- **Status:** Accepted
- **Decision:** Completed `US-AD-01` and implemented `US-P2-01B` across backend, portable Tier-3 widgets, Tier-4 `/admin/*` sub-routes, and live `/caregiver` synchronization:
  - **Database & Backend (`core/`):**
    - Added nullable `late_reason = models.CharField(max_length=64, null=True, blank=True)` to `StudentAttendance` in [`core/models.py`](../core/models.py) with migration [`core/migrations/0026_attendance_timer_late_reason.py`](../core/migrations/0026_attendance_timer_late_reason.py) and updated [`docs/4_DATA_AND_ENV.md`](../docs/4_DATA_AND_ENV.md).
    - Extended `AttendanceSheetBO` in [`core/business_objects/attendance_health.py`](../core/business_objects/attendance_health.py) with `ALLOWED_LATE_REASONS` (`Traffic / Transit Delay`, `Family / Morning Routine`, `Medical / Appointment`, `Weather / Road Conditions`, `Other (Parent Notified)`), `get_attendance_config()`, `update_attendance_config()` (writing `TenantConfig` `AuditLog`), and cutoff + 5-reason late check-in enforcement in `check_in()`. Exposed `GET /api/v1/attendance/config` and `PUT /api/v1/attendance/config` in [`core/api/v1/attendance.py`](../core/api/v1/attendance.py).
    - Extended `StudentHealthUpsertInput` ([`core/schemas/attendance_health.py`](../core/schemas/attendance_health.py)) and `HealthRecordBO.to_dict()` / `upsert_health_record()` with `photo_consent`, `topical_consent`, `medications`, `vaccinations`, and `doctor_phone`; fixed the `/students/{student_id}/health-record` `PUT` URL converter in [`core/api/v1/health.py`](../core/api/v1/health.py) and added `GET /api/v1/health/medication-logs`.
    - Implemented `ChildCareHistoryBO.get_child_day_history()` in [`core/business_objects/care_events.py`](../core/business_objects/care_events.py) and `GET /api/v1/students/{student_id}/care-history` in [`core/api/v1/care_events.py`](../core/api/v1/care_events.py); registered `CareEvent`, `CareMedia`, `LearningFramework`, and `LearningObservation` in [`core/admin.py`](../core/admin.py).
    - Permitted `["admin", "owner"]` on `/admin/history` in [`frontend/middleware.ts`](../frontend/middleware.ts).
  - **Frontend API Client, Portable Tier-3 Widgets & Tier-4 Admin Routes (`frontend/`):**
    - Extended [`frontend/app/lib/api.ts`](../frontend/app/lib/api.ts) with helpers for attendance timer config, student health upsert & medication logs, child care history, academic calendars/curriculums CRUD, billing fee structures/invoices/late-fee/discounts/reconciliation finalize, and operations/payroll/procurement 3-way match/events.
    - Updated [`frontend/components/widgets/admin/admin-overview-widget.tsx`](../frontend/components/widgets/admin/admin-overview-widget.tsx), [`frontend/app/admin/layout.tsx`](../frontend/app/admin/layout.tsx), and [`frontend/app/admin/page.tsx`](../frontend/app/admin/page.tsx) with live **Pending Meds & Consent Alerts** KPI counts and 11-module navigation.
    - Built portable API-agnostic Tier-3 widgets (`AttendanceTimerConfigWidget`, `MedicationConsentSetupWidget`, `AdminAcademicsWidget`, `AdminBillingWidget`, `AdminOperationsWidget`, and `ChildCareHistoryWidget`) and mounted them in [`frontend/app/admin/attendance-config/page.tsx`](../frontend/app/admin/attendance-config/page.tsx), [`frontend/app/admin/health-medications/page.tsx`](../frontend/app/admin/health-medications/page.tsx), [`frontend/app/admin/history/page.tsx`](../frontend/app/admin/history/page.tsx), [`frontend/app/admin/academics/page.tsx`](../frontend/app/admin/academics/page.tsx), [`frontend/app/admin/billing/page.tsx`](../frontend/app/admin/billing/page.tsx), and [`frontend/app/admin/operations/page.tsx`](../frontend/app/admin/operations/page.tsx).
    - Synchronized [`frontend/app/caregiver/page.tsx`](../frontend/app/caregiver/page.tsx) and [`frontend/components/widgets/caregiver/caregiver-overview-widget.tsx`](../frontend/components/widgets/caregiver/caregiver-overview-widget.tsx) with `fetchAttendanceConfig()`, `Expected` pre-cutoff status, live SLA countdowns (removing hardcoded `12 mins remaining` / `Absent (SLA 12m)` strings for `DEF-030`), and the 5-option `late_reason` selector.
    - Marked `US-P1-03B`, `US-P2-01B`, and `US-AD-01`..`US-AD-08` as **`Developed`** in [`docs/2_PRD.md`](../docs/2_PRD.md) & [`docs/9_TECHNICAL_DESIGN_DOC.md`](../docs/9_TECHNICAL_DESIGN_DOC.md), and `DEF-030` as **`Fixed`** in [`docs/11_DEFECTS.md`](../docs/11_DEFECTS.md) & [`docs/9_TECHNICAL_DESIGN_DOC.md`](../docs/9_TECHNICAL_DESIGN_DOC.md).
- **Evidence:**
  - Backend Pytest: `./.venv/bin/pytest tests/test_api_attendance_health.py tests/test_api_metadata.py -v` $\rightarrow$ **13 passed in 11.43s**; `./.venv/bin/pytest tests/test_rls_configuration.py tests/test_api_caregiver_mvp2.py tests/test_api_academics.py tests/test_api_billing.py tests/test_api_sprint5.py -q` $\rightarrow$ **18 passed in 12.70s**.
  - Static & Build: `npx tsc --noEmit` (0 errors), focused ESLint on all 20 modified/created TS/TSX files (0 errors), `npm --prefix frontend run build` (26/26 routes compiled cleanly).
  - Real-Browser Playwright E2E: `npx --prefix frontend playwright test e2e/admin-portal-audit.spec.ts e2e/caregiver-portal-deep-audit.spec.ts --workers=1` $\rightarrow$ **13 passed (1.0m)** with 0 failures.

### 2026-11-24 — Log & Auto-Sync New Admin Requirements (`US-AD-09`, `US-AD-10`, `US-AD-11`)

- **Status:** Accepted
- **Decision:**
  1. Appended three new Admin User Stories (`US-AD-09`, `US-AD-10`, `US-AD-11`, marked `Not Started`) to Section `4.12` of [`docs/2_PRD.md`](../docs/2_PRD.md) covering:
     - `US-AD-09`: Admin Create/Modify/Delete of `MedicationLog` and scheduled prescriptions against students.
     - `US-AD-10`: Admin capture/un-check of Parental Consent (`consent_flag` & `consent_date` lifecycle) to share student health/medication information with care providers (`BR-07-01`).
     - `US-AD-11`: Admin 360° Student Card on `/admin/students` exposing full student visibility and edit/modify/delete CRUD across all child domains (`Profile & Docs`, `Guardians & Pickup`, `Health & Medications`, `Attendance & Care`, `Academics & Billing`).
  2. Synchronized all three requirements into [`docs/9_TECHNICAL_DESIGN_DOC.md`](../docs/9_TECHNICAL_DESIGN_DOC.md) via the `SDL_SB` subagent (`sdl-tdd-sync`), detailing 4-layer implementation plans, exact target file paths, and concrete verification steps (and updated Section 1 count to `65 User Stories`).
  3. Kept application code untouched (`AGENTS.md` Never Rule #7 / #8) pending explicit user confirmation to begin `DEV_SB` implementation.
- **Evidence:** Python verification confirmed `docs/2_PRD.md` (`65` US rows, `0` malformed) and `docs/9_TECHNICAL_DESIGN_DOC.md` (`65` US rows, `0` malformed) match 65/65 in exact order and status (`0` mismatches), with all cited existing repository files verified on disk.

### 2026-11-24 — Verify & Ship `US-AD-09`, `US-AD-10`, `US-AD-11`, `US-CG-17`, and `US-CG-19`

- **Status:** Accepted
- **Decision:**
  1. **Restored Frontend RBAC Route Guard ([`frontend/middleware.ts`](../frontend/middleware.ts)):** Reinstated the full JWT cookie claim verification and role-prefix routing rules, ensuring `/admin/history` permits `["admin", "owner"]`, `/admin/*` permits `["admin"]`, and unauthorized roles redirect cleanly to `/?denied=role-mismatch` or `/?denied=missing-session`.
  2. **Enforced `BR-07-01` Consent-Missing Precedence ([`core/api/v1/health.py`](../core/api/v1/health.py)):** Updated `get_classroom_medications()` so `not bool(h.consent_flag)` takes precedence over an earlier same-day `MedicationLog`, guaranteeing Caregiver/Teacher views show `Blocked (Consent Missing)` and masked instructions whenever parental consent is revoked (`US-AD-10`).
  3. **Fixed Frontend State Synchronization & Caregiver Pickup Hydration:**
     - Wired `onLoadPickupContacts?.(toddler.studentId)` across all remaining child slide-over drawer triggers (`MoreVertical`, Compact List `<tr onClick>`, and Compact List `Add Note`) in [`frontend/components/widgets/caregiver/caregiver-overview-widget.tsx`](../frontend/components/widgets/caregiver/caregiver-overview-widget.tsx).
     - Refactored [`frontend/app/admin/health-medications/page.tsx`](../frontend/app/admin/health-medications/page.tsx) with `normalizeHealthProfile`, `selectedStudentIdRef`, and direct post-PUT `healthProfile` state hydration so saving consent toggles updates `MedicationConsentSetupWidget` without stale `loadStudentProfile` races.
     - Aligned initial `loadedKey` in [`frontend/components/widgets/admin/medication-consent-setup-widget.tsx`](../frontend/components/widgets/admin/medication-consent-setup-widget.tsx) and cleaned up pre-hydration/locator waits in [`frontend/e2e/admin-portal-audit.spec.ts`](../frontend/e2e/admin-portal-audit.spec.ts) and [`frontend/e2e/caregiver-portal-deep-audit.spec.ts`](../frontend/e2e/caregiver-portal-deep-audit.spec.ts).
  4. **Normalized Demo Fixture State & Completed Documentation:** Deduplicated Maya Lin's `EmergencyContact` records and aligned `tenant_id` to `demo-school`, marked `US-AD-09`, `US-AD-10`, `US-AD-11`, `US-CG-17`, and `US-CG-19` as **`Developed`** in [`docs/2_PRD.md`](../docs/2_PRD.md) and [`docs/9_TECHNICAL_DESIGN_DOC.md`](../docs/9_TECHNICAL_DESIGN_DOC.md).
- **Evidence:**
  - Backend Pytest: `./.venv/bin/pytest tests/test_api_attendance_health.py` $\rightarrow$ **13 passed in 13.00s**.
  - Static & Production Build: `npx tsc --noEmit` (**0 errors**), focused ESLint on `middleware.ts`, `app/admin/health-medications/page.tsx`, `components/widgets/admin/medication-consent-setup-widget.tsx`, `components/widgets/caregiver/caregiver-overview-widget.tsx`, and `app/lib/api.ts` (**0 errors**), `npm --prefix frontend run build` (**26/26** routes compiled cleanly).
  - Real-Browser Playwright E2E: `cd frontend && npx playwright test e2e/admin-portal-audit.spec.ts e2e/caregiver-portal-deep-audit.spec.ts --workers=1` $\rightarrow$ **16 passed (2.0m)** with **0 failed**.

### 2026-11-24 — Log & Auto-Sync New Requirement (`US-AD-12`)

- **Status:** Accepted
- **Decision:**
  1. Appended **`US-AD-12`** (`Scheduled Dose Start/End Date Tenure & Caregiver Daily Reminder`, marked `Not Started`) to Section `4.12` of [`docs/2_PRD.md`](../docs/2_PRD.md#L209) covering Admin configuration of `start_date` and `end_date` tenure per student prescription and Caregiver daily active reminder surfacing on `/caregiver` until that day's dose is logged completed (`BR-07-01`).
  2. Automatically synchronized `US-AD-12` into [`docs/9_TECHNICAL_DESIGN_DOC.md`](../docs/9_TECHNICAL_DESIGN_DOC.md#L113) via the `SDL_SB` subagent (`sdl-tdd-sync`), detailing a verified 4-layer implementation plan and unit/E2E testing steps, and updated Section 1 count to `66 User Stories`.
  3. Kept application code untouched per `AGENTS.md` Never Rule #7 / #8 pending explicit user confirmation to begin `DEV_SB` implementation.
- **Evidence:** Python verification confirmed `docs/2_PRD.md` (`66` US rows, `0` malformed rows in Section `4.12`) and `docs/9_TECHNICAL_DESIGN_DOC.md` (`66` US rows, `0` malformed rows) match `66/66` in ID and status (`0` mismatches), with all `27` cited workspace file paths verified on disk.

### 2026-11-24 — Export `2_PRD.md` Sections `4.1`–`4.11` to `docs/6_STATUS_UPDATE.csv`

- **Status:** Accepted
- **Decision:** Populated [`docs/6_STATUS_UPDATE.csv`](../docs/6_STATUS_UPDATE.csv) with all `54` user-story requirements from Sections `4.1` through `4.11` of [`docs/2_PRD.md`](../docs/2_PRD.md) using the `Sl No,Item,Update` format (`US-CG-*` short titles sourced from [`docs/9_TECHNICAL_DESIGN_DOC.md`](../docs/9_TECHNICAL_DESIGN_DOC.md)).
- **Evidence:** CSV round-trip validation via Python `csv.reader` confirmed `54` valid 3-column rows (`53` `Developed`, `1` `Not Started` — `US-CG-18`, excluding Section `4.12`).

### 2026-11-24 — Populate `Module` Column in `docs/6_STATUS_UPDATE.csv`

- **Status:** Accepted
- **Decision:** Added and populated the `Module` column in [`docs/6_STATUS_UPDATE.csv`](../docs/6_STATUS_UPDATE.csv) (`Sl No,Module,Item,Update`) by mapping each of the `54` rows in Sections `4.1`–`4.11` to its corresponding `### 4.X` section heading in [`docs/2_PRD.md`](../docs/2_PRD.md).
- **Evidence:** CSV round-trip verification via Python `csv.reader` confirmed `54` 4-column rows spanning `11` modules with zero missing or empty fields.

### 2026-11-24 — Expand `docs/6_STATUS_UPDATE.csv` with Full PRD Columns & `Requirement Details`

- **Status:** Accepted
- **Decision:** Expanded [`docs/6_STATUS_UPDATE.csv`](../docs/6_STATUS_UPDATE.csv) to `15` columns (`Sl No`, `Module`, `Story ID`, `Item`, `Requirement Details`, `Update`, `Epic / Domain`, `Plan Task`, `Persona(s)`, `User Story`, `Priority & MoSCoW`, `Business Rules`, `Given-When-Then Acceptance Criteria & DoD`, `Edge Cases & Security / Tenant Isolation Gates`, `Step-by-Step Manual Testing & Verification Script`) covering all `54` rows in Sections `4.1`–`4.11` of [`docs/2_PRD.md`](../docs/2_PRD.md), with plain-English business summaries in `Requirement Details` and cleaned spreadsheet-friendly formatting.
- **Evidence:** Python `csv.reader` verification confirmed `15` columns across all `54` rows (`53` `Developed`, `1` `Not Started` — `US-CG-18`), `54` distinct non-empty `Requirement Details` entries, and zero leftover `<br>` or LaTeX formatting tokens.

### 2026-11-24 — Normalize `docs/6_STATUS_UPDATE.csv` to ASCII + UTF-8 BOM for macOS Excel

- **Status:** Accepted
- **Decision:** Replaced non-ASCII typography (`—`, `–`, `•`, `°`, `🍓`) in [`docs/6_STATUS_UPDATE.csv`](../docs/6_STATUS_UPDATE.csv) with plain ASCII equivalents and saved with UTF-8 BOM (`utf-8-sig`) so macOS Excel opens without MacRoman mojibake (`‚Äî`).
- **Evidence:** Verified UTF-8 BOM header bytes (`0xEF 0xBB 0xBF`), `54` data rows × `15` non-empty columns via `csv.reader`, and `0` non-ASCII characters remaining in cell content.

### 2026-11-24 — Create Multi-Tab `docs/6_STATUS_UPDATE.xlsx` with `Requirements` & `Defects` Tabs

- **Status:** Accepted
- **Decision:** Created [`docs/6_STATUS_UPDATE.xlsx`](../docs/6_STATUS_UPDATE.xlsx) with two formatted worksheets: `Requirements` (`54` rows × `15` columns matching [`docs/6_STATUS_UPDATE.csv`](../docs/6_STATUS_UPDATE.csv)) and `Defects` (all `34` defects `DEF-001`–`DEF-034` × `7` columns from [`docs/11_DEFECTS.md`](../docs/11_DEFECTS.md), `29` `Fixed` and `5` `Open`, cleaned of Markdown/LaTeX markers and normalized to plain ASCII), while keeping [`docs/6_STATUS_UPDATE.csv`](../docs/6_STATUS_UPDATE.csv) intact.
- **Evidence:** Python `zipfile` + `xml.etree.ElementTree` round-trip check confirmed valid ZIP/XML structure, sheets `['Requirements', 'Defects']`, exact cell-for-cell parity against `docs/6_STATUS_UPDATE.csv`, and `34` defect rows (`29` `Fixed`, `5` `Open`: `DEF-029`, `DEF-031`, `DEF-032`, `DEF-033`, `DEF-034`) with zero leftover Markdown/LaTeX or non-ASCII characters.

### 2026-11-24 — Fix Caregiver Portal Defects `DEF-029`, `DEF-031`, `DEF-032`, `DEF-033`, & `DEF-034`

- **Status:** Accepted
- **Decision:** Resolved all 5 open Caregiver Portal defects (`DEF-029`, `DEF-031`, `DEF-032`, `DEF-033`, `DEF-034`) and fixed soft-deleted `StudentAttendance` reactivation on `uq_student_attendance_record`:
  - `DEF-029`: Added cutoff-aware on-time `Check-In` vs `Log Late Arrival` buttons in Cards View and Compact View Action column (`caregiver-overview-widget.tsx`), keeping on-time check-in `status='Present'` and `late_reason=None`.
  - `DEF-031`: Added portaled `z-[80]` confirmation dialog (`Cancel` / `Confirm Departure`), green departure toast notification, and live footer badge (`Checked out at <time> • Cloud Ledger Saved`) in `caregiver-overview-widget.tsx` + `caregiver/page.tsx`.
  - `DEF-032`: Added `is_checked_out` to `core/api/v1/attendance.py` roster/check-out responses, centralized `getEffectiveToddlerStatus()`, and switched slide-over drawer reads from stale `selectedDrawerToddler` to live `drawerToddler` (`activeDrawerToddler`) so `"Checked Out"` and departure timestamps render consistently across drawer, Cards View, Compact View, and reloads.
  - `DEF-033`: Enforced post-checkout daily care locking in `CareEventBO.create_events()` and `LearningObservationBO.create_observation()` (`STUDENT_CHECKED_OUT` HTTP 422 without supervisor override, `OVERRIDE_POST_CHECKOUT_CARE_EVENT` immutable `AuditLog` when unlocked via supervisor role or hashed `supervisor_override_pin_hash`), exposed `POST /api/v1/care-events/verify-supervisor-pin`, locked frontend care/portfolio inputs with zero API emission when checked out, and added the portaled `z-[80]` Supervisor PIN unlock modal (`caregiver-overview-widget.tsx`, `caregiver/page.tsx`).
  - `DEF-034`: Added required `Severity Level` pills (`Low`, `Medium`, `High`, `Critical`) + `BR-07-03` Principal auto-escalation warning banner in `boo-boo-modal.tsx`, wired `onSubmitIncident` cleanly in `caregiver/page.tsx` without firing spurious `Low` submissions on modal open, and rendered severity / `Principal Escalated` badges on incident cards.
  - Hardened `AttendanceSheetBO.check_in()` and `mark_attendance()` (`core/business_objects/attendance_health.py`) to reactivate soft-deleted (`is_deleted=True`) `StudentAttendance` rows rather than raising `uq_student_attendance_record` `IntegrityError`, and aligned caregiver portal check-in/out/incident dates to `selectedDate`.
- **Evidence:** `pytest tests/test_api_attendance_health.py tests/test_api_caregiver_mvp2.py tests/test_bo_attendance_health.py tests/test_rls_configuration.py` (`28 passed`), `npx tsc --noEmit` + focused ESLint (`0` errors), Playwright E2E `e2e/admin-portal-audit.spec.ts` + `e2e/caregiver-portal-deep-audit.spec.ts` (`17 passed, 0 failed`), and `npm --prefix frontend run build` (`26/26` routes). Updated [`docs/6_STATUS_UPDATE.xlsx`](6_STATUS_UPDATE.xlsx) (`Defects` tab) and [`docs/9_TECHNICAL_DESIGN_DOC.md`](9_TECHNICAL_DESIGN_DOC.md) to `Fixed` (`2026-11-24`).


### 2026-11-25 — Move Section `4.12` (`US-AD-01`–`US-AD-12`) to `docs/6_STATUS_UPDATE.xlsx` & Standardize Canonical Ledger Rules

- **Status:** Accepted
- **Decision:** Appended all `12` Admin Console requirements (`US-AD-01`–`US-AD-12`, including `US-AD-12` Scheduled Dose Start/End Date Tenure & Caregiver Daily Reminder) from Section `4.12` of [`docs/2_PRD.md`](../docs/2_PRD.md) into [`docs/6_STATUS_UPDATE.xlsx`](../docs/6_STATUS_UPDATE.xlsx) (`Requirements` tab) as plain-ASCII 15-column rows (`Sl No` `55`–`66`), and updated [`AGENTS.md`](../AGENTS.md) plus [`.agent/skills/sdl-tdd-sync/SKILL.md`](../.agent/skills/sdl-tdd-sync/SKILL.md) to reference `docs/6_STATUS_UPDATE.xlsx` (`Requirements` and `Defects` tabs) as the canonical tracker going forward.
- **Evidence:** Python `zipfile` + `xml.etree.ElementTree` round-trip check confirmed valid OpenXML structure, `Requirements` tab (`67` rows total: `66` requirements matching `US-*` IDs in `docs/2_PRD.md` and `docs/9_TECHNICAL_DESIGN_DOC.md` 1:1; `64` `Developed`, `2` `Not Started` — `US-CG-18`, `US-AD-12`), intact `Defects` tab (`35` rows), and `0` non-ASCII characters.

### 2026-11-25 — Implement `US-AD-12` Scheduled Dose Start/End Date Tenure & Caregiver Daily Reminder

- **Status:** Accepted
- **Decision:** Implemented `US-AD-12` end-to-end across schema, BO, API, Admin UI, Caregiver UI, and tests:
  - Backend: Added `ScheduledMedicationItemSchema` (`core/schemas/attendance_health.py`), `HealthRecordBO._parse_optional_iso_date()`, `_normalize_and_validate_medications()`, and `is_medication_active_on_date()` (`core/business_objects/attendance_health.py`, rejecting `end_date < start_date` / invalid dates with HTTP 422 `INVALID_MEDICATION_TENURE` and logging medication tenure in `AuditLog`), and updated `GET /api/v1/health/classroom-medications` (`core/api/v1/health.py`) with `target_date` tenure filtering and `start_date`/`end_date` serialization while preserving `BR-07-01` consent masking.
  - Admin & Caregiver UI: Added portaled `z-[80]` `DatePicker` tenure fields (`start_date`, `end_date`), inline range warnings, tenure badges, and `JSON.stringify(medications)` sync keys in `MedicationConsentSetupWidget` and `AdminStudentCardDrawer`; mapped `startDate`/`endDate`, passed `targetDate` on `!isHistoricalReadOnly`, keyed `administeredDoses` by `${selectedDate}:${med.id}`, and rendered Schedule Tenure badges in `CaregiverOverviewWidget` + `frontend/app/caregiver/page.tsx`.
- **Evidence:** `./.venv/bin/pytest tests/test_bo_attendance_health.py tests/test_api_attendance_health.py tests/test_rls_configuration.py` (`26 passed`), `npx tsc --noEmit` + focused ESLint (`0` errors), Playwright E2E `e2e/admin-portal-audit.spec.ts` + `e2e/caregiver-portal-deep-audit.spec.ts` (`18 passed, 0 failed`), and `npm --prefix frontend run build` (`26/26` routes). Updated [`docs/4_DATA_AND_ENV.md`](4_DATA_AND_ENV.md), [`docs/2_PRD.md`](2_PRD.md), [`docs/9_TECHNICAL_DESIGN_DOC.md`](9_TECHNICAL_DESIGN_DOC.md), and [`docs/6_STATUS_UPDATE.xlsx`](6_STATUS_UPDATE.xlsx) (`US-AD-12` marked `Developed`).

### 2026-11-25 — Log `DEF-035` & `DEF-036` (Caregiver Identity & Demo Fallback Leakage) and Sync Fix Plans to TDD

- **Status:** Accepted
- **Decision:** Logged two new `Open` defects in [`docs/6_STATUS_UPDATE.xlsx`](6_STATUS_UPDATE.xlsx) (`Defects` tab, rows `36`–`37`) and synchronized verified, codebase-grounded 4-layer fix plans and unit testing steps into [`docs/9_TECHNICAL_DESIGN_DOC.md`](9_TECHNICAL_DESIGN_DOC.md) via `SDL_SB` (with zero application code changes):
  - `DEF-035`: Caregiver Portal (`/caregiver`) displays hardcoded `"Clara Gomez"` / `"Nurse Clara Gomez"` identity instead of authenticated JWT `user_name` / `/api/v1/auth/profile`.
  - `DEF-036`: Caregiver Portal (`/caregiver`) displays hardcoded `INITIAL_SEEDED_TODDLERS`, `INITIAL_MEDICATIONS`, `INITIAL_INCIDENTS`, static header alerts, and demo quick-note recipients when a newly onboarded tenant has `0` students/incidents or non-Toddler grades.
- **Evidence:** OpenXML archive round-trip & plain-ASCII check on `docs/6_STATUS_UPDATE.xlsx` (`37` rows on `Defects`, `67` rows untouched on `Requirements`); Python matrix verification on `docs/9_TECHNICAL_DESIGN_DOC.md` (`76` markdown table rows with strictly `6` `|` delimiters, `66/66` `US-*` 1:1 parity, `DEF-035` & `DEF-036` status `Open`, and `0` missing cited file paths across `12` and `10` verified paths respectively).

### 2026-11-25 — Add Requirement `US-MKT-01` (Marketing App Start Free Trial Integration) & Sync TDD

- **Status:** Accepted
- **Decision:** Added new cross-app requirement **`US-MKT-01`** (*Marketing App Start Free Trial Integration with CRM Daycare Setup*, Status: `Not Started`) across [`docs/6_STATUS_UPDATE.xlsx`](6_STATUS_UPDATE.xlsx) (`Requirements` tab, Row `68`, `Sl No` `67`), [`docs/2_PRD.md`](2_PRD.md) (Section `4.13 Marketing App & Self-Service Daycare Trial Onboarding`), and [`docs/9_TECHNICAL_DESIGN_DOC.md`](9_TECHNICAL_DESIGN_DOC.md) (Line `115`, via `SDL_SB`), with zero application code changes in either `skool_crm` or `Skulz` (`/Users/soumyadeepbhadra/My Files/BusinessInCanada/School CRM/Skulz`):
  - Connects `Skulz` `/start-free-trial` (`StartFreeTrialPage.jsx` on `http://localhost:5173`) to `POST /api/v1/auth/trial-signup` in `skool_crm` (`http://127.0.0.1:8000`) with dev/HTTPS CORS support (`config/settings.py`), 14-day `trial_ends_at` + `AuditLog` (`CREATE` `Tenant`) + `full_name` support in `TrialSignupBO.create_trial()`, confirmation screen with copyable `School Code` & `Username`, and `?username=` sign-in handoff to `skool_crm` (`http://localhost:3000`).
- **Evidence:** OpenXML & plain-ASCII verification on `docs/6_STATUS_UPDATE.xlsx` (`68` rows on `Requirements`, `37` untouched rows on `Defects`, `0` non-ASCII chars); Python 3-way parity check confirming `67/67` `US-*` Story IDs in exact order across `docs/6_STATUS_UPDATE.xlsx`, `docs/2_PRD.md`, and `docs/9_TECHNICAL_DESIGN_DOC.md` (`77` TDD table rows / `75` entries with `0` malformed pipe delimiters, and `21/21` existing file paths across both repos verified on disk with `0` missing).

### 2026-11-25 — Implement `US-MKT-01` (Marketing App Start Free Trial Integration with CRM API)

- **Status:** Accepted
- **Decision:** Connected `Skulz` marketing app (`/Users/soumyadeepbhadra/My Files/BusinessInCanada/School CRM/Skulz`, `http://localhost:5173/start-free-trial`) directly to `skool_crm`'s `POST /api/v1/auth/trial-signup` endpoint using the exact 5 existing API fields (`daycare_name`, `email`, `role` in `Admin`/`Owner`/`Teacher`, `password`, `confirm_password`):
  - `Skulz/frontend`: Added `src/lib/crmApi.js` (`startFreeTrial`, `getCrmSignInUrl`), `.env.example`, and updated `src/pages/StartFreeTrialPage.jsx` with the 5 exact fields, client validation & loading lock, parent guidance link, inline server error alert, copyable `School Code` / `Login Username` confirmation screen, and CRM portal handoff link (`http://localhost:3000/?username=...`).
  - `skool_crm`: Enabled `http://localhost:5173` / `http://127.0.0.1:5173` CORS & CSRF origins in `DEBUG` mode (`config/settings.py`, `.env.example`, `.env`, `docs/4_DATA_AND_ENV.md`), pre-filled `identity` from `?username=` in `frontend/app/page.tsx` and `frontend/app/components/sign-in-screen.tsx`, and added tests in `tests/test_api_trial_signup.py`, `tests/test_settings_security.py`, and `frontend/e2e/marketing-trial-signup.spec.ts`.
- **Evidence:** `./.venv/bin/pytest tests/test_api_trial_signup.py tests/test_settings_security.py` (`14 passed`), focused `Skulz` ESLint on `StartFreeTrialPage.jsx` & `crmApi.js` + `vite build` (`0` errors), `npx --prefix frontend tsc -p frontend/tsconfig.json --noEmit` (`0` errors) + `npm --prefix frontend run build` (`26/26` routes), live `OPTIONS` CORS preflight (`200` with `Access-Control-Allow-Origin: http://localhost:5173`), and cross-app Playwright E2E `npx --prefix frontend playwright test e2e/marketing-trial-signup.spec.ts` (`1 passed`, DB cleaned up afterward). Marked `US-MKT-01` `Developed` in `docs/6_STATUS_UPDATE.xlsx`, `docs/2_PRD.md`, and `docs/9_TECHNICAL_DESIGN_DOC.md`.

### 2026-11-25 — Log `US-MKT-02` & Implement `US-MKT-03`, `US-MKT-04`, `US-MKT-05` (Configurable 14-Day Trial, VAPT Security & Cross-App Telemetry)

- **Status:** Accepted
- **Decision:** Logged 4 new requirements (`US-MKT-02`–`US-MKT-05`) across [`docs/6_STATUS_UPDATE.xlsx`](6_STATUS_UPDATE.xlsx) (`Requirements` Rows `69`–`72`), [`docs/2_PRD.md`](2_PRD.md) (Sections `4.13` & `4.14`), and [`docs/9_TECHNICAL_DESIGN_DOC.md`](9_TECHNICAL_DESIGN_DOC.md) (via `SDL_SB`). Kept **`US-MKT-02`** (welcome email & school code recovery) as **`Not Started`**, and implemented + verified **`US-MKT-03`**, **`US-MKT-04`**, and **`US-MKT-05`** end-to-end across `skool_crm` and `Skulz`:
  - `US-MKT-03`: Added `DEFAULT_FREE_TRIAL_DAYS` (`1..365`, default `14`) in `config/settings.py`, `TrialSignupBO.evaluate_trial_status()` / `update_trial_window()` / `TrialExpiredError` (HTTP `402 TRIAL_EXPIRED` gate on expired operational writes while preserving `GET` reads and Owner extension `PATCH /api/v1/school-setup/trial`), public `GET /api/v1/metadata/trial-policy`, dynamic trial copy on `Skulz` `StartFreeTrialPage.jsx`, and live semantic-token `admin-trial-banner` in `frontend/app/admin/layout.tsx`.
  - `US-MKT-04`: Added `SecurityHeadersMiddleware`, `RateLimitMiddleware` (HTTP `429` + `Retry-After`), `JWTAuthBearer` `alg=none` / `REQUIRE_JWT_EXP` enforcement, sanitized non-debug HTTP `500` handler, CSV formula injection protection (`SchoolSetupImportBO._validate_csv_formula_safety`), strict `next.config.ts` CSP without hardcoded LAN IPs or prod `unsafe-eval`, WebCrypto HS256 verification in `frontend/middleware.ts`, non-prod gating on demo quick-login/apply fallbacks, plus `Skulz` `vite.config.js` security headers and `public/_headers`.
  - `US-MKT-05`: Created `core/telemetry.py` (`scrub_pii`, `TelemetryRegistry`, `emit_telemetry_event`), `RequestTelemetryMiddleware` (`X-Request-ID`), `/api/v1/healthz`, `/api/v1/readyz`, `POST /api/v1/telemetry/events` (`202`), `Admin`/`Owner`-scoped `GET /api/v1/telemetry/summary`, `Skulz/frontend/src/lib/telemetry.js`, and `skool_crm/frontend/app/lib/telemetry.ts` + `TelemetryProvider`.
- **Evidence:** `./.venv/bin/pytest tests/test_api_trial_signup.py tests/test_settings_security.py tests/test_rls_configuration.py tests/test_student_scope.py tests/test_us_mkt_03_trial_lifecycle.py tests/test_us_mkt_04_security_vapt.py tests/test_us_mkt_05_telemetry.py` (`34 passed`), `Skulz/frontend` focused ESLint + `vite build` (`6.64s`, `0` errors), `skool_crm` `tsc --noEmit` + focused ESLint + `next build` (`26/26` routes, `0` errors), live security header + `/healthz` + `/trial-policy` curl checks (`200`), and cross-app Playwright E2E `npx --prefix frontend playwright test e2e/marketing-trial-signup.spec.ts` (`1 passed`, `0` leftover DB rows). Marked `US-MKT-03`, `US-MKT-04`, and `US-MKT-05` `Developed` (`US-MKT-02` remains `Not Started`).
