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




















### 2026-11-08 — Parent Signup Activation State CI Repair

- **Status:** Completed & Verified (PR #2)
- **Decision:** Updated `POST /api/v1/auth/signup` to create newly registered parent users with `is_active=False` and return `status: "pending_activation"`, matching the auth API contract and test expectations for pending account activation.
- **Verification:** `pytest /home/runner/work/skulz-school-crm/skulz-school-crm/tests/test_api_auth.py -k signup_creates_parent_user_with_hashed_password_and_tenant_membership` passed.
- **Evidence:** [`core/api/v1/auth.py`](../core/api/v1/auth.py), [`tests/test_api_auth.py`](../tests/test_api_auth.py).
