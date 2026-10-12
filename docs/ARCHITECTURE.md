# Architecture

## System Shape

The product is a tenant-aware school CRM with a Django/Django Ninja API, PostgreSQL data store, and Next.js App Router frontend. The API base path is `/api/v1/`; routers are registered centrally in `core/api/__init__.py` and mounted by `config/urls.py`.

```text
Next.js portal
    │ HTTPS + bearer JWT
    ▼
Django Ninja API (/api/v1)
    │ schemas · auth · tenant/object checks
    ▼
Business Objects (domain rules and workflows)
    │ Django ORM
    ▼
PostgreSQL (tenant-scoped entities)
```

The three-layer boundary is the target for new and changed domain logic: API routes handle transport, authorization, and response mapping; schemas validate input; Business Objects implement domain workflows; models and database constraints persist data. Current code has exceptions, including route-level ORM access and direct model operations in some BOs; do not treat the target pattern as proof of complete enforcement.

## Stack

- **Backend:** Django 5.x and Django Ninja; Pydantic v2 schemas; `python-jose` HS256 bearer JWTs.
- **Data:** PostgreSQL, Django models, UUID primary keys, tenant-scoped entities, JSON fields, decimal money fields, and migrations.
- **Frontend:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, SWR, shared UI and PC component libraries.
- **Payments:** Stripe-hosted Checkout. The backend stores pending/completed payment state and accepts completion only from signature-verified webhook events; it does not handle card details.
- **Async processing:** No Celery/Redis worker is configured. Requests and browser-triggered imports run through the API synchronously; do not promise durable background jobs.

See [technology options](reference/tech_stack_options.md) for historical alternatives and [validation policy](reference/validation_architecture_policy.md) for validation-layer guidance.

## Backend Module Cards

| Module                   | Responsibility                                                                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `config/`                | Django settings, root URL routing, WSGI/ASGI entry points, environment configuration.                                                            |
| `core/models.py`         | Shared domain entities, tenant/audit fields, relationships, constraints, and sequence helpers.                                                   |
| `core/schemas/`          | Django Ninja/Pydantic request validation and API payload contracts.                                                                              |
| `core/auth/`             | JWT bearer authentication, role decorator, and object-level student/application/vendor checks.                                                   |
| `core/business_objects/` | Domain workflows, rule validation, transaction handling, and response-ready domain data.                                                         |
| `core/api/v1/`           | HTTP endpoints organized by domain: auth, enrollment, academics, attendance, health, billing, operations, analytics, metadata, and school setup. |
| `core/migrations/`       | Versioned database schema changes; migrations are required for model changes.                                                                    |
| `tests/`                 | Pytest API, BO, scope, and model behavior tests.                                                                                                 |

`TenantScopedModel` supplies tenant, audit timestamps/actor, and soft-delete fields for tenant-bound models. Prefer tenant-filtered lookups with `is_deleted=False` even when database isolation is available.

## Frontend Module Cards

| Module                       | Responsibility                                                                                                              |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `frontend/app/`              | App Router pages/layouts for role portals.                                                                                  |
| `frontend/app/components/`   | Route-level workflows and portal compositions.                                                                              |
| `frontend/app/lib/`          | Session and typed API clients; use these rather than ad hoc endpoint calls.                                                 |
| `frontend/components/ui/`    | Low-level UI primitives.                                                                                                    |
| `frontend/components/pc/`    | Shared product components including PageHeader, SectionPanel, KpiCard, DataTable, EmptyState, StatusPill, forms, and shell. |
| `frontend/styles/tokens.css` | Semantic design tokens consumed by themes and Tailwind utilities.                                                           |

Follow the detailed frontend requirements in [root AGENTS.md](../AGENTS.md) and [frontend AGENTS.md](../frontend/AGENTS.md). Keep route-specific composition in app components; add genuinely missing reusable primitives under `frontend/components/pc` and export/story them there.

## Request and API Conventions

- API routes use `JWTAuthBearer()` for protected requests and `@require_roles(...)` for endpoint role gates.
- Authentication attaches `user_id`, `user_role`, `tenant_id`, and available identity/link claims to the request. Object access must still be checked in the backend; frontend middleware only gates navigation.
- Query and mutation scope is tenant-first and must respect `is_deleted`. Parent, vendor, and other restricted roles also require object-level authorization.
- Request payloads belong in named schemas under `core/schemas/`; business workflows belong in BOs.
- Standard success/error envelope:

  ```json
  {
    "data": {},
    "meta": { "tenant_id": "…", "role": "…", "version": "v1" },
    "errors": null
  }
  ```

- `BusinessRuleError` is handled centrally as HTTP 422 with registered rule identifiers. Authentication failures are 401; role/object denials are normally 403 or 404 to avoid disclosing inaccessible records. Unexpected exceptions remain server errors and must not be converted into business-rule responses.
- All externally supplied values must be schema-validated; do not trust tenant IDs, role claims, student IDs, invoice ownership, payment status, or success/cancel return URLs supplied by the browser.
- Stripe checkout uses a pending payment record, server-calculated currency/minor units, invoice-balance checks, and a signature-verified webhook. A webhook replay must not duplicate completion side effects.

The implemented API inventory is maintained in [ENTITY_MODEL_AND_SUPPORTED_APIS.md](reference/ENTITY_MODEL_AND_SUPPORTED_APIS.md). Business rule IDs and their current registry are in [rule_registry.md](rule_registry.md).

## Tenant Isolation Status

Tenant query filters and object checks are required throughout the API. Authentication sets `app.current_tenant_id` on the database connection; middleware clears connection context around requests. Migration `0013` creates tenant/self-read policies for `core_portal_role_membership`, but database-wide RLS policies are not present in the migrations inspected. Treat PostgreSQL RLS as partial, not as a guaranteed boundary for every model, until full table coverage and cross-tenant tests are delivered.

## Errors, Logging, and Auditing

- Use structured response envelopes and stable error codes/rule IDs.
- Keep logs operational and redact credentials, JWTs, student/health data, and payment payloads.
- `AuditLog` records selected domain actions, but audit coverage and tamper resistance are not universal. Extend and test audit behavior for sensitive state transitions before production.
- Do not log Stripe webhook secrets, card data, raw auth headers, or full child records.

## Testing and Quality Gates

- Backend: run focused pytest modules for changed API/BO behavior, then the full `pytest` suite; use `manage.py check` and `makemigrations --check` for Django/model changes.
- Frontend: focused ESLint on changed files and `npm run build` from `frontend/`.
- Security-sensitive changes need positive and negative tenant/role/object-access tests, including foreign-tenant identifiers and replay cases where relevant.
- CI is not yet configured in `.github/workflows/`; these checks currently require a local run or a separately approved CI addition.

Useful references: [entity model and APIs](reference/ENTITY_MODEL_AND_SUPPORTED_APIS.md), [ER diagram](dbml_er_diagram.dbml), [validation architecture](reference/validation_architecture_policy.md), [student access control](reference/student_access_control.md), and [Stripe payments](parent_payments_stripe.md).

## Deployment

Production settings are environment-driven and fail closed for required keys, database configuration, hosts/origins, and Stripe credentials. Deploy behind HTTPS, configure a restrictive host/CORS/CSRF allowlist, provide secret-manager values, apply migrations, and forward Stripe webhook events to `/api/v1/stripe/webhook`. Verify secure proxy/HTTPS behavior and webhook delivery in the deployment environment. No Docker/compose or GitHub Actions deployment pipeline was found during this audit.

## Assumptions

- **ASSUMPTION:** PostgreSQL is the intended production database; local development may use the same engine with a developer database.
- **ASSUMPTION:** Tenant IDs and role claims are issued by a trusted identity flow in production; the local Session Switcher is development-only.
- **ASSUMPTION:** The existing API envelope and domain route modules remain stable public contracts unless versioned changes are approved.
