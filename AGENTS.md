# AGENTS.md

Multi-tenant School CRM built with **Django + Django Ninja** (`core/`), **PostgreSQL** (`TenantScopedModel` + RLS), **JWT RBAC** (`core/auth/`), and **Next.js App Router** (`frontend/`).

## 1. Selective Reading Rule (Do NOT Read Everything Upfront)

Read **only** the files required for your current task:

| Task Type | Read Only These Files Before Editing |
| :--- | :--- |
| **Product / Backlog Scope** | [`docs/2_PRD.md`](docs/2_PRD.md), [`docs/8_PRODUCT_BACKLOG_STORIES.md`](docs/8_PRODUCT_BACKLOG_STORIES.md) |
| **Business Rules (BO Layer)** | Target `core/business_objects/<domain>.py` + matching section in [`docs/rule_registry.md`](docs/rule_registry.md) |
| **API Route / Schema Change** | Target `core/api/v1/<domain>.py` + `core/schemas/<domain>.py` |
| **Database / Model / Env Change** | `core/models.py` + [`docs/4_DATA_AND_ENV.md`](docs/4_DATA_AND_ENV.md) |
| **Auth / RBAC / Tenant RLS** | `core/auth/` (`bearer.py`, `decorators.py`, `scoping.py`) + [`docs/1_SECURITY.md`](docs/1_SECURITY.md) |
| **Frontend / Portal UI Change** | Target route in `frontend/app/`, `frontend/styles/tokens.css`, `frontend/components/ui`, `frontend/components/pc` + [`docs/5_DESIGN.md`](docs/5_DESIGN.md) |
| **Architecture / Sprint Status** | [`docs/3_ARCHITECTURE.md`](docs/3_ARCHITECTURE.md), [`docs/6_PLAN.md`](docs/6_PLAN.md) |

*Ignore `docs/reference/` unless explicitly requested.*

---

## 2. Never Rules

1. **No Secrets:** Never commit, log, or hardcode real secrets, tokens, private keys, or credentials.
2. **No Scope Bypass:** Never bypass `tenant_id=request.tenant_id`, `is_deleted=False`, `@require_roles(...)`, object-level guards (`verify_student_access`, `verify_application_access`, `verify_vendor_access`), or Business Object (`BO`) rules.
3. **No Unchecked Schema Changes:** Never add/alter a database table without a migration, RLS policy coverage (`0020_enable_tenant_rls`), and an update to [`docs/4_DATA_AND_ENV.md`](docs/4_DATA_AND_ENV.md).
4. **No Broad Refactors:** Keep edits minimal, targeted, and consistent with existing naming and patterns.
5. **No Untested Changes:** Always run the narrowest relevant test/build check before finishing.
6. **Memory Log Required:** Append a brief dated decision/status entry to [`docs/7_MEMORY_LOG.md`](docs/7_MEMORY_LOG.md) when completing a task.

---

## 3. Backend Conventions (`core/`)

- **3-Layer Split:** Persistence in `core/models.py` (`TenantScopedModel`) $\rightarrow$ domain rules in `core/business_objects/` $\rightarrow$ payload schemas in `core/schemas/` $\rightarrow$ HTTP routes in `core/api/v1/`.
- **Route Pattern:** Authenticate via `JWTAuthBearer()`, authorize via `@require_roles(...)` and `core/auth/scoping.py`, query with `get_object_or_404(..., tenant_id=request.tenant_id, is_deleted=False)`, and return `build_response(...)` / `build_error(...)`.
- **Router Map (`core/api/v1/`):** `auth.py`, `enrollments.py`, `academics.py`, `attendance.py`, `health.py`, `billing.py`, `sprint5.py` (HR/payroll/vendors/events/comms), `analytics.py`, `school_setup.py`, `metadata.py`.

---

## 4. Mandatory Frontend UI Rules (`frontend/`)

1. **Reuse Design System:** Import primitives from `frontend/components/ui` and shared product components (`data-table`, etc.) from `frontend/components/pc`. Do not build duplicate controls or raw HTML tables/inputs.
2. **No Hardcoded Colors:** Use semantic Tailwind utilities backed by `frontend/styles/tokens.css`. Never use hex/RGB/HSL literals or arbitrary color classes.
3. **App Router Only:** Product workflows belong in `frontend/app/`. Static HTML mockups belong only in `Artefacts/UX Designs/` when explicitly requested.

---

## 5. Required Work Cycle & Validation Commands

1. Read only the target code and domain files from the table above.
2. Implement the minimal change across Schema / BO / Route / UI.
3. Run focused verification:
   - **Backend:** `pytest <path/to/test_file.py>` (or `python manage.py test`)
   - **Frontend:** focused ESLint on changed files + `npm run build` (from `frontend/`)
4. Append a dated entry to [`docs/7_MEMORY_LOG.md`](docs/7_MEMORY_LOG.md).
