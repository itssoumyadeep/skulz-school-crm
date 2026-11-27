# AGENTS.md

Multi-tenant School CRM built with **Django + Django Ninja** (`core/`), **PostgreSQL** (`TenantScopedModel` + RLS), **JWT RBAC** (`core/auth/`), and **Next.js App Router** (`frontend/`).

## 1. Selective Reading Rule (Do NOT Read Everything Upfront)

Read **only** the files required for your current task:

| Task Type | Read Only These Files Before Editing |
| :--- | :--- |
| **Product / Backlog Scope** | [`docs/6_STATUS_UPDATE.xlsx`](docs/6_STATUS_UPDATE.xlsx) (`Requirements` tab) |
| **Technical Design (TDD)** | [`docs/9_TECHNICAL_DESIGN_DOC.md`](docs/9_TECHNICAL_DESIGN_DOC.md) — **never read in full**; locate the Requirement/Defect ID line via `grep -n` and read only that 1-line row (see `sdl-tdd-sync` skill) |
| **Business Rules (BO Layer)** | Target `core/business_objects/<domain>.py` + matching section in [`docs/rule_registry.md`](docs/rule_registry.md) |
| **API Route / Schema Change** | Target `core/api/v1/<domain>.py` + `core/schemas/<domain>.py` |
| **Database / Model / Env Change** | `core/models.py` + [`docs/4_DATA_AND_ENV.md`](docs/4_DATA_AND_ENV.md) |
| **Auth / RBAC / Tenant RLS** | `core/auth/` (`bearer.py`, `decorators.py`, `scoping.py`) + [`docs/1_SECURITY.md`](docs/1_SECURITY.md) |
| **Frontend / Portal UI Change** | Target route in `frontend/app/`, `frontend/styles/tokens.css`, `frontend/components/ui`, `frontend/components/pc`, `frontend/components/widgets` + [`docs/5_DESIGN.md`](docs/5_DESIGN.md) |
| **Architecture / Status** | [`docs/3_ARCHITECTURE.md`](docs/3_ARCHITECTURE.md) |
| **Defects / Bug Fixes** | [`docs/6_STATUS_UPDATE.xlsx`](docs/6_STATUS_UPDATE.xlsx) (`Defects` tab) + target module files |

*Ignore `docs/reference/` unless explicitly requested.*

---

## 2. Never Rules

1. **No Secrets:** Never commit, log, or hardcode real secrets, tokens, private keys, or credentials.
2. **No Scope Bypass:** Never bypass `tenant_id=request.tenant_id`, `is_deleted=False`, `@require_roles(...)`, object-level guards (`verify_student_access`, `verify_application_access`, `verify_vendor_access`), or Business Object (`BO`) rules.
3. **No Unchecked Schema Changes:** Never add/alter a database table without a migration, RLS policy coverage (`0020_enable_tenant_rls`), and an update to [`docs/4_DATA_AND_ENV.md`](docs/4_DATA_AND_ENV.md).
4. **No Broad Refactors:** Keep edits minimal, targeted, and consistent with existing naming and patterns.
5. **No Untested Changes:** Always run the narrowest relevant test/build check before finishing.
6. **Memory Log Required:** Append a brief dated decision/status entry to [`docs/7_MEMORY_LOG.md`](docs/7_MEMORY_LOG.md) (append-only; never read the full file) when completing a task.
7. **Defect, Requirement & Auto-TDD Sync Required:**
   - Log every defect in [`docs/6_STATUS_UPDATE.xlsx`](docs/6_STATUS_UPDATE.xlsx) (`Defects` tab) using its 7-column table (`Defect Id | Date Raised | Issue Description | Reviewed by Me | Resolution | Status | Fixed Date`) normalized to plain ASCII.
   - [`docs/6_STATUS_UPDATE.xlsx`](docs/6_STATUS_UPDATE.xlsx) (`Requirements` tab, 15-column plain-ASCII format) is the canonical status ledger where all new and updated requirements must be listed going forward (keep [`docs/2_PRD.md`](docs/2_PRD.md) in sync if referenced). Retired files `6_PLAN.md`, `8_PRODUCT_BACKLOG_STORIES.md`, `9_CURRENT_JOB_EXECUTION_PLAN.md`, and `12_CAREGIVER_REQUIREMENTS.md` must not be recreated.
   - Whenever **any new Requirement or Defect is added**, automatically invoke a fresh `SDL_SB` subagent per task (via the `sdl-tdd-sync` skill, retiring it once verified) to append its verified, new-developer-ready 4-layer Technical Implementation Plan and Unit Testing Steps to [`docs/9_TECHNICAL_DESIGN_DOC.md`](docs/9_TECHNICAL_DESIGN_DOC.md) (2 sections, 5-column matrix, zero assumed/unverified symbols).
   Don't start the development when the request is to add the requirement. Clarify when to start the development and accordingly proceed with the DEV_SB sub-agent.
8. **No Unrequested Code Edits During QA / Logging:** When the user asks to explain an issue, inspect state, or log a defect/requirement during manual testing, do **not** modify application code until explicitly asked to fix it.


## 3. Backend Conventions (`core/`)

- **3-Layer Split:** Persistence in `core/models.py` (`TenantScopedModel`) $\rightarrow$ domain rules in `core/business_objects/` $\rightarrow$ payload schemas in `core/schemas/` $\rightarrow$ HTTP routes in `core/api/v1/`.
- **Route Pattern:** Authenticate via `JWTAuthBearer()`, authorize via `@require_roles(...)` and `core/auth/scoping.py`, query with `get_object_or_404(..., tenant_id=request.tenant_id, is_deleted=False)`, and return `build_response(...)` / `build_error(...)`.
- **Router Map (`core/api/v1/`):** `auth.py`, `enrollments.py`, `academics.py`, `attendance.py`, `health.py`, `care_events.py`, `billing.py`, `sprint5.py` (HR/payroll/vendors/events/comms), `analytics.py`, `school_setup.py`, `metadata.py`.

---

## 4. Mandatory Frontend UI Rules (`frontend/`)

1. **4-Tier Component Hierarchy:** Compose from Tier 1 (`frontend/components/ui`) $\rightarrow$ Tier 2 (`frontend/components/pc`) $\rightarrow$ Tier 3 portable functional widgets (`frontend/components/widgets/<domain>/`) $\rightarrow$ Tier 4 thin portal route containers (`frontend/app/`). Do not build duplicate controls or raw HTML tables/inputs.
2. **Portable Widget Contract:** Widgets in `frontend/components/widgets/` must be 100% API-agnostic (pure props + callbacks, zero `@/app/lib/api` or router imports) and adapt via boolean `capabilities` flags (`WidgetBaseProps`) rather than hardcoded role names.
3. **No Hardcoded Colors:** Use semantic Tailwind utilities backed by `frontend/styles/tokens.css`. Never use hex/RGB/HSL literals or arbitrary color classes.
4. **3-Stage UI Workflow:** Static HTML mockups in `Artefacts/UX Designs/` $\rightarrow$ portable widgets in `frontend/components/widgets/<domain>/` (`.types.ts` + `.tsx`) $\rightarrow$ thin route assembly in `frontend/app/`.
5. **Self-Hosted Local Fonts Only:** Keep self-hosted `.woff2` fonts in `frontend/app/fonts/` loaded via `next/font/local` in `frontend/app/layout.tsx`. Never re-introduce external `next/font/google` stylesheets (breaks Next.js 16 Turbopack builds and triggers CSP violations).

---

## 5. Required Work Cycle & Validation Commands

1. Identify what's been asked. a. Update/Add/Delete a Requirement or Defect, b. Update/Add/Delete a Code , c. Update Status of a task
   a. When asked to update/add/delete a requirement or defect, update the requirement or defect in the respective file.
   b. When asked to update/add/delete a code, update the code in the respective file; follow the 9_TECHNICAL_DESIGN_DOC.md file strictly for the requirement.
   c. When asked to update the status of a task, update the status of the task in the 6_STATUS_UPDATE.xlsx file.
2. Read only the relevant files first. Understand the context and target code and domain files from the table above.
3. Implement the minimal changes across Schema / BO / Route / UI.
4. Run focused verification:
   - **Backend:** `pytest <path/to/test_file.py>` (or `python manage.py test`)
   - **Frontend:** focused ESLint on changed files + `npm run build` (from `frontend/`) + **Playwright E2E browser verification** (Only when mentioned in prompt)via the global `playwright-e2e-testing` skill and `playwright-qa` agent (`npx --prefix frontend playwright test`).
5. Append a dated entry to [`docs/7_MEMORY_LOG.md`](docs/7_MEMORY_LOG.md)
