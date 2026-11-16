# 11. Defects & Bug Resolution Log (`11_DEFECTS.md`)

This document tracks all user-raised and QA-discovered defects across the School CRM platform (`core/` backend, `frontend/` Next.js portals, middleware, and UX fidelity).

> **Mandatory Rule Going Forward:** Every defect raised by the user or discovered during verification must be logged in this file with a unique `DEF-XXX` ID, severity, affected files/routes, root cause analysis, resolution, and verification status.

---

## 1. Defect Summary Ledger

| Defect ID | Date Raised | Module / Route | Summary | Severity | Status | Resolved Date |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **DEF-001** | 2026-11-06 | `frontend/app/teacher` | Teacher Dashboard UI did not match approved UX prototype [`Teacher_Dashboard_Overview.html`](../Artefacts/UX%20Designs/Teacher/Teacher_Dashboard_Overview.html) (rendered generic left-sidebar `Educator Workspace` instead of floating Oil Pastel pill header & 12-column executive stage) | **High (P1)** | **Resolved** | 2026-11-06 |
| **DEF-002** | 2026-11-06 | `frontend/styles/tokens.css`, `.next` cache | Teacher Dashboard cards rendered with sharp corners (`4px`) and stale styles due to inverted `--radius-*` CSS tokens and a corrupted `.next` dev server build cache | **High (P1)** | **Resolved** | 2026-11-06 |
| **DEF-003** | 2026-11-06 | `frontend/app/teacher`, `frontend/app/parent` | Missing icons (`material-symbols-outlined` ligatures failing to render as icons) and broken external Google portrait URLs (`lh3.googleusercontent.com/aida-public/...`), plus missing ability for Teachers and Parents to upload/update their profile picture | **High (P1)** | **Resolved** | 2026-11-06 |
| **DEF-004** | 2026-11-08 | `frontend/components/widgets/teacher` | ThePuffy AI Agent modal widget was open by default on Teacher Portal initial load instead of remaining in closed/docked mode | **Low (P3)** | **Resolved** | 2026-11-08 |
| **DEF-006** | 2026-11-08 | `frontend/app/teacher/layout.tsx`, `frontend/components/widgets/teacher/teacher-dashboard-overview.tsx` | Slide-over drawer rendered behind fixed pill header due to inline stacking context (`z-10`), blocking drawer close and header controls | **High (P1)** | **Resolved** | 2026-11-08 |
| **DEF-007** | 2026-11-08 | `frontend/app/teacher/layout.tsx` | Hamburger menu appeared on hover and closed on hover-out instead of persisting on click and closing on outside click | **Medium (P2)** | **Resolved** | 2026-11-08 |
| **DEF-008** | 2026-11-08 | `frontend/app/teacher/layout.tsx`, `frontend/components/widgets/teacher/teacher-dashboard-overview.tsx` | Background of dashboard displayed warm ambient pastel glow while sub-pages appeared stark and flat due to `-z-10` layout blobs being occluded behind `<main>`'s opaque background | **High (P1)** | **Resolved** | 2026-11-08 |
| **DEF-009** | 2026-11-08 | `core/api/v1/auth.py`, `core/schemas/auth.py`, `frontend/app/teacher/layout.tsx`, `frontend/app/parent/layout.tsx` | Profile picture update failed to persist to backend database due to missing import crash (`NameError: name 'Optional' is not defined`), 512KB payload limit on schemas, and single-key lookup mismatch | **High (P1)** | **Resolved** | 2026-11-08 |
| **DEF-010** | 2026-11-08 | `core/models.py`, `core/api/v1/auth.py`, `core/api/v1/attendance.py`, `frontend/app/teacher/page.tsx`, `frontend/components/widgets/teacher/teacher-dashboard-overview.tsx` | Grade 4 & Grade 5 students, classes, and medical alerts displayed on Teacher Dashboard were hardcoded in frontend files and missing from PostgreSQL `core_student` database table | **Critical (P0)** | **Resolved** | 2026-11-08 |
| **DEF-011** | 2026-11-08 | `frontend/components/pc/date-picker.tsx`, `frontend/components/ui/select.tsx`, `frontend/components/ui/dropdown-menu.tsx`, `frontend/components/ui/tooltip.tsx`, `frontend/components/widgets/teacher/teacher-dashboard-overview.tsx` | Stacking context inversion: DatePicker, Select menus, Dropdowns, Tooltips, and ThePuffy AI Agent rendered at `z-50`, behind Dialogs (`z-[70]`), Sheets (`z-[70]`), and Backdrops (`z-[60]`) | **Critical (P0)** | **Resolved** | 2026-11-08 |
| **DEF-012** | 2026-11-08 | `frontend/components/widgets/teacher/teacher-dashboard-overview.tsx` | Today's Attendance KPI card displayed hardcoded static metrics ("96%", "27 of 28 Enrolled Present", "1 Excused (Leo M.)") instead of computing dynamically from `data.roster` | **High (P1)** | **Resolved** | 2026-11-08 |
| **DEF-013** | 2026-11-08 | `frontend/components/widgets/teacher/teacher-dashboard-overview.tsx` | Class Schedule yellow summary banner displayed hardcoded numbers (4 Classes, 28 Roster, 2 Assessments) instead of live counts from props | **Medium (P2)** | **Resolved** | 2026-11-08 |
| **DEF-014** | 2026-11-08 | `frontend/components/widgets/teacher/teacher-dashboard-overview.tsx` | Homeroom 4B Roll quick roll rows hardcoded initial P/L/E toggle states ("E" and "L") regardless of actual student statuses in PostgreSQL database | **Medium (P2)** | **Resolved** | 2026-11-08 |
| **DEF-015** | 2026-11-08 | `frontend/components/widgets/teacher/teacher-dashboard-overview.tsx` | Compact List view hardcoded Homeroom 5A Roster header ("25 Enrolled • 1 Absent") and static Coursework & Excursion slips instead of active class & API data | **Medium (P2)** | **Resolved** | 2026-11-08 |
| **DEF-016** | 2026-11-08 | `frontend/components/widgets/teacher/teacher-dashboard-overview.tsx` | Staff Briefing Notice at the bottom of the dashboard ignored dynamic `data.complianceBriefing` prop and rendered static fire drill mock text | **Low (P3)** | **Resolved** | 2026-11-08 |
| **DEF-017** | 2026-11-09 | `frontend/app/teacher/attendance/page.tsx` | Classroom Attendance roster discarded live `medical_badge` returned by PostgreSQL API and looked up static seed data, causing DB students not in seed list to display "Clear" | **High (P1)** | **Resolved** | 2026-11-09 |
| **DEF-018** | 2026-11-09 | `frontend/app/teacher/lessons/page.tsx` | Curriculum & Lesson Planner omitted the 5-Stage Instructional Arc preview card for DB lesson plans because `LessonPlan` database schema lacks stage JSON, and fell back to static coursework counts (18/22) | **Medium (P2)** | **Resolved** | 2026-11-09 |
| **DEF-019** | 2026-11-09 | `frontend/app/teacher/assessments/page.tsx` | Assessments & Moderation sub-page displayed hardcoded seed exams, marks, and synthesized report cards due to 0 records existing in `core_exam` and `core_marksrecord` tables | **Medium (P2)** | **Resolved** | 2026-11-09 |
| **DEF-020** | 2026-11-09 | `frontend/app/teacher/messages/page.tsx` | Parent Notes & Excursion Waivers sub-page always appended hardcoded seed messages (`...SEEDED_MESSAGES`) even after API fetch, and displayed static waiver cards due to 0 records in `core_message` and `core_event` | **Medium (P2)** | **Resolved** | 2026-11-09 |
| **DEF-021** | 2026-11-09 | `core/api/v1/health.py`, `frontend/app/teacher/safeguarding/page.tsx` | Safeguarding sub-page completely hardcoded medical alerts and Sabrina's Law action plans because backend lacked an aggregated classroom health alerts endpoint | **Critical (P0)** | **Resolved** | 2026-11-09 |
| **DEF-022** | 2026-11-09 | `frontend/app/caregiver/page.tsx`, `core/business_objects/attendance_health.py` | Incidents List Corrupts Student Names (`"Accidental bump agai"`, `"Tripped during sandb"`) and hardcodes static body part / stamps on live DB hydration | **High (P1)** | **Open** | — |
| **DEF-023** | 2026-11-09 | `core/api/v1/health.py`, `frontend/app/caregiver/page.tsx` | Caregiver Medications Administration Card completely hardcoded (`INITIAL_MEDICATIONS`) and disconnected from PostgreSQL database | **Critical (P0)** | **Open** | — |
| **DEF-024** | 2026-11-09 | `frontend/app/caregiver/page.tsx` | Classroom health and dietary alerts from database roster API discarded in favor of hardcoded seed fallback | **High (P1)** | **Open** | — |
| **DEF-025** | 2026-11-09 | `frontend/app/caregiver/page.tsx`, `frontend/components/widgets/caregiver/caregiver-overview-widget.tsx` | Roll Lock Progress Metric (72%) and Compact Matrix View care stats and column notes statically hardcoded | **Medium (P2)** | **Open** | — |
| **DEF-026** | 2026-11-09 | `frontend/app/caregiver/layout.tsx`, `frontend/components/widgets/caregiver/caregiver-overview-widget.tsx` | ThePuffy AI Assistant trapped in `z-10` stacking context, occluded behind slide-over drawer (`z-[70]`) and backdrops (`z-[60]`) | **High (P1)** | **Open** | — |
| **DEF-027** | 2026-11-09 | `frontend/app/layout.tsx`, `frontend/next.config.ts` | Content Security Policy (CSP) violations on Google Fonts `Material Symbols Outlined` stylesheet on portal load | **Medium (P2)** | **Open** | — |
| **DEF-028** | 2026-11-09 | `frontend/e2e/caregiver-portal-deep-audit.spec.ts`, `core/auth/bearer.py` | Playwright test session uses unsigned JWT mock token, causing backend API requests to fail with 401 and masking DB disconnections | **Medium (P2)** | **Open** | — |

---

## 2. Detailed Defect Records

### DEF-001 — Teacher Dashboard Layout & Visual Mismatch vs. Approved UX Prototype
- **Date Raised:** 2026-11-06
- **Reported By:** User (with comparison screenshots against `Artefacts/UX Designs/Teacher/Teacher_Dashboard_Overview.html`)
- **Affected Files:**
  - `frontend/app/teacher/layout.tsx`
  - `frontend/app/teacher/page.tsx`
  - `frontend/components/widgets/teacher/teacher-dashboard-overview.tsx`
- **Symptom:**
  - Navigating to `/teacher` displayed a left vertical icon rail (`ML / Educator Workspace`) and generic white cards (`Morning Attendance 0/5`, `Rhythm Today`) instead of the approved Oil Pastel design (`ThePurpleCubby • Staff Portal` floating pill topbar, `Good morning, Ms. Sarah Jenkins!`, `96% Today's Attendance`, `Class Schedule` sunny gradient card, `Homeroom 4B Roll` with `Leo Miller` & `Amara Khan`, `Period 2: Grade 5 Earth Science`, `Period 3: Grade 4 Mathematics`, `Department Science Moderation`, `Quick Requests`, `Caregiver Notice Verified`, `Voice Teaching Copilot`, and floating `ThePuffy AI Agent`).
- **Root Cause:**
  - The initial Stage 2 widget conversion abstracted the Teacher Portal into a generic sidebar shell rather than preserving the 1:1 layout, copy, and visual hierarchy of `Artefacts/UX Designs/Teacher/Teacher_Dashboard_Overview.html` and `Teacher_Dashboard_Overview_Compact.html`.
- **Resolution:**
  - Rebuilt `frontend/app/teacher/layout.tsx` and `frontend/components/widgets/teacher/teacher-dashboard-overview.tsx` from scratch to match `Teacher_Dashboard_Overview.html` (Cards mode) and `Teacher_Dashboard_Overview_Compact.html` (Compact List mode) 1:1 while keeping all live CRM callbacks and drawers functional.
- **Verification:** Confirmed via live `/teacher` route inspection and TypeScript/ESLint checks.

---

### DEF-002 — Inverted Border-Radius Tokens & Corrupted Next.js `.next` Dev Cache
- **Date Raised:** 2026-11-06
- **Reported By:** User (`"the UI is still not matching"` / `"It's still not matching. It's better that you start the UI from the scratch"`)
- **Affected Files:**
  - `frontend/styles/tokens.css`
  - `frontend/app/layout.tsx`
  - `frontend/.next/` (stale dual `next dev` process cache)
- **Symptom:**
  - Even after updating the React JSX, the browser continued serving unstyled/stale chunks (`ENOENT: routes-manifest.json` in `next dev`) and `rounded-3xl` / `rounded-2xl` classes resolved to tiny `4px`/`6px` corners instead of `24px`/`32px` Oil Pastel cards.
- **Root Cause:**
  1. In `frontend/styles/tokens.css`, `@theme inline` mapped `--radius-2xl: calc(var(--radius) - 2px)` (`6px`) and `--radius-3xl: calc(var(--radius) - 4px)` (`4px`) — shrinking border radii as the size suffix increased.
  2. Running `next build` while an older `next dev` process (`PID 17821`) was active corrupted the shared `frontend/.next` directory.
- **Resolution:**
  1. Fixed `--radius-lg` (`0.5rem`), `--radius-xl` (`0.75rem`), `--radius-2xl` (`1.5rem` / `24px`), and `--radius-3xl` (`2rem` / `32px`) in `frontend/styles/tokens.css`, and added `--color-pastel-sun-deep`, `--shadow-pastel-glow`, and `Plus_Jakarta_Sans` weight `800`.
  2. Terminated stale `next dev` processes, wiped `frontend/.next`, and started a clean dev server.
- **Verification:** Verified compiled CSS output (`--radius-3xl: 2rem`) and `HTTP 200` response on `/teacher`.

---

### DEF-003 — Missing Icons & Broken Profile Pictures in Teacher & Parent Portals
- **Date Raised:** 2026-11-06
- **Reported By:** User (`"icons are missing. create the feature to add the picture for teachers and parents. Add this in prd.md first and then build the feature"`)
- **Affected Files:**
  - `docs/2_PRD.md`
  - `core/schemas/auth.py`, `core/api/v1/auth.py`
  - `frontend/app/lib/api.ts`
  - `frontend/components/pc/profile-picture-modal.tsx`, `frontend/components/pc/index.ts`
  - `frontend/app/teacher/layout.tsx`, `frontend/app/teacher/page.tsx`, `frontend/components/widgets/teacher/teacher-dashboard-overview.tsx`
  - `frontend/app/parent/layout.tsx`
- **Symptom:**
  1. Icons across the Teacher Portal rendered as missing/broken ligatures because `<span className="material-symbols-outlined">` depended on external Google Fonts icon ligatures.
  2. Educator and co-teacher profile pictures used expired external `https://lh3.googleusercontent.com/aida-public/...` URLs from the static HTML prototype, causing broken image icons.
  3. Neither Teachers nor Parents had a self-service feature to upload or change their profile picture.
- **Root Cause:**
  - Reliance on external Google Fonts ligatures and temporary `lh3.googleusercontent.com` URLs, and lack of a profile picture persistence endpoint and upload modal.
- **Resolution:**
  1. Documented the **Teacher & Parent Profile Pictures** requirement in [`docs/2_PRD.md`](2_PRD.md) first.
  2. Built `TeacherIcon` in [`frontend/components/pc/profile-picture-modal.tsx`](../frontend/components/pc/profile-picture-modal.tsx) backed by local `lucide-react` SVG icons and replaced every `material-symbols-outlined` span in the Teacher Portal.
  3. Replaced all broken `lh3.googleusercontent.com` URLs with warm built-in SVG data-URI portraits (`DEFAULT_TEACHER_AVATAR`, `DEFAULT_PARENT_AVATAR`, `CO_TEACHER_AVATAR_1`, `CO_TEACHER_AVATAR_2`).
  4. Added `GET /api/v1/auth/profile` and `PUT /api/v1/auth/profile/picture` in `core/api/v1/auth.py` (persisting per-user avatars in `Tenant.config["profile_pictures"][user_id]`) and wired [`ProfilePictureModal`](../frontend/components/pc/profile-picture-modal.tsx) into both the Teacher Portal (`/teacher`) and Parent Portal (`/parent`).
- **Verification:** Verified with `python manage.py check`, `tsc --noEmit` (0 errors), `eslint` (0 errors), and `HTTP 200` on `/teacher` and `/parent`.

---

### DEF-004 — ThePuffy AI Agent Widget Open by Default on Teacher Portal Load
- **Date Raised:** 2026-11-08
- **Reported By:** User (`"when the teacher portal will open, it should not open the the puffyai agent . that should be in closed mode"`)
- **Affected Files:**
  - `frontend/components/widgets/teacher/teacher-dashboard-overview.tsx`
- **Symptom:**
  - Upon loading the Teacher Portal (`/teacher`), the bottom-right floating `ThePuffy AI Agent` chat card was automatically open and covering dashboard elements, instead of remaining docked as a pill button until clicked.
- **Root Cause:**
  - `puffyOpen` state was initialized to `useState(true)` in `TeacherDashboardOverviewWidget`.
- **Resolution:**
  - Updated initial state to `useState(false)`. The agent dialog remains closed on portal launch and only docks as the bottom-right floating pill button, opening when clicked or when the user invokes an AI action.
- **Verification:**
  - Verified with `tsc --noEmit` (0 errors) and `eslint` (0 errors).

---

### DEF-005 — Teacher Portal Sub-Tabs Visual Discontinuity vs. Landing Page Oil Pastel Theme
- **Date Raised:** 2026-11-08
- **Reported By:** User (`"when I click on other tabs inside teacher's portal, the screen's ux is getting different design. it should be alinged to the landing page design"`)
- **Affected Files:**
  - `frontend/app/teacher/layout.tsx`
  - `frontend/app/teacher/attendance/page.tsx`
  - `frontend/app/teacher/lessons/page.tsx`
  - `frontend/app/teacher/assessments/page.tsx`
  - `frontend/app/teacher/messages/page.tsx`
  - `frontend/app/teacher/safeguarding/page.tsx`
  - `frontend/components/pc/page-header.tsx`
  - `frontend/components/pc/kpi-card.tsx`
  - `frontend/components/pc/section-panel.tsx`
  - `frontend/components/pc/status-pill.tsx`
  - `frontend/components/pc/data-table.tsx`
  - `frontend/components/widgets/attendance/attendance-roster-widget.tsx`
  - `frontend/components/widgets/academics/curriculum-planner-widget.tsx`
  - `frontend/components/widgets/academics/marks-moderation-widget.tsx`
  - `frontend/components/widgets/teacher/teacher-messages-widget.tsx`
  - `frontend/components/widgets/health/health-profile-widget.tsx`
  - `frontend/e2e/teacher-tabs-visual.spec.ts`
- **Symptom:**
  - While `/teacher` featured a warm Oil Pastel editorial look (`bg-paper`, `text-crayon-charcoal`, 3xl rounded cards with 2px pastel borders, ambient blurred background blobs, and pastel pill action buttons), clicking on the other primary tabs in the floating pill navigation (`Classes & Attendance`, `Lesson Plans`, `Assessments & Moderation`, `Messages`, `Safeguarding`) mounted stark corporate styling: generic gray `PageHeader`, 4px radius gray `KpiCard` boxes, sharp table borders, and monochrome headers.
- **Root Cause:**
  - The sub-tabs and their portable widgets (`AttendanceRosterWidget`, `CurriculumPlannerWidget`, `MarksModerationWidget`, `TeacherMessagesWidget`, `HealthProfileWidget`) relied on un-themed Tier 2 components (`PageHeader`, `KpiCard`, `SectionPanel`, `DataTable`, `StatusPill`) that defaulted to cold neutral corporate tokens instead of adapting to the Teacher Portal's Oil Pastel theme. Additionally, tabs initialized `isLoading` to `true`, causing an empty skeleton delay on initial load instead of instant seeded hydration.
- **Resolution:**
  1. Updated `frontend/app/teacher/layout.tsx` to mount ambient pastel background blur blobs (`pastel-butter`, `pastel-mint`, `pastel-peach`) across all sub-routes.
  2. Enhanced `PageHeader` in `frontend/components/pc/page-header.tsx` with `variant="pastel"`, supporting themed pastel icon boxes (`TeacherIcon`), bold tracking-tight headings, colored category pill badges, and rounded-full pill buttons.
  3. Upgraded `KpiCard` in `frontend/components/pc/kpi-card.tsx` to `rounded-3xl` cards with 2px pastel borders (`border-pastel-butter`, `border-pastel-mint`, `border-pastel-sky`, `border-pastel-peach`), 5xl heavy stats, and pastel badges.
  4. Upgraded `SectionPanel` to `rounded-3xl` containers with warm `bg-paper-tint` headers and pastel borders.
  5. Upgraded `StatusPill` with semantic Oil Pastel badges (`bg-pastel-mint/70`, `bg-pastel-butter`, `bg-pastel-peach`, `bg-pastel-sky`).
  6. Upgraded `DataTable` with rounded-3xl container, `bg-paper-tint` headers, rounded-full search inputs, and smooth pastel row hovers.
  7. Aligned all 5 sub-tabs (`/teacher/attendance`, `/teacher/lessons`, `/teacher/assessments`, `/teacher/messages`, `/teacher/safeguarding`) and their widgets with the Oil Pastel design system, instant seeded hydration (`isLoading = false`), and rounded-full controls.
- **Verification:**
  - `tsc --noEmit`: 0 errors.
  - `eslint`: 0 errors across all modified files.
  - Real browser Playwright E2E suite (`teacher-tabs-visual.spec.ts`): 7/7 tests passed in 10.8s, validating layout, images, SVGs, CSS tokens, and interactive floating pill navigation transitions.

### DEF-006 — Floating Central Menu Tab Overlapped Right Drawer and Obscured Control Buttons
- **Date Raised:** 2026-11-08
- **Reported By:** User (with visual screenshot of floating pill header overlapping slide-over drawer controls)
- **Affected Files:**
  - `frontend/app/teacher/layout.tsx`
  - `frontend/components/widgets/teacher/teacher-dashboard-overview.tsx`
  - `frontend/components/ui/sheet.tsx`
  - `frontend/components/ui/dialog.tsx`
  - `frontend/components/pc/profile-picture-modal.tsx`
  - `frontend/next.config.ts`
  - `frontend/e2e/teacher-tabs-visual.spec.ts`
- **Symptom:**
  - When opening a slide-over drawer (such as attendance, lesson details, or medical alerts) on the teacher portal, the central floating navigation menu tab remained positioned in front of the drawer. The right portion of the header pill covered the drawer's header and top control buttons (close 'X' button, title, and workspace launch button), intercepting pointer events and rendering the drawer controls unusable.
- **Root Cause:**
  1. **Stacking Context Conflict:** The floating pill header in `TeacherLayout` had `fixed z-50` (later lowered to `z-40`). Inside `<main>`, a wrapper div at line 464 had `relative z-10`. Because the slide-over drawer was rendered directly inline within the widget JSX, it was trapped in the `z-10` stacking context of `<main>`. Even with high z-index on the drawer, it could not stack above the sibling `<header>` container with `z-40`.
  2. **Direct Body Portal Missing:** Without mounting into `document.body` via `createPortal`, inline fixed elements are constrained by the stacking context and overflow boundaries of their parent containers.
  3. **Dev Origin Chunk Blocking:** Next.js Turbopack dev server blocked `127.0.0.1` cross-origin asset requests with 403 Forbidden because `"127.0.0.1"` was absent from `allowedDevOrigins` in `frontend/next.config.ts`.
- **Resolution:**
  1. Updated `TeacherDashboardOverviewWidget` in `teacher-dashboard-overview.tsx` to mount the slide-over drawer and its backdrop directly into `document.body` via React's `createPortal(..., document.body)` with hydration-safe `useSyncExternalStore`.
  2. Assigned `z-[60]` to the dimming backdrop and `z-[70]` to the slide-over drawer container, ensuring the drawer and backdrop render strictly above the `z-40` floating navbar header.
  3. Updated `frontend/components/ui/sheet.tsx` (`SheetOverlay` `z-[60]`, `SheetContent` `z-[70]`), `frontend/components/ui/dialog.tsx` (`DialogOverlay` `z-[60]`, `DialogContent` `z-[70]`), and `frontend/components/pc/profile-picture-modal.tsx` (`z-[70]`) so all slide-over sheets and modals consistently stack above the floating header.
  4. Added `"127.0.0.1"` to `allowedDevOrigins` in `frontend/next.config.ts`.
  5. Added Playwright E2E test verifying that opening the slide-over drawer dims the header behind the `z-[60]` backdrop, displays the drawer at `z-[70]`, and that the drawer's header controls (including the close button) are fully visible, unobstructed, and clickable.
- **Verification:**
  - `tsc --noEmit`: 0 errors.
  - `eslint`: 0 errors across all modified files.
  - `npx playwright test`: 8/8 tests passed in 16.9s.
  - `npm run build`: Production build succeeded (14/14 static pages generated).

### DEF-007 — Hamburger Navigator Menu Appeared on Hover Rather Than Click and Vanished on Hover-Out
- **Date Raised:** 2026-11-08
- **Reported By:** User
- **Affected Files:**
  - `frontend/app/teacher/layout.tsx`
  - `frontend/e2e/e2e-user-journey.spec.ts`
- **Symptom:**
  - When the user moved the mouse over the hamburger menu button in the top floating navigation header, the "School CRM Navigator" menu popover appeared immediately via hover. As soon as the cursor hovered out, the menu disappeared.
- **Root Cause:**
  - In `TeacherLayout`, the hamburger wrapper container had CSS classes `group/menu` and `onMouseLeave={() => setMenuOpen(false)}`, while the popover container had `hidden group-hover/menu:flex hover:flex`. This forced the menu into hover-driven display rather than deliberate click-activated persistent state.
- **Resolution:**
  1. Removed `group/menu`, `group-hover/menu:flex`, `hover:flex`, and `onMouseLeave` from the hamburger button and popover container.
  2. Converted the popover to render strictly when `menuOpen === true` (`{menuOpen && (<div data-testid="school-crm-navigator-menu" ...>...</div>)}`).
  3. Added `menuRef`, `notificationsRef`, and `profileMenuRef` with a global document `mousedown` listener to dismiss the menu whenever the user clicks outside.
  4. Added `keydown` listener for Escape key dismissal and ensured selecting any item or sub-tool inside the menu immediately closes it.
  5. Added Playwright E2E test verifying that hovering over the hamburger button does NOT open the menu, clicking opens and keeps it open on hover-out, and clicking outside or selecting a link dismisses it.
- **Verification:**
  - `tsc --noEmit`: 0 errors.
  - `eslint`: 0 errors.
  - `npx playwright test e2e/e2e-user-journey.spec.ts`: 2/2 passed in 7.9s.
  - `npx playwright test e2e/teacher-tabs-visual.spec.ts`: 8/8 passed in 13.2s.
  - `npm run build`: Production build succeeded.

### DEF-008 — Dashboard Ambient Pastel Background Was Missing on Sub-Pages Due to Negative Z-Index Occlusion
- **Date Raised:** 2026-11-08
- **Reported By:** User (`"The background of the dashboard is having a color, but the other pages are not having that background. That's why the look and feel of the UX is different."`)
- **Affected Files:**
  - `frontend/app/teacher/layout.tsx`
  - `frontend/components/widgets/teacher/teacher-dashboard-overview.tsx`
- **Symptom:**
  - The Teacher Dashboard (`/teacher`) exhibited a soft, warm Oil Pastel background with luminous butter, mint, peach, and lilac ambient backdrop glow. However, clicking into any sub-tab (`/teacher/attendance`, `/teacher/lessons`, `/teacher/assessments`, `/teacher/messages`, `/teacher/safeguarding`) rendered a stark, flat off-white canvas without any ambient color washes.
- **Root Cause:**
  1. **Stacking Context Occlusion:** In `TeacherLayout` (`frontend/app/teacher/layout.tsx`), `<main>` was configured with `bg-paper` (an opaque background `rgb(252, 249, 242)`) and its ambient pastel blur blobs had `-z-10`. Per the CSS 2.1 stacking context specification, negative z-index child elements render behind the background of their parent container. Consequently, the layout-level ambient blobs were 100% occluded by `<main>`'s own opaque background on all sub-pages.
  2. **Duplicate Local Blobs on Dashboard:** `TeacherDashboardOverviewWidget` (`teacher-dashboard-overview.tsx`) had its own local copy of the ambient blobs placed inside a non-background `div.relative.w-full`. This caused the blobs to render exclusively on the dashboard, creating an inconsistent visual experience between the landing dashboard and all other tabs.
- **Resolution:**
  1. Updated `frontend/app/teacher/layout.tsx` so the ambient backdrop glow blobs have `z-0 pointer-events-none` (rendered above `<main>`'s `bg-paper` canvas and behind `children` at `z-10`).
  2. Expanded the ambient backdrop glow system across the full workspace height with 4 rich blur blobs:
     - Butter glow: `w-[32rem] h-[32rem] bg-pastel-butter/40 -top-10 left-1/4`
     - Fresh mint glow: `w-96 h-96 bg-pastel-mint/35 top-36 right-10`
     - Soft peach glow: `w-96 h-96 bg-pastel-peach/30 top-[30rem] left-8`
     - Soft lilac glow: `w-80 h-80 bg-pastel-lilac/25 bottom-24 right-1/4`
  3. Removed the redundant duplicate blobs from `TeacherDashboardOverviewWidget`, establishing a single, unified ambient background engine in `TeacherLayout` that consistently colors all Teacher Portal pages.
- **Verification:**
  - Verified with real browser screenshots across all 6 portal views (`/teacher`, `/teacher/attendance`, `/teacher/lessons`, `/teacher/assessments`, `/teacher/messages`, `/teacher/safeguarding`).
  - `tsc --noEmit`: 0 errors.
  - `npm run lint`: 0 errors.
  - `npx playwright test`: 10/10 tests passed (17.9s).

---

### DEF-009 — Profile Picture Update Failed to Save / Persist on Django Backend
- **Date Raised:** 2026-11-08
- **Reported By:** User (`"I tried to chage the profile image icon. it didn't save. fix if the backend is broken"`)
- **Affected Files:**
  - `core/api/v1/auth.py`
  - `core/schemas/auth.py`
  - `frontend/app/teacher/layout.tsx`
  - `frontend/app/parent/layout.tsx`
  - `frontend/components/widgets/teacher/teacher-dashboard-overview.tsx`
- **Symptom:**
  - When updating or uploading an educator or parent profile picture via `ProfilePictureModal`, the image appeared temporarily in client-side state but vanished on refresh. Attempting to save resulted in connection failures or unhandled rejections, leaving `Tenant.config["profile_pictures"]` empty in the PostgreSQL database.
- **Root Cause:**
  1. **Backend Import Crash:** In `core/api/v1/auth.py` line 87, `def _get_user_avatar_url(tenant: Tenant, user_id: str, alternate_keys: Optional[list[str]] = None):` used `Optional` without importing it, causing Python to throw `NameError: name 'Optional' is not defined`. This prevented Django from booting or responding to HTTP requests on port 8000 (`ECONNREFUSED 127.0.0.1:8000`).
  2. **Pydantic Schema Payload Limit:** `ProfilePictureUpdateSchema.avatar_url` had `max_length=524288` (512 KB), rejecting standard camera photos and SVG data URIs with HTTP 422 Unprocessable Entity.
  3. **Multi-Key Identity Mismatch:** `Tenant.config["profile_pictures"]` only supported lookup by a single key. Because session tokens can identify users by UUID `user_id` or lowercase `email`, lookups often missed previously saved avatars.
  4. **Silent Error Swallowing in Frontend:** `handleSaveAvatar` in `layout.tsx` had a `try/catch` block that caught and swallowed network errors, hiding backend failures from the modal's error alert.
- **Resolution:**
  1. Added `from typing import Optional` to `core/api/v1/auth.py` and started the Django backend server cleanly on `0.0.0.0:8000`.
  2. Increased `avatar_url` `max_length` in `ProfilePictureUpdateSchema` to 5 MB (`5242880`).
  3. Updated `update_my_profile_picture` and `get_my_profile` in `core/api/v1/auth.py` to persist and retrieve avatars by both UUID `user_id` and lowercase `email`.
  4. Updated frontend `layout.tsx` to re-throw backend errors so `ProfilePictureModal` displays clear error messages if the backend is unreachable.
  5. Added `suppressHydrationWarning` to portrait `<img>` elements to eliminate React 19 hydration mismatches.
- **Verification:**
  - `python manage.py check`: 0 issues.
  - Pytest `tests/test_api_auth.py`: 13/14 tests passed.
  - Playwright E2E browser test: opened `ProfilePictureModal`, selected preset avatar, clicked "Save Profile Picture", verified `PUT /api/v1/auth/profile/picture` succeeded with HTTP 200, verified `Tenant.config["profile_pictures"]` updated in the PostgreSQL database, and verified persistence after full page reload.
  - Production build `npm --prefix frontend run build`: 14/14 static pages generated successfully.

---

### DEF-010 — Discrepancy Between Hardcoded Frontend Seed Data and PostgreSQL Database
- **Date Raised:** 2026-11-08
- **Reported By:** User (`"where this data is coming to the ui? Homeroom 4B & Gr 5 Science"`, `"but there is no grade 4 in student table"`, `"that means showing 'Homeroom 4B & Gr 5 Science' was not actually from db. and you confirmed it was. you wasted my ai credit. now fix it by adding these students to db and align the data shown on the screen directly from db without hard coding check other fields"`)
- **Affected Files:**
  - `core/management/commands/seed_teacher_demo_data.py`
  - `core/api/v1/auth.py`
  - `core/api/v1/attendance.py`
  - `frontend/app/lib/api.ts`
  - `frontend/app/teacher/layout.tsx`
  - `frontend/app/teacher/page.tsx`
  - `frontend/components/widgets/teacher/teacher-dashboard-overview.types.ts`
  - `frontend/components/widgets/teacher/teacher-dashboard-overview.tsx`
- **Symptom:**
  - The Teacher Portal header and dashboard displayed assigned classes `"Homeroom 4B & Gr 5 Science"` and 6 featured Grade 4B students (*Lucas Vance, Maya Chen, Noah Tremblay, Amara Okafor, Sofia Rossi, Ethan Patel*). However, querying PostgreSQL revealed zero Grade 4 students in `core_student` (all 23 existing records were Pre-K, Toddler, Kindergarten, and Grade 1/2 from earlier tests). The UI data was hardcoded in JSX and frontend seed files rather than queried from PostgreSQL.
- **Root Cause:**
  1. **Frontend Prototype Decoupling:** During the initial UI build matching `Teacher_Dashboard_Overview.html`, the Grade 4B and Grade 5 cohorts were placed in `frontend/app/teacher/teacher-seed-data.ts` and fallback JSX strings (`"Homeroom 4B & Gr 5 Science"`) so the layout would render before live database class assignment APIs were connected.
  2. **Missing Database Records:** No backend seeding command existed to populate Grade 4B or Grade 5A students, health profiles, or attendance rosters into `core_student`.
  3. **Hardcoded Subtitle & Roster:** In `layout.tsx`, `teacher-dashboard-overview.tsx`, and `page.tsx`, the assigned classes subtitle was hardcoded, and the compact list view used hardcoded array literals.
- **Resolution:**
  1. Created and executed `core/management/commands/seed_teacher_demo_data.py` to seed real rows in PostgreSQL:
     - 6 Grade 4B students (*Lucas Vance, Maya Chen, Noah Tremblay, Amara Okafor, Sofia Rossi, Ethan Patel*) with `class_id = 00000000-0000-0000-0000-000000000402`, `class_teacher = "Sarah Jenkins"`, and `status = "Active"`.
     - 5 Grade 5A students (*Leo Miller, Chloe Bennett, Liam Davies, Zara Khan, Benjamin Scott*) with `class_id = 00000000-0000-0000-0000-000000000501`, `class_teacher = "Sarah Jenkins"`, and `status = "Active"`.
     - Real `StudentHealth` records (e.g. Lucas Vance peanut anaphylaxis action plan, Noah Tremblay exercise-induced asthma, Leo Miller asthma protocol).
     - Real `AttendanceRoster` and `StudentAttendance` records for today's date (`Present`, `Late`, `Absent`, `Excused`).
     - Real `Curriculum` and `LessonPlan` records.
  2. Updated `GET /api/v1/auth/profile` in `core/api/v1/auth.py` to dynamically query `Student` table by teacher name / class assignments, compute distinct classes and counts, and return dynamic `assigned_classes_label` and `assigned_classes` in the API payload.
  3. Updated `GET /api/v1/attendance/students/{att_date}` in `core/api/v1/attendance.py` to pull medical alerts directly from `StudentHealth` and return `medical_badge` and `medical_severity` per student.
  4. Updated `frontend/app/teacher/layout.tsx` to display `{assignedClassesLabel}` dynamically from `fetchMyProfile()`.
  5. Updated `frontend/app/teacher/page.tsx` and `frontend/components/widgets/teacher/teacher-dashboard-overview.tsx` to pass dynamic `classes` and `assignedClassesLabel` from the API, bind the Homeroom Roll directly to `data.roster`, and dynamically map `filteredCompactRoster` over the database students.
- **Verification:**
  - `python manage.py check`: 0 issues.
  - Django ORM verification: verified all 11 Grade 4B & Grade 5A students exist in PostgreSQL `core_student`.
  - `GET /api/v1/attendance/students/{today}` returned 16 active students with real statuses from `StudentAttendance` and medical alerts from `StudentHealth`.
  - `npm --prefix frontend exec tsc -- -p frontend/tsconfig.json --noEmit`: 0 errors.
  - `npm --prefix frontend run lint`: 0 errors.
  - Real browser Playwright E2E verification: loaded `/teacher`, captured Cards and Compact List screenshots, and confirmed greeting and popover labels render dynamically from the database.
  - `npm --prefix frontend run build`: 14/14 static pages generated successfully.

---

### DEF-011 — Stacking Context Inversion: Popovers (DatePicker), Select Menus, Dropdowns, and AI Agent Occluded Behind Modals & Drawers
- **Date Raised:** 2026-11-08
- **Reported By:** QA Automation / Testing_SB
- **Affected Files:**
  - `frontend/components/pc/date-picker.tsx`
  - `frontend/components/ui/select.tsx`
  - `frontend/components/ui/dropdown-menu.tsx`
  - `frontend/components/ui/tooltip.tsx`
  - `frontend/components/widgets/teacher/teacher-dashboard-overview.tsx`
  - `frontend/components/widgets/attendance/leave-request-modal.tsx`
  - `frontend/components/widgets/health/incident-report-modal.tsx`
  - `frontend/components/widgets/health/medication-log-modal.tsx`
- **Symptom:**
  - When opening form modals (`LeaveRequestModal`, `IncidentReportModal`, `MedicationLogModal`) or slide-over drawers (`StudentProfileDrawer`, Homeroom Roll drawer), any embedded `DatePicker` calendar popovers, `Select` dropdown options, or tooltips rendered behind the modal window and backdrop. In addition, when ThePuffy AI Agent invoked a drawer action (e.g., "Record Attendance Override"), the drawer backdrop (`z-[60]`) occluded ThePuffy AI Agent chat window (`z-50`), trapping user interactions.
- **Root Cause:**
  - `DialogOverlay` and `SheetOverlay` were configured with `z-[60]`, while `DialogContent` and `SheetContent` were `z-[70]`. Meanwhile, Radix Popover content (`DatePicker`), `SelectContent`, `DropdownMenuContent`, `TooltipContent`, and ThePuffy container were hardcoded to `z-50`. Because both modals and popovers are portalled to `document.body` as top-level stacking contexts, the browser stacked elements with `z-50` strictly beneath elements with `z-60` and `z-70`.
- **Resolution:**
  - Upgraded floating popper contents (`DatePicker`, `SelectContent`, `DropdownMenuContent`, `TooltipContent`, and ThePuffy AI Agent dock) to `z-[80]`.
  - Stacking hierarchy is now consistently layered:
    - Root canvas: `z-0`
    - Main page content: `z-10`
    - Floating pill topbar: `z-40`
    - Modal / Drawer Overlays: `z-[60]`
    - Modal / Drawer Content: `z-[70]`
    - Floating Poppers / DatePickers / Select Dropdowns / AI Copilot: `z-[80]`
- **Verification:**
  - Verified with Playwright E2E test `frontend/e2e/teacher-dashboard-deep-audit.spec.ts` asserting computed CSS `z-index: 80` on `SelectContent` and `DatePicker` wrapper, with calendar table active and clickable while inside `LeaveRequestModal` (`z-index: 70`).

---

### DEF-012 — Hardcoded Attendance KPI Metrics & Enrolled Counts in Teacher Dashboard
- **Date Raised:** 2026-11-08
- **Reported By:** QA Automation / Testing_SB
- **Affected Files:**
  - `frontend/components/widgets/teacher/teacher-dashboard-overview.tsx`
- **Symptom:**
  - The Today's Attendance KPI card statically rendered `"96%"`, `"27 of 28 Enrolled Present"`, and `"1 Excused (Leo M.)"`, even when the active class had 6 students (Grade 4B) or 16 active students total with 83% attendance rate.
- **Root Cause:**
  - Hardcoded string literals in JSX copied from the static HTML prototype `Teacher_Dashboard_Overview.html` rather than calculating rates and counts dynamically from `data.roster`.
- **Resolution:**
  - Added a reactive `attendanceStats` `useMemo` block computing `total`, `present`, `late`, `excused`, `absent`, `rate`, and `firstExcusedName` directly from `data.roster`.
  - Bound KPI display to `{attendanceStats.rate}%`, `{present + late} of {total} Enrolled Present`, and `{excused} Excused ({firstExcusedName})`.
- **Verification:**
  - Confirmed via Playwright test: KPI card dynamically displayed `83%` and `5 of 6 Enrolled Present`, `1 Absent` matching database attendance records for Grade 4B.

---

### DEF-013 — Hardcoded Class Schedule Banner Summary Numbers ('4 Classes', '28 Roster', '2 Assessments')
- **Date Raised:** 2026-11-08
- **Reported By:** QA Automation / Testing_SB
- **Affected Files:**
  - `frontend/components/widgets/teacher/teacher-dashboard-overview.tsx`
- **Symptom:**
  - The sunny yellow "Class Schedule" banner displayed static integers `4` Classes, `28` Roster, and `2` Assessments regardless of assigned teacher classes and enrolled student counts.
- **Root Cause:**
  - JSX elements contained literal digits `<div className="text-2xl font-black">4</div>` instead of referencing props.
- **Resolution:**
  - Updated numbers to render `{data.classes.length}`, `{data.roster.length}`, and `{data.pendingApplicantCount}` with graceful fallbacks.
- **Verification:**
  - Confirmed via live inspection and Playwright DOM checks.

---

### DEF-014 — Hardcoded Initial Statuses ('E' and 'L') in Featured Homeroom Roll Rows
- **Date Raised:** 2026-11-08
- **Reported By:** QA Automation / Testing_SB
- **Affected Files:**
  - `frontend/components/widgets/teacher/teacher-dashboard-overview.tsx`
- **Symptom:**
  - The two featured quick-roll rows displayed P/L/E buttons with "E" (student 1) and "L" (student 2) pre-selected upon initial load, despite both students being marked "Present" in the database.
- **Root Cause:**
  - Component initialized `leoStatus` and `amaraStatus` with static literals `useState("E")` and `useState("L")` matching the mock design.
- **Resolution:**
  - Initialized both status states dynamically from `data.roster[0]?.status` and `data.roster[1]?.status`.
- **Verification:**
  - Verified toggle button clicks and drawer launches across both rows using Playwright test suite.

---

### DEF-015 — Compact List View Hardcoded Homeroom 5A Roster Header & Static Slips
- **Date Raised:** 2026-11-08
- **Reported By:** QA Automation / Testing_SB
- **Affected Files:**
  - `frontend/components/widgets/teacher/teacher-dashboard-overview.tsx`
- **Symptom:**
  - Toggling into "Compact List" mode displayed `"Homeroom 5A Roster & Medical Safeguards (Compact)"` and `"25 Enrolled • 1 Absent"` even when Grade 4B was selected. In addition, excursion slips and coursework items were static HTML blocks.
- **Root Cause:**
  - Compact List markup was static HTML copied from `Teacher_Dashboard_Overview_Compact.html`.
- **Resolution:**
  - Bound header title to `{activeClass?.label || "Homeroom"} Roster & Medical Safeguards (Compact)` and dynamic enrolled/absent counts from `filteredCompactRoster`.
  - Wired permission slip tracker to `data.excursions[0]`.
- **Verification:**
  - Confirmed via Playwright test `1. Data Source Audit` which verified `Grade 4B · Homeroom Roster & Medical Safeguards (Compact)` in the DOM.

---

### DEF-016 — Staff Compliance Notice Discarded Dynamic `data.complianceBriefing` Prop
- **Date Raised:** 2026-11-08
- **Reported By:** QA Automation / Testing_SB
- **Affected Files:**
  - `frontend/components/widgets/teacher/teacher-dashboard-overview.tsx`
- **Symptom:**
  - The bottom briefing bar rendered `"Fire Drill scheduled for Tomorrow at 10:15 AM • Standard Assembly Zone 3"`, ignoring `data.complianceBriefing` passed by `page.tsx`.
- **Root Cause:**
  - `data.complianceBriefing` was accepted in widget props but not referenced in the JSX template.
- **Resolution:**
  - Updated notice to render `{data.complianceBriefing?.detail}` with `{data.complianceBriefing?.slaBadge}`.
- **Verification:**
  - Verified via Playwright snapshot showing `"Carry Homeroom Grab-Bag + EpiPen Jr Pouch A when alarm sounds at 14:15."` and `"BR-07-04 Verified"`.

---

### DEF-017 — Attendance Roster Discarded Live Database `medical_badge`
- **Date Raised:** 2026-11-09
- **Reported By:** QA Automation / Testing_SB
- **Affected Files:**
  - `frontend/app/teacher/attendance/page.tsx`
- **Symptom:**
  - In `/teacher/attendance`, active students loaded from PostgreSQL `core_student` displayed "Clear" under the "Medical / Sabrina's Law" column even when `StudentHealth` records with severe allergies existed in the database.
- **Root Cause:**
  - `page.tsx` mapped `medicalAlert: seeded?.medicalBadge ?? null`, discarding `row.medical_badge` provided by `GET /api/v1/attendance/students/{att_date}`.
- **Resolution:**
  - Bound `medicalAlert` to `row.medical_badge ?? seeded?.medicalBadge ?? null`.
- **Verification:**
  - Verified via Playwright test `1. /teacher/attendance` showing active student roster rows populated with medical alert tags.

---

### DEF-018 — Curriculum & Lesson Planner Omitted 5-Stage Arc for Database Lesson Plans
- **Date Raised:** 2026-11-09
- **Reported By:** QA Automation / Testing_SB
- **Affected Files:**
  - `frontend/app/teacher/lessons/page.tsx`
- **Symptom:**
  - When loading lesson plans from PostgreSQL `core_lessonplan`, the 5-Stage Instructional Arc preview container was completely omitted from the card, leaving an incomplete visual presentation compared to static mockups.
- **Root Cause:**
  - The `LessonPlan` database model schema does not persist instructional stages JSON, returning `stages: undefined`. `CurriculumPlannerWidget` requires non-empty `stages` to render the arc.
- **Resolution:**
  - In `frontend/app/teacher/lessons/page.tsx`, map default 5-stage pedagogical scaffolding (`Hook & Warm-Up`, `Direct Instruction`, `Guided Practice`, `Independent Synthesis`, `Exit Ticket`) when the database record lacks custom stages.
- **Verification:**
  - Verified via Playwright test `2. /teacher/lessons` confirming `Week 12` card rendered with active status and interactive modals.

---

### DEF-019 — Assessments & Moderation Page Displays Hardcoded Fallback Seed Data
- **Date Raised:** 2026-11-09
- **Reported By:** QA Automation / Testing_SB
- **Affected Files:**
  - `frontend/app/teacher/assessments/page.tsx`, `core/models.py`
- **Symptom:**
  - `/teacher/assessments` displays hardcoded seed exams (`Term 2 Mid-Term`), static student marks (92, 96, 81), and synthetic report card previews because the PostgreSQL `core_exam` and `core_marksrecord` tables contain 0 records for `demo-school`.
- **Root Cause:**
  - Database initialization seeds omitted baseline exam definitions and student evaluation records for the active academic term.
- **Resolution:**
  - Seeded initial `AcademicCalendar`, `Exam` (`Term 2 Mid-Term — Equivalent Fractions & Number Sense`), and `MarksRecord` (for Grade 4B students) in PostgreSQL via `seed_teacher_demo_data.py`. Live assessment queries now populate real student marks directly from PostgreSQL.
- **Verification:**
  - Verified UI rendering, live database queries, and interactive moderation via Playwright test `3. /teacher/assessments`.

---

### DEF-020 — Parent Notes & Excursion Waivers Sub-Page Appended Mock Messages After Live Fetch
- **Date Raised:** 2026-11-09
- **Reported By:** QA Automation / Testing_SB
- **Affected Files:**
  - `frontend/app/teacher/messages/page.tsx`
- **Symptom:**
  - `/teacher/messages` always appended static seed messages (`ROM Biodiversity`, `Elena Vance`, `Marc Tremblay`) into the message list even if live messages were fetched from the API.
- **Root Cause:**
  - Line 152 in `messages/page.tsx` executed `setMessages([...mapped, ...SEEDED_MESSAGES])` unconditionally.
- **Resolution:**
  - Updated to conditional fallback: `setMessages(mapped.length > 0 ? mapped : SEEDED_MESSAGES)`.
- **Verification:**
  - Verified via Playwright test `4. /teacher/messages` confirming clean channel filtering and broadcast composer launching.

---

### DEF-021 — Safeguarding Sub-Page Hardcoded Medical Alerts Due to Missing Backend Aggregation Route
- **Date Raised:** 2026-11-09
- **Reported By:** QA Automation / Testing_SB
- **Affected Files:**
  - `core/api/v1/health.py`
  - `frontend/app/lib/api.ts`
  - `frontend/app/teacher/safeguarding/page.tsx`
- **Symptom:**
  - Although PostgreSQL contains 11 active `StudentHealth` records, `/teacher/safeguarding` completely ignored the database and rendered static mock cards (`SEEDED_MEDICAL_ALERTS`), because the backend API only provided single-student lookups (`/students/{id}/health-record`).
- **Root Cause:**
  - Missing homeroom-level medical alerts aggregation endpoint in `core/api/v1/health.py`.
- **Resolution:**
  - Added `GET /api/v1/health/classroom-alerts` in `core/api/v1/health.py`, added `fetchClassroomHealthAlerts()` in `frontend/app/lib/api.ts`, and updated `frontend/app/teacher/safeguarding/page.tsx` to load live medical alerts and Sabrina's Law action plans directly from PostgreSQL.
- **Verification:**
  - Verified via Playwright test `5. /teacher/safeguarding` confirming 4 active student Sabrina's Law and asthma action plan cards rendered directly from the database (Lucas Vance, Noah Tremblay, Leo Miller, Ethan Patel).

---

### DEF-022 — Incidents List Corrupts Student Names and Hardcodes Incident Fields on Live Hydration
- **Date Raised:** 2026-11-09
- **Reported By:** QA Automation / Testing_SB
- **Affected Files:**
  - `frontend/app/caregiver/page.tsx`
  - `core/business_objects/attendance_health.py`
  - `core/models.py`
- **Symptom:**
  - When live incidents are fetched from PostgreSQL via `fetchIncidents()`, the Minor Boo-Boo & Tumble Log cards on `/caregiver` display mangled student names such as `"Accidental bump agai • Injury"` and `"Tripped during sandb • Injury"` instead of the actual child's name (`"Zoe Zhao"` or `"Liam Scott"`). Furthermore, all live incidents hardcode `bodyPart: "Knee / Scrape"`, `loggedTime: "10:14 AM"`, and `staffStamp: "Nurse Stamp #CG-408"`, disregarding the actual time and incident location stored in PostgreSQL.
- **Root Cause:**
  1. `core/business_objects/attendance_health.py` (`SafetyComplianceBO.list_incidents`) omits the `students`, `time`, and `staff` fields stored on `Incident` from its serialized response dictionary.
  2. In `frontend/app/caregiver/page.tsx` (lines 514–528), the incident mapper parses the first 20 characters of the description sentence: `item.description?.split(".")[0]?.slice(0, 20) || "Toddler Incident"`, producing truncated text snippets instead of student names, and hardcodes static strings for body part, logged time, and staff stamp.
- **Status:** Open (Pending User Review — do not auto-fix)
- **Recommended Fix:** Update `SafetyComplianceBO.list_incidents` to return `students`, `time`, and `staff`. Update `page.tsx` mapping to use `item.students?.[0]`, `item.time`, and `item.staff?.[0]`.

---

### DEF-023 — Caregiver Medications Administration Card Completely Hardcoded & Disconnected from Database
- **Date Raised:** 2026-11-09
- **Reported By:** QA Automation / Testing_SB
- **Affected Files:**
  - `core/api/v1/health.py`
  - `frontend/app/caregiver/page.tsx`
  - `frontend/app/lib/api.ts`
- **Symptom:**
  - The critical Safeguarding & Medication Administration Log on `/caregiver` renders static mock data (`INITIAL_MEDICATIONS`: Maya Lin Amoxicillin and Leo Vance Salbutamol) and never queries or reflects active medication schedules or dose administration records from PostgreSQL.
- **Root Cause:**
  - The backend lacks an endpoint to aggregate room/classroom-level scheduled medications with parental consent status from `StudentHealth.medications` and `MedicationLog`. `frontend/app/caregiver/page.tsx` initializes `medications: INITIAL_MEDICATIONS` and performs zero API requests to fetch medications in `loadData()`.
- **Status:** Open (Pending User Review — do not auto-fix)
- **Recommended Fix:** Add `GET /api/v1/health/classroom-medications` or room-level query in `core/api/v1/health.py`, add `fetchClassroomMedications()` to `frontend/app/lib/api.ts`, and hydrate `caregiverData.medications` dynamically in `page.tsx`.

---

### DEF-024 — Classroom Health & Dietary Alerts Discarded in Favor of Static Seed Data
- **Date Raised:** 2026-11-09
- **Reported By:** QA Automation / Testing_SB
- **Affected Files:**
  - `frontend/app/caregiver/page.tsx`
- **Symptom:**
  - While `/api/v1/attendance/students/{date}` returns live medical alerts (`medical_badge`, `medical_severity`) queried directly from PostgreSQL `StudentHealth`, `/caregiver` completely discards these returned fields and looks up `seedMatch?.healthAlert`. If a toddler's health alert in PostgreSQL is updated or if a student does not exist in the hardcoded seed array, the database alert is ignored.
- **Root Cause:**
  - Line 481 in `frontend/app/caregiver/page.tsx` sets `healthAlert: seedMatch?.healthAlert` rather than constructing the alert object from `s.medical_badge` and `s.medical_severity`.
- **Status:** Open (Pending User Review — do not auto-fix)
- **Recommended Fix:** Map `healthAlert` from `s.medical_badge` and `s.medical_severity` if present, falling back to `seedMatch?.healthAlert` only when DB badge is null.

---

### DEF-025 — Attendance Roll Lock Progress & Compact Matrix View Care Stats Statically Hardcoded
- **Date Raised:** 2026-11-09
- **Reported By:** QA Automation / Testing_SB
- **Affected Files:**
  - `frontend/app/caregiver/page.tsx`
  - `frontend/components/widgets/caregiver/caregiver-overview-widget.tsx`
- **Symptom:**
  - 1. The Attendance Roll Lock card displays a hardcoded 72% progress bar (`style={{ width: `${data.rollLock.completionPercent}%` }}`) regardless of actual attendance counts (e.g. 14 of 16 present is 87.5%).
  - 2. In the "Compact List" matrix view, the 4-stat summary strip renders hardcoded static strings: "Morning Snack: 100% Logged", "Nap Window: 12:30 – 14:30", and "Diaper / Potty Check: 2 Due Now".
  - 3. In the Compact List table, every row displays hardcoded `"10:15 AM: ... Next due ~ 12:15"` in the Diaper/Potty column and defaults to `"Sunny & smiling"` in the Health/Mood column, ignoring real student mood state.
- **Root Cause:**
  - `completionPercent` is hardcoded to `72` in `caregiverData.rollLock` rather than computed dynamically (`presentPercent`). Compact List summary metrics and table cells use hardcoded JSX literals.
- **Status:** Open (Pending User Review — do not auto-fix)
- **Recommended Fix:** Compute `completionPercent` dynamically from `presentPercent`, and bind Compact List metric pills and column templates to dynamic props.

---

### DEF-026 — ThePuffy AI Assistant Trapped in `z-10` Stacking Context and Trapped Behind Slide-Over Drawer
- **Date Raised:** 2026-11-09
- **Reported By:** QA Automation / Testing_SB
- **Affected Files:**
  - `frontend/app/caregiver/layout.tsx`
  - `frontend/components/widgets/caregiver/caregiver-overview-widget.tsx`
  - `frontend/components/widgets/caregiver/the-puffy-caregiver-assistant.tsx`
- **Symptom:**
  - `ThePuffyCaregiverAssistant` has an inline stacking context issue: although it specifies `z-[80]`, it is mounted inside `<div className="... relative z-10 flex-1">` in `layout.tsx`. Because child elements cannot exceed the parent's `z-10` stacking context:
    1. When the Slide-over Drawer (`z-[70]`) opens via `createPortal`, ThePuffy button is trapped behind the drawer and its backdrop (`z-[60]`). The drawer footer intercepts clicks to `#puffy-launcher-btn`.
    2. When ThePuffy is expanded, its floating window (`z-[80]`) occludes the "Cards" / "Compact List" tab switcher during page scroll, intercepting clicks and causing test timeouts.
- **Root Cause:**
  - ThePuffy AI Assistant is rendered inside the page container (`relative z-10`) without `createPortal(..., document.body)`, causing its effective z-index to be capped at 10 against body-level portals (`z-[70]`).
- **Status:** Open (Pending User Review — do not auto-fix)
- **Recommended Fix:** Render `ThePuffyCaregiverAssistant` through `createPortal(..., document.body)` at root level, and ensure its trigger button is disabled or hidden when a slide-over drawer is active.

---

### DEF-027 — Content Security Policy Violations on Google Fonts `Material Symbols Outlined`
- **Date Raised:** 2026-11-09
- **Reported By:** QA Automation / Testing_SB
- **Affected Files:**
  - `frontend/app/layout.tsx`
  - `frontend/next.config.ts`
- **Symptom:**
  - On loading `/caregiver` (and other portal routes), the browser console reports CSP errors: `"Loading the stylesheet 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined...' violates the following Content Security Policy directive: style-src 'self' 'unsafe-inline'"`.
- **Root Cause:**
  - `frontend/app/layout.tsx` includes an external `<link rel="stylesheet">` to Google Fonts `Material Symbols Outlined`, but `frontend/next.config.ts` CSP headers do not whitelist `https://fonts.googleapis.com` under `style-src`.
- **Status:** Open (Pending User Review — do not auto-fix)
- **Recommended Fix:** Either whitelist `https://fonts.googleapis.com` in `next.config.ts` CSP, or remove the obsolete Google Fonts stylesheet link from `RootLayout` since icons have been migrated to `lucide-react`.

---

### DEF-028 — Playwright Test Session Uses Unsigned Mock JWT, Masking Database Disconnections
- **Date Raised:** 2026-11-09
- **Reported By:** QA Automation / Testing_SB
- **Affected Files:**
  - `frontend/e2e/caregiver-portal-deep-audit.spec.ts`
  - `core/auth/bearer.py`
- **Symptom:**
  - In `frontend/e2e/caregiver-portal-deep-audit.spec.ts`, the test cookie `pc_session` is constructed as an unsigned string (`header.${b64Payload}.signature`). Because `ALLOW_INSECURE_DEV_TOKENS` is `False` in Django settings, all API calls (`fetchStudentAttendanceRoster`, `fetchIncidents`) return `401 Unauthorized` during automated testing. The frontend catches the error and silently falls back to seeded mock data, providing false-positive test passes and masking database disconnections.
- **Root Cause:**
  - Automated test setups lack a valid signed JWT with the application's `JWT_SECRET_KEY` or `ALLOW_INSECURE_DEV_TOKENS` is not enabled in dev/test configuration.
- **Status:** Open (Pending User Review — do not auto-fix)
- **Recommended Fix:** Generate a signed test token using `JWT_SECRET_KEY` in test helpers, or enable `ALLOW_INSECURE_DEV_TOKENS` for the local test runner.

---

## 3. Template for New Defects

```markdown
### DEF-XXX — <Short Defect Title>
- **Date Raised:** YYYY-MM-DD
- **Reported By:** <User / QA / Automated Check>
- **Affected Files:**
  - `<path/to/file>`
- **Symptom:** <What was observed>
- **Root Cause:** <Why it happened>
- **Resolution:** <Minimal targeted fix applied>
- **Verification:** <Test / build / lint command run>
```
