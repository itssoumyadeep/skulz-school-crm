# Teacher Portal — Feature Requirements

**Portal:** `/teacher`  
**Reference design:** Greenfield International School — Teacher Console  
**Architecture refs:** `AGENT.md`, `student_access_control.md`, `AGENT.md §16 P03/P04/P06`  
**Scope:** Teacher role only. All data scoped to teacher's assigned classes. No cross-class access.

---

## Navigation structure (from design)

```
Sidebar
├── Dashboard          ← landing page (this screenshot)
├── My Classes
├── Students
├── Attendance
├── Assessments / Grades
├── Schedule
├── Messages
├── Announcements
├── Reports
└── Settings
```

---

## REQ-1 — Students list page (`/teacher/students`)

### REQ-1.0 — Page layout

- Page heading: "Students" with a live count badge showing total students across all the teacher's assigned classes (e.g. "28 students").
- Class filter dropdown at the top: defaults to "All my classes". Options list each class the teacher is assigned to (e.g. "Grade 6 – Section A", "Grade 6 – Section B"). Selecting a class filters the list to that class only.
- Search bar: filters the visible list by student name in real time as the teacher types. Minimum 2 characters before filtering begins.
- List is scoped strictly to the teacher's assigned classes. The teacher cannot search for or view students outside their class roster. This is enforced at the API level (`GET /students` with class scope filter), not just in the UI.
- The page must load with the correct default state for a teacher: all assigned classes selected, alphabetical ordering by last name, and no unrelated student records visible.
- If the teacher enters fewer than 2 characters in the search box, the list remains unfiltered and the page continues to show the full roster for the selected scope.
- If a selected class has no students, the UI must show a clear empty state rather than a blank table.
- The teacher cannot access any student record outside the assigned class list even if a direct URL is guessed or a query parameter is modified; server-side access control must reject out-of-scope requests.
- The total count badge updates immediately when the class filter changes or the search criteria is applied, showing the number of rows currently in scope.

**Acceptance criteria**

- A teacher sees only the students assigned to their classes.
- The class filter default is "All my classes".
- Searching with fewer than 2 characters does not filter the list.
- Searching with 2+ characters narrows the results in real time by student name.
- The count badge reflects the visible result set and remains accurate across filter changes.
- Out-of-scope students are not visible in the UI, and API requests return access-denied or empty results as appropriate.

**Definition of done**

- The page matches the teacher-only scope requirement.
- UI and API enforce the same class roster boundary.
- Search and filter states work without exposing data outside the teacher's assigned students.

### REQ-1.1 — Student list table

Display each student as a row with the following columns:

| Column       | Content                                                                                         |
| ------------ | ----------------------------------------------------------------------------------------------- |
| Student      | Avatar initials + full name                                                                     |
| Class        | Class name and section                                                                          |
| Attendance % | This month's attendance percentage with a colour indicator (≥90% green, 75–89% amber, <75% red) |
| Last seen    | Date of most recent attendance mark                                                             |
| Status       | Active / On leave / Absent today pill                                                           |
| Action       | "View profile" button                                                                           |

- Default sort: alphabetical by last name
- Table supports column sorting by clicking column headers (Name, Attendance %)
- Rows are paginated: 20 rows per page with next/previous controls
- Empty state: if a filter returns no results, show "No students match your search" with a clear-filter link

### REQ-1.2 — "View profile" button behaviour

- Clicking "View profile" on any row navigates to the student's profile page at `/teacher/students/{student_id}`
- The student profile page is a **full page**, not a modal or slide-over panel

---

## REQ-1.a — Student profile page (`/teacher/students/{student_id}`)

> The teacher can view and edit specific data fields for students in their class. They cannot see or edit financial data, health conditions beyond allergy/emergency flags, or data belonging to students outside their classes.

### REQ-1.a.0 — Page header

- Student's full name as the page title
- Sub-line: class name, section, grade, and student number (e.g. "Grade 6 · Section A · Student #GVS-2024-0042")
- Status pill: Active / On leave / Suspended
- Avatar with student initials (or uploaded photo if available)
- Breadcrumb: Students → [Student name]
- Top-right action buttons: "Mark attendance", "Send message to parent", "Add note"

### REQ-1.a.1 — Profile tabs

The profile page is organised into tabs. Active tab is visually highlighted. Tab order:

```
Overview | Attendance | Assignments | Marks | Notes | Documents | Notifications
```

---

### REQ-1.a.2 — Tab: Overview

**Purpose:** Quick summary of this student across all dimensions the teacher can see.

**Sections within Overview:**

**Personal details (read-only for teacher)**

- Full name, date of birth, grade, section, class teacher name, student number, enrolled date
- Teacher cannot edit these fields — edit is Admin/Principal only

**Emergency contacts (read-only for teacher)**

- Emergency contact name, relationship, phone number
- Displayed as a read-only card; teacher cannot edit
- If no emergency contact is on file, show a warning banner: "No emergency contact recorded. Contact Admin."

**Allergy and health flags (read-only for teacher)**

- List of known allergies and their severity level (e.g. "Peanuts — Severe")
- List of dietary restrictions
- Special needs flag (yes/no — no detail shown beyond flag)
- Full health records (conditions, medications) are not visible to teacher role — only the flags relevant to classroom safety

**Today's snapshot**

- Attendance status for today: Present / Absent / Late / On leave
- Assignments due this week for this student (count and list)
- Latest marks entered by this teacher for this student

---

### REQ-1.a.3 — Tab: Attendance

**Purpose:** View and manage this student's attendance record. Supports REQ process P03.

**View**

- Monthly calendar grid showing each school day coloured by status:
  - Green = Present
  - Red = Absent (no leave)
  - Amber = Late
  - Blue = On leave (approved)
  - Grey = Non-school day / holiday
- Summary row below the calendar: total present, total absent, total late, total on leave, attendance percentage this term
- Attendance percentage displayed as a progress bar with the configured threshold marked (e.g. 75% line)
- Previous month navigation arrows to view past months

**Mark attendance (inline action)**

- "Mark today's attendance" button visible only if:
  - Today is a school day (validated against AcademicCalendar)
  - The attendance window for this class is currently open
  - Today's attendance has not already been locked
- On click: show an inline radio button row — Present / Late / Absent / On leave
- Selecting "Late" shows a time input for arrival time
- Selecting "On leave" shows a read-only field referencing the approved leave request ID if one exists; if no approved leave exists, teacher marks Absent and parent notification fires automatically
- On save: attendance record is created via `POST /attendance/mark`; a confirmation toast appears
- After the 24-hour lock window, the mark button is hidden and replaced with a "Locked — contact Admin to correct" note

**Leave requests for this student**

- Table of all leave requests for this student: date range, type, status, approved by
- Teacher can submit a new leave request on behalf of a parent: button "Log leave request" opens a form (date range, leave type, reason); submitted as `POST /leave-requests`
- Teacher cannot approve leave — that is Admin. They can only submit.

**Attendance history export**

- "Export CSV" button downloads this student's attendance history for the current term

---

### REQ-1.a.4 — Tab: Assignments

**Purpose:** View and manage assignments for this student. Supports P04 ClassroomPlan BO.

**View**

- List of all assignments the teacher has posted to this student's class, with per-student submission status
- Columns: Assignment title, Subject, Due date, Submitted (yes/no), Submission date, Marks awarded, Feedback given (yes/no)
- Row colour: overdue and not submitted = amber row background; submitted on time = normal; submitted late = light amber

**Actions**

- Click any assignment row to expand: shows the full assignment instructions, any attachments, and this student's submitted file (if uploaded)
- "Give feedback" button on each submitted assignment: opens an inline text area where teacher types written feedback; saved via `PATCH /assignments/{id}` with feedback field
- "Add marks" button: only visible for assignments that have a max_marks value; opens a marks entry input; saved via `POST /exams/{id}/marks` if linked to an exam, or via assignment marks endpoint
- Teacher can create a new assignment from this page: "New assignment" button in the page header navigates to the assignment creation form pre-filled with this student's class

**Overdue alert**

- If a student has 3 or more overdue unsubmitted assignments, display a yellow banner at the top of the tab: "This student has [N] overdue assignments. Consider notifying the parent."
- Banner includes a one-click "Notify parent" button that opens the messaging compose window pre-filled with the student's parent

---

### REQ-1.a.5 — Tab: Marks

**Purpose:** View and enter subject marks for this student. Supports P04 AcademicRecord BO.

**View**

- Table of all marks entered for this student by this teacher, grouped by subject
- Columns: Assessment name, Assessment type (formative / summative / practical), Date, Marks obtained, Max marks, Grade, Locked status
- Locked rows shown with a lock icon and greyed background — cannot be edited
- Grade computed and displayed automatically based on the configured grading scale

**Entry**

- "Enter marks" button: opens a form with fields — Assessment name, Assessment type, Date, Marks obtained, Max marks
- On save: marks record created via `POST /exams/{id}/marks`; grade computed automatically
- If marks are already locked (deadline passed), the "Enter marks" button is hidden and replaced with: "Marks for this period are locked. Request Principal approval to make changes."
- Marks across all subjects for this student shown in a summary bar chart (visual only, no interaction)

**Cross-subject view**

- Teacher can see marks for subjects they teach only. Other subjects' marks are shown as "–" with a note "Entered by another teacher."

---

### REQ-1.a.6 — Tab: Notes

**Purpose:** Teacher-managed notes about a student. Private to the school (not visible to parent portal).

**View**

- Chronological list of notes, newest first
- Each note shows: timestamp, note text, created by (teacher name), category tag

**Add note**

- "Add note" button opens an inline form:
  - Note text (textarea, max 1000 characters)
  - Category: Academic concern / Behavioural / Positive observation / Parent follow-up / Other
  - Visibility: School staff only (default, cannot be changed by teacher — notes are never parent-visible)
- On save: note stored and visible immediately
- Teacher can edit their own notes within 24 hours of creation; after 24 hours notes are read-only
- Teacher cannot delete notes — deletion requires Admin or Principal

**Categories and use**

- "Academic concern" notes trigger an optional prompt: "Would you like to notify the parent about this concern?" — if yes, opens the message compose window pre-filled with the concern summary
- "Parent follow-up" notes display a follow-up due date field (optional)

---

### REQ-1.a.7 — Tab: Documents

**Purpose:** Teacher can attach and view documents associated with this student.

**View**

- List of all documents attached to this student that are visible to the teacher role
- Columns: Document name, Type, Uploaded by, Upload date, Size
- Documents uploaded by Admin (enrollment docs, identity docs) are visible as read-only; teacher cannot download identity or health documents — download is restricted to Admin/Principal
- Documents uploaded by the teacher are fully accessible

**Upload**

- "Attach document" button opens an upload form:
  - File selector (PDF, DOCX, images — max 10 MB)
  - Document type: Classwork sample / Assessment paper / Behavioural record / Other
  - Note (optional): short description of what the document is
- On upload: stored against the student record, visible to Admin and Principal immediately
- Teacher cannot delete documents once uploaded — deletion requires Admin

**Access rules (enforced at API)**

- Teacher can only attach documents to students in their own classes
- Teacher cannot view or download documents categorised as Identity, Medical, or Financial

---

### REQ-1.a.8 — Tab: Notifications

**Purpose:** View and configure notifications sent to the parent of this student from the teacher's context. Supports P06 CommunicationBundle BO.

**View**

- History of all notifications sent to this student's parent by the teacher or by the system on behalf of events this teacher triggered (attendance absences, overdue assignments)
- Columns: Date/time, Notification type, Channel (SMS / email / push), Message snippet, Delivery status (delivered / read / failed)
- System-generated notifications (absent alerts, overdue reminders) are marked with a "System" badge; teacher-authored messages are marked with the teacher's name

**Send notification**

- "Send message to parent" button opens a compose panel (same as Messages page):
  - Pre-filled recipient: this student's parent
  - Subject (optional)
  - Message body (textarea)
  - Channel selector: push notification (default), email, SMS (if school SMS plan active)
- On send: message created via `POST /messages`; delivery tracked and visible in this history list
- Teacher cannot send bulk notifications from the student profile page — bulk messaging is on the Messages page

**Notification preferences (read-only for teacher)**

- Displays the parent's configured notification preferences (which channels they've opted into) as a read-only summary
- Teacher cannot change parent notification preferences — that is a parent portal action

---

## REQ-2 — My Classes page (`/teacher/my-classes`)

> **Process:** P04 Academic Management — ClassroomPlan BO (BO-05)

- Lists all classes the teacher is assigned to as cards
- Each class card shows: class name, grade, section, student count, room number, subject(s)
- Clicking a class card navigates to `/teacher/my-classes/{class_id}` — the class detail page

### REQ-2.1 — Class detail page (`/teacher/my-classes/{class_id}`)

- Class name, grade, section, room, student count in the page header
- Tabs: Students | Lesson Plans | Assignments | Attendance | Schedule

**Students tab**

- Same list as REQ-1 but pre-filtered to this class. "View profile" button works the same way.

**Lesson Plans tab**

- List of all lesson plans created by this teacher for this class, sorted by week descending
- Each row: week commencing, topic, curriculum link, status (Draft / Submitted / Reviewed), reviewed by (VP name if reviewed)
- "New lesson plan" button opens a form:
  - Class (pre-filled, read-only)
  - Week commencing (date picker)
  - Topic (text input)
  - Curriculum link (dropdown of subjects/topics from the active curriculum for this grade)
  - Objectives (textarea)
  - Resources (file attachments, max 3 files, 10 MB each)
- On save as Draft: stored with status Draft — teacher can edit
- On submit: status moves to Submitted; VP is notified for review
- After VP review, status is Reviewed — teacher can view but not edit

**Assignments tab**

- List of all assignments posted to this class with aggregate submission stats
- "New assignment" button creates an assignment scoped to this class

**Attendance tab**

- Date selector (defaults to today)
- Quick-mark grid: all students in the class listed with Present / Absent / Late / On leave radio buttons
- Single "Save attendance" button submits all marks at once via `POST /attendance/mark-bulk`
- Shows today's window open/closed status and time remaining in window

---

## REQ-3 — Attendance page (`/teacher/attendance`)

> **Process:** P03 Attendance Management — AttendanceSheet BO (BO-07), LeaveCase BO (BO-08)

### REQ-3.1 — Daily attendance view

- Default view: today's date, all classes the teacher is responsible for
- Class tabs at the top if teacher is assigned to multiple classes
- Quick-mark grid identical to REQ-2.1 Attendance tab
- Attendance window status banner: green "Window open until 09:45 AM" or red "Window closed — marks locked"
- If window is closed and teacher has not yet marked a session: show warning "Attendance not yet marked for this session. Contact Admin."

### REQ-3.2 — Attendance history

- Date range selector: defaults to current month
- Filter by class and by attendance status
- Table: date, student name, class, status, method, locked flag
- Chronically absent students (below configured threshold) highlighted with an amber row

### REQ-3.3 — Leave requests

- Tab: "Leave requests" shows all leave requests for students in the teacher's classes
- Teacher can submit a new student leave request (REQ-1.a.3)
- Teacher can view status of submitted requests but cannot approve them

---

## REQ-4 — Assessments / Grades page (`/teacher/assessments`)

> **Process:** P04 Academic Management — AcademicRecord BO (BO-04), ExamPackage BO (BO-06)

### REQ-4.1 — Assessments list

- List of all assessments (exams + assignments with marks) the teacher has created or is responsible for marking
- Columns: Name, Type, Class, Date, Status (Draft / Active / Marks entered / Locked)
- Filter by class and by assessment type

### REQ-4.2 — Marks entry

- Clicking an active assessment opens the marks entry view
- Grid: one row per student, one column per subject/component
- Teacher enters marks in cells; marks computed to grade automatically
- "Save draft" saves without locking; "Submit marks" moves status to Marks entered and notifies VP for moderation
- Locked assessments are read-only with a lock icon

### REQ-4.3 — Grade summary

- Per-class grade distribution chart (bar chart: grade A/B/C/D/F counts)
- Per-student progress summary table: student name, average mark, grade trend (up/down/stable arrow)
- "Below threshold" flag shown for students below the passing mark

---

## REQ-5 — Schedule page (`/teacher/schedule`)

> **Process:** P04 Academic Management — AcademicCalendar BO (BO-03)

- Weekly calendar view (Mon–Fri) showing the teacher's assigned classes as time blocks
- Each block shows: time, subject, class name, room
- Date navigation: previous/next week arrows; "Today" button returns to current week
- Clicking a class block shows a details popup: class name, students enrolled, lesson plan for that week (if uploaded), attendance status for that session
- Academic calendar events (holidays, exam weeks, blackout dates) are shown as background highlights on the calendar
- Read-only — teacher cannot edit the schedule; scheduling is VP/Admin

---

## REQ-6 — Messages page (`/teacher/messages`)

> **Process:** P06 Communication — CommunicationBundle BO (BO-22)

### REQ-6.1 — Inbox

- List of all direct messages received from parents, sorted newest first
- Each row: sender (parent name + student name), message snippet, timestamp, unread indicator
- Unread messages shown in bold; unread count badge in the sidebar nav item

### REQ-6.2 — Compose

- "New message" button opens a compose panel:
  - Recipient: dropdown of parents of students in the teacher's classes only (teacher cannot message parents of other classes)
  - Subject (optional)
  - Body (textarea, max 2000 characters)
  - Send button: `POST /messages`
- Teacher cannot send bulk messages from this page (bulk requires Admin role)

### REQ-6.3 — Message thread view

- Clicking a message in the inbox opens the full thread
- Shows the full conversation history between teacher and that parent
- Teacher can reply inline at the bottom of the thread
- Messages are retained for 12 months minimum (displayed and not deletable by teacher)
- Out-of-hours indicator: if the teacher has configured availability hours in Settings, messages sent outside those hours show a grey clock icon with "Sent outside available hours — queued for delivery"

### REQ-6.4 — Class group message

- "Send class update" button: composes a one-way broadcast to all parents of a selected class
- Subject required for class broadcasts
- Delivery status summary shown after sending: X delivered, X failed

---

## REQ-7 — Announcements page (`/teacher/announcements`)

> **Process:** P06 Communication — CommunicationBundle BO (BO-22)

- List of all school announcements published by Admin or Principal — read-only
- Teacher can see announcements targeted at the "All teachers" or "All staff" audience
- Announcements requiring acknowledgement show a blue "Mark as read" button; once clicked it is replaced with a green "Acknowledged" badge with timestamp
- Teacher cannot create school-wide announcements — that is Principal/Admin only

---

## REQ-8 — Reports page (`/teacher/reports`)

> **Process:** P10 Reports — AnalyticsDashboard BO (BO-23), scoped to teacher's classes only

- Pre-built report cards available to the teacher:
  - Class attendance summary (current term, by class)
  - Assignment submission rates (by class)
  - Grade distribution (by class, by assessment)
  - Individual student progress (one student at a time, across all assessments entered by this teacher)
- Each report has a date range picker (defaults to current term)
- "Export CSV" button downloads the report data
- "Export PDF" button generates a formatted PDF report
- Teacher cannot access financial reports, school-wide reports, or cross-class reports

---

## REQ-9 — Settings page (`/teacher/settings`)

### REQ-9.1 — Profile settings

- View and edit: display name, contact email, phone number, profile photo
- Cannot change: role, assigned classes, school, employment details (those are Admin-managed)

### REQ-9.2 — Notification preferences

- Toggle: receive push notifications for new parent messages (on/off)
- Toggle: receive email digest of attendance alerts (daily / off)
- Toggle: receive reminder when attendance window is about to close (15 min before / off)
- Toggle: receive alert when a student's attendance drops below threshold (on/off)

### REQ-9.3 — Availability hours

- Set availability hours for parent messaging (e.g. Mon–Fri, 08:00–17:00)
- Messages received outside hours are queued; parent sees an "outside available hours" notice
- Cannot disable availability hours entirely (school policy minimum: must have at least 4 hours per weekday)

### REQ-9.4 — Lesson plan templates

- Saved lesson plan templates: list of templates the teacher has created
- "New template" button: create a reusable lesson plan structure (title, objectives template, curriculum link)
- Edit and delete own templates

---

## REQ-10 — Dashboard (`/teacher` — landing page)

> This is the page shown in the design screenshot.

### REQ-10.1 — Greeting and date

- Greeting: "Good morning/afternoon/evening, [First name]!" — time-of-day aware
- Subtitle: "Here's what's happening with your classes today."
- Date badge top-right: current date in the format shown (e.g. "May 20, 2024 (Mon)")

### REQ-10.2 — KPI cards (top row)

Four summary cards, left to right:

| Card          | Value                                       | Link               |
| ------------- | ------------------------------------------- | ------------------ |
| Students      | Total students across all teacher's classes | → Students page    |
| Classes       | Number of active classes assigned           | → My Classes page  |
| Pending Tasks | Count of tasks due today or overdue         | → inline task list |
| Events Today  | Count of school events on today's calendar  | → Schedule page    |

- Values are live-fetched on page load; no stale cache
- Each card has a "View all / View classes / View tasks / View schedule" link

### REQ-10.3 — Today's schedule

- Left panel: "Today's Schedule" with a "View full schedule" link to Schedule page
- Lists each class session today with: time (colour-coded purple), subject name (bold), room badge (purple/green pill depending on room type)
- Clicking a session row navigates to the class detail (REQ-2.1)
- If no sessions today: empty state "No classes scheduled for today."

### REQ-10.4 — Pending tasks

- Right panel: "Pending Tasks" with a "View all tasks" link
- Numbered list (1–N) of tasks due today or overdue, each with:
  - Task description (e.g. "Take attendance for Grade 6 – Section A")
  - Due label ("Due today" / "Due tomorrow" / "Due in N days" / "Overdue" in red)
- Clicking a task navigates to the relevant page (e.g. attendance task → Attendance page for that class)
- Tasks are automatically generated by the system from pending actions:
  - Unmarked attendance for a class session that has passed the window open time
  - Assessments with no marks entered past due date
  - Lesson plans not submitted for the current week
  - Unread parent messages older than 24 hours
  - Report cards awaiting teacher comments before publish date
- Maximum 10 tasks shown on dashboard; "View all tasks" shows the full list

### REQ-10.5 — Recent announcements

- Bottom-left panel: "Recent Announcements" with a "View all" link to Announcements page
- Shows the 3 most recent announcements visible to the teacher role
- Each row: announcement title, sender, date

### REQ-10.6 — Quick links

- Bottom-right panel: "Quick Links" — configurable shortcuts to frequently used actions
- Default links: Mark attendance, New lesson plan, New assignment, Message a parent
- Teacher can customise these in Settings (REQ-9)

---

## Access control summary (enforced at API — not UI only)

| Page / Action           | Allowed                  | Blocked                                        |
| ----------------------- | ------------------------ | ---------------------------------------------- |
| View student list       | Own classes only         | Students in other classes                      |
| View student profile    | Own classes only         | Students in other classes                      |
| Mark attendance         | Own class, within window | Other classes, outside window, after 24hr lock |
| Enter marks             | Own subject only         | Other teachers' subjects                       |
| Add notes               | Own students             | Students in other classes                      |
| Attach documents        | Own students             | Identity/medical/financial docs                |
| Send message            | Parents of own students  | Parents of other classes, bulk send            |
| View reports            | Own class data           | School-wide, financial, cross-class            |
| Edit schedule           | Never                    | Always — read-only                             |
| Approve leave           | Never                    | Always — Admin only                            |
| Delete notes/docs       | Never                    | Always — Admin only                            |
| View full health record | Never                    | Always — allergy flags only                    |

---

## API endpoints used by this portal

```
GET    /students                          (scoped to teacher's class_ids)
GET    /students/{id}                     (own class only — 404 if out of scope)
POST   /attendance/mark                   (single mark)
POST   /attendance/mark-bulk              (class bulk mark)
GET    /classes/{id}/attendance/{date}
GET    /students/{id}/attendance-summary
POST   /leave-requests
GET    /classes/{id}/plan/{week}
POST   /lesson-plans
PATCH  /lesson-plans/{id}
POST   /assignments
PATCH  /assignments/{id}
GET    /assignments/{id}/submissions
POST   /exams/{id}/marks
GET    /students/{id}/academic-record/{term}
POST   /messages
GET    /messages/{id}/delivery-status
GET    /analytics/kpis/teacher            (own class scope enforced server-side)
GET    /reports/{id}                      (own class scope enforced server-side)
GET    /calendar/current                  (read-only)
GET    /notification-rules               (read-only)
```

---

## Business rules enforced in this portal (from `docs/rule_registry.md`)

| Rule     | Description                                                | Where it surfaces in teacher portal                                |
| -------- | ---------------------------------------------------------- | ------------------------------------------------------------------ |
| BR-03-01 | Attendance only markable within configured window          | Mark button hidden / greyed outside window                         |
| BR-03-02 | Attendance locked after 24 hours                           | Mark button replaced with locked notice                            |
| BR-03-03 | Absent without approved leave triggers parent notification | Notification fires automatically on save                           |
| BR-04-01 | Lesson plan must map to at least one curriculum topic      | Curriculum link field required; form cannot submit without it      |
| BR-04-02 | Assignment due date cannot fall on a holiday               | Date picker disables holiday dates sourced from AcademicCalendar   |
| BR-04-04 | Marks cannot publish without Principal/VP sign-off         | "Submit marks" sends to moderation — teacher cannot self-publish   |
| BR-06-02 | All messages logged immutably                              | Delete button never shown; 12-month message history always visible |

---

## Definition of done for each requirement

- [ ] REQ-1: Students page loads scoped to teacher's classes; search and class filter work; "View profile" navigates correctly
- [ ] REQ-1.a: Student profile page loads with all 7 tabs; each tab shows correct data scoped to this teacher's access
- [ ] REQ-1.a.3: Attendance tab — mark button respects window and lock rules; leave request submit works
- [ ] REQ-1.a.4: Assignments tab — feedback and marks entry work; overdue banner shows correctly
- [ ] REQ-1.a.5: Marks tab — entry, grade computation, locked state all work correctly
- [ ] REQ-1.a.6: Notes tab — add, edit within 24hrs, read-only after; parent notification prompt works
- [ ] REQ-1.a.7: Documents tab — upload works; identity/medical docs not downloadable by teacher
- [ ] REQ-1.a.8: Notifications tab — message history visible; compose opens correct parent recipient
- [ ] REQ-2: My Classes page and class detail tabs all functional
- [ ] REQ-3: Attendance page — daily quick-mark, history, leave requests all functional
- [ ] REQ-4: Assessments page — list, marks grid, grade summary chart all functional
- [ ] REQ-5: Schedule page — weekly view, calendar events, session detail popup functional
- [ ] REQ-6: Messages — inbox, compose, thread view, class broadcast all functional
- [ ] REQ-7: Announcements — list, acknowledgement action functional
- [ ] REQ-8: Reports — 4 report types, date range, CSV and PDF export functional
- [ ] REQ-9: Settings — profile, notification prefs, availability hours, templates all functional
- [ ] REQ-10: Dashboard — all 6 sections load with live data; task links navigate to correct pages
- [ ] Access control: all 12 blocked actions confirmed blocked at API level (not UI only)
- [ ] All business rules surface correctly in the UI at the right moment
