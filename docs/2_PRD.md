# Product Requirements Document (PRD)

## 1. Product Overview

The School CRM is a multi-tenant operations platform for schools and daycares covering admissions, academics, attendance, health and safeguarding, billing and online payments, HR and payroll, procurement, events, communications, analytics, and governance. Every user and record is strictly isolated by school tenant and authorized role.

- **Detailed User Stories & Acceptance Criteria:** [8_PRODUCT_BACKLOG_STORIES.md](8_PRODUCT_BACKLOG_STORIES.md)
- **Business Rules:** [rule_registry.md](rule_registry.md)
- **Architecture & Security:** [3_ARCHITECTURE.md](3_ARCHITECTURE.md) | [1_SECURITY.md](1_SECURITY.md)
- **Delivery Plan:** [6_PLAN.md](6_PLAN.md)

---

## 2. Personas

| Persona | High-Level Responsibility |
| :--- | :--- |
| **Admin** | Configures school setup data and manages admissions, student records, billing, staff, and daily operations. |
| **Principal / Vice Principal** | Oversees school operations, admission decisions, academic moderation, attendance overrides, staff coverage, and safeguarding escalations. |
| **Teacher** | Manages assigned classes, student attendance, lesson plans, assignments, assessments, and parent communications. |
| **Caregiver** | Records daily care observations, attendance, and consented health/medication logs for assigned care groups. |
| **Parent** | Submits applications, views linked children's academic/attendance/health updates, responds to event permissions, and pays invoices online. |
| **Owner** | Oversees single-school or network operations, financial reconciliations, and high-value approval overrides. |
| **Board / Trustee** | Reviews anonymized, aggregate-only governance, enrollment, and financial KPIs with zero access to individual student PII. |
| **Vendor** | Views assigned purchase orders, records deliveries, and submits vendor invoices for three-way match approval. |
| **Staff** | Accesses personal schedules, leave requests, compliance status, payslips, appraisals, and internal requisitions. |

---

## 3. High-Level Product Requirements (Aligned to Backlog)

### P0 — Identity, Tenant Isolation, Admissions & School Setup

| Requirement Area | High-Level Requirement | Aligned Backlog Stories | Status |
| :--- | :--- | :--- | :--- |
| **Tenant Foundation & Numbering** | Isolate all domain records by tenant with soft deletion and atomic tenant-prefixed student numbering. | Foundation (`S1-01`) | **Done** |
| **Authentication & Session Lifecycle** | Authenticate users per tenant and role using secure server-controlled sessions, token refresh/revocation, and key rotation. | `US-P0-01` | **In Progress** |
| **Database Tenant Isolation (RLS)** | Enforce PostgreSQL Row-Level Security across all tenant tables under a non-bypass database role. | `US-P0-02` | **In Progress** |
| **Admissions & Enrollment Lifecycle** | Manage applicant intake, document verification, assessments, recommendations, decisions, offer acceptance, and student activation. | `US-P0-03` | **In Progress** |
| **Admin School Setup & Bulk Imports** | Provide transactional CSV templates and bulk imports for students/parents and operational datasets with full-batch rollback on error. | `US-P0-04` | **In Progress** |

### P1 — Core School Operations

| Requirement Area | High-Level Requirement | Aligned Backlog Stories | Status |
| :--- | :--- | :--- | :--- |
| **Academics & Curriculum Planning** | Manage academic calendars, curriculum outcomes, lesson plans, assignments, and conflict-checked exam schedules. | `US-P1-01` | **In Progress** |
| **Marks Moderation & Report Cards** | Gate marks locking, leadership moderation sign-off, and parent-visible report card publication by calendar dates and attendance rules. | `US-P1-02` | **In Progress** |
| **Student Attendance & Alerts** | Record class/care-group scoped attendance within a 24-hour edit window and flag unexcused absences and chronic low attendance. | `US-P1-03` | **In Progress** |
| **Leave & Substitute Coverage** | Process student and staff leave requests with blackout-date gates and assign available substitute staff to uncovered classes. | `US-P1-04` | **In Progress** |
| **Health, Medication & Safeguarding** | Manage student health profiles, parental-consent medication logs, 1-hour SLA incident tracking with Principal escalation, and immutable safety drills. | `US-P1-05` | **In Progress** |
| **Billing, Waivers & Reconciliation** | Manage fee structures, invoices, post-grace-period late fees, tiered discount/refund approvals, and monthly financial reconciliation. | `US-P1-06` | **In Progress** |
| **Stripe-Hosted Parent Payments** | Enable partial or full online invoice payments via Stripe Checkout, completing payment status strictly upon verified Stripe webhooks. | `US-P1-07` | **In Progress** |
| **Staff Compliance & Payroll** | Enforce staff background/DBS compliance prior to teaching assignment, track appraisals, and deduct unpaid leave in payroll runs. | `US-P1-08` | **In Progress** |
| **Vendor & Procurement Management** | Manage vendors, requisitions, purchase orders, deliveries, and vendor invoices with mandatory 3-way match approval. | `US-P1-09` | **In Progress** |
| **Events & Emergency Communications** | Coordinate school events (with 48-hour permission deadlines), parent volunteers, and emergency broadcasts that bypass opt-outs. | `US-P1-10` | **In Progress** |

### P2 — Role Portals & Self-Service Experiences

| Requirement Area | High-Level Requirement | Aligned Backlog Stories | Status |
| :--- | :--- | :--- | :--- |
| **Shared Design System** | Provide reusable, token-driven UI and product components across all role portals. | Foundation (`S6-01`) | **Done** |
| **Admin Operational Console** | Deliver a unified Admin portal for admissions, setup imports, academics, attendance, billing, procurement, and data governance. | `US-P2-01` | **In Progress** |
| **Principal & VP Portals** | Deliver leadership workspaces for admission decisions, marks moderation, attendance/leave overrides, staff cover, and incident escalations. | `US-P2-02` | **In Progress** |
| **Teacher & Caregiver Portals** | Deliver server-scoped classroom and care-group portals for attendance, lesson plans, assessments, health logs, and parent messaging. | `US-P2-03` | **In Progress** |
| **Parent Multi-Child Portal** | Enable parents to switch across linked children to manage applications, view published academic/attendance/health updates, and submit event permissions. | `US-P2-04` | **In Progress** |
| **Parent Billing & Receipts Portal** | Enable parents to view child invoices, initiate partial/full Stripe Checkout payments, track pending confirmation, and download receipts. | `US-P2-05` | **In Progress** |
| **Vendor Self-Service Portal** | Provide vendors with scoped access to their purchase orders, delivery acknowledgements, and invoice match statuses. | `US-P2-06` | **In Progress** |
| **Owner, Board & Trustee Portals** | Provide Owners with operational/financial override controls and restrict Board/Trustee users strictly to anonymized aggregate KPIs. | `US-P2-07` | **In Progress** |
| **Staff Self-Service Portal** | Enable staff to view schedules, request leave, monitor compliance, review payslips/appraisals, and submit internal requisitions. | `US-P2-08` | **In Progress** |

### P3 — Reporting, Governance & Launch Readiness

| Requirement Area | High-Level Requirement | Aligned Backlog Stories | Status |
| :--- | :--- | :--- | :--- |
| **Role-Scoped Analytics & Reports** | Provide tenant- and role-scoped KPI dashboards, custom report builders, and scheduled report generation. | `US-P3-01` | **In Progress** |
| **Signed Outbound Webhooks** | Dispatch signed, idempotent outbound webhook events and scheduled jobs via a durable background worker with retries. | `US-P3-02` | **In Progress** |
| **Offline Attendance Sync** | Support durable offline attendance queueing with idempotent reconnect synchronization and conflict handling. | `US-P3-03` | **Yet to Be Done** |
| **Data Governance & Privacy** | Provide data retention policies, subject-access export, and right-to-erasure workflows that preserve mandatory audit trails. | `US-P3-04` | **Yet to Be Done** |
| **Production Hardening & Release** | Enforce rate limiting, alerting, backup/restore verification, load testing, and full CI release gates before production launch. | `US-P3-05` | **Yet to Be Done** |

---

## 4. Top Release Priorities

1. **Teacher & Caregiver Server Scoping (`US-P1-03`, `US-P2-03`):** Enforce class and care-group scoping with negative access tests.
2. **Production Authentication (`US-P0-01`):** Complete `HttpOnly` session handling, token refresh/revocation, and signing-key rotation.
3. **Runtime RLS Verification (`US-P0-02`):** Validate forced PostgreSQL RLS using the non-bypass application database role.
4. **Live Stripe Checkout & Billing Acceptance (`US-P1-06`, `US-P1-07`, `US-P2-05`):** Complete live test-mode Stripe Checkout and webhook verification.
5. **Production Operations & Hardening (`US-P3-05`):** Establish rate limiting, monitoring, backup/restore drills, and release gates.

---

## 5. High-Level Non-Functional Requirements & Success Outcomes

- **Tenant & Role Isolation:** Zero cross-tenant or unauthorized role/object data disclosures (`US-P0-01`, `US-P0-02`).
- **Data & Financial Integrity:** Transactional batch imports roll back completely on error (`US-P0-04`); billing uses decimal arithmetic and confirms online payments strictly via verified webhooks (`US-P1-06`, `US-P1-07`).
- **Child Privacy & Safeguarding:** Sensitive health and safeguarding records are restricted to authorized roles with immutable audit trails (`US-P1-05`, `US-P3-04`).
- **Quality & Performance:** All backend, frontend, migration, and security checks pass in CI; representative API workloads target `<200 ms` p95 latency under production-like load (`US-P3-05`).

---

## 6. Out of Scope

- Replacing the Django / Django Ninja / PostgreSQL backend or Next.js App Router frontend.
- Using browser session emulation as production authentication.
- Storing or processing raw payment card details on school servers (delegated to Stripe Checkout).
- Automated AI educational or safeguarding decisions without an approved human-review policy.
