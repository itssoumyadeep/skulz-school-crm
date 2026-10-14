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
