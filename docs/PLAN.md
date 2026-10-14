# Delivery Plan

Status reflects repository code/tests reviewed on 2026-10-11. `Done` means the listed acceptance check is present and covered by current code/tests; `Partial` means implementation exists but scope or verification is incomplete; `Planned` means no sufficient implementation evidence was found. Dependencies reference task IDs below. Detailed rules live in [rule_registry.md](rule_registry.md); product outcomes live in [PRD.md](PRD.md).

## Sprint 1 — Tenant Foundation and Admissions

| ID    | Task                                                 | Depends on   | Acceptance check                                                                                                                                                                                                                                                  | Status  |
| ----- | ---------------------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| S1-01 | Tenant-scoped entities and student numbering         | —            | Tenant base/audit fields exist; student numbers are atomic and tenant-prefixed; generator tests pass.                                                                                                                                                             | Done    |
| S1-02 | Authentication, role membership, and request context | S1-01        | Login verifies passwords and membership; signed JWT is validated; unauthorized roles fail; production secrets fail closed. Refresh/revocation and production identity lifecycle remain absent.                                                                    | Partial |
| S1-03 | Database tenant isolation                            | S1-01, S1-02 | Every tenant table has tested forced RLS policies and cross-tenant access tests pass. Current migrations cover portal-role membership only.                                                                                                                       | Partial |
| S1-04 | Admissions lifecycle and access                      | S1-01, S1-02 | Parent/Admin enrollment, documents, decisions, offer acceptance, and payment confirmation pass workflow and isolation tests. Full policy/role coverage remains incomplete.                                                                                        | Partial |
| S1-05 | Admin school setup imports                           | S1-01, S1-02 | Admin config is tenant-scoped; batches are schema/template validated and transactional; Student import creates Student+Parent without Application; all requested datasets have passing tests. Current tests cover representative datasets, not every import type. | Partial |

## Sprint 2 — Academics and Assessment

| ID    | Task                                   | Depends on          | Acceptance check                                                                                                                                           | Status  |
| ----- | -------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| S2-01 | Academic entities and calendar         | S1-01               | Curriculum, calendar, lesson, assignment, exam, marks, and report-card models/migrations exist; calendar date checks pass.                                 | Partial |
| S2-02 | Curriculum, lesson, and exam workflows | S2-01, S1-02        | BO rules reject invalid mappings, holiday dates, and exam overlaps; tenant-scoped API tests pass.                                                          | Partial |
| S2-03 | Marks moderation and report cards      | S2-01, S2-02        | Marks lock/moderation and report-card publication gates have pass/fail tests; published records are what Parent views expose.                              | Partial |
| S2-04 | Academic portal workflows              | S2-02, S2-03, S6-01 | Teacher/Admin can complete planned calendar, lesson, exam, marks, and report workflows; missing planned endpoints and UI states are enumerated and closed. | Partial |

## Sprint 3 — Attendance, Rostering, Health, and Safety

| ID    | Task                                 | Depends on   | Acceptance check                                                                                                                                                        | Status  |
| ----- | ------------------------------------ | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| S3-01 | Attendance and leave models/BOs/APIs | S1-01, S1-02 | Attendance, leave, roster, lock-window, status, and tenant tests pass.                                                                                                  | Partial |
| S3-02 | Health and safeguarding controls     | S1-01, S1-02 | Health/medication consent, incident escalation, and compliance API tests pass; field-level access policy is verified for each role.                                     | Partial |
| S3-03 | Role-scoped attendance screens       | S3-01, S6-01 | Admin/Principal/Teacher attendance screens use server-scoped data and meet responsive/accessibility checks. Shared student attendance exists; full role parity remains. | Partial |
| S3-04 | Offline attendance and sync          | S3-01, S3-03 | Offline marks survive reload, sync idempotently on reconnect, and report conflict/failure states. No durable PWA sync implementation verified.                          | Planned |

## Sprint 4 — Billing and Finance

| ID    | Task                                           | Depends on          | Acceptance check                                                                                                                                                                                                                                                            | Status  |
| ----- | ---------------------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| S4-01 | Fee structures, invoices, and account balances | S1-01, S1-02        | Decimal totals, invoice states, tenant scope, and balance math pass billing API/BO tests.                                                                                                                                                                                   | Partial |
| S4-02 | Discounts, refunds, and reconciliation         | S4-01, S1-02        | Approval gates, refund behavior, audit data, and reconciliation discrepancy rules pass dedicated tests.                                                                                                                                                                     | Partial |
| S4-03 | Stripe Checkout and webhook lifecycle          | S4-01, S4-02, S1-02 | Partial amounts cannot exceed current balance; invalid signatures do not complete payment; duplicate webhooks are idempotent; live Stripe test-mode checkout and deployment secrets are verified. Automated tests pass; live credential-backed checkout remains unverified. | Partial |
| S4-04 | Parent billing experience                      | S4-01, S4-03, S6-01 | Parent sees only linked children’s invoices/payment history and can start hosted checkout; browser return state never indicates payment success without server confirmation.                                                                                                | Partial |

## Sprint 5 — HR, Procurement, Events, and Communications

| ID    | Task                             | Depends on                 | Acceptance check                                                                                                                                        | Status  |
| ----- | -------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| S5-01 | Staff, compliance, and payroll   | S1-01, S1-02               | Staff/DBS and payroll leave-deduction rules have API/BO tests and role checks.                                                                          | Partial |
| S5-02 | Vendor and procurement workflows | S1-01, S1-02               | Vendor, requisition, purchase order, delivery, invoice, and 3-way match paths have tenant/security tests.                                               | Partial |
| S5-03 | Events and communications        | S1-02, S4-01               | Events and messages validate business rules, preserve permissions, and expose delivery states backed by a configured provider.                          | Partial |
| S5-04 | Operational portals              | S5-01, S5-02, S5-03, S6-01 | Staff/vendor workflows are usable end-to-end with server-side authorization and error/empty states. Route/API foundations exist; breadth is incomplete. | Partial |

## Sprint 6 — Operational Portals and Design System

| ID    | Task                                   | Depends on                 | Acceptance check                                                                                                              | Status  |
| ----- | -------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------- |
| S6-01 | Shared tokens and component foundation | —                          | Semantic tokens and shared UI/PC primitives exist; no parallel primitives are added; changed UI passes focused lint/build.    | Done    |
| S6-02 | Admin operational console              | S1-04, S2-04, S4-01, S6-01 | Admin admissions, setup, attendance, billing, and data-classification workflows use real APIs and enforce Admin/tenant scope. | Partial |
| S6-03 | Principal and Vice Principal workflows | S2-04, S3-01, S6-01        | Decisions, attendance, leave, schedule, and moderation workflows are API-backed and role-tested.                              | Partial |
| S6-04 | Teacher/Caregiver PWA workflows        | S2-04, S3-01, S3-02, S6-01 | Class/care-group data scope is enforced server-side and requested attendance/academic/health workflows are complete.          | Partial |

## Sprint 7 — Parent, Vendor, and Governance Portals

| ID    | Task                                   | Depends on                        | Acceptance check                                                                                                                             | Status  |
| ----- | -------------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| S7-01 | Parent applications and child profiles | S1-04, S2-03, S3-02, S4-01, S6-01 | Every linked child is shown with real data; no invented profile values; application and health access are scoped.                            | Partial |
| S7-02 | Parent billing and checkout            | S4-03, S4-04                      | Linked-child balances, pending/completed payments, receipts, partial checkout, webhook-confirmed status, and cross-parent denial are tested. | Partial |
| S7-03 | Vendor self-service                    | S5-02, S6-01                      | Vendor sees only its own procurement records and cannot access student data.                                                                 | Partial |
| S7-04 | Owner, Board, and Trustee portals      | S1-02, S6-01, S8-01               | Owner network views and Board/Trustee aggregate-only views are verified against API scope.                                                   | Partial |

## Sprint 8 — Analytics, Compliance, and Launch Readiness

| ID    | Task                                      | Depends on                 | Acceptance check                                                                                                                    | Status  |
| ----- | ----------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------- |
| S8-01 | Analytics and custom reports              | S2-01, S3-01, S4-01, S5-01 | Tenant/role-scoped analytics and report endpoints pass privacy and calculation tests.                                               | Partial |
| S8-02 | Outbound webhooks and scheduled work      | S5-03, S8-01               | Outbound events have signatures, durable retries, idempotency, and monitoring. No worker/queue is configured.                       | Partial |
| S8-03 | Data governance and compliance operations | S1-01, S1-02, S8-01        | Export/erasure, retention, audit, and safeguarding obligations have documented owners, tested workflows, and jurisdictional review. | Planned |
| S8-04 | Production hardening and release          | S1-03, S4-03, S8-01, S8-02 | RLS coverage, production auth, rate limits, monitoring, backups/restore, CI security scans, and load tests pass a release gate.     | Planned |

## Status Definitions

- **Done:** Acceptance check is implemented and supported by current tests/evidence.
- **Partial:** Some implementation exists, but the acceptance check is not fully satisfied or verified.
- **Planned:** No sufficient implementation evidence was found.

## Assumptions

- **ASSUMPTION:** Sprint ordering remains a useful dependency model, but priorities and release dates have not been re-approved by product stakeholders.
- **ASSUMPTION:** Tasks marked Partial reflect known code/test evidence, not a complete product-owner acceptance review.
- **ASSUMPTION:** Live Stripe validation requires deployment/test credentials and Stripe CLI webhook forwarding outside automated tests.
