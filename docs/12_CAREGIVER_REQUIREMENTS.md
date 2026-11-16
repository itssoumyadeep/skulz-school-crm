# 12. Caregiver / Early Childhood Educator (ECE) Portal — Requirements

> **Scope:** Caregiver Daily Care Portal (`/caregiver`) for daycare / early-years rooms (infant, toddler, preschool).
> **Benchmarked against:** Brightwheel and Lillio (formerly HiMama).
> **Linked docs:** [`2_PRD.md`](2_PRD.md) (`US-P2-03`), [`rule_registry.md`](rule_registry.md), [`11_DEFECTS.md`](11_DEFECTS.md), UX: `Artefacts/UX Designs/Caregiver/`.
> **Ordering rule:** stories are ordered by **priority and value** — MVP first, then each tier builds on the previous one.
> **Story layout (every story):** ① User interaction (Actor + Given/When/Then) → ② Value proposition → ③ System design → ④ Everything else (rules, edge cases, competitor parity, DoD).

---

## 0. Competitive Comparison (what a Caregiver uses)

Legend: ✅ core feature · ◐ partial / add-on · — not offered · **Us** = current repo state (`Built` / `Partial` / `Gap`).

| Capability | Brightwheel | Lillio | Us (today) | Story |
| :--- | :---: | :---: | :---: | :---: |
| Room roster + check-in/out (PIN / QR / tablet) | ✅ | ✅ | **Partial** — status only; no check-in/out timestamps persisted | CG-01 |
| Authorized pickup (photo + PIN/ID) | ✅ | ✅ (family sharing + permissions) | **Gap** — `EmergencyContact` has no photo/PIN/pickup flag | CG-02 |
| Allergy / medical alert flags | ✅ | ✅ | **Partial** — API returns badge, UI ignores it (`DEF-024`) | CG-03 |
| Medication log with parent e-signature | ✅ | ✅ | **Partial** — UI hardcoded (`DEF-023`) | CG-04 |
| Incident / accident report + parent notice | ✅ | ✅ | **Partial** — names mangled (`DEF-022`) | CG-05 |
| Daily report: diaper, meals/bottles, naps, mood, hydration | ✅ | ✅ (15 structured categories) | **Gap** — only local React state; `HealthObservation` lacks diaper/meal/hydration | CG-06 |
| Parent feed of the child's day | ✅ (social-feed style, strongest) | ✅ | **Gap** | CG-07 |
| Photo / video sharing | ✅ | ✅ (tagged to observations) | **Gap** | CG-08 |
| Daily health screening at drop-off | ✅ | ✅ | **Gap** | CG-09 |
| Learning observations / milestones / portfolios | ◐ | ✅ (strongest — developmental domains, evidence reports) | **Gap** | CG-10 |
| Supply / low-stock reminders | ◐ | ◐ | **Gap** | CG-11 |
| Shift handover | ◐ | ◐ | **Gap** | CG-12 |
| Two-way parent messaging | ✅ | ✅ | **Partial** — `Message` model exists; caregiver UI is mock | CG-13 |
| Lesson plans / curriculum aligned to standards | ✅ | ✅ (strongest — partner curriculum, state/provincial alignment) | **Gap** (teacher lesson plans exist, not early-years) | CG-14 |
| Offline attendance / logging queue | ◐ | ◐ | **Gap** (`US-P3-03`) | CG-15 |
| Day report PDF / family contact sharing | ◐ | ✅ | **Gap** | CG-16 |
| Staff-to-child ratio tracking | ✅ | ✅ | **Out of scope** (product decision) | — |
| Tuition billing / autopay | ✅ (strongest) | ✅ | Parent/Admin portals — **not a caregiver feature** | — |

**Takeaway:** Brightwheel wins on speed and parent-feed experience; Lillio wins on developmental documentation and curriculum. Our MVP matches the **shared core** (safety + daily report + parent feed); tiers 2–3 add each competitor's differentiator.

---

## 1. Priority Roadmap

| Tier | Goal | Stories | Why this order |
| :--- | :--- | :--- | :--- |
| **MVP-1 — Safe, real daily operations** | A caregiver can run a room safely on real data | CG-01 → CG-05 | Safety/compliance is non-negotiable; every parent-visible feature depends on trustworthy roster and health data |
| **MVP-2 — Daily report & parent value** | Parents see their child's day; caregiver logs in seconds | CG-06 → CG-08 | This is what parents pay for and what both competitors lead with |
| **Tier 2 — Differentiate** | Match each competitor's strength | CG-09 → CG-13 | Screening, learning evidence, handover, supplies, messaging |
| **Tier 3 — Grow** | Planning, resilience, reporting | CG-14 → CG-16 | Valuable but not needed to launch |

| ID | Story | Tier | MoSCoW | Value | Effort |
| :--- | :--- | :--- | :---: | :---: | :---: |
| CG-01 | Room roster, check-in/out & absence outreach | MVP-1 | Must | High | M |
| CG-02 | Authorized pickup verification | MVP-1 | Must | High | M |
| CG-03 | Allergy & medical alerts everywhere | MVP-1 | Must | High | S |
| CG-04 | Medication administration with consent gate | MVP-1 | Must | High | M |
| CG-05 | Incident / boo-boo report with 1-hour SLA | MVP-1 | Must | High | M |
| CG-06 | Daily care micro-logs (diaper, meals, naps, hydration, mood) | MVP-2 | Must | High | L |
| CG-07 | Parent daily-report feed + one-tap notes | MVP-2 | Must | High | M |
| CG-08 | Photo & video moments | MVP-2 | Should | High | M |
| CG-09 | Drop-off health screening | Tier 2 | Should | Med | S |
| CG-10 | Learning observations & milestones | Tier 2 | Should | High | L |
| CG-11 | Supply requests | Tier 2 | Could | Low | S |
| CG-12 | Shift handover | Tier 2 | Should | Med | M |
| CG-13 | Two-way parent messaging | Tier 2 | Should | Med | M |
| CG-14 | Early-years lesson / activity planner | Tier 3 | Could | Med | L |
| CG-15 | Offline queue & sync | Tier 3 | Could | Med | L |
| CG-16 | Day-report PDF & family contact sharing | Tier 3 | Could | Low | S |

**Cross-cutting requirements (apply to every story):**
- Tenant + room scoping on every query (`tenant_id=request.tenant_id`, `is_deleted=False`, `verify_student_access`). Unassigned student → HTTP 403/404.
- Every number/label on screen comes from the database. No hardcoded fallbacks shown as real data (`DEF-010/012/022/023/024/025`).
- Z-index contract: header `z-40` · backdrop `z-[60]` · modal/drawer `z-[70]` · popover/select/datepicker/ThePuffy `z-[80]`, rendered via portal (`DEF-011/026`).
- Oil Pastel tokens only, `lucide-react` icons, no external image URLs (`DEF-002/003`). ThePuffy closed by default (`DEF-004`).

---

# MVP-1 — Safe, Real Daily Operations

## CG-01 — Room Roster, Check-In/Out & Absence Outreach

### ① User interaction
**As a** Caregiver, **I want** to see only my room's children and check each one in or out with one tap (or guardian PIN), **so that** I always know exactly who is in my care.

- **Given** I am signed in as a Caregiver assigned to Room 1A,
  **When** I open `/caregiver`,
  **Then** I see only Room 1A children, with live `Present / Enrolled` and percentage computed from today's attendance.
- **Given** a child has arrived,
  **When** I tap **Check-In** (or the guardian enters a PIN),
  **Then** status becomes `Present`, the actual arrival time is stored, and the headcount updates immediately.
- **Given** a child is leaving,
  **When** I tap **Check-Out** and complete pickup verification (CG-02),
  **Then** the departure time is stored and the child leaves the present count.
- **Given** a child has not arrived by the morning window end,
  **When** the window closes,
  **Then** the child shows `Unconfirmed Absence` with a follow-up countdown and a **Call Guardian** action (`BR-03-02`).

### ② Value proposition
Accurate real-time headcount is the single most safety-critical fact in a daycare; it also drives parent notifications and billing hours.

### ③ System design
- **Model gap:** `StudentAttendance` has `status`, `method`, `locked` but **no `check_in_at` / `check_out_at`**. Add both nullable `DateTimeField`s + migration, RLS coverage, and update [`4_DATA_AND_ENV.md`](4_DATA_AND_ENV.md).
- **API:** extend `GET /attendance/students/{date}` to return `check_in_at`, `check_out_at`; add `POST /attendance/check-in` and `/check-out` (roles include `CareGiver`).
- **UI:** `CaregiverOverviewWidget` KPI pill derived via `useMemo` from roster; arrival label from `check_in_at` (never a default string).

### ④ Everything else
- **Rules:** `BR-03-01` (24 h lock, Principal override), `BR-03-02` (unexcused absence notifies parent).
- **Edge cases:** double check-in is idempotent; check-out before check-in rejected (422); child checked out cannot be re-marked without override.
- **Parity:** Brightwheel/Lillio — kiosk/PIN/QR check-in; parent contactless check-in is a later enhancement.
- **DoD:** roster count = DB count; negative room-scoping test; Playwright with a **signed** JWT (`DEF-028`).

---

## CG-02 — Authorized Pickup Verification

### ① User interaction
**As a** Caregiver, **I want** to see who is authorized to collect each child, with photo and credential, **so that** I never release a child to the wrong person.

- **Given** an adult arrives to collect a child,
  **When** I open that child's pickup card,
  **Then** I see every authorized person with photo, relationship, phone, and required credential (`PIN` or `Photo ID`).
- **Given** the adult enters a correct PIN or I confirm photo ID,
  **When** I confirm,
  **Then** check-out is allowed and the verifier and method are recorded.
- **Given** the person is not on the list or is flagged `Custody Restriction`,
  **When** I look them up,
  **Then** release is blocked, a red banner shows, and Admin sign-off is required.

### ② Value proposition
Prevents the highest-severity daycare incident (unauthorized release) and is the main trust signal for parents.

### ③ System design
- **Model gap:** `EmergencyContact` has `name`, `phone`, `relationship`, `medical_consent` only. Add `is_authorized_pickup`, `photo_url`, `pickup_pin_hash` (hashed, never plaintext), `id_check_required`, `custody_restricted`, `restriction_note`.
- **API:** `GET /students/{id}/pickup-contacts`, `POST /students/{id}/pickup-verify` (returns pass/fail; PIN compared server-side).
- **UI:** pickup card in cubby card + drawer; avatar via inline SVG fallback if no photo (`DEF-003`).

### ④ Everything else
- **Rules:** PINs hashed and rate-limited; every verification written to the audit log.
- **Edge cases:** one-time temporary pickup person added by parent with expiry date; 3 failed PIN attempts lock the card and alert Admin.
- **Parity:** Brightwheel PIN/QR + photo; Lillio secondary-family permissions.
- **DoD:** blocked-release test; PIN never appears in any API response or log.

---

## CG-03 — Allergy & Medical Alerts Everywhere

### ① User interaction
**As a** Caregiver, **I want** allergies and conditions shown on every child card, meal log, and pickup view, **so that** I can't miss a life-threatening risk.

- **Given** a child has a `High` or `Critical` allergy in their health profile,
  **When** I see that child anywhere (roster, meal log, nap, outdoor),
  **Then** a bold badge with the allergen and severity is visible without opening anything.
- **Given** a parent updates a child's allergy in the database,
  **When** I reload,
  **Then** the badge reflects the new value (no stale seed text).

### ② Value proposition
Anaphylaxis prevention; fastest compliance win; legally required (Sabrina's Law in Ontario).

### ③ System design
- **API:** attendance roster already returns `medical_badge` / `medical_severity`; add room-level `GET /health/classroom-alerts` (exists for teachers — reuse with room scoping).
- **UI:** map `healthAlert` from API fields; seed fallback only when API errors (`DEF-024`).

### ④ Everything else
- **Edge cases:** multiple allergies → show highest severity + count; no health record → "No alerts on file" (not blank).
- **Parity:** both competitors show allergy alerts on profile; we show them on every operational surface.
- **DoD:** changing `StudentHealth.allergies` changes the UI on reload (test).

---

## CG-04 — Medication Administration with Consent Gate

### ① User interaction
**As a** Caregiver, **I want** to log a scheduled dose only when parental consent is on file, **so that** I administer medication safely and legally.

- **Given** a child has a scheduled medication and `consent_flag = True`,
  **When** I tap **Log Administered Dose** and confirm dose and notes,
  **Then** the card becomes `Administered` with time and my name, and the parent receives a receipt (`BR-07-01`).
- **Given** `consent_flag = False`,
  **When** I open the medication card,
  **Then** the action is disabled with a consent warning; API submission returns HTTP 422 `RULE_VIOLATION`.
- **Given** a dose was already given today,
  **When** I try to log it again,
  **Then** I am warned about duplicate dosing and must confirm explicitly.

### ② Value proposition
Replaces paper medication logs; creates the audit trail insurers and licensors ask for.

### ③ System design
- **Data:** schedule lives in `StudentHealth.medications` (JSON); administrations in `MedicationLog`. Add `scheduled_time` per medication entry and link log → scheduled item.
- **API (new):** `GET /health/classroom-medications` returning today's schedule + administration state + consent per child (`DEF-023`); `POST /health/medication-log` already enforces `BR-07-01`.
- **UI:** replace `INITIAL_MEDICATIONS` with fetched data; optimistic update with rollback on 422.

### ④ Everything else
- **Edge cases:** witness sign-off for controlled meds (optional); missed dose flagged after a configurable grace window; child absent → dose shown as `Skipped (absent)`.
- **Parity:** Brightwheel/Lillio — medication log + e-signature.
- **DoD:** consent gate enforced client **and** server; negative test for cross-room child.

---

## CG-05 — Incident / "Boo-Boo" Report with 1-Hour SLA

### ① User interaction
**As a** Caregiver, **I want** to record a minor injury in under a minute, **so that** parents are told fast and the school has a record.

- **Given** a child is hurt,
  **When** I open **Log Boo-Boo**, choose the child, type, body part, and first aid, and submit,
  **Then** the incident is saved with my stamp and a 1-hour parent-acknowledgement timer starts (`BR-07-02`).
- **Given** severity is `High`/`Critical`, allergic reaction, or head injury,
  **When** I submit,
  **Then** it auto-escalates to the Principal and prompts an immediate guardian call (`BR-07-03`).
- **Given** the incident list,
  **When** I view it,
  **Then** each card shows the real child name, time, body part, and SLA state from the database.

### ② Value proposition
Fast, defensible incident documentation; parents hear it from you first.

### ③ System design
- **Model:** `Incident` stores `students` (JSON) and `time`, `staff`; **add `body_part`** (or structured field in `actions_taken`).
- **API:** `SafetyComplianceBO.list_incidents` must serialize `students`, `time`, `staff`, `body_part` (`DEF-022`). Student name resolved server-side from IDs.
- **UI:** remove string-slicing of `description`; no hardcoded stamp/time.

### ④ Everything else
- **Edge cases:** multi-child incident; SLA breach turns the card red and notifies Admin; incident edit after sign-off creates a superseding record.
- **Parity:** both competitors — digital incident report + e-signature; Brightwheel adds parent signature inside the app.
- **DoD:** incident round-trip test (create → list shows correct name/time).

---

# MVP-2 — Daily Report & Parent Value

## CG-06 — Daily Care Micro-Logs (Diaper, Meals, Naps, Hydration, Mood)

### ① User interaction
**As a** Caregiver, **I want** to log diapers, food, naps, water, and mood with one or two taps, **so that** I can document care without taking my eyes off the children.

- **Given** a child card,
  **When** I tap **Diaper** and pick `Wet / BM / Both / Dry / Potty`,
  **Then** the event is stored with time and the "next check due" timer resets.
- **Given** mealtime,
  **When** I pick intake (`None / Some / Half / Most / All`) — or bottle `offered / consumed` mL for infants,
  **Then** it is saved, and allergy badges (CG-03) stay visible on the same view.
- **Given** nap time,
  **When** I tap **All Asleep** or start one child's timer,
  **Then** state becomes `Sleeping` with a live duration; **Wake** stores total minutes.
- **Given** water is offered,
  **When** I tap `+60 / +120 mL`,
  **Then** the hydration bar advances toward the target.
- **Given** I tap a mood (`Sunny / Playful / Sleepy / Fussy / Unwell`),
  **When** it saves,
  **Then** it persists to the child's day record.
- **Given** I am on the Compact List,
  **When** I use **Quick Batch** (e.g., "All Asleep", "Batch Meal Log"),
  **Then** the action applies to the selected children in one request.

### ② Value proposition
This is the daily-report engine both competitors are built around — it turns the caregiver's day into the parent's reassurance with near-zero typing.

### ③ System design
- **Model gap:** `HealthObservation` covers mood/appetite/nap minutes/notes per day only. Add a generic **`CareEvent`** model: `student`, `event_type` (`diaper|meal|bottle|nap_start|nap_end|water|mood|sunscreen|note`), `occurred_at`, `payload` (JSON), `logged_by`, `parent_visible`. One table keeps the timeline simple and feeds CG-07. Needs migration, RLS (`0020_enable_tenant_rls`), data-doc update.
- **API:** `POST /care-events` (single + batch), `GET /care-events?student_id&date`.
- **UI:** routine widgets write via callbacks; **all** stats (Compact strip, hydration %, "2 diapers due") computed from events (`DEF-025`).

### ④ Everything else
- **Rules:** sunscreen / barrier cream require topical-application consent on file; infant sleep check prompt every 15 min while `Sleeping` (infant rooms).
- **Edge cases:** backdated entry within the same day allowed, flagged `late entry`; undo within 5 min; roll lock `BR-03-01` does not block care events.
- **Parity:** Lillio — 15 structured categories; Brightwheel — fastest tap flow. Target: ≤ 2 taps per event.
- **DoD:** events persist across reload; summary metrics match DB counts.

---

## CG-07 — Parent Daily-Report Feed & One-Tap Notes

### ① User interaction
**As a** Parent, **I want** to see my child's day as it happens, **so that** I feel reassured while I'm at work.
**As a** Caregiver, **I want** to send a warm note with one tap, **so that** I can keep families informed without typing.

- **Given** a caregiver logs a care event marked parent-visible,
  **When** it saves,
  **Then** it appears in that child's parent feed within seconds, in time order.
- **Given** I select a child (or **Whole Room**) and tap a template chip (e.g., "+ Great Lunch 🍓"),
  **When** I press **Send**,
  **Then** the note is delivered with a `Delivered` receipt and appears in the recent-notes list.
- **Given** a parent has linked children in different rooms,
  **When** they open the feed,
  **Then** they see only their own children's events (cross-parent access → 403/404).

### ② Value proposition
The parent feed is Brightwheel's flagship experience and the main retention driver for families.

### ③ System design
- **Data:** feed = `CareEvent` (parent_visible) ∪ `Message` ∪ media (CG-08). Reuse `Message` for notes.
- **API:** `GET /parent/children/{id}/feed?date=`; `POST /messages` (caregiver → parent, template id optional).
- **Dependency:** Parent portal feed UI (`/parent`) — coordinate with `US-P2-04`.
- **Templates:** stored per tenant, editable by Admin; seeded defaults.

### ④ Everything else
- **Edge cases:** opted-out channels respected for non-urgent notes (emergency bypass `BR-06-01`); caregiver can hide an event before publish (within 5 min).
- **Parity:** Brightwheel feed style; Lillio daily report generated from check-in.
- **DoD:** parent sees event after caregiver logs it (E2E across two sessions).

---

## CG-08 — Photo & Video Moments

### ① User interaction
**As a** Caregiver, **I want** to attach a photo or short video to a child's day, **so that** parents see real moments.

- **Given** I am on a child card,
  **When** I capture or upload a photo and choose one or more children,
  **Then** it is saved to each child's timeline and (if approved) shown in the parent feed.
- **Given** a child has `photo_consent = False`,
  **When** I tag them,
  **Then** I am blocked and warned.

### ② Value proposition
Photos are the highest-engagement content for parents; both competitors lead with it.

### ③ System design
- **Model:** `CareMedia` (`student(s)`, `file_ref`, `mime`, `consent_checked`, `captured_by`); add **`photo_consent`** to the student/guardian consent record.
- **Storage:** tenant-prefixed object storage path, signed short-lived URLs; size/type allow-list (PNG/JPEG/WebP/MP4); EXIF stripped.
- **API:** `POST /care-media` (multipart), `GET` via signed URL.

### ④ Everything else
- **Edge cases:** group photo with a non-consented child; deletion removes from all feeds; no raw files in logs.
- **Parity:** both offer photo/video; Lillio ties media to observations (CG-10).
- **DoD:** consent block test; no broken images (`naturalWidth > 0`).

---

# Tier 2 — Differentiate

## CG-09 — Drop-Off Health Screening

**① User interaction** — **As a** Caregiver, **I want** a quick symptom check at drop-off, **so that** sick children are flagged before entering the room.
- **Given** a child is checking in,
  **When** I answer the screener (`fever`, `rash`, `cough`, `vomiting`, `contagious exposure`) and optionally record temperature,
  **Then** a positive answer shows a **Do Not Admit / Notify Director** prompt and is logged.

**② Value proposition** — Limits outbreaks; Lillio and Brightwheel both include health checks.

**③ System design** — `CareEvent(event_type='health_screen')` with payload; optional admit-override requires Supervisor role. UI step inside CG-01 check-in drawer.

**④ Everything else** — Rule: exclusion thresholds configurable per tenant. Edge: parent self-attests via app before arrival. DoD: positive screen blocks one-tap check-in.

---

## CG-10 — Learning Observations & Milestones

**① User interaction** — **As a** Caregiver, **I want** to record a short observation tied to a developmental domain, **so that** each child's progress is documented.
- **Given** I write a note and/or attach a photo,
  **When** I pick domains (e.g., Fine Motor, Language, Social-Emotional) from the configured framework (e.g., ELECT / EYFS),
  **Then** it is added to the child's portfolio.
- **Given** an observation is marked **Share with family**,
  **When** I save,
  **Then** it appears in the parent feed.
- **Given** a term ends,
  **When** I open **Developmental Summary**,
  **Then** I can review observations grouped by domain.

**② Value proposition** — Lillio's core strength; satisfies licensing/pedagogical documentation duties and raises perceived quality.

**③ System design** — New `LearningObservation` (`student`, `domains[]`, `framework`, `note`, `media`, `shared_with_family`, `observed_on`) and tenant-configurable `LearningFramework` lookup. Report view aggregates by domain.

**④ Everything else** — Edge: multi-child observation; edit history kept. Parity: Lillio (full), Brightwheel (basic). DoD: portfolio shows only that child's data.

---

## CG-11 — Supply Requests

**① User interaction** — **As a** Caregiver, **I want** to ask a parent for diapers/clothes/cream in one tap, **so that** the child never runs out.
- **Given** a child card,
  **When** I tap **Request Supplies** and pick items,
  **Then** the parent gets a notification and the request shows `Requested` until the parent marks `Sent`.

**② Value proposition** — Removes a daily friction point; low effort, visible delight.

**③ System design** — Reuse `Message` with `category='supply_request'` + item list; no new table for MVP.

**④ Everything else** — Edge: don't re-request the same item within 24 h. DoD: notification appears in parent feed.

---

## CG-12 — Shift Handover

**① User interaction** — **As a** Lead Educator, **I want** an auto-generated handover summary, **so that** the closing educator knows what matters.
- **Given** my shift ends,
  **When** I open **Handover**,
  **Then** I see: children present/departed, upcoming/missed doses, incidents today, abnormal naps/meals, open supply requests, and a free-text note.
- **Given** both educators confirm,
  **When** they sign,
  **Then** custody is recorded with timestamps and cannot be edited.

**② Value proposition** — Continuity of care; reduces missed medications at shift change.

**③ System design** — New `ShiftHandover` (`room`, `from_staff`, `to_staff`, `summary_json`, `signed_at`) generated from existing queries (attendance, `MedicationLog`, `Incident`, `CareEvent`). Immutable after both signatures.

**④ Everything else** — Edge: no incoming educator → handover held pending. DoD: summary numbers match DB.

---

## CG-13 — Two-Way Parent Messaging

**① User interaction** — **As a** Parent, **I want** to message my child's caregiver, **so that** I can share updates (e.g., "early pickup today").
**As a** Caregiver, **I want** to read and reply from the portal, **so that** conversations stay in one place.
- **Given** a parent sends a message,
  **When** the caregiver opens the inbox,
  **Then** it shows unread count and thread, and reply marks it read.
- **Given** a message mentions pickup change,
  **When** received,
  **Then** it is surfaced on that child's pickup card (CG-02) as a temporary note.

**② Value proposition** — Table-stakes in both products; reduces phone calls to the front desk.

**③ System design** — Extend `Message` with thread id and read state; scoped by caregiver's room children; polling first, websocket later.

**④ Everything else** — Edge: quiet hours; Admin can view threads (audit). DoD: cross-parent isolation test.

---

# Tier 3 — Grow

## CG-14 — Early-Years Lesson / Activity Planner

**① User interaction** — **As a** Lead Educator, **I want** to plan weekly play-based activities linked to learning domains, **so that** planning and documentation connect.
- **Given** I open the weekly planner,
  **When** I add an activity to a day and tag domains,
  **Then** it appears on the room schedule and can be attached to observations (CG-10).

**② Value proposition** — Lillio's curriculum strength; saves planning time.

**③ System design** — Extend existing `LessonPlan` with `age_group` and `domains`; optional template library.

**④ Everything else** — Edge: copy last week. DoD: plan ↔ observation link works.

---

## CG-15 — Offline Queue & Sync

**① User interaction** — **As a** Caregiver, **I want** my logs saved when Wi-Fi drops, **so that** nothing is lost.
- **Given** the browser is offline,
  **When** I log events,
  **Then** they queue locally with a visible `Pending sync` count and replay idempotently on reconnect.

**② Value proposition** — Playgrounds and basements have poor signal.

**③ System design** — IndexedDB queue + `client_mutation_id` idempotency key on `POST /care-events` and `/attendance`; purge on logout (`US-P3-03`).

**④ Everything else** — Edge: record locked by `BR-03-01` while offline → conflict UI. DoD: duplicate replay creates one record.

---

## CG-16 — Day-Report PDF & Family Contact Sharing

**① User interaction** — **As a** Caregiver, **I want** to download a child's daily report and let parents invite family, **so that** records can be shared and filed.
- **Given** a child's day has events,
  **When** I tap **Download Day Report**,
  **Then** a PDF of the day's timeline is generated for that child only.

**② Value proposition** — Licensing evidence and parent keepsake; Lillio family sharing parity.

**③ System design** — Server-side PDF from `CareEvent` + incidents; access-checked, expiring link.

**④ Everything else** — Edge: redact other children's names in group incidents. DoD: PDF contains only that child's data.

---

## 2. Explicitly Out of Scope (for the caregiver portal)

| Item | Reason |
| :--- | :--- |
| Staff-to-child **ratio tracking** | Product decision (2026-11-16) |
| Tuition billing / autopay | Belongs to Admin & Parent portals (`US-P2-01`, `US-P2-05`) |
| Enrollment CRM / waitlist | Admissions epic (`US-P0-03`) |
| Staff scheduling / payroll | Staff & HR epics (`US-P2-08`, `US-P1-08`) |
| Kiosk hardware | Web/tablet only for now |

## 3. Known Repo Gaps That Block the MVP (found while writing this)

1. `StudentAttendance` lacks `check_in_at` / `check_out_at` — arrival times on screen today are default strings, not data (CG-01).
2. `EmergencyContact` lacks pickup flag, photo, PIN, custody restriction (CG-02).
3. No model for diaper / hydration / meal-intake events (CG-06) — current UI keeps these only in React state.
4. No media storage or photo-consent field (CG-08).
5. Open defects `DEF-022` – `DEF-028` map to CG-03, CG-04, CG-05, CG-06 and the test harness; fix as part of MVP-1 so they do not recur.

## 4. Success Criteria (Release Gates)

- MVP-1 (CG-01 → CG-05): **100 %** of on-screen roster, alert, medication, and incident data traces to PostgreSQL; negative room-scoping tests pass.
- MVP-2 (CG-06 → CG-08): a caregiver can log a diaper/meal/nap in **≤ 2 taps**, and a parent sees it in **≤ 5 s**.
- Playwright (signed JWT, `DEF-028`) covers: check-in/out, pickup block, consent block, incident SLA, care event → parent feed, view toggle, z-index layering (70 / 80).
- `tsc --noEmit`, `npm run lint`, `npm run build`, and focused `pytest` all pass; every discovered defect logged in `11_DEFECTS.md`; entry added to `7_MEMORY_LOG.md`.
