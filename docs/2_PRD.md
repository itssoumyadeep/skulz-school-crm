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
| **Teacher Portal** | Deliver server-scoped classroom portal for attendance, lesson plans, assessments, health alerts, parent messaging, and educator profile picture management. | `US-P2-03` | **Done** |
| **Caregiver Daily Care Portal** | Deliver server-scoped early years & toddler care portal for drop-off check-ins, 24h attendance locks, consented medication logs, routine tracking (mood, hydration, meals, naps), pickup PIN authorizations, minor incident logs with 1h SLA, and reassuring parent messaging. | `US-P2-03` | **In Progress** |
| **Parent Multi-Child Portal** | Enable parents to switch across linked children to manage applications, view published academic/attendance/health updates, submit event permissions, and manage parent profile pictures. | `US-P2-04` | **In Progress** |
| **Teacher & Parent Profile Pictures** | Allow Teachers and Parents to upload, preview, update, or reset their profile picture (`PNG`/`JPEG`/`WebP` or curated preset avatars) with tenant-isolated persistence (`GET /api/v1/auth/profile`, `PUT /api/v1/auth/profile/picture`) and offline-safe SVG portrait fallbacks. | `US-P2-03`, `US-P2-04` | **In Progress** |
| **Parent Billing & Receipts Portal** | Enable parents to view child invoices, initiate partial/full Stripe Checkout payments, track pending confirmation, and download receipts. | `US-P2-05` | **In Progress** |
| **Vendor Self-Service Portal** | Provide vendors with scoped access to their purchase orders, delivery acknowledgements, and invoice match statuses. | `US-P2-06` | **In Progress** |
| **Owner, Board & Trustee Portals** | Provide Owners with operational/financial override controls and restrict Board/Trustee users strictly to anonymized aggregate KPIs. | `US-P2-07` | **In Progress** |
| **Staff Self-Service Portal** | Enable staff to view schedules, request leave, monitor compliance, review payslips/appraisals, and submit internal requisitions. | `US-P2-08` | **In Progress** |

### P2 Detailed Requirements — Caregiver Daily Care & Early Years Portal (`US-P2-03`)

The **Caregiver Daily Care Portal** provides early years educators, daycare nurses, and toddler caregivers with a dedicated, role-scoped workspace to manage daily classroom routines, medical consent verifications, attendance lock SLAs, minor injury tracking, and parent communication. It matches the approved Oil Pastel design system from [`Caregiver_Daily_Care_Portal.html`](../Artefacts/UX%20Designs/Caregiver/Caregiver_Daily_Care_Portal.html) and [`Caregiver_Daily_Care_Portal_Compact.html`](../Artefacts/UX%20Designs/Caregiver/Caregiver_Daily_Care_Portal_Compact.html).

#### 1. Given-When-Then Functional Specifications

- **CG-01: Care-Group & Room Server Scoping (RBAC & RLS)**
  - **Given** an authenticated user with the `Caregiver` or `Staff` role assigned to a specific room or care group (e.g., Room 1A "Sunflowers Toddler & Pre-K", 16 enrolled),
  - **When** the caregiver accesses `/caregiver` or queries student care endpoints,
  - **Then** the backend returns strictly students, health records, and attendance logs belonging to that assigned room/care group (`request.tenant_id` + `class_id`/care group), and
  - **When** an actor attempts to access an unassigned student ID or cross-room data via direct URL or API call,
  - **Then** the system returns HTTP 403 Forbidden or HTTP 404 Not Found.

- **CG-02: Attendance Check-In, 24-Hour Roll Lock & Absence Outreach (`BR-03-01`, `BR-03-02`)**
  - **Given** children arriving at daycare drop-off,
  - **When** the caregiver logs attendance or marks late arrivals,
  - **Then** the check-in time (e.g., "08:35 AM") and arrival notes are recorded, and the KPI metric pill ("14 / 16 Little Learners In • 88%") updates reactively, and
  - **When** session attendance remains unconfirmed past the morning window,
  - **Then** unexcused absences trigger a follow-up countdown SLA (e.g., "12 mins remaining") and automated parent notification flag (`BR-03-02`), and
  - **When** more than 24 hours have elapsed since the session date,
  - **Then** the attendance roll is locked from standard edits (`BR-03-01`), requiring a Principal override to modify.

- **CG-03: Medication Administration & Parental Digital Consent Gating (`BR-07-01`)**
  - **Given** scheduled child prescriptions or medical drops (e.g., Amoxicillin 125mg/5mL, Salbutamol Inhaler 100mcg),
  - **When** viewing the Medication Administration & Consent Log,
  - **Then** the portal displays only medications with active parental digital authorization (`consent_flag=True`), verifying who gave consent (e.g., "Consent Verified by Elena R. (Mother)"), and
  - **When** the caregiver clicks "Log Administered Dose",
  - **Then** the system captures the precise timestamp, nurse/caregiver ID, dosage, and observation notes, shifts card status to "Administered", and dispatches a digital confirmation receipt to the family portal, and
  - **When** parental consent is missing (`consent_flag=False`),
  - **Then** dose administration is disabled and attempts to submit return HTTP 422 `RULE_VIOLATION` (`BR-07-01`).

- **CG-04: Learner Cubby Routine Boards (Mood, Hydration, Naps & Nutrition)**
  - **Given** active toddlers in classroom cubbies,
  - **When** the caregiver records routine updates,
  - **Then** the portal provides single-click updates for:
    - **Mood & Energy Status:** Sunny (`sentiment_very_satisfied`), Playful (`mood`), Sleepy/Resting (`bedtime`),
    - **Hydration Tracker:** Progress toward daily target (e.g., 360 / 500 mL),
    - **Meals & Snacks:** Nutrition intake percentage (e.g., "100% Finished"),
    - **Nap & Quiet Time:** Rest duration logging and nap target tracking (e.g., "1:00 PM", "25 min logged"),
  - **And** updates are optimistically reflected in the UI and persisted to the daily care observation register.

- **CG-05: Guardian Pickup Authorization & Security PIN Verification**
  - **Given** child pickup and dismissal at end of day,
  - **When** a guardian or authorized contact arrives,
  - **Then** the child card displays authorized contact photo, name, relationship, and verified authentication method (e.g., "PIN Authorized #8841", "ID Check Req. #3390"), preventing unauthorized child release.

- **CG-06: Minor Incident / Boo-Boo & Tumble Log (`BR-07-02`, `BR-07-03`)**
  - **Given** a child experiences a minor classroom tumble or scrape (e.g., sandbox scrape, foam block bump),
  - **When** the caregiver clicks "Log Boo-Boo" / "New Incident",
  - **Then** a modal opens allowing selection of learner, incident category (`Skin Scrape`, `Bump / Bruise`, `Small Pinch`, `Bite`, `Other`), affected body part, and treatment note, and
  - **When** submitted,
  - **Then** the incident is recorded with a nurse/caregiver stamp, parent delivery notice is dispatched, and a 1-hour parent acknowledgement SLA timer initiates (`BR-07-02`), and
  - **When** an incident is flagged with High/Critical severity, Allergic Reaction, or Major Injury,
  - **Then** the backend automatically escalates the incident to the Principal and alerts the parents immediately (`BR-07-03`).

- **CG-07: Direct Reassuring Caregiver-to-Parent Messaging**
  - **Given** positive daytime milestones,
  - **When** the caregiver selects a quick recipient ("Maya L.", "Leo V.", "Whole Room") and taps a positive template ("+ Great Lunch 🍓", "+ Fast Asleep ☁️", "+ Gentle Sharing 🚂"),
  - **Then** the note is delivered to the parent mobile portal and logged in the encrypted classroom feed with delivery receipts.

- **CG-08: Dual View Layouts (Cards Grid vs. Compact List Matrix)**
  - **Given** caregiver device ergonomics and task density,
  - **When** toggling between "Cards" and "Compact List",
  - **Then** the UI switches seamlessly between visual cubby cards and a dense, horizontal table matrix showing Drop-Off, Meals, Nap, Diaper/Bathroom, Health/Mood, and Quick Log actions.

- **CG-09: ThePuffy AI Care Assistant**
  - **Given** the caregiver working on the floor,
  - **When** clicking the floating ThePuffy button,
  - **Then** a docked assistant opens at `z-[80]` with care-group scoped actions ("Review medication consent logs", "Verify attendance roll call audit", "Log minor incident boo-boo note") without occluding dialogs or drawers.

#### 2. Success Criteria & Quality Gates

1. **Functional Completeness:**
   - All 9 features (CG-01 through CG-09) implemented and interactive.
   - Dual-view switcher ("Cards" and "Compact List") fully operational with persistent selection.
   - All modals ("Log Boo-Boo", "Medication Administration", "Add Routine Note") and slide-overs functional with form validation.
2. **Security, Tenant & Scope Isolation:**
   - Multi-tenant isolation verified (`tenant_id = request.tenant_id`, `is_deleted = False`).
   - Server-side caregiver room scoping verified (`get_student_queryset()` negative test passes).
   - Parent consent gate (`BR-07-01`) enforced on both client and server.
3. **UI/UX Design System Fidelity:**
   - 100% adherence to the approved Oil Pastel design system (`tokens.css`, rounded cards, warm ambient pastel background, zero hardcoded hex/RGB colors).
   - Zero missing or unrendered icon font ligatures; all icons backed by local SVG primitives (`lucide-react`).
   - Zero broken image links; all avatars backed by warm inline SVG data URIs or authenticated profile pictures.
4. **DOM Stacking Context & Layering Rule:**
   - Base canvas: `z-0`, Main content: `z-10`, Fixed navigation: `z-40`, Modal backdrops: `z-[60]`, Modals/Drawers: `z-[70]`, Popovers/DatePickers/Selects/ThePuffy: `z-[80]`.
5. **Automated QA & Browser Verification:**
   - Real browser Playwright E2E test suite covering Cards view, Compact List view, Check-in, Boo-Boo modal, Medication dose logging, and Stacking Context assertions passing with 100% success.
   - ESLint: 0 errors; TypeScript: 0 errors; Next.js production build (`npm run build`): 14/14 pages passing.

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
