# Purple Cubby — Business Rule Registry

This registry tracks all Class 2 Business Rules enforced by the Business Object (BO) layer.
Naming convention: `BR-{PROCESS:02d}-{SEQ:02d}`

---

## BR-01-01: Offered status requires all documents verified

| Field       | Value                                                                                                                                                                                           |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rule ID     | BR-01-01                                                                                                                                                                                        |
| Process     | P01 — Enrollment & Admissions                                                                                                                                                                   |
| BO          | BO-02 EnrollmentCase                                                                                                                                                                            |
| Status      | Active                                                                                                                                                                                          |
| Added       | 2026-08-29                                                                                                                                                                                      |
| Retired     | —                                                                                                                                                                                               |
| Description | Application cannot advance to 'Offered' status unless all required document types (`birth_certificate`, `previous_school_records`, `photo`) are uploaded and marked verified by Admin or above. |
| Trigger     | On call to EnrollmentCaseBO.advance_status('Offered')                                                                                                                                           |
| Violation   | HTTP 422 — `{ "code": "RULE_VIOLATION", "rule": "BR-01-01", "message": "Cannot advance to Offered: missing verified documents: [...]" }`                                                        |
| Test ref    | `tests.test_bo_enrollment_case.TestBR0101`                                                                                                                                                      |

---

## BR-01-02: Seat confirmation requires payment verification

| Field       | Value                                                                                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Rule ID     | BR-01-02                                                                                                                                         |
| Process     | P01 — Enrollment & Admissions                                                                                                                    |
| BO          | BO-02 EnrollmentCase                                                                                                                             |
| Status      | Active                                                                                                                                           |
| Added       | 2026-08-29                                                                                                                                       |
| Retired     | —                                                                                                                                                |
| Description | Seat confirmation requires a payment receipt. Enrollment status cannot be set to 'Active' until payment confirmation flag is true.               |
| Trigger     | On call to EnrollmentCaseBO.advance_status('Active')                                                                                             |
| Violation   | HTTP 422 — `{ "code": "RULE_VIOLATION", "rule": "BR-01-02", "message": "Cannot activate enrollment: seat confirmation payment not confirmed." }` |
| Test ref    | `tests.test_bo_enrollment_case.TestBR0102`                                                                                                       |

---

## BR-01-03: Active enrollment requires at least one emergency contact

| Field       | Value                                                                                                                                               |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rule ID     | BR-01-03                                                                                                                                            |
| Process     | P01 — Enrollment & Admissions                                                                                                                       |
| BO          | BO-02 EnrollmentCase                                                                                                                                |
| Status      | Active                                                                                                                                              |
| Added       | 2026-08-29                                                                                                                                          |
| Retired     | —                                                                                                                                                   |
| Description | At least one emergency contact must be recorded for the student before enrollment can be marked 'Active'.                                           |
| Trigger     | On call to EnrollmentCaseBO.advance_status('Active')                                                                                                |
| Violation   | HTTP 422 — `{ "code": "RULE_VIOLATION", "rule": "BR-01-03", "message": "Cannot activate enrollment: at least one emergency contact is required." }` |
| Test ref    | `tests.test_bo_enrollment_case.TestBR0103`                                                                                                          |

---

## BR-01-04: Decision immutability after notification dispatch

| Field       | Value                                                                                                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Rule ID     | BR-01-04                                                                                                                                                                 |
| Process     | P01 — Enrollment & Admissions                                                                                                                                            |
| BO          | BO-02 EnrollmentCase                                                                                                                                                     |
| Status      | Active                                                                                                                                                                   |
| Added       | 2026-08-29                                                                                                                                                               |
| Retired     | —                                                                                                                                                                        |
| Description | Admission decision (Approved/Offered/Waitlisted/Rejected) is immutable once notification has been dispatched to parent. Only Owner role can override.                    |
| Trigger     | On modifying decision status of an application with `notification_dispatched=True`                                                                                       |
| Violation   | HTTP 422 — `{ "code": "RULE_VIOLATION", "rule": "BR-01-04", "message": "Admission decision is immutable after notification has been sent. Contact Owner to override." }` |
| Test ref    | `tests.test_bo_enrollment_case.TestBR0104`                                                                                                                               |

---

## BR-01-05: Automatic tenant-scoped student number assignment

| Field       | Value                                                                                                                                                                                              |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rule ID     | BR-01-05                                                                                                                                                                                           |
| Process     | P01 — Enrollment & Admissions                                                                                                                                                                      |
| BO          | BO-02 EnrollmentCase & BO-01 StudentProfile                                                                                                                                                        |
| Status      | Active                                                                                                                                                                                             |
| Added       | 2026-08-29                                                                                                                                                                                         |
| Retired     | —                                                                                                                                                                                                  |
| Description | Every student must be assigned an atomic, monotonic, tenant-scoped student number (e.g. `STU-YYYY-XXXX`) generated from `TenantSequence` upon transition to Applied/Active if not already present. |
| Trigger     | On student creation or application state advance                                                                                                                                                   |
| Violation   | HTTP 422 — `{ "code": "RULE_VIOLATION", "rule": "BR-01-05", "message": "Student number generation failed." }`                                                                                      |
| Test ref    | `tests.test_student_number_generator`                                                                                                                                                              |

---

## BR-02-01: Invoice generation requires active or offered enrollment

| Field       | Value                                                                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Rule ID     | BR-02-01                                                                                                                                   |
| Process     | P02 — Billing & Fee Management                                                                                                             |
| BO          | BO-10 FeeAccount                                                                                                                           |
| Status      | Active                                                                                                                                     |
| Added       | 2026-08-29                                                                                                                                 |
| Retired     | —                                                                                                                                          |
| Description | Invoice generation is only allowed for students in the tenant and in an Active or Offered status for the billing term.                     |
| Trigger     | On call to FeeAccountBO.create_invoice() or bulk_generate_invoices()                                                                       |
| Violation   | HTTP 422 — `{ "code": "RULE_VIOLATION", "rule": "BR-02-01", "message": "Invoices can only be generated for Active or Offered students." }` |
| Test ref    | `tests.test_bo_billing.TestBR0201`                                                                                                         |

---

## BR-02-02: Late fee requires expired grace period

| Field       | Value                                                                                                                                   |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Rule ID     | BR-02-02                                                                                                                                |
| Process     | P02 — Billing & Fee Management                                                                                                          |
| BO          | BO-10 FeeAccount                                                                                                                        |
| Status      | Active                                                                                                                                  |
| Added       | 2026-08-29                                                                                                                              |
| Retired     | —                                                                                                                                       |
| Description | Late fee can only be applied after the invoice due date plus the configured grace period days.                                          |
| Trigger     | On call to FeeAccountBO.apply_late_fee()                                                                                                |
| Violation   | HTTP 422 — `{ "code": "RULE_VIOLATION", "rule": "BR-02-02", "message": "Late fee cannot be applied before the grace period expires." }` |
| Test ref    | `tests.test_bo_billing.TestBR0202`                                                                                                      |

---

## BR-02-03: High-value discount requires Owner approval

| Field       | Value                                                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------------------------------------ |
| Rule ID     | BR-02-03                                                                                                                 |
| Process     | P02 — Billing & Fee Management                                                                                           |
| BO          | BO-10 FeeAccount                                                                                                         |
| Status      | Active                                                                                                                   |
| Added       | 2026-08-29                                                                                                               |
| Retired     | —                                                                                                                        |
| Description | Discount or waiver amounts above the tenant threshold require Owner approval.                                            |
| Trigger     | On call to FeeAccountBO.apply_discount_waiver()                                                                          |
| Violation   | HTTP 422 — `{ "code": "RULE_VIOLATION", "rule": "BR-02-03", "message": "High-value discount requires Owner approval." }` |
| Test ref    | `tests.test_bo_billing.TestBR0203`                                                                                       |

---

## BR-02-04: Refund approval matrix

| Field       | Value                                                                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Rule ID     | BR-02-04                                                                                                                                   |
| Process     | P02 — Billing & Fee Management                                                                                                             |
| BO          | BO-11 PaymentTransaction                                                                                                                   |
| Status      | Active                                                                                                                                     |
| Added       | 2026-08-29                                                                                                                                 |
| Retired     | —                                                                                                                                          |
| Description | Refunds above the configured threshold require Owner approval.                                                                             |
| Trigger     | On call to PaymentTransactionBO.process_refund()                                                                                           |
| Violation   | HTTP 422 — `{ "code": "RULE_VIOLATION", "rule": "BR-02-04", "message": "Refunds above the configured threshold require Owner approval." }` |
| Test ref    | `tests.test_bo_billing.TestBR0204`                                                                                                         |

---

## BR-02-05: Invoice cannot be marked paid with balance remaining

| Field       | Value                                                                                                                                           |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Rule ID     | BR-02-05                                                                                                                                        |
| Process     | P02 — Billing & Fee Management                                                                                                                  |
| BO          | BO-11 PaymentTransaction                                                                                                                        |
| Status      | Active                                                                                                                                          |
| Added       | 2026-08-29                                                                                                                                      |
| Retired     | —                                                                                                                                               |
| Description | An invoice cannot be finalized as Paid while any outstanding balance remains.                                                                   |
| Trigger     | On call to PaymentTransactionBO.record_payment()                                                                                                |
| Violation   | HTTP 422 — `{ "code": "RULE_VIOLATION", "rule": "BR-02-05", "message": "Invoice cannot be marked Paid while an outstanding balance remains." }` |
| Test ref    | `tests.test_bo_billing.TestBR0205`                                                                                                              |

---

## BR-02-06: Reconciliation finalization requires clean ledger

| Field       | Value                                                                                                                                  |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Rule ID     | BR-02-06                                                                                                                               |
| Process     | P02 — Billing & Fee Management                                                                                                         |
| BO          | BO-12 FinancialStatement                                                                                                               |
| Status      | Active                                                                                                                                 |
| Added       | 2026-08-29                                                                                                                             |
| Retired     | —                                                                                                                                      |
| Description | Reconciliation cannot be finalized while discrepancies remain unless the actor holds the Owner role.                                   |
| Trigger     | On call to FinancialStatementBO.finalize_reconciliation()                                                                              |
| Violation   | HTTP 422 — `{ "code": "RULE_VIOLATION", "rule": "BR-02-06", "message": "Cannot finalize reconciliation while discrepancies remain." }` |
| Test ref    | `tests.test_bo_billing.TestBR0206`                                                                                                     |

---

## BR-04-01: Lesson plan mapped to curriculum topic

| Field       | Value                                                                                                                                               |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rule ID     | BR-04-01                                                                                                                                            |
| Process     | P04 — Academic Management                                                                                                                           |
| BO          | BO-05 ClassroomPlan                                                                                                                                 |
| Status      | Active                                                                                                                                              |
| Added       | 2026-08-29                                                                                                                                          |
| Retired     | —                                                                                                                                                   |
| Description | Lesson plan must be mapped to at least one valid topic or learning outcome from the current curriculum version.                                     |
| Trigger     | On creating or updating a LessonPlan                                                                                                                |
| Violation   | HTTP 422 — `{ "code": "RULE_VIOLATION", "rule": "BR-04-01", "message": "Lesson plan must reference valid learning outcomes from the curriculum." }` |
| Test ref    | `tests.test_bo_academic.TestClassroomPlanBO`                                                                                                        |

---

## BR-04-02: Assignment due date cannot fall on holiday or blackout date

| Field       | Value                                                                                                                                         |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Rule ID     | BR-04-02                                                                                                                                      |
| Process     | P04 — Academic Management                                                                                                                     |
| BO          | BO-03 AcademicCalendar & BO-05 ClassroomPlan                                                                                                  |
| Status      | Active                                                                                                                                        |
| Added       | 2026-08-29                                                                                                                                    |
| Retired     | —                                                                                                                                             |
| Description | Assignment due date cannot fall on a calendar holiday or blackout date as defined in Academic Calendar.                                       |
| Trigger     | On creating or modifying an Assignment                                                                                                        |
| Violation   | HTTP 422 — `{ "code": "RULE_VIOLATION", "rule": "BR-04-02", "message": "Assignment due date falls on a calendar holiday or blackout date." }` |
| Test ref    | `tests.test_bo_academic.TestAcademicCalendarBO`                                                                                               |

---

## BR-04-03: Exam schedule conflict and holiday prevention

| Field       | Value                                                                                                                                    |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Rule ID     | BR-04-03                                                                                                                                 |
| Process     | P04 — Academic Management                                                                                                                |
| BO          | BO-03 AcademicCalendar & BO-06 ExamPackage                                                                                               |
| Status      | Active                                                                                                                                   |
| Added       | 2026-08-29                                                                                                                               |
| Retired     | —                                                                                                                                        |
| Description | Exam cannot be scheduled on a calendar holiday or blackout date. Two exams for the same class cannot overlap in time on the same date.   |
| Trigger     | On creating or scheduling an Exam                                                                                                        |
| Violation   | HTTP 422 — `{ "code": "RULE_VIOLATION", "rule": "BR-04-03", "message": "Exam schedule conflicts with holiday or existing class exam." }` |
| Test ref    | `tests.test_bo_academic.TestExamPackageBO`                                                                                               |

---

## BR-04-04: Marks moderation sign-off gate before publishing

| Field       | Value                                                                                                                                              |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rule ID     | BR-04-04                                                                                                                                           |
| Process     | P04 — Academic Management                                                                                                                          |
| BO          | BO-04 AcademicRecord                                                                                                                               |
| Status      | Active                                                                                                                                             |
| Added       | 2026-08-29                                                                                                                                         |
| Retired     | —                                                                                                                                                  |
| Description | Marks and exam results cannot be published before Principal or Vice Principal moderation sign-off.                                                 |
| Trigger     | On publishing MarksRecord or ReportCard                                                                                                            |
| Violation   | HTTP 422 — `{ "code": "RULE_VIOLATION", "rule": "BR-04-04", "message": "Marks cannot be published without Principal or VP moderation sign-off." }` |
| Test ref    | `tests.test_bo_academic.TestAcademicRecordBO`                                                                                                      |

---

## BR-04-05: Report card release date gating

| Field       | Value                                                                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Rule ID     | BR-04-05                                                                                                                                    |
| Process     | P04 — Academic Management                                                                                                                   |
| BO          | BO-04 AcademicRecord                                                                                                                        |
| Status      | Active                                                                                                                                      |
| Added       | 2026-08-29                                                                                                                                  |
| Retired     | —                                                                                                                                           |
| Description | Report card release is gated by the published_date configured in Academic Calendar — cannot be released early.                              |
| Trigger     | On call to publish report card                                                                                                              |
| Violation   | HTTP 422 — `{ "code": "RULE_VIOLATION", "rule": "BR-04-05", "message": "Report card cannot be published before configured release date." }` |
| Test ref    | `tests.test_bo_academic.TestAcademicRecordBO`                                                                                               |

---

## BR-04-06: Minimum attendance threshold for report card release

| Field       | Value                                                                                                                                                           |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rule ID     | BR-04-06                                                                                                                                                        |
| Process     | P04 — Academic Management                                                                                                                                       |
| BO          | BO-04 AcademicRecord                                                                                                                                            |
| Status      | Active                                                                                                                                                          |
| Added       | 2026-08-29                                                                                                                                                      |
| Retired     | —                                                                                                                                                               |
| Description | Student attendance percentage below configured threshold (e.g. 75%) blocks report card from being released to parent portal until counselor/principal override. |
| Trigger     | On publishing ReportCard                                                                                                                                        |
| Violation   | HTTP 422 — `{ "code": "RULE_VIOLATION", "rule": "BR-04-06", "message": "Attendance below minimum threshold (75%) blocks report card publication." }`            |
| Test ref    | `tests.test_bo_academic.TestAcademicRecordBO`                                                                                                                   |

---

## BR-04-07: Marks records immutability after moderation deadline

| Field       | Value                                                                                                                                          |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Rule ID     | BR-04-07                                                                                                                                       |
| Process     | P04 — Academic Management                                                                                                                      |
| BO          | BO-04 AcademicRecord                                                                                                                           |
| Status      | Active                                                                                                                                         |
| Added       | 2026-08-29                                                                                                                                     |
| Retired     | —                                                                                                                                              |
| Description | Marks records are locked after the configured deadline or moderation; retroactive alterations require Principal/Owner approval and audit note. |
| Trigger     | On updating locked MarksRecord                                                                                                                 |
| Violation   | HTTP 422 — `{ "code": "RULE_VIOLATION", "rule": "BR-04-07", "message": "Marks record is locked. Modifications require Principal approval." }`  |
| Test ref    | `tests.test_bo_academic.TestAcademicRecordBO`                                                                                                  |

---

## BR-05-01: DBS background check required for teaching staff

| Field       | Value                                                                                                                                                 |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rule ID     | BR-05-01                                                                                                                                              |
| Process     | P05 — HR & Payroll                                                                                                                                    |
| BO          | BO-13 StaffMember                                                                                                                                     |
| Status      | Active                                                                                                                                                |
| Added       | 2026-08-29                                                                                                                                            |
| Retired     | —                                                                                                                                                     |
| Description | Staff with teaching responsibilities cannot be assigned if the DBS/background check is missing or expired.                                            |
| Trigger     | On call to StaffMemberBO.create_staff() or compliance check endpoint                                                                                  |
| Violation   | HTTP 422 — `{ "code": "RULE_VIOLATION", "rule": "BR-05-01", "message": "Cannot assign teaching duties to staff with missing or expired DBS check." }` |
| Test ref    | `tests.test_bo_sprint5.TestBR0501`                                                                                                                    |

## BR-05-02: Payroll deductions include approved unpaid leave

| Field       | Value                                                                                                             |
| ----------- | ----------------------------------------------------------------------------------------------------------------- |
| Rule ID     | BR-05-02                                                                                                          |
| Process     | P05 — HR & Payroll                                                                                                |
| BO          | BO-15 PayrollRun                                                                                                  |
| Status      | Active                                                                                                            |
| Added       | 2026-08-29                                                                                                        |
| Retired     | —                                                                                                                 |
| Description | Approved unpaid leave in the selected payroll period must reduce net pay automatically.                           |
| Trigger     | On call to PayrollRunBO.compute_payroll()                                                                         |
| Violation   | HTTP 422 — `{ "code": "RULE_VIOLATION", "rule": "BR-05-02", "message": "Payroll deduction calculation failed." }` |
| Test ref    | `tests.test_bo_sprint5.TestBR0502`                                                                                |

## BR-06-01: Emergency broadcasts ignore opt-out and log confirmation

| Field       | Value                                                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Rule ID     | BR-06-01                                                                                                                       |
| Process     | P06 — Communications                                                                                                           |
| BO          | BO-22 CommunicationBundle                                                                                                      |
| Status      | Active                                                                                                                         |
| Added       | 2026-08-29                                                                                                                     |
| Retired     | —                                                                                                                              |
| Description | Emergency broadcasts must bypass opt-out settings and record delivery confirmation for every recipient.                        |
| Trigger     | On call to CommunicationBundleBO.send_emergency_broadcast()                                                                    |
| Violation   | HTTP 422 — `{ "code": "RULE_VIOLATION", "rule": "BR-06-01", "message": "Emergency broadcast delivery confirmation missing." }` |
| Test ref    | `tests.test_bo_sprint5.TestBR0601`                                                                                             |

## BR-08-01: Procurement 3-way match required before vendor payment

| Field       | Value                                                                                                                                                           |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rule ID     | BR-08-01                                                                                                                                                        |
| Process     | P08 — Vendor & Procurement                                                                                                                                      |
| BO          | BO-19 ProcurementOrder                                                                                                                                          |
| Status      | Active                                                                                                                                                          |
| Added       | 2026-08-29                                                                                                                                                      |
| Retired     | —                                                                                                                                                               |
| Description | Requisition, delivery, and vendor invoice amounts must match before a vendor invoice can be approved for payment.                                               |
| Trigger     | On call to ProcurementOrderBO.approve_vendor_invoice()                                                                                                          |
| Violation   | HTTP 422 — `{ "code": "RULE_VIOLATION", "rule": "BR-08-01", "message": "Vendor payments are blocked until requisition, delivery, and invoice amounts match." }` |
| Test ref    | `tests.test_bo_sprint5.TestBR0801`                                                                                                                              |

## BR-09-01: Event permission deadline must be at least 48 hours prior

| Field       | Value                                                                                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Rule ID     | BR-09-01                                                                                                                                         |
| Process     | P09 — Events                                                                                                                                     |
| BO          | BO-21 SchoolEvent                                                                                                                                |
| Status      | Active                                                                                                                                           |
| Added       | 2026-08-29                                                                                                                                       |
| Retired     | —                                                                                                                                                |
| Description | Permission slip deadline must be at least 48 hours before the event date.                                                                        |
| Trigger     | On call to SchoolEventBO.create_event()                                                                                                          |
| Violation   | HTTP 422 — `{ "code": "RULE_VIOLATION", "rule": "BR-09-01", "message": "Permission slip deadline must be at least 48 hours before the event." }` |
| Test ref    | `tests.test_bo_sprint5.TestBR0901`                                                                                                               |

---

## BR-03-01: Attendance 24-hour edit lock

| Field       | Value                                                                                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rule ID     | BR-03-01                                                                                                                                                |
| Process     | P03 — Attendance Management                                                                                                                             |
| BO          | BO-07 AttendanceSheet                                                                                                                                   |
| Status      | Active                                                                                                                                                  |
| Added       | 2026-08-29                                                                                                                                              |
| Retired     | —                                                                                                                                                       |
| Description | Attendance records are locked for editing 24 hours after the session date for audit integrity. Modifications after 24 hours require Principal override. |
| Trigger     | On updating or re-marking an attendance record                                                                                                          |
| Violation   | HTTP 422 — `{ "code": "RULE_VIOLATION", "rule": "BR-03-01", "message": "Attendance record is locked (exceeds 24-hour window)." }`                       |
| Test ref    | `tests.test_bo_attendance_health.TestAttendanceSheetBO`                                                                                                 |

---

## BR-03-02: Unexcused student absence parent notification

| Field       | Value                                                                                                      |
| ----------- | ---------------------------------------------------------------------------------------------------------- |
| Rule ID     | BR-03-02                                                                                                   |
| Process     | P03 — Attendance Management                                                                                |
| BO          | BO-07 AttendanceSheet                                                                                      |
| Status      | Active                                                                                                     |
| Added       | 2026-08-29                                                                                                 |
| Retired     | —                                                                                                          |
| Description | Marking a student absent without an approved leave request triggers an automated parent notification flag. |
| Trigger     | On marking student attendance as Absent                                                                    |
| Violation   | HTTP 422 / Notification Trigger                                                                            |
| Test ref    | `tests.test_bo_attendance_health.TestAttendanceSheetBO`                                                    |

---

## BR-03-03: Staff unexcused absence cover alert

| Field       | Value                                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------------- |
| Rule ID     | BR-03-03                                                                                                      |
| Process     | P03 — Attendance Management                                                                                   |
| BO          | BO-09 StaffRoster                                                                                             |
| Status      | Active                                                                                                        |
| Added       | 2026-08-29                                                                                                    |
| Retired     | —                                                                                                             |
| Description | Staff absence without prior leave approval triggers an immediate class-without-cover alert to Vice Principal. |
| Trigger     | On staff absence without approved LeaveRequest                                                                |
| Violation   | Alert Event Trigger                                                                                           |
| Test ref    | `tests.test_bo_attendance_health.TestStaffRosterBO`                                                           |

---

## BR-03-04: Leave request blackout date override

| Field       | Value                                                                                                                                                       |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rule ID     | BR-03-04                                                                                                                                                    |
| Process     | P03 — Attendance Management                                                                                                                                 |
| BO          | BO-08 LeaveCase                                                                                                                                             |
| Status      | Active                                                                                                                                                      |
| Added       | 2026-08-29                                                                                                                                                  |
| Retired     | —                                                                                                                                                           |
| Description | Leave request overlapping with exam weeks or calendar blackout dates requires explicit Principal or Owner approval.                                         |
| Trigger     | On creating or approving LeaveRequest                                                                                                                       |
| Violation   | HTTP 422 — `{ "code": "RULE_VIOLATION", "rule": "BR-03-04", "message": "Leave request conflicts with blackout dates/exams. Principal approval required." }` |
| Test ref    | `tests.test_bo_attendance_health.TestLeaveCaseBO`                                                                                                           |

---

## BR-03-05: Low attendance threshold counselor flag

| Field       | Value                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------ |
| Rule ID     | BR-03-05                                                                                                     |
| Process     | P03 — Attendance Management                                                                                  |
| BO          | BO-07 AttendanceSheet                                                                                        |
| Status      | Active                                                                                                       |
| Added       | 2026-08-29                                                                                                   |
| Retired     | —                                                                                                            |
| Description | Monthly student attendance below 80% automatically flags the student for counselor and administrator review. |
| Trigger     | On monthly attendance calculation                                                                            |
| Violation   | Warning flag in attendance summary                                                                           |
| Test ref    | `tests.test_bo_attendance_health.TestAttendanceSheetBO`                                                      |

---

## BR-03-06: Substitute staff availability check

| Field       | Value                                                                                                                                          |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Rule ID     | BR-03-06                                                                                                                                       |
| Process     | P03 — Attendance Management                                                                                                                    |
| BO          | BO-09 StaffRoster                                                                                                                              |
| Status      | Active                                                                                                                                         |
| Added       | 2026-08-29                                                                                                                                     |
| Retired     | —                                                                                                                                              |
| Description | A staff member cannot be assigned as a substitute teacher on a day they have an approved leave request or marked absence.                      |
| Trigger     | On assigning a substitute teacher                                                                                                              |
| Violation   | HTTP 422 — `{ "code": "RULE_VIOLATION", "rule": "BR-03-06", "message": "Selected substitute staff is on leave or unavailable on this date." }` |
| Test ref    | `tests.test_bo_attendance_health.TestStaffRosterBO`                                                                                            |

---

## BR-07-01: Medication administration parental consent gate

| Field       | Value                                                                                                                                          |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Rule ID     | BR-07-01                                                                                                                                       |
| Process     | P07 — Health & Safety Management                                                                                                               |
| BO          | BO-17 HealthRecord                                                                                                                             |
| Status      | Active                                                                                                                                         |
| Added       | 2026-08-29                                                                                                                                     |
| Retired     | —                                                                                                                                              |
| Description | Medication administration requires a signed parent consent form on record (`consent_flag=True`) before any dose can be logged.                 |
| Trigger     | On creating MedicationLog                                                                                                                      |
| Violation   | HTTP 422 — `{ "code": "RULE_VIOLATION", "rule": "BR-07-01", "message": "Cannot administer medication: signed parental consent is required." }` |
| Test ref    | `tests.test_bo_attendance_health.TestHealthRecordBO`                                                                                           |

---

## BR-07-02: Incident 1-hour admin acknowledgement SLA

| Field       | Value                                                                                        |
| ----------- | -------------------------------------------------------------------------------------------- |
| Rule ID     | BR-07-02                                                                                     |
| Process     | P07 — Health & Safety Management                                                             |
| BO          | BO-18 SafetyCompliance                                                                       |
| Status      | Active                                                                                       |
| Added       | 2026-08-29                                                                                   |
| Retired     | —                                                                                            |
| Description | Any logged incident must be acknowledged and categorized by Admin within 1 hour of creation. |
| Trigger     | Evaluated in compliance audits & incident updates                                            |
| Violation   | SLA breach warning flag                                                                      |
| Test ref    | `tests.test_bo_attendance_health.TestSafetyComplianceBO`                                     |

---

## BR-07-03: Serious incident automatic principal escalation

| Field       | Value                                                                                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Rule ID     | BR-07-03                                                                                                                                                           |
| Process     | P07 — Health & Safety Management                                                                                                                                   |
| BO          | BO-18 SafetyCompliance                                                                                                                                             |
| Status      | Active                                                                                                                                                             |
| Added       | 2026-08-29                                                                                                                                                         |
| Retired     | —                                                                                                                                                                  |
| Description | Incidents categorized as High/Critical severity, Allergic Reaction, or Major Injury automatically escalate to Principal and trigger immediate parent notification. |
| Trigger     | On Incident creation / update                                                                                                                                      |
| Violation   | Automatic escalation flags                                                                                                                                         |
| Test ref    | `tests.test_bo_attendance_health.TestSafetyComplianceBO`                                                                                                           |

---

## BR-07-04: Safety drill sign-off immutability

| Field       | Value                                                                                                                        |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Rule ID     | BR-07-04                                                                                                                     |
| Process     | P07 — Health & Safety Management                                                                                             |
| BO          | BO-18 SafetyCompliance                                                                                                       |
| Status      | Active                                                                                                                       |
| Added       | 2026-08-29                                                                                                                   |
| Retired     | —                                                                                                                            |
| Description | Safety drill records are immutable after sign-off; corrections require a new superseding record.                             |
| Trigger     | On updating a signed-off SafetyDrill                                                                                         |
| Violation   | HTTP 422 — `{ "code": "RULE_VIOLATION", "rule": "BR-07-04", "message": "Safety drill record is signed off and immutable." }` |
| Test ref    | `tests.test_bo_attendance_health.TestSafetyComplianceBO`                                                                     |

---

## BR-02-01: Paid invoice balance zero check

| Field       | Value                                                                                                                                              |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rule ID     | BR-02-01                                                                                                                                           |
| Process     | P02 — Billing & Fee Management                                                                                                                     |
| BO          | BO-10 FeeAccount                                                                                                                                   |
| Status      | Active                                                                                                                                             |
| Added       | 2026-08-29                                                                                                                                         |
| Retired     | —                                                                                                                                                  |
| Description | Invoice cannot be marked as 'Paid' if the outstanding balance is greater than zero.                                                                |
| Trigger     | On updating invoice status to Paid                                                                                                                 |
| Violation   | HTTP 422 — `{ "code": "RULE_VIOLATION", "rule": "BR-02-01", "message": "Cannot mark invoice as Paid: outstanding balance is greater than zero." }` |
| Test ref    | `tests.test_bo_billing.TestFeeAccountBO`                                                                                                           |

---

## BR-02-02: Automatic late fee application

| Field       | Value                                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------------------- |
| Rule ID     | BR-02-02                                                                                                |
| Process     | P02 — Billing & Fee Management                                                                          |
| BO          | BO-10 FeeAccount                                                                                        |
| Status      | Active                                                                                                  |
| Added       | 2026-08-29                                                                                              |
| Retired     | —                                                                                                       |
| Description | Late fee applies automatically when current date exceeds invoice due date plus configured grace period. |
| Trigger     | On invoice valuation / late fee job                                                                     |
| Violation   | Automatic fee adjustment                                                                                |
| Test ref    | `tests.test_bo_billing.TestFeeAccountBO`                                                                |

---

## BR-02-03: Discount and waiver approval hierarchy

| Field       | Value                                                                                                                             |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Rule ID     | BR-02-03                                                                                                                          |
| Process     | P02 — Billing & Fee Management                                                                                                    |
| BO          | BO-10 FeeAccount                                                                                                                  |
| Status      | Active                                                                                                                            |
| Added       | 2026-08-29                                                                                                                        |
| Retired     | —                                                                                                                                 |
| Description | Discount or waiver requests exceeding $200 require Owner approval; Principal approval is sufficient for amounts <= $200.          |
| Trigger     | On creating or approving DiscountWaiver                                                                                           |
| Violation   | HTTP 422 — `{ "code": "RULE_VIOLATION", "rule": "BR-02-03", "message": "High-value discounts (> $200) require Owner approval." }` |
| Test ref    | `tests.test_bo_billing.TestFeeAccountBO`                                                                                          |

---

## BR-02-04: Immutable discount approval audit log

| Field       | Value                                                                                                                                  |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Rule ID     | BR-02-04                                                                                                                               |
| Process     | P02 — Billing & Fee Management                                                                                                         |
| BO          | BO-10 FeeAccount                                                                                                                       |
| Status      | Active                                                                                                                                 |
| Added       | 2026-08-29                                                                                                                             |
| Retired     | —                                                                                                                                      |
| Description | All discount and waiver approvals must be permanently logged in the audit trail with approver ID, timestamp, and justification reason. |
| Trigger     | On discount creation                                                                                                                   |
| Violation   | Audit log enforcement                                                                                                                  |
| Test ref    | `tests.test_bo_billing.TestFeeAccountBO`                                                                                               |

---

## BR-02-05: High-value refund Owner approval gate

| Field       | Value                                                                                                                      |
| ----------- | -------------------------------------------------------------------------------------------------------------------------- |
| Rule ID     | BR-02-05                                                                                                                   |
| Process     | P02 — Billing & Fee Management                                                                                             |
| BO          | BO-11 PaymentTransaction                                                                                                   |
| Status      | Active                                                                                                                     |
| Added       | 2026-08-29                                                                                                                 |
| Retired     | —                                                                                                                          |
| Description | Payment refund requests exceeding $500 require Owner approval before being processed.                                      |
| Trigger     | On processing a payment refund                                                                                             |
| Violation   | HTTP 422 — `{ "code": "RULE_VIOLATION", "rule": "BR-02-05", "message": "Refunds exceeding $500 require Owner approval." }` |
| Test ref    | `tests.test_bo_billing.TestPaymentTransactionBO`                                                                           |

---

## BR-02-06: Period reconciliation discrepancy resolution gate

| Field       | Value                                                                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Rule ID     | BR-02-06                                                                                                                                    |
| Process     | P02 — Billing & Fee Management                                                                                                              |
| BO          | BO-12 FinancialStatement                                                                                                                    |
| Status      | Active                                                                                                                                      |
| Added       | 2026-08-29                                                                                                                                  |
| Retired     | —                                                                                                                                           |
| Description | A monthly financial reconciliation period cannot be finalized if there are unresolved discrepancies.                                        |
| Trigger     | On finalizing a Reconciliation record                                                                                                       |
| Violation   | HTTP 422 — `{ "code": "RULE_VIOLATION", "rule": "BR-02-06", "message": "Cannot finalize reconciliation: unresolved discrepancies exist." }` |
| Test ref    | `tests.test_bo_billing.TestFinancialStatementBO`                                                                                            |
