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
