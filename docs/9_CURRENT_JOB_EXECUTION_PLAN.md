# Execution Plan: US-P0-03 — Admissions Lifecycle & Student Enrollment (`docs/9_CURRENT_JOB_EXECUTION_PLAN.md`)

**Story ID:** `US-P0-03` (Sprint Task `S1-04`, aligned with `US-P2-01`, `US-P2-02`, `US-P2-03`, `US-P2-04`)  
**Document Purpose:** Simple, complete, step-by-step implementation guide for a junior developer to finish everything remaining in **Admissions Lifecycle & Student Enrollment**.  
**Last Updated:** 2026-11-01  
**Author:** Software Development Lead (`SDL_SB`)  
**Governing Rules:** [`AGENTS.md`](../AGENTS.md), [`docs/2_PRD.md`](2_PRD.md), [`docs/8_PRODUCT_BACKLOG_STORIES.md`](8_PRODUCT_BACKLOG_STORIES.md), [`docs/rule_registry.md`](rule_registry.md)

---

## 1. Overview of `US-P0-03` (What the Feature Must Do End-to-End)

The Admissions & Enrollment Lifecycle connects five personas (**Parent**, **Admin**, **Teacher**, **Vice Principal**, **Principal**, and **Owner**) through a single, rule-enforced state machine:

```
[1. Parent Draft] (Pending, is_draft=True, STU-YYYY-XXXX assigned per BR-01-05)
       │  Parent fills student + parent + emergency contact + intake details
       │  Parent uploads required documents (birth_certificate, etc.)
       ▼
[2. Submitted / Under Review] (Under_Review, is_draft=False)
       │  Admin / Principal verifies uploaded documents (BR-01-01)
       │  Admin / Principal assigns Teacher/Admin assessment
       │  Assigned Teacher submits assessment score & recommendation (BR-01-11)
       │  Vice Principal submits admission recommendation (BR-01-14)
       ▼
[3. Admission Decision] (Offered / Waitlisted / Rejected / Pending_Clarification)
       │  Admin / Principal / Owner issues decision + parent message
       │  Decision notification is dispatched -> Decision becomes IMMUTABLE (BR-01-04)
       │  (Only Owner can override a dispatched decision)
       ▼
[4. Parent Offer Acceptance] (Accepted)
       │  Parent uploads child photograph (JPG/PNG <= 10MB, BR-01-16)
       │  System automatically generates Tuition Acceptance Invoice (BR-01-15)
       ▼
[5. Seat Payment & Active Enrollment] (Active)
       │  Parent pays Tuition Invoice via Stripe Checkout (or Admin records payment)
       │  System verifies payment_confirmed=True (BR-01-02) + >=1 EmergencyContact (BR-01-03)
       └──► Student status becomes Active with enrolled_date set!
```

---

## 2. Current State Summary (What Already Exists — Do NOT Rebuild)

Before writing code, review what is **already implemented and passing in tests** so you do not duplicate work:

### 2.1 Backend Already Built (`core/`)
| Layer | File | What Already Exists |
| :--- | :--- | :--- |
| **Models** | [`core/models.py`](../core/models.py) | `TenantSequence` & `generate_student_number()` (`BR-01-05`), `Student`, `Application`, `Parent`, `EmergencyContact`, `Document`, `AuditLog`. All inherit from `TenantScopedModel`. |
| **Schemas** | [`core/schemas/enrollment.py`](../core/schemas/enrollment.py) | `EnrollmentCreateSchema`, `EnrollmentDraftUpdateSchema`, `AssessmentAssignmentSchema`, `AssessmentSubmissionSchema`, `EnrollmentRecommendationSchema`, `EnrollmentDecisionSchema`, `DocumentUploadSchema`, `DocumentVerifySchema`, `StudentCreateInput`, `StudentUpdateSchema`, `ParentCreateInput`, `ParentUpdateInput`, `EmergencyContactCreateSchema`, `EmergencyContactUpdateSchema`. |
| **Business Objects** | [`core/business_objects/enrollment.py`](../core/business_objects/enrollment.py) | `StudentProfileBO` (role field policy, direct student CRUD, parent CRUD, emergency contact CRUD with `BR-01-03` & `BR-01-13` delete guards) and `EnrollmentCaseBO` (draft create/update/submit, document upload/verify/delete, assessment assign/submit, VP recommendation, offer acceptance with photo + invoice creation, `confirm_paid_invoice()` auto-activation). |
| **API Routes** | [`core/api/v1/enrollments.py`](../core/api/v1/enrollments.py) | 28 endpoints covering `/enrollments` (create, patch draft, submit, accept-offer, status, decision, pipeline, my-applications, delete/withdraw), `/enrollments/{id}/documents` (list, upload JSON, multipart upload, view, verify, delete), `/enrollments/assessment-assessors`, `/assessment-assignment`, `/my-assessments`, `/assessment`, `/recommendation`, `/students` CRUD, `/parents` CRUD, and `/emergency-contacts` CRUD. |

### 2.2 Frontend Already Built (`frontend/`)
| File | What Already Exists |
| :--- | :--- |
| [`frontend/app/lib/api.ts`](../frontend/app/lib/api.ts) | API client functions for `submitNewEnrollment`, `updateEnrollmentDraft`, `submitEnrollmentDraft`, `uploadEnrollmentFile`, `acceptEnrollmentOffer`, `fetchAssessmentAssessors`, `viewEnrollmentDocument`, `assignEnrollmentAssessment`, `fetchMyAssessments`, `submitEnrollmentAssessment`, `submitEnrollmentRecommendation`, `verifyEnrollmentDocument`, `fetchMyApplications`, `fetchAdmissionsPipeline`, `submitEnrollmentDecision`, `updateStudent`. |
| [`frontend/app/components/parent-admissions-workflow.tsx`](../frontend/app/components/parent-admissions-workflow.tsx) | Parent application list (`DataTable`), draft creation/editing form, file attachment input, submit button, and Offer Acceptance modal with child photo upload (`acceptEnrollmentOffer`). |
| [`frontend/app/components/admissions-workflow.tsx`](../frontend/app/components/admissions-workflow.tsx) | `OwnerAdminAdmissionsQueue` component used by Admin (`/admin/admissions`) and Owner (`/governance/owner/admissions`) with KPI cards, `DataTable`, document preview (`iframe`), document verify toggle, and assessor assignment dialog. |

---

## 3. Gap Analysis (What Is Remaining for `US-P0-03`)

Our audit identified **4 Backend Gaps** and **6 Frontend / UI Gaps** that prevent `US-P0-03` from meeting its Acceptance Criteria and Definition of Done.

### 3.1 Summary of Remaining Backend Work (`core/`)

| Gap ID | Requirement / Rule | What Is Broken or Missing in Backend | Target File(s) |
| :--- | :--- | :--- | :--- |
| **BE-01** | **`BR-01-04` Decision Notification & Immutability** | In `EnrollmentCaseBO.advance_status()`, when an Admin/Principal/Owner sets status to `Offered`, `Waitlisted`, or `Rejected`, `self.application.notification_dispatched` is **never set to `True`** and never saved to the database. Because it stays `False`, `validate_BR_01_04()` never triggers on subsequent API calls, allowing non-Owners to overwrite final decisions after notification. Also, `validate_BR_01_04` only checks when `self.application.status in final_decisions`, which misses blocking transitions back to `Under_Review` or `Pending_Clarification` after notification is dispatched. | `core/business_objects/enrollment.py` |
| **BE-02** | **`BR-01-01` Required Document Verification Alignment** | `docs/rule_registry.md` and `docs/8_PRODUCT_BACKLOG_STORIES.md` specify `birth_certificate`, `previous_school_records`, and `photo` for `BR-01-01`, whereas `EnrollmentCaseBO.REQUIRED_DOCUMENT_TYPES` currently only checks `{'birth_certificate'}` (and `photo` is uploaded on `accept-offer`). When `previous_school_records` or `photo` are uploaded prior to offer, or when `BR-01-01` is evaluated, `EnrollmentCaseBO` must enforce verification of all uploaded required document types and disallow advancing to `Accepted` by non-Owners without going through the `Offered` -> Parent `accept-offer` flow. | `core/business_objects/enrollment.py` |
| **BE-03** | **Non-Owner Direct `Accepted` Bypass in `advance_status()`** | Currently in `EnrollmentCaseBO.advance_status()`, if an `Admin` calls `PUT /api/v1/enrollments/{id}/decision` with `decision="Accepted"`, it bypasses `validate_BR_01_01` (which only checks `target_status == 'Offered'`), bypasses `validate_BR_01_06` (`BR-01-11`), bypasses `validate_BR_01_14`, and immediately sets `student.status = 'Active'` without `payment_confirmed` (`BR-01-02`) or `EmergencyContact` (`BR-01-03`)! Only `Owner` is allowed to perform an executive override to `Accepted`; `Admin` and `Principal` must issue `Offered` (or `Waitlisted` / `Rejected` / `Pending_Clarification`) and only advance to `Active` once `BR-01-02` and `BR-01-03` pass. Furthermore, when `new_status == 'Accepted'`, `student.status` should remain `'Inactive'` until `new_status == 'Active'` (when seat payment is confirmed per `BR-01-02`). | `core/business_objects/enrollment.py` |
| **BE-04** | **`PATCH /api/v1/students/{student_id}` Direct Model Mutation Bypass (`Never Rule #2`)** | In `core/api/v1/enrollments.py`, `update_student()` mutates `Student` directly in the route handler instead of going through `StudentProfileBO.update_student()`. If a user sends `{"status": "Active"}`, it bypasses `BR-01-02` (seat payment confirmation check on linked application) and `BR-01-03` (at least one `EmergencyContact`). It also lets `Teacher` modify administrative fields (`status`, `student_number`, `class_id`). | `core/business_objects/enrollment.py`, `core/api/v1/enrollments.py` |

---

### 3.2 Summary of Remaining Frontend / UI Work (`frontend/`)

| Gap ID | Portal / Screen | What Is Broken or Missing in Frontend UI | Target File(s) |
| :--- | :--- | :--- | :--- |
| **FE-01** | **Missing API Client Helpers (`api.ts`)** | `frontend/app/lib/api.ts` is missing client functions for endpoints that already exist in backend: deleting/withdrawing a draft application (`DELETE /enrollments/{id}`), deleting an unverified document (`DELETE /enrollments/{id}/documents/{doc_id}`), listing/creating/updating/deleting `EmergencyContact` (`GET/POST /students/{id}/emergency-contacts`, `PATCH/DELETE /emergency-contacts/{id}`), and listing/creating/updating/deleting `Parent` (`GET/POST /parents`, `PATCH/DELETE /parents/{id}`). Also `updateEnrollmentDraft` in `api.ts` is missing `emergency_contact_name` in its TypeScript payload type. | `frontend/app/lib/api.ts` |
| **FE-02** | **Parent Application Wizard: Document Type Selector, Document Delete & Draft Withdrawal** | In `frontend/app/components/parent-admissions-workflow.tsx`:<br>1. `saveRecord()` hardcodes the first uploaded file as `birth_certificate` and all others as `other`. Parents cannot select `previous_school_records`, `photo`, `immunization`, or `proof_of_address`.<br>2. Parents cannot see verification status per document or delete an unverified document (`DELETE /enrollments/{id}/documents/{doc_id}`).<br>3. Parents cannot withdraw/delete a saved draft (`DELETE /enrollments/{id}`).<br>4. In `details` view (after submission), parents cannot see the full 4-stage progress tracker (`Application` -> `Assessment` -> `Decision` -> `Enrollment`), decision/clarification reason, or a direct "Pay Tuition Invoice" button linking to `/parent/payments` when status is `Accepted` and an invoice is open. | `frontend/app/components/parent-admissions-workflow.tsx` |
| **FE-03** | **Admin / Principal / Owner Queue: `Offered`, `Waitlisted`, `Active` & `BR-01-04` Lock UI** | In `frontend/app/components/admissions-workflow.tsx` (`OwnerAdminAdmissionsQueue`):<br>1. Clicking "Approve" as `admin` sends `decision="Accepted"` instead of `"Offered"`, breaking the parent offer-acceptance flow.<br>2. There is no **"Waitlist" (`Waitlisted`)** action or **"Activate Enrollment" (`Active`)** action (for applications in `Accepted`/`Offered` state with `payment_confirmed=True`).<br>3. When `notification_dispatched === true`, the UI does not show an "Immutable Decision (`BR-01-04`)" badge or restrict decision override buttons to `role === "owner"`.<br>4. The detail modal does not display the Teacher Assessment score/notes or the Vice Principal recommendation summary. | `frontend/app/components/admissions-workflow.tsx` |
| **FE-04** | **Principal & Vice Principal Portals Wired to Static `sampleApplications`** | In `frontend/app/components/admissions-workflow.tsx` (lines 360–365), only `admin` and `owner` render the live queue; `principal` (`/principal/admissions`, `/principal/decision-queue`) and `vice_principal` (`/vice-principal`) fall through to hardcoded `sampleApplications` where the "Open" button does nothing!<br>- `principal` must use the live pipeline (`fetchAdmissionsPipeline`) with full document review, assessment assignment, and final decision (`Offered`, `Waitlisted`, `Rejected`, `Pending_Clarification`, `Active`) controls.<br>- `vice_principal` must use the live pipeline (`fetchAdmissionsPipeline`) and have a **"Submit Recommendation"** modal calling `submitEnrollmentRecommendation(applicationId, { recommendation, reason })` (`PUT /enrollments/{id}/recommendation`). | `frontend/app/components/admissions-workflow.tsx` |
| **FE-05** | **Teacher Portal Admissions Assessments Not Wired (`/teacher/assessments`)** | `frontend/app/teacher/assessments/page.tsx` is a static placeholder with hardcoded rows and raw HTML `<table>` tags (violating `AGENTS.md` Frontend Rule #1 & #2). Neither `/teacher/assessments` nor `AdmissionsWorkflow` (`role="teacher"`) calls `fetchMyAssessments()` (`GET /enrollments/my-assessments`) or `submitEnrollmentAssessment()` (`PUT /enrollments/{id}/assessment`). Teachers need a live "Assigned Admissions Assessments" section using `DataTable`, `SectionPanel`, and a `Dialog` modal to submit `score` (0–100), `recommendation` (`Recommend Admission`, `Needs further review`, `Not recommended`), and `notes`. | `frontend/app/components/admissions-workflow.tsx`, `frontend/app/teacher/assessments/page.tsx` |
| **FE-06** | **Student Widget & Profile: Invalid Status Enum, Raw Colors & Emergency Contact / Parent Management** | In `frontend/app/components/student-widget.tsx`:<br>1. `EditStudentModal` uses hardcoded statuses `["Inquiry", "Applied", "Offered", "Accepted", "Active", "Waitlisted", "Rejected", "Withdrawn"]`, but `StudentUpdateSchema` only allows `['Active', 'Inactive', 'Waitlisted']` (causing HTTP 422 on save!).<br>2. `EditStudentModal` has no UI to view, add, edit, or delete **Emergency Contacts** (`BR-01-03`) or **Parents** (`BR-01-13`), nor a "+ Add Student" modal wired to `POST /api/v1/students`.<br>3. `student-widget.tsx` uses raw color classes (`bg-[#6E3FF3]`, `text-slate-*`, `bg-emerald-50`) instead of design system components and tokens. | `frontend/app/components/student-widget.tsx` |

---

## 4. Step-by-Step Backend Execution Plan

Follow these steps in exact order. Every change must respect `AGENTS.md` Never Rules (tenant scoping, RBAC decorators, BO layer enforcement, and focused `pytest` verification).

---

### Backend Task BE-01: Enforce `BR-01-04` Notification Dispatch & Decision Immutability
- **File to Edit:** [`core/business_objects/enrollment.py`](../core/business_objects/enrollment.py)
- **What to Change:**
  1. In `EnrollmentCaseBO.validate_BR_01_04(self)` (around line 757):
     - Ensure that once `self.application.notification_dispatched` is `True`, **any** status change away from a dispatched decision (`Offered`, `Accepted`, `Rejected`, `Waitlisted`) by a non-`Owner` is blocked with `RuleViolation(rule_id='BR-01-04', message="Admission decision is immutable after notification has been sent. Contact Owner to override.", field='status')`, **except**:
       - A `Parent` accepting an offer (`self.actor_role == 'Parent' and self.application.status == 'Offered' and self.target_status == 'Accepted'`), OR
       - Advancing from `'Offered'` or `'Accepted'` to `'Active'` once seat payment and emergency contact gates (`BR-01-02`, `BR-01-03`) are satisfied.
  2. In `EnrollmentCaseBO.advance_status()` (around line 1285):
     - When `new_status in {'Offered', 'Rejected', 'Waitlisted'}`:
       - Set `self.application.notification_dispatched = True`.
       - Record `'notification_dispatched_at': self.application.decision_date.isoformat()` inside `workflow_data['decision']`.
       - Include `'notification_dispatched'` in `self.application.save(update_fields=[...])`.
- **Business Rules Enforced:** `BR-01-04`.
- **How to Test:**
  - Run `./.venv/bin/pytest tests/test_bo_enrollment_case.py tests/test_api_enrollments.py`.
  - Add a test in `tests/test_api_enrollments.py` verifying that after an `Admin` sets `decision="Offered"` (or `"Rejected"`), `notification_dispatched` is `True` in the response, a second `PUT /api/v1/enrollments/{id}/decision` by `Admin` to change it to `"Waitlisted"` or `"Rejected"` returns `HTTP 422` with `rule="BR-01-04"`, and an `Owner` calling the same endpoint succeeds (`200 OK`).

---

### Backend Task BE-02 & BE-03: Guard Non-Owner `Accepted` Transitions & Document Verification (`BR-01-01`, `BR-01-02`, `BR-01-03`, `BR-01-11`, `BR-01-14`)
- **File to Edit:** [`core/business_objects/enrollment.py`](../core/business_objects/enrollment.py)
- **What to Change:**
  1. **Prevent Non-Owner Direct `Accepted` Bypass:**
     - Add a validation method `validate_BR_01_15_direct_accept(self) -> Optional[RuleViolation]` (or inside `validate_BR_01_04` / `validate_BR_01_06`):
       - If `self.target_status == 'Accepted'` and `self.actor_role not in {'Parent', 'Owner'}`:
         - Return `RuleViolation(rule_id='BR-01-04', message="Only a Parent accepting an offer or an Owner overriding a decision can set status to Accepted. Issue an Offered decision instead.", field='decision')`.
  2. **Verify Uploaded Documents Before `Offered` (`BR-01-01`):**
     - In `validate_BR_01_01(self)`:
       - Keep `birth_certificate` as mandatory before `Offered`, AND check that any uploaded required admission documents (`birth_certificate`, `previous_school_records`, `photo`) currently attached to the application (`is_deleted=False`) are marked `verified=True`. If any uploaded document of those types has `verified=False`, or if `birth_certificate` is missing, return the `BR-01-01` `RuleViolation`. (Note: if `previous_school_records` or `photo` is uploaded before offer, it must be verified; if `photo` is not yet uploaded, the parent uploads it during `accept_offer()`).
  3. **Keep Student Status Accurate on `Accepted` vs `Active` (`BR-01-02`):**
     - Check `advance_status()` lines 1306–1312 and existing tests (`test_parent_accepts_offer_after_uploading_student_photo`, `test_owner_approval_accepts_without_review_gates`):
       - Note that existing tests in `tests/test_api_enrollments.py` (lines 179 and 632) assert `accepted.json()["data"]["student"]["status"] == "Active"` when `status == "Accepted"`. Preserve compatibility with those existing tests while ensuring `application.status == "Active"` strictly requires `BR-01-02` (`payment_confirmed=True`) and `BR-01-03` (`EmergencyContact` exists) and sets `student.enrolled_date = timezone.now().date()`.
- **Business Rules Enforced:** `BR-01-01`, `BR-01-02`, `BR-01-03`, `BR-01-04`, `BR-01-11`, `BR-01-14`.
- **How to Test:**
  - Run `./.venv/bin/pytest tests/test_bo_enrollment_case.py tests/test_api_enrollments.py`.
  - Add a test proving `Admin` cannot jump directly from `Under_Review` to `Accepted` via `PUT /api/v1/enrollments/{id}/decision` (returns `422 RULE_VIOLATION`), whereas `Admin` can transition `Under_Review` -> `Offered` once documents, teacher assessment, and VP recommendation are complete.

---

### Backend Task BE-04: Move `update_student` Logic into `StudentProfileBO.update_student()` and Enforce `BR-01-02` & `BR-01-03`
- **Files to Edit:**
  - [`core/business_objects/enrollment.py`](../core/business_objects/enrollment.py)
  - [`core/api/v1/enrollments.py`](../core/api/v1/enrollments.py)
- **What to Change:**
  1. In `StudentProfileBO` (`core/business_objects/enrollment.py`), add a method:
     ```python
     def update_student(
         self,
         updates: Dict[str, Any],
         actor_id: Optional[uuid.UUID] = None,
     ) -> 'StudentProfileBO':
     ```
     - **Role field guard:** If `self.actor_role == 'Teacher'`, disallow changing `student_number` or `status` (raise `BusinessRuleError` with `RuleViolation(rule_id='BR-01-05', message="Teachers cannot modify student_number or enrollment status.", field='status')` if attempted, unless `status` is unchanged).
     - **`BR-01-03` Emergency Contact Check:** If `updates.get('status') == 'Active'` and `self.student.status != 'Active'`:
       - If the student has an existing `Application` (`is_deleted=False`), check `BR-01-03`: if not `self.student.emergency_contacts.filter(is_deleted=False).exists()`, raise `BR-01-03`.
       - Also if the student has an existing `Application` whose status is in `{'Pending', 'Under_Review', 'Offered', 'Accepted'}` and `not application.payment_confirmed`, raise `BR-01-02` (`"Cannot activate student: seat confirmation payment is not confirmed."`).
     - Apply updates inside `with transaction.atomic():`, set `enrolled_date` if transitioning to `Active`, and create the `AuditLog` entry.
  2. In `core/api/v1/enrollments.py` (`update_student` at line 701):
     - Replace the inline model mutation and `AuditLog.objects.create(...)` with `bo = StudentProfileBO(student=student, actor_role=role)` and `bo.update_student(updates=updates, actor_id=...)`.
- **Business Rules & Security Checks Enforced:** `BR-01-02`, `BR-01-03`, `BR-01-05`, `get_student_queryset(request)`, `AuditLog`.
- **How to Test:**
  - Run `./.venv/bin/pytest tests/test_api_enrollments.py tests/test_bo_student_profile.py tests/test_crud_execution_plan.py`.
  - Add a test in `tests/test_api_enrollments.py` where `Admin` tries to `PATCH /api/v1/students/{id}` with `{"status": "Active"}` for an applicant whose application has `payment_confirmed=False` -> returns `HTTP 422` (`BR-01-02`).

---

## 5. Step-by-Step Frontend (UI) Execution Plan

**Mandatory Frontend Rules (`AGENTS.md` §4):**
1. **Reuse Design System:** Import primitives from `@/components/ui/*` (`Button`, `Input`, `Select`, `Textarea`, `Checkbox`, `Dialog`, `Badge`, `Tabs`) and `@/components/pc` (`DataTable`, `PageHeader`, `SectionPanel`, `StatusPill`, `KpiCard`, `DatePicker`, `EmptyState`). **Never use raw HTML `<table>` tags.**
2. **No Hardcoded Colors:** Use semantic Tailwind classes backed by `frontend/styles/tokens.css` (`bg-surface`, `bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`, `text-primary`, `text-destructive`, `text-success`, `text-warning`). **Never use hex codes like `#7c2ff2` or `#6E3FF3` or raw `slate-*` / `amber-*` classes.**

---

### Frontend Task FE-01: Add Complete Admissions, Parent & Emergency Contact Client Functions to `api.ts`
- **File to Edit:** [`frontend/app/lib/api.ts`](../frontend/app/lib/api.ts)
- **What to Add / Fix:**
  1. Update `EnrollmentCase` type (line 218) to include `notification_dispatched?: boolean;` and `verified_at?: string | null;` on `documents`.
  2. Fix `updateEnrollmentDraft` parameter type (line 319) to include `emergency_contact_name?: string;` (currently missing from the TypeScript type even though `makePayload()` sends it).
  3. Add the following API client functions in the `P01: Enrollment & Admissions` section of `frontend/app/lib/api.ts`:
     - `withdrawEnrollmentApplication(applicationId: string)` $\rightarrow$ `DELETE /enrollments/${applicationId}`
     - `deleteEnrollmentDocument(applicationId: string, documentId: string)` $\rightarrow$ `DELETE /enrollments/${applicationId}/documents/${documentId}`
     - `createDirectStudent(payload: ...)` $\rightarrow$ `POST /students`
     - `deleteStudentRecord(studentId: string)` $\rightarrow$ `DELETE /students/${studentId}`
     - `fetchStudentEmergencyContacts(studentId: string)` $\rightarrow$ `GET /students/${studentId}/emergency-contacts`
     - `createStudentEmergencyContact(studentId: string, payload: { name: string; phone: string; relationship: string; medical_consent: boolean })` $\rightarrow$ `POST /students/${studentId}/emergency-contacts`
     - `updateStudentEmergencyContact(contactId: string, payload: Partial<...>)` $\rightarrow$ `PATCH /emergency-contacts/${contactId}`
     - `deleteStudentEmergencyContact(contactId: string)` $\rightarrow$ `DELETE /emergency-contacts/${contactId}`
     - `fetchStudentParents(studentId: string)` $\rightarrow$ `GET /parents?student_id=${studentId}`
     - `createStudentParent(payload: { student_id: string; name: string; relationship: string; phone: string; email: string; media_consent?: boolean })` $\rightarrow$ `POST /parents`
     - `updateStudentParent(parentId: string, payload: Partial<...>)` $\rightarrow$ `PATCH /parents/${parentId}`
     - `deleteStudentParent(parentId: string)` $\rightarrow$ `DELETE /parents/${parentId}`

---

### Frontend Task FE-02: Upgrade Parent Application Wizard & Status Details (`parent-admissions-workflow.tsx`)
- **File to Edit:** [`frontend/app/components/parent-admissions-workflow.tsx`](../frontend/app/components/parent-admissions-workflow.tsx)
- **What to Build / Connect:**
  1. **Per-File Document Type Selector in Form Mode:**
     - Instead of forcing the first file to be `birth_certificate` and all others to be `other`, allow the parent to choose the document type (`birth_certificate`, `previous_school_records`, `photo`, `immunization`, `proof_of_address`, `other`) via a `<Select>` control when attaching files, or provide dedicated upload slots for:
       - **Birth Certificate** (`birth_certificate` — required to submit per `BR-01-07`)
       - **Previous School Records** (`previous_school_records`)
       - **Student Photograph** (`photo`)
       - **Additional Supporting Document** (`immunization` / `proof_of_address` / `other`)
     - Keep backward compatibility with the existing `<Input type="file" aria-label="Birth certificate and supporting documents" ... />` so existing automated/manual flows continue to work seamlessly.
  2. **Uploaded Document List & Delete Unverified Document:**
     - In `form` mode (when editing an existing draft or `Pending_Clarification` application), list `editingApplication.documents` with `<StatusPill variant={doc.verified ? "success" : "warning"}>{doc.verified ? "Verified" : "Pending review"}</StatusPill>`.
     - For any document where `!doc.verified`, render a **"Remove"** `<Button variant="outline" size="sm">` that calls `deleteEnrollmentDocument(editingApplication.application_id, doc.document_id)` and refreshes the draft state.
  3. **Withdraw Draft Button:**
     - In `form` mode (when `editingApplication` exists and is a draft or `Pending`), add a **"Withdraw draft"** `<Button variant="outline">` that calls `withdrawEnrollmentApplication(editingApplication.application_id)` and returns to `workspace` mode with a confirmation message.
  4. **Rich Application Status Tracker in `details` Mode:**
     - Display the 4-stage progress bar (`Application`, `Assessment`, `Decision`, `Enrollment`) highlighting the current stage based on `viewingApplication.status`.
     - If `viewingApplication.workflow_data.decision?.reason` is present, display the school's decision message in a `<SectionPanel title="Decision & School Notes">`.
     - If `viewingApplication.status === "Offered"`, display an **"Accept offer"** button in the header/panel to re-open the photo upload modal if the parent closed it earlier.
     - If `viewingApplication.invoices.length > 0`, render a `<SectionPanel title="Tuition Invoice & Seat Confirmation">` showing invoice amount, due date, balance due, `<StatusPill>`, and a `<Button asChild><Link href="/parent/payments">Pay tuition invoice</Link></Button>` so the parent can complete payment (`BR-01-02`) to activate enrollment.
- **States to Handle:**
  - Loading state (`loadState === "loading"`), API/RuleViolation 422 error alert (`role="alert"` in `text-destructive`), file size/extension validation error (`<= 10 MB`, PDF/JPG/PNG), empty state (`applications.length === 0`), and success notice (`role="status"` in `text-success`).

---

### Frontend Task FE-03: Complete Admin, Principal & Owner Queue Actions (`admissions-workflow.tsx`)
- **File to Edit:** [`frontend/app/components/admissions-workflow.tsx`](../frontend/app/components/admissions-workflow.tsx)
- **What to Build / Connect:**
  1. **Route `principal` to `OwnerAdminAdmissionsQueue`:**
     - Change line 360 from:
       ```tsx
       if (role === "admin" || role === "owner") {
       ```
       to:
       ```tsx
       if (role === "admin" || role === "owner" || role === "principal") {
       ```
       and update `OwnerAdminAdmissionsQueue`'s `role` prop type to `"admin" | "owner" | "principal"`.
  2. **Fix Decision Actions (`Offered`, `Waitlisted`, `Rejected`, `Pending_Clarification`, `Active`):**
     - Expand `QueueAction` to:
       ```ts
       type QueueAction = "offer" | "waitlist" | "reject" | "clarify" | "assign" | "activate" | "owner_accept";
       ```
     - When `role === "admin"` or `role === "principal"` or `role === "owner"` clicks **"Approve / Send Offer"**, send `decision = "Offered"` (with optional `invoiceAmount` for `owner`/`admin`/`principal` so `offer_invoice_amount` is stored for parent acceptance).
     - Add a **"Waitlist"** button in the request detail modal that opens the decision dialog with `decision = "Waitlisted"`.
     - For `role === "owner"`, also provide an **"Override: Direct Accept"** (`decision = "Accepted"`) or decision override option when `application.notification_dispatched === true`.
     - When an application is in `Accepted` or `Offered` status and `application.payment_confirmed === true` (and has `>= 1` emergency contact), show an **"Activate Enrollment (`Active`)"** button that calls `submitEnrollmentDecision(application.application_id, "Active", "Seat payment and emergency contact verified.")`.
  3. **Display `BR-01-04` Decision Immutability State:**
     - When `detailApplication.notification_dispatched === true` and `detailApplication.status` is in `["Offered", "Accepted", "Rejected", "Waitlisted"]`:
       - Display a `<StatusPill variant="info">Decision dispatched (Locked per BR-01-04)</StatusPill>`.
       - If `role !== "owner"`, disable or hide decision-change buttons (`Offer`, `Waitlist`, `Reject`) and show helper text: *"Decision notification has been sent to the parent. Only an Owner can override a dispatched decision (`BR-01-04`)."*
       - If `role === "owner"`, show **"Owner Override Decision"** buttons (`Offered`, `Accepted`, `Waitlisted`, `Rejected`).
  4. **Display Assessment & VP Recommendation Details in Request Modal:**
     - Inside `detailApplication` modal, add a section displaying:
       - **Teacher Assessment:** `status`, `assessor_name`, `score` (`/ 100`), `recommendation`, and `notes` (or `"Not yet completed — required before final decision (BR-01-11)"`).
       - **Vice Principal Recommendation:** `decision` (`Offered` / `Waitlisted` / `Rejected`) and `reason` (or `"Pending VP recommendation (BR-01-14)"`).

---

### Frontend Task FE-04: Wire Vice Principal Recommendation Queue (`admissions-workflow.tsx`)
- **File to Edit:** [`frontend/app/components/admissions-workflow.tsx`](../frontend/app/components/admissions-workflow.tsx)
- **What to Build / Connect:**
  1. When `role === "vice_principal"`, do **not** use `sampleApplications`. Fetch real applications from `fetchAdmissionsPipeline()` (`GET /api/v1/enrollments/pipeline`).
  2. Render the applications in a `<DataTable>` inside `<SectionPanel title="Assessment recommendations">` with KPI cards (`Total in review`, `Assessments completed`, `Recommendations submitted`).
  3. Add an **"Open & Recommend"** action button on each row that opens a `<Dialog>` showing:
     - Student & parent details, uploaded documents, and the completed Teacher Assessment (`score`, `recommendation`, `notes`).
     - If `workflow_data.assessment?.status !== "Completed"`, show a `<StatusPill variant="warning">Waiting for teacher assessment</StatusPill>` and disable recommendation submission.
     - If `workflow_data.assessment?.status === "Completed"`, show a form with:
       - `<Select>` for `recommendation`: `"Offered"`, `"Waitlisted"`, `"Rejected"`
       - `<Textarea>` for `reason`
       - `<Button>` calling `submitEnrollmentRecommendation(application.application_id, { recommendation, reason })` (`PUT /api/v1/enrollments/{id}/recommendation`).
- **States to Handle:** Loading spinner/text, error banner, empty table state, `409 WORKFLOW_NOT_READY` / `422` error display, and success notice.

---

### Frontend Task FE-05: Wire Teacher Admissions Assessment Portal (`admissions-workflow.tsx` & `teacher/assessments/page.tsx`)
- **Files to Edit:**
  - [`frontend/app/components/admissions-workflow.tsx`](../frontend/app/components/admissions-workflow.tsx)
  - [`frontend/app/teacher/assessments/page.tsx`](../frontend/app/teacher/assessments/page.tsx)
- **What to Build / Connect:**
  1. In `frontend/app/components/admissions-workflow.tsx`:
     - When `role === "teacher"`, fetch assigned assessments using `fetchMyAssessments()` (`GET /api/v1/enrollments/my-assessments`).
     - Render a `<DataTable>` of assigned applicant assessments showing Student Name, Grade, Scheduled Date/Time, Assessment Status (`Assigned`, `Scheduled`, `Completed`), Score, and an **"Enter Assessment"** `<Button>`.
     - Clicking **"Enter Assessment"** opens a `<Dialog>` with:
       - `<Input type="number" min={0} max={100} />` for `score`
       - `<Select>` for `recommendation`: `"Recommend Admission"`, `"Needs further review"`, `"Not recommended"`
       - `<Textarea>` for `notes`
       - Submit button calling `submitEnrollmentAssessment(application.application_id, { score, recommendation, notes })` (`PUT /api/v1/enrollments/{id}/assessment`).
  2. In `frontend/app/teacher/assessments/page.tsx`:
     - Replace the raw HTML `<table>` and hardcoded `slate-*` / `amber-*` classes with `<AdmissionsWorkflow role="teacher" />` (or render `<AdmissionsWorkflow role="teacher" />` alongside class assessments using `SectionPanel` and `DataTable` from `@/components/pc` with semantic tokens). Zero raw `<table>` tags or hardcoded color classes!

---

### Frontend Task FE-06: Upgrade `student-widget.tsx` for Valid Statuses, Design Tokens & Emergency Contact / Parent CRUD
- **File to Edit:** [`frontend/app/components/student-widget.tsx`](../frontend/app/components/student-widget.tsx)
- **What to Build / Connect:**
  1. **Fix `EditStudentModal` Status Dropdown:**
     - Change the status options in `EditStudentModal` (line 306) from `["Inquiry", "Applied", ...]` to the valid backend `Student` status enum: `["Active", "Inactive", "Waitlisted"]`.
  2. **Add Emergency Contacts (`BR-01-03`) & Parents (`BR-01-13`) Management in `EditStudentModal`:**
     - When `EditStudentModal` opens for a student, fetch `fetchStudentEmergencyContacts(student.student_id)` and `fetchStudentParents(student.student_id)`.
     - Display existing Emergency Contacts with a form to **Add Emergency Contact** (`createStudentEmergencyContact`) and **Delete** (`deleteStudentEmergencyContact`). If the backend returns `HTTP 422` (`BR-01-03`: cannot delete the last emergency contact of an Active student), display the exact rule violation message in `text-destructive`.
     - Display existing Parent contacts with a form to **Add Parent** (`createStudentParent`) and **Delete** (`deleteStudentParent`), surfacing `HTTP 422` (`BR-01-13`) if attempting to delete the sole parent of an Active student.
  3. **Wire `+ Add Student` Button (`permissions?.can_create`):**
     - Connect the `+ Add Student` button in `Toolbar` (line 149) to a modal that calls `createDirectStudent` (`POST /api/v1/students`) with student name, DOB, grade, status (`Inactive` or `Active`), parent details, and emergency contact details (enforcing `BR-01-03` when `status === "Active"`).
  4. **Replace Hardcoded Hex/Tailwind Palette Classes with Semantic Tokens:**
     - Replace `bg-[#6E3FF3]`, `hover:bg-[#582CD6]`, `text-slate-*`, `bg-emerald-50`, `bg-rose-50`, `bg-amber-50` in `student-widget.tsx` with `<Button>`, `<StatusPill>`, and semantic token classes (`bg-primary`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-surface`).

---

## 6. Verification & Definition of Done (DoD) Checklist

Before marking `US-P0-03` as **Done**, run every command below and verify all checkboxes pass.

### 6.1 Automated Backend Verification Commands
Run from the repository root (`/Users/soumyadeepbhadra/My Files/BusinessInCanada/School CRM/skool_crm`):

```bash
# 1. Run Business Object unit tests for EnrollmentCaseBO, StudentProfileBO, and atomic student numbering
./.venv/bin/pytest tests/test_bo_enrollment_case.py tests/test_bo_student_profile.py tests/test_student_number_generator.py

# 2. Run API integration & RBAC/tenant-isolation tests for Enrollments & Phase 1 CRUD
./.venv/bin/pytest tests/test_api_enrollments.py tests/test_crud_execution_plan.py -k "TestCRUDPhase1FoundationAndPeople or TestEnrollmentsAPI"
```

### 6.2 Automated Frontend Verification Commands
Run from `frontend/`:

```bash
cd frontend

# 1. Run focused ESLint on all touched admissions & student files
npx eslint app/lib/api.ts app/components/parent-admissions-workflow.tsx app/components/admissions-workflow.tsx app/components/student-widget.tsx app/teacher/assessments/page.tsx

# 2. Run full Next.js production typecheck and build
npm run build
```

### 6.3 Manual End-to-End Browser Walkthrough Checklist
1. **Parent Draft & Document Upload (`/parent/applications`):**
   - [ ] Log in as **Parent** $\rightarrow$ Click **Create new** $\rightarrow$ Save as draft without all fields $\rightarrow$ Reopen draft, fill student/parent/emergency contact details, upload `birth_certificate` (and optional `previous_school_records`), and click **Submit application**.
   - [ ] Verify status changes to **Assessment in progress (`Under_Review`)** and an atomic `STU-YYYY-XXXX` number is assigned (`BR-01-05`).
2. **Admin Document Verification & Assessment Assignment (`/admin/admissions`):**
   - [ ] Switch to **Admin** $\rightarrow$ Open the submitted application $\rightarrow$ Preview and **Verify** uploaded documents (`BR-01-01`).
   - [ ] Click **Assign** $\rightarrow$ Assign assessment to a **Teacher**.
3. **Teacher Assessment Submission (`/teacher/assessments`):**
   - [ ] Switch to the assigned **Teacher** $\rightarrow$ Open `/teacher/assessments` $\rightarrow$ Click **Enter Assessment** $\rightarrow$ Submit score (`90`), recommendation (`Recommend Admission`), and notes (`BR-01-11`).
4. **Vice Principal Recommendation (`/vice-principal`):**
   - [ ] Switch to **Vice Principal** $\rightarrow$ Open `/vice-principal` $\rightarrow$ Review the completed teacher assessment and submit recommendation (`Offered`) with reason (`BR-01-14`).
5. **Principal / Admin Offer Decision & `BR-01-04` Immutability (`/principal/admissions` or `/admin/admissions`):**
   - [ ] Switch to **Principal** or **Admin** $\rightarrow$ Open the application $\rightarrow$ Click **Approve / Send Offer** (`Offered`) with tuition amount and parent message.
   - [ ] Reopen the application as **Admin** $\rightarrow$ Verify the decision shows as dispatched/locked (`BR-01-04`) and cannot be changed to `Rejected`/`Waitlisted` except by **Owner**.
6. **Parent Offer Acceptance & Photo Upload (`/parent/applications`):**
   - [ ] Switch to **Parent** $\rightarrow$ Open the `Offered` application $\rightarrow$ Upload a JPG/PNG student photo and click **Accept offer** (`BR-01-16`).
   - [ ] Verify status becomes **Offer accepted (`Accepted`)** and a Tuition Invoice is automatically generated (`BR-01-15`).
7. **Seat Payment Confirmation & Active Enrollment (`BR-01-02`, `BR-01-03`):**
   - [ ] Complete payment on the generated invoice (or confirm payment) $\rightarrow$ Verify application advances to **Enrolled (`Active`)** and student record is **Active** with `enrolled_date` populated.
8. **Emergency Contact & Parent Guard Rails (`/admin/students`):**
   - [ ] Open the active student in `StudentWidget` $\rightarrow$ Attempt to delete their only `EmergencyContact` (`BR-01-03`) or only `Parent` (`BR-01-13`) $\rightarrow$ Verify HTTP 422 error message blocks the deletion.
9. **Memory Log Update (`AGENTS.md` Rule #6):**
   - [ ] Append a dated completion entry to [`docs/7_MEMORY_LOG.md`](7_MEMORY_LOG.md).
