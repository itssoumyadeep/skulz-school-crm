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







