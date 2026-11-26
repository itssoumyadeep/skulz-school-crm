# Data and Environment

## Data Model

The Django model source is `core/models.py`. Tenant-bound records inherit from `TenantScopedModel`, which adds `tenant`, creation/update timestamps, `created_by`, and `is_deleted`. Application queries must still include tenant and soft-delete filters.

The full visual model references are the [ER diagram](er_diagram.md) and [DBML diagram](dbml_er_diagram.dbml). The entity/API inventory is [ENTITY_MODEL_AND_SUPPORTED_APIS.md](reference/ENTITY_MODEL_AND_SUPPORTED_APIS.md).

| Domain                     | Main entities                                                                                                                                         |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tenant and identity        | `Tenant`, `TenantSequence`, `PortalRoleMembership`                                                                                                    |
| Student/admissions         | `Student`, `Application`, `Parent`, `EmergencyContact`, `Document`, `AuditLog`                                                                        |
| Academics                  | `Curriculum`, `AcademicCalendar`, `LessonPlan`, `Assignment`, `Exam`, `MarksRecord`, `ReportCard`, `LearningFramework`, `LearningObservation`         |
| Attendance and leave       | `StudentAttendance`, `StaffAttendance`, `LeaveRequest`, `AttendanceRoster`                                                                            |
| Health and safety          | `StudentHealth`, `HealthObservation`, `MedicationLog`, `Incident`, `SafetyDrill`, `CareEvent`, `CareMedia`                                          |
| Billing                    | `FeeStructure`, `Invoice`, `Payment`, `DiscountWaiver`, `Reconciliation`                                                                              |
| HR and operations          | `Staff`, `Contract`, `PayrollRun`, `Appraisal`, `CPDRecord`, `Vendor`, `Requisition`, `PurchaseOrder`, `DeliveryRecord`, `VendorInvoice`, `Inventory` |
| Events and communications  | `Event`, `EventRegistration`, `EventVolunteer`, `EventReport`, `Message`, `NotificationRule`                                                          |
| Reporting and integrations | `AnalyticsSnapshot`, `CustomReport`, `ReportSchedule`, `WebhookSubscription`, `WebhookDeliveryAttempt`                                                |

`Payment` includes Stripe Checkout session/payment-intent references, currency, and checkout expiry. These fields do not contain card data.

## Migrations

- Models live in `core/models.py`; migrations live in `core/migrations/` and are the deployed schema history.
- After a model change, generate a migration with `python manage.py makemigrations core`, inspect the generated operations, and commit the migration with the model change.
- Before deployment, run `python manage.py makemigrations --check`, back up the database, and apply migrations with `python manage.py migrate` as a controlled deployment step.
- Test migration state against the target PostgreSQL version. Do not edit an already-applied migration; add a forward migration instead.
- New tenant-bound tables require tenant filters and soft-delete behavior. Migration `0020_enable_tenant_rls` enables and forces RLS policies for the current tenant-scoped table inventory; new tenant tables must extend that policy through a same-change migration and catalog test. See [ARCHITECTURE.md](ARCHITECTURE.md) and [SECURITY.md](SECURITY.md).
- Migration `0021_caregiver_mvp1_fields` extends existing RLS-protected tables for Caregiver MVP-1 (`US-CG-01`..`US-CG-05`):
  - `StudentAttendance` (`core_student_attendance`): `check_in_at`, `check_out_at` (nullable `DateTimeField`).
  - `EmergencyContact` (`core_emergency_contact`): `is_authorized_pickup`, `photo_url`, `pickup_pin_hash` (hashed via `make_password`), `id_check_required`, `custody_restricted`, `restriction_note`, `failed_pin_attempts`, `pickup_locked_until`.
  - `Incident` (`core_incident`): `body_part` (`CharField`, blank=True).
- Migrations `0022_caregiver_mvp2_care_events_media` and `0023_care_events_media_rls` add Caregiver MVP-2 (`US-CG-06`..`US-CG-08`) schema & forced RLS coverage:
  - `StudentHealth` (`core_student_health`): `photo_consent` (`BooleanField`), `topical_consent` (`BooleanField`).
  - `CareEvent` (`core_care_event`, forced RLS): `event_id`, `student`, `event_type`, `occurred_at`, `payload` (JSON), `logged_by`, `parent_visible`, `is_hidden`.
  - `CareMedia` (`core_care_media`, forced RLS): `media_id`, `students` (M2M), `file_ref`, `mime`, `caption`, `consent_checked`, `captured_by`, `captured_at`, `parent_visible`.
- Migrations `0024_caregiver_tier2_learning_observations` and `0025_learning_observations_rls` add Caregiver Tier 2 (`US-CG-10`) schema & forced RLS coverage:
  - `LearningFramework` (`core_learning_framework`, forced RLS): `framework_id`, `code`, `name`, `domains` (JSON), `is_default`.
  - `LearningObservation` (`core_learning_observation`, forced RLS): `observation_id`, `student`, `framework`, `domains` (JSON), `note`, `media_ids` (JSON), `shared_with_family`, `observed_on`, `logged_by`, `activity_plan_id`.
- Migration `0026_attendance_timer_late_reason` extends `StudentAttendance` (`core_student_attendance`, already covered by forced RLS) with `late_reason` (`CharField(max_length=64, null=True, blank=True)`) for late check-in cutoff tracking (`US-P1-03B` / `US-P2-01B`).
- `StudentHealth.medications` JSON schedule items (`core_student_health`, covered by forced RLS via `0020_enable_tenant_rls`) support optional `start_date` and `end_date` (`YYYY-MM-DD` strings or `None`, `US-AD-12`) alongside `name`, `dosage`, `scheduled_time`, and `consent` (no schema migration required).

## Seed and Test Data

- `tests/conftest.py` provides isolated test tenants and role JWT fixtures; pytest uses the configured test database.
- `seed_test_data.py` creates/gets a demo tenant and prints a signed Admin JWT for local API exploration. Run only against an isolated local/test database. Treat its stdout token as a credential; do not paste it into logs, issues, or commits.
- The trial-signup endpoint creates a Tenant and account as an application workflow; it is not a general-purpose production seed command.
- Student numbers are generated by `generate_student_number()` using tenant configuration and `TenantSequence`.
- Never run test seeds or local fixtures against a production database.

## Environment Variables

Backend settings load the repository-root `.env` with `python-dotenv` (`override=False`), so variables already exported by the process take precedence. Production should inject values from a secret manager or deployment environment. `local.env` is ignored by Git but is **not** automatically loaded by Django; use exported variables or the supported `.env` file. The checked-in [.env.example](../.env.example) contains placeholders and local-development defaults only.

| Variable                         | Purpose                                                                                             | Required                                           | Where set                                                                  |
| -------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------- |
| `DJANGO_DEBUG`                   | Enables Django debug mode. Defaults to `false`; keep false in production.                           | Yes; explicitly false in production                | Backend process environment or repo-root `.env`                            |
| `DJANGO_SECRET_KEY`              | Django signing/cryptographic key; minimum 50 characters; no fallback.                               | Always                                             | Backend secret manager/environment; local `.env` for development           |
| `JWT_SECRET_KEY`                 | HS256 API-token signing key; separate from Django key; minimum 50 characters; no fallback.          | Always                                             | Backend secret manager/environment; local `.env` for development           |
| `DB_ENGINE`                      | Django database backend. Defaults to PostgreSQL backend.                                            | No                                                 | Backend environment or `.env`                                              |
| `DB_NAME`                        | PostgreSQL database name. Local debug default is `skool_crm_db`.                                    | Production                                         | Backend environment/secret configuration                                   |
| `DB_USER`                        | PostgreSQL login. Local debug fallback uses `USER`, then `postgres`.                                | Production                                         | Backend environment/secret configuration                                   |
| `DB_PASSWORD`                    | PostgreSQL password. There is no configured production fallback.                                    | Production                                         | Secret manager/environment; never frontend or source                       |
| `DB_HOST`                        | PostgreSQL host. Local debug default is loopback.                                                   | Production                                         | Backend environment                                                        |
| `DB_PORT`                        | PostgreSQL port. Local debug default is `5432`.                                                     | Production                                         | Backend environment                                                        |
| `DB_CONN_MAX_AGE`                | Django persistent connection lifetime in seconds; defaults to `0` in debug and `60` otherwise.      | No                                                 | Backend environment                                                        |
| `DJANGO_ALLOWED_HOSTS`           | Comma-separated HTTP Host allowlist. Development defaults to localhost/testserver.                  | Production                                         | Backend environment                                                        |
| `CORS_ALLOWED_ORIGINS`           | Comma-separated browser origins allowed by the CORS middleware (`localhost:3000` & `localhost:5173` added in debug). | Production; HTTPS origins required                 | Backend environment                                                        |
| `CSRF_TRUSTED_ORIGINS`           | Django trusted origins (`localhost:3000` & `localhost:5173` added in debug).                                         | Production; HTTPS origins required                 | Backend environment                                                        |
| `DJANGO_SECURE_SSL_REDIRECT`     | Enables redirect to HTTPS; defaults on when debug is false.                                         | Production; must be true                           | Backend environment                                                        |
| `DJANGO_SECURE_HSTS_SECONDS`     | HSTS max-age; defaults to one year outside debug and zero in debug.                                 | Production; must be positive                       | Backend environment                                                        |
| `ALLOW_INSECURE_DEV_TOKENS`      | Opts into unsigned Session Switcher tokens. Effective only when `DJANGO_DEBUG=true`; default false. | No; must remain false outside isolated local demos | Backend local environment only                                             |
| `FRONTEND_BASE_URL`              | Base URL used for Stripe Checkout return URLs; defaults to local frontend.                          | Production deployment value required operationally | Backend environment                                                        |
| `DEFAULT_FREE_TRIAL_DAYS`        | Configurable trial period duration in days (`1`..`365`, default `14`, `US-MKT-03`).                 | No; defaults to `14`                               | Backend environment                                                        |
| `REQUIRE_JWT_EXP`                | Require `exp` claim on HS256 JWTs (`true` outside debug, `US-MKT-04`).                              | No; defaults to `true` in production               | Backend environment                                                        |
| `RATE_LIMIT_ENABLED`             | Enables fixed-window HTTP 429 rate limiting across auth/signup/checkout/telemetry (`US-MKT-04`).    | No; defaults to `true`                             | Backend environment                                                        |
| `RATE_LIMIT_AUTH_PER_MIN`        | Per-IP requests/min cap on `/auth/login`, `/auth/signup`, and recovery routes (default `60`).       | No                                                 | Backend environment                                                        |
| `RATE_LIMIT_TRIAL_PER_MIN`       | Per-IP requests/min cap on `/auth/trial-signup`, `/enrollments/public-apply`, checkout (default `20`). | No                                              | Backend environment                                                        |
| `RATE_LIMIT_TELEMETRY_PER_MIN`   | Per-IP requests/min cap on `/telemetry/events` ingestion (default `240`).                           | No                                                 | Backend environment                                                        |
| `TELEMETRY_ENABLED`              | Enables privacy-safe telemetry emission & `X-Request-ID` logging (`US-MKT-05`, default `true`).     | No                                                 | Backend environment                                                        |
| `TELEMETRY_OTLP_ENDPOINT`        | Optional HTTP telemetry forwarder endpoint; empty uses structured logs + in-memory summary only.    | No                                                 | Backend environment                                                        |
| `STRIPE_SECRET_KEY`              | Server-side Stripe API key. Required by production settings and Checkout creation.                  | Production; test key for local checkout            | Secret manager/backend environment only                                    |
| `STRIPE_WEBHOOK_SECRET`          | Stripe webhook signature-verification secret.                                                       | Production; Stripe CLI secret for local checkout   | Secret manager/backend environment only                                    |
| `STRIPE_CURRENCY`                | Three-letter Checkout currency; defaults to `cad`.                                                  | No; set to the configured billing currency         | Backend environment                                                        |
| `STRIPE_CHECKOUT_SUCCESS_URL`    | Optional Checkout success URL override; default is the Parent payments route.                       | No                                                 | Backend environment                                                        |
| `STRIPE_CHECKOUT_CANCEL_URL`     | Optional Checkout cancellation URL override.                                                        | No                                                 | Backend environment                                                        |
| `NEXT_PUBLIC_API_BASE`           | Public API origin/base path used by frontend API clients; defaults to local Django API.             | Production build/deploy value required             | Next.js build environment or `frontend/.env.local`; public, never a secret |
| `NEXT_PUBLIC_TENANT_BASE_DOMAIN` | Parent/tenant portal base domain in production sign-in routing; code has a default domain.          | Only if deployed domain differs from the default   | Next.js build environment; public, never a secret                          |
| `DJANGO_SETTINGS_MODULE`         | Selects Django settings module; `manage.py`, WSGI, and ASGI set `config.settings` by default.       | Normally not set manually                          | Entrypoints; override only for an intentional alternate settings module    |
| `PYTHON_DOTENV_DISABLED`         | Disables dotenv loading; used by settings subprocess tests for deterministic isolation.             | No; test-only use                                  | Test subprocess environment                                                |
| `NODE_ENV`                       | Next.js mode (`development`/`production`); set by Next.js scripts.                                  | No; managed by Next.js                             | Do not set manually for normal `npm run dev/build/start`                   |
| `USER`                           | OS username used only as a local-debug fallback for `DB_USER`.                                      | No                                                 | Operating-system environment; set `DB_USER` explicitly for production      |

`NEXT_PUBLIC_*` variables are embedded in browser bundles and must contain only public configuration. Never place signing keys, database credentials, Stripe secrets, webhook secrets, or other credentials in them.

## Assumptions

- **ASSUMPTION:** PostgreSQL is the production database and local developers may use a local PostgreSQL instance; the settings allow `DB_ENGINE` overrides, but other engines are not a supported production target.
- **ASSUMPTION:** Deployment injects backend secrets directly into the process environment. No platform-specific deployment manifest is currently documented.
- **ASSUMPTION:** `NEXT_PUBLIC_API_BASE` is set at frontend build time, as required by Next.js public environment-variable handling.
