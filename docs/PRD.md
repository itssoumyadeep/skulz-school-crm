# Product Requirements

## Product

The School CRM supports school operations across student admissions, academics, attendance, health and safety, billing, staffing, procurement, events, communications, analytics, and governance. It is a multi-tenant product: each school’s users and records must remain isolated by tenant and role.

This PRD summarizes product scope and outcomes. Detailed rule definitions live in the [business rule registry](rule_registry.md); current architecture and security constraints are in [ARCHITECTURE.md](ARCHITECTURE.md) and [SECURITY.md](SECURITY.md).

## Personas

- **Admin:** configures school data and manages admissions, records, finance, staff, and operations.
- **Principal / Vice Principal:** oversee school operations, decisions, attendance, academics, and staff coverage.
- **Teacher:** manages assigned classes, attendance, lesson plans, assessments, and parent communications.
- **Caregiver:** records care observations and authorized student attendance/health information.
- **Parent:** manages applications, views linked children’s profiles and school information, and pays invoices.
- **Owner:** manages a school or network and has authorized financial and operational oversight.
- **Board / Trustee:** views authorized aggregate governance and financial information, not individual student records.
- **Vendor:** accesses only authorized procurement and vendor-account workflows.
- **Staff:** uses role-authorized school workflows.

## Prioritized Scope

### P0 — Identity, tenant, and admissions foundation

- Tenant onboarding and tenant-scoped school access.
- Secure authentication, role membership, and server-enforced tenant/object authorization.
- Student identity and numbering, parent links, admission applications, documents, decisions, and status tracking.
- Admin school setup imports for students/parents and the supported people and operations datasets.

**Acceptance:** Every read/write is scoped to the authenticated tenant; unauthorized role/object access is rejected; admission state changes follow the registered rules; setup imports validate rows and roll back invalid batches; Student setup creates the intended Student and linked Parent records without creating an Application.

### P1 — Core school operations

- Academic calendars, curriculum, lesson plans, assignments, assessments, marks, and report cards.
- Student and staff attendance, leave, rosters, health observations, medication consent, incidents, and safety drills.
- Fee structures, invoices, payment ledger, discounts, refunds, and reconciliation.
- Staff, payroll, vendors, procurement, events, and communications.

**Acceptance:** Domain writes go through schemas and business-object rules; audit-sensitive updates are attributable; invoice/payment totals use decimal money values; attendance, health, and financial data follow their role scopes.

### P2 — Self-service portals

- Admin, Principal, Vice Principal, Teacher, Caregiver, Parent, Owner, Board, Trustee, Vendor, and Staff portal views.
- Parent multi-child profiles, invoice balances, payment history, and Stripe-hosted partial invoice payments.
- Vendor procurement tracking and governance summaries.

**Acceptance:** Parent-visible student and billing records belong only to linked children; a payment is completed only after a verified Stripe webhook; the frontend never treats a return URL as payment confirmation.

### P3 — Reporting and launch hardening

- Role-scoped analytics, scheduled/custom reports, and signed outbound webhooks.
- Production operations: deployment configuration, backups, monitoring, incident handling, rate limits, and recovery procedures.

**Acceptance:** Reports obey role and tenant scopes; webhooks are signed and replay-safe; deployment meets the release checklist in [SECURITY.md](SECURITY.md).

## Non-Functional Requirements

- **Security:** API authentication plus route- and object-level authorization; tenant scoping for all domain data; no secrets or card data in source, browser storage, or logs.
- **Privacy:** Minimize child-data exposure by role; protect health, identity, and safeguarding records; define retention and deletion obligations before production.
- **Integrity:** Use atomic transactions for multi-record workflows, database constraints for structural invariants, and business objects for domain rules.
- **Usability:** Responsive role-specific workflows with accessible labels, keyboard behavior, clear loading/error/empty states, and shared design-system components.
- **Compatibility:** Django/Django Ninja API with a consistent response envelope; Next.js App Router frontend; PostgreSQL as the target database.
- **Performance and resilience:** Measure representative API and portal workloads, monitor failures, and test backup restore and payment webhook recovery before production.

## Success Measures

- **Isolation:** Zero known cross-tenant or unauthorized role/object disclosures; all negative access-control tests pass.
- **Admissions and setup:** Valid setup batches complete with generated student numbers; invalid batches create no partial records.
- **Billing:** Ledger balance equals invoice total less completed payments; duplicate webhook delivery creates no duplicate payment; pending or failed checkout is never reported as paid.
- **Quality:** Backend tests, frontend lint, production build, migrations, and security checks pass in CI before merge.
- **Performance:** Track API p95 and error rate by route; the roadmap’s `<200 ms` p95 is a target to validate under a defined production-like load, not a current guarantee.

## Out of Scope

- Replacing the Django/PostgreSQL and Next.js architecture.
- Treating the browser session emulator as production authentication.
- Storing or processing raw card details; checkout is delegated to Stripe.
- AI-generated educational or safeguarding decisions without an approved human-review policy.
- Offline attendance synchronization, SMS/push delivery, recurring payments, and broad external integrations until their infrastructure and contracts are approved.

## Assumptions

- **ASSUMPTION:** The initial customer is a school or daycare operating as an isolated tenant; network-owner access is an explicitly granted exception.
- **ASSUMPTION:** Canadian dollars are the initial Stripe billing currency; deployment currency and supported regions may vary by tenant and legal configuration.
- **ASSUMPTION:** Feature priority reflects the existing sprint roadmap, not a newly validated customer-research ranking.
