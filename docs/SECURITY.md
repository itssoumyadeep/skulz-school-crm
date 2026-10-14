# Security

## Scope and Data

The CRM stores child identity and education records, parent contact details, health and safeguarding information, attendance, payment and invoice records, staff data, and tenant configuration. Treat student, health, safeguarding, identity, authentication, and payment data as sensitive. The application uses hosted Stripe Checkout; it must not store card numbers or CVCs.

Actors include Parents, Teachers, Caregivers, Admins, Principals, Vice Principals, Owners, Board/Trustee users, Vendors, and service operators. A user may access only the roles and tenant-scoped records authorized for their account. Parents are further limited to linked children and their records.

## Threat Model

| Risk                                                              | Current control or gap                                                                                                                                                                                                                                   |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cross-tenant disclosure through a missing query filter            | API queries are expected to filter by `tenant_id`; migration `0020_enable_tenant_rls` enables forced RLS policies for all current tenant-scoped core tables. Runtime enforcement still requires a non-bypass application role and integration tests. |
| Parent accessing another child's records                          | `verify_student_access` and `verify_application_access` check linked IDs, parent records, and creator identity. Every child-related endpoint must use these checks.                                                                                      |
| Teacher/Caregiver access exceeding class or care-group assignment | Current `get_student_queryset()` returns all tenant students for both roles. Assignment-level scoping is a release blocker before real student data is exposed to these roles.                                                                           |
| Forged or stolen session                                          | API bearer tokens are HS256-verified. The browser role middleware only decodes claims and is not an authorization boundary. The Session Switcher can mint unsigned tokens when insecure development tokens are explicitly enabled.                       |
| Secret exposure or key compromise                                 | Settings require environment-provided Django/JWT keys and fail closed in production. `.env.example` is placeholders only. Real values must stay in secret storage and be rotated if exposed. Git history retains previous hardcoded signing-key values.  |
| Payment fraud or replay                                           | Parent Checkout creates a pending payment; only signature-verified Stripe webhooks complete it. Invoice locking, amount/balance validation, pending-checkout exclusion, and replay handling are implemented. Preserve these checks in all payment paths. |
| Sensitive data in logs, uploads, or exports                       | Log only identifiers and operational context; redact tokens, credentials, health notes, and full payment payloads. Child documents and exports require private storage, authorization checks, and retention controls.                                    |
| Abuse, credential stuffing, or denial of service                  | No application rate-limiting control was found. Add limits before public production exposure, especially for login, signup, uploads, and payment initiation.                                                                                             |

## Authentication and Authorization

**Current:** `POST /api/v1/auth/login` checks Django credentials and an active tenant role membership, then issues an eight-hour HS256 JWT. The API’s `JWTAuthBearer` verifies the signature, checks the tenant exists, maps the role, and sets tenant context. `require_roles` provides route-level RBAC; `verify_student_access`, `verify_application_access`, and `verify_vendor_access` provide object-level checks.

The Parent login token includes linked student IDs resolved by parent email. The frontend `SessionSwitcher` creates unsigned mock JWTs. The frontend middleware decodes claims without signature verification and only provides navigation gating; backend authorization is authoritative.

**Required production direction:**

- Disable the Session Switcher and `ALLOW_INSECURE_DEV_TOKENS` outside isolated local development; reject unsigned tokens in every shared or production environment.
- Have the frontend exchange credentials with the real login endpoint and store tokens in `HttpOnly`, `Secure`, `SameSite` cookies through a server-controlled session/BFF. Do not treat a JavaScript-writable cookie or decoded browser claims as trusted identity.
- Define a short-lived access-token and refresh/revocation design. Validate issuer, audience, expiry, allowed algorithms, tenant, and role membership. Plan key rotation and invalidation of existing sessions.
- Keep role checks at route boundaries and tenant/object checks in the backend business/API path. Never trust a client-supplied tenant or linked-child list as the sole access proof.

See [student access control](reference/student_access_control.md) for intended field and role scopes. Its intended class/care-group guarantees are not fully implemented yet.

## Tenant Isolation

All application reads and writes must include the authenticated tenant and respect soft deletion. API object lookup must scope tenant ownership before returning data. Parent records and payment/receipt access additionally require linked-student/parent ownership checks.

RLS is enabled and forced for every current tenant-scoped core table by migration `0020_enable_tenant_rls`, with request-scoped tenant context safely established and cleared. The `Tenant` table is intentionally excluded because authentication must resolve it before tenant context exists. The application database role must not bypass RLS. Cross-tenant tests must cover list, detail, export, payment, receipt, and background/management operations; the current catalog test verifies policy coverage, while non-bypass runtime enforcement remains a release check.

## Child Data Handling

- Collect and return only fields needed for the user’s role and task. Health, medication, incident, identity, and safeguarding information require stricter access than general academic data.
- Parent views must be limited to their linked children. Teacher access must be restricted to assigned classes; Caregiver access must be restricted to assigned care groups before production exposure.
- Do not put child records, health data, access tokens, or payment details in browser logs, analytics, URLs, or persistent local storage unless an approved retention design requires it.
- Keep uploaded child documents private and tenant-scoped. Verify file type/size, authorize every read/download, use malware scanning where supported, and define retention/deletion policies.
- Avoid placing sensitive values in exception messages or audit logs. Use stable record IDs and redacted event summaries.

## Audit, Rate Limits, and Monitoring

`AuditLog` exists and several workflows write audit records, but coverage is not universal and the database does not enforce immutability. Before production, define required events, actor/tenant attribution, retention, access controls, tamper resistance, and tests for security-critical writes. Never log passwords, JWTs, Stripe secrets, card data, or full health documents.

No application rate limiter or production monitoring/alerting integration was found in the inspected configuration. Add per-IP and per-account limits for authentication, signup, uploads, and payment-session creation; protect webhook processing with signature validation and replay/idempotency controls. Alert on repeated authentication failures, authorization denials, webhook failures, and suspected cross-tenant access.

## Secrets and Dependencies

- Keep local credentials in ignored `.env` or an approved secret manager. `local.env` is ignored by Git; Django currently auto-loads `.env`, not `local.env`.
- Use `.env.example` for variable names and placeholders only. Never paste real secrets into source, examples, logs, tests, issues, or commits.
- Production startup requires configured Django/JWT keys, database credentials, host/origin allowlists, Stripe keys, HTTPS redirect, and HSTS. Rotate the old Django/JWT signing keys manually because Git history still contains their previous values. Rotate any database or Stripe credentials if they were ever committed or shared.
- Keep Python and npm dependency manifests/lockfiles reviewed. Update dependencies deliberately, run vulnerability/secret scans in CI, and record security-impacting upgrades.

## Backups and Incident Basics

No verified backup/restore or incident-response procedure was found in the inspected repository. Before production, assign an owner for encrypted, access-controlled, off-site database and document backups; set recovery-point/recovery-time objectives; test restoration regularly; and define retention and deletion behavior.

For a suspected incident: restrict affected access, preserve relevant audit/security logs, rotate exposed credentials and signing keys, assess tenant and child-data scope, follow applicable notification obligations, document the timeline and remediation, and verify recovery before restoring service. Do not put sensitive incident details in public issue trackers.

## Pre-release Checklist

- [ ] Production secrets are supplied by a secret manager; no placeholders or development keys are present.
- [ ] `DEBUG=False`; allowed hosts and HTTPS CORS/CSRF origins are exact; HTTPS redirect, HSTS, secure cookies, and trusted proxy settings are verified in the deployed topology.
- [ ] Unsigned mock sessions are disabled; real login, token expiry, refresh/revocation, logout, and signing-key rotation are tested.
- [ ] Every role/tenant/object boundary has positive and negative API tests; Teacher and Caregiver roster scoping is enforced.
- [ ] RLS is enabled/forced for every tenant table and cross-tenant tests exercise it using the production database role.
- [ ] Stripe test/live keys are separated; webhooks verify signatures, are idempotent, and cannot complete a payment from a browser return alone.
- [ ] Uploads, downloads, exports, logs, audit trails, and backups have explicit access and retention controls.
- [ ] Rate limits, alerting, backup restore, incident contacts, and rollback procedures are tested.
- [ ] CI runs backend tests, frontend lint/build, dependency checks, and secret scanning.

## Assumptions

- **ASSUMPTION:** Production runs behind HTTPS termination at a trusted reverse proxy; deployment-specific proxy headers and secure-cookie behavior still need verification.
- **ASSUMPTION:** Stripe is the payment provider for card checkout; no payment-card data is handled by this application.
- **ASSUMPTION:** FERPA/GDPR applicability, data residency, retention periods, and breach-notification timelines require legal/operational confirmation for deployment jurisdictions.
