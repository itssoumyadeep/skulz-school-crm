# Student Data Access Control — Implementation Guide

> **Task:** Implement student data visibility and access control across all 9 portals.
> **Portals live at:** `localhost:3000` (Next.js 15 App Router)
> **Backend:** Django Ninja API at `/api/v1/`
> **Reference:** `validation_architecture_policy.md` for architecture rules, validation classes, and naming conventions.

---

## What you are building

Every portal must show students **only within the scope defined below**.
Scope is enforced at **two places simultaneously** — API query and frontend route guard.
Never enforce scope only on the frontend.

---

## Scope definitions

| Portal         | Route                 | Scope          | Students visible                              |
| -------------- | --------------------- | -------------- | --------------------------------------------- |
| Owner          | `/governance/owner`   | Network        | All students across all schools               |
| Board Member   | `/governance/board`   | Aggregate only | No individual students — counts and KPIs only |
| Trustee        | `/governance/trustee` | Aggregate only | No individual students — counts and KPIs only |
| Principal      | `/principal`          | School         | All students in their school                  |
| Vice Principal | `/principal`          | School         | All students in their school                  |
| Administrator  | `/admin`              | School         | All students in their school                  |
| Teacher        | `/teacher`            | Class          | Only students in their assigned classes       |
| Care Giver     | `/caregiver`          | Care group     | Only students in their assigned care group    |
| Parent         | `/parent`             | Own child      | Only their own enrolled child(ren)            |
| Vendor         | `/vendor`             | None           | Zero student data — no access at all          |

---

## Field visibility per role

### Fields every authorised role can see

```
student_number, name, grade, section, status, enrolled_date, class_teacher
```

### Additional fields by role

**Owner**

```
+ attendance_pct, fee_account_summary, health_flags, parent_contact (read-only)
```

**Principal / Vice Principal**

```
+ dob, parent_contact, emergency_contact, attendance_pct
+ academic_summary, health_flags, incident_history, schedule
Principal only: + fee_status, invoice_history
```

**Administrator**

```
+ all fields including dob, parent_contact, emergency_contact
+ fee_account, invoice_history, payment_data, health_records, medication_log
```

**Teacher**

```
+ attendance_status (own class only)
+ marks for own subject only — never other subjects
+ assignment_submissions (own class only)
+ emergency_contact (read-only, own class students only)
BLOCKED: dob, full parent contact, health_conditions, medications, fee_data
```

**Care Giver**

```
+ dob (required for care), allergies, medications, emergency_contact
+ health_observations, nap_schedule, dietary_restrictions
BLOCKED: academic_marks, report_card, fee_data, attendance_pct
```

**Parent**

```
+ own child's attendance_summary, assignments, report_card
+ health_profile (only what they submitted), fee_account, invoices, receipts
BLOCKED: all other students, staff records, school financials
```

**Board Member / Trustee**

```
VISIBLE: enrollment_count_by_grade, retention_rate, attendance_compliance_pct
         collection_rate, scholarship_utilisation (Trustee only)
BLOCKED: name, dob, student_number, parent_contact, health_data, individual marks
```

**Vendor**

```
BLOCKED: everything — no student data endpoint is callable from vendor JWT
```

---

## Backend — API changes

### 1. Add scope filter to the student list endpoint

File: `backend/core/api/v1/enrollments.py`

The existing `GET /api/v1/students` endpoint must apply a scope filter based on the
authenticated user's role before returning any records. Add this filter function:

```python
def get_student_queryset(request):
    """
    Returns a queryset of students scoped to the authenticated user's role.
    Always scoped to tenant_id. Never returns deleted records.
    """
    role      = request.user.role
    tenant_id = request.tenant_id
    base_qs   = Student.objects.filter(tenant_id=tenant_id, is_deleted=False)

    if role in ('Owner',):
        # All students across all schools in the network
        return base_qs

    if role in ('Principal', 'Vice_Principal', 'Administrator'):
        # All students in the user's school
        return base_qs.filter(school_id=request.user.school_id)

    if role == 'Teacher':
        # Only students in the teacher's assigned classes
        class_ids = Schedule.objects.filter(
            staff_id=request.user.staff_id,
            is_deleted=False,
        ).values_list('class_id', flat=True)
        return base_qs.filter(class_id__in=class_ids)

    if role == 'Care_Giver':
        # Only students in the caregiver's assigned care group
        return base_qs.filter(care_group_id=request.user.care_group_id)

    if role == 'Parent':
        # Only the parent's own enrolled child(ren)
        student_ids = Parent.objects.filter(
            user_id=request.user.id,
            is_deleted=False,
        ).values_list('student_id', flat=True)
        return base_qs.filter(id__in=student_ids)

    if role in ('Board_Member', 'Trustee'):
        # No individual student records — return empty, use aggregate endpoints
        return base_qs.none()

    if role == 'Vendor':
        # No student data ever
        return base_qs.none()

    return base_qs.none()
```

Update the list endpoint and the single student endpoint to use this function:

```python
@router.get('/students')
@require_roles('Owner','Principal','Vice_Principal','Administrator',
               'Teacher','Care_Giver','Parent')
def list_students(request, grade: str = None, section: str = None):
    qs = get_student_queryset(request)
    if grade:
        qs = qs.filter(grade=grade)
    if section:
        qs = qs.filter(section=section)
    students = [StudentProfile_BO(s, request.user.role).to_dict() for s in qs]
    return 200, success_response(students, request.meta)


@router.get('/students/{student_id}')
@require_roles('Owner','Principal','Vice_Principal','Administrator',
               'Teacher','Care_Giver','Parent')
def get_student(request, student_id: str):
    qs = get_student_queryset(request)
    student = get_object_or_404(qs, id=student_id)   # 404 if out of scope
    bo = StudentProfileBO(student=student, actor_role=request.user.role)
    return 200, success_response(bo.to_dict(), request.meta)
```

### 2. Add field filtering in StudentProfileBO

File: `backend/core/business_objects/enrollment.py`

The BO's `to_dict()` method must strip fields the role cannot see.
Add a `FIELD_POLICY` dict at the top of the file:

```python
FIELD_POLICY = {
    'Owner': {
        'allowed': ['student_number','name','dob','grade','section','status',
                    'enrolled_date','parent_contact','class_teacher',
                    'attendance_pct','fee_account_summary','health_flags'],
        'read_only': True,
    },
    'Principal': {
        'allowed': ['student_number','name','dob','grade','section','status',
                    'enrolled_date','parent_contact','emergency_contact',
                    'attendance_pct','academic_summary','health_flags',
                    'fee_status','incident_history','schedule'],
        'read_only': False,
    },
    'Vice_Principal': {
        'allowed': ['student_number','name','dob','grade','section','status',
                    'enrolled_date','parent_contact','emergency_contact',
                    'attendance_pct','academic_summary','health_flags',
                    'incident_history','schedule'],
        'read_only': False,
    },
    'Administrator': {
        'allowed': '__all__',   # all fields
        'read_only': False,
    },
    'Teacher': {
        'allowed': ['student_number','name','grade','section','status',
                    'attendance_status','marks_own_subject',
                    'assignment_submissions','emergency_contact'],
        'read_only': True,
    },
    'Care_Giver': {
        'allowed': ['student_number','name','dob','grade','section',
                    'allergies','medications','emergency_contact',
                    'health_observations','nap_schedule','dietary_restrictions'],
        'read_only': True,
    },
    'Parent': {
        'allowed': ['name','grade','section','status','attendance_summary',
                    'assignments','report_card','health_profile',
                    'fee_account','invoices','receipts'],
        'read_only': True,
    },
}

class StudentProfileBO(BaseBusinessObject):

    def __init__(self, student, actor_role: str):
        self.student    = student
        self.actor_role = actor_role
        self._policy    = FIELD_POLICY.get(actor_role, {'allowed': [], 'read_only': True})

    def to_dict(self) -> dict:
        full = self._build_full_dict()
        if self._policy['allowed'] == '__all__':
            return full
        return {k: v for k, v in full.items() if k in self._policy['allowed']}

    def _build_full_dict(self) -> dict:
        return {
            'student_number':      self.student.student_number,
            'name':                self.student.name,
            'dob':                 str(self.student.dob),
            'grade':               self.student.grade,
            'section':             self.student.section,
            'status':              self.student.status,
            'enrolled_date':       str(self.student.enrolled_date),
            'parent_contact':      self._get_parent_contact(),
            'emergency_contact':   self._get_emergency_contact(),
            'attendance_pct':      self._get_attendance_pct(),
            'academic_summary':    self._get_academic_summary(),
            'health_flags':        self._get_health_flags(),
            'fee_status':          self._get_fee_status(),
            # ... add remaining fields
        }
```

### 3. Aggregate endpoint for Board Member and Trustee

Add a separate endpoint that returns only counts — no individual records.

```python
@router.get('/students/aggregate')
@require_roles('Owner','Board_Member','Trustee','Principal','Administrator')
def get_student_aggregate(request):
    """
    Returns enrollment counts and KPIs only.
    No individual student names, DOBs, or contact details are returned.
    Used by Board Member and Trustee portals exclusively.
    """
    school_id = request.user.school_id if request.user.role != 'Owner' else None
    qs = Student.objects.filter(tenant_id=request.tenant_id, is_deleted=False)
    if school_id:
        qs = qs.filter(school_id=school_id)

    data = {
        'total_enrolled':         qs.filter(status='Active').count(),
        'by_grade':               list(qs.values('grade').annotate(count=Count('id'))),
        'enrollment_trend_pct':   compute_enrollment_trend(qs),
        'retention_rate_pct':     compute_retention_rate(qs),
    }
    return 200, success_response(data, request.meta)
```

### 4. Block vendor JWT from all student endpoints

In `require_roles`, the Vendor role is never listed. But add an explicit guard in
`TenantMiddleware` as a belt-and-suspenders check:

```python
STUDENT_PATHS = ['/api/v1/students', '/api/v1/enrollments']

class TenantMiddleware:
    def __call__(self, request):
        ...
        if request.user.role == 'Vendor':
            for path in STUDENT_PATHS:
                if request.path.startswith(path):
                    return JsonResponse(
                        {'data': None, 'meta': {}, 'errors': [
                            {'code': 'RBAC_DENIED',
                             'message': 'Vendor role has no access to student data.'}
                        ]}, status=403
                    )
        ...
```

---

## Frontend — Portal changes

### 5. API client helper — scoped student fetch

File: `frontend/lib/students.ts`

Create a single helper that all portals use. Never write `fetch('/api/v1/students')`
directly in a page component.

```typescript
import { apiClient } from "./api";

export type StudentScope = "list" | "aggregate";

export async function fetchStudents(params?: {
  grade?: string;
  section?: string;
}) {
  const query = new URLSearchParams(
    params as Record<string, string>,
  ).toString();
  return apiClient.get(`/students${query ? "?" + query : ""}`);
}

export async function fetchStudentAggregate() {
  return apiClient.get("/students/aggregate");
}

export async function fetchStudent(studentId: string) {
  return apiClient.get(`/students/${studentId}`);
}
```

### 6. Route guards — one per portal

Add a `middleware.ts` at `frontend/middleware.ts`. This runs on every request and
redirects if the JWT role does not match the portal route.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getTokenClaims } from "./lib/auth";

const ROLE_ROUTES: Record<string, string[]> = {
  Owner: ["/governance/owner"],
  Board_Member: ["/governance/board"],
  Trustee: ["/governance/trustee"],
  Principal: ["/principal"],
  Vice_Principal: ["/principal"],
  Administrator: ["/admin"],
  Teacher: ["/teacher"],
  Care_Giver: ["/caregiver"],
  Parent: ["/parent"],
  Vendor: ["/vendor"],
};

export function middleware(request: NextRequest) {
  const claims = getTokenClaims(request);
  const path = request.nextUrl.pathname;
  const allowed = ROLE_ROUTES[claims?.role ?? ""] ?? [];

  const isAllowed = allowed.some((r) => path.startsWith(r));
  if (!isAllowed) {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/governance/:path*",
    "/principal/:path*",
    "/admin/:path*",
    "/teacher/:path*",
    "/caregiver/:path*",
    "/parent/:path*",
    "/vendor/:path*",
  ],
};
```

### 7. Student list page — per portal

Each portal has its own student list page. They all call `fetchStudents()` — the
backend scope filter handles what comes back. The pages differ only in which columns
they render.

**Admin portal** — `frontend/app/(admin)/students/page.tsx`

```typescript
// Shows all fields including financial and health flags
const COLUMNS = [
  "student_number",
  "name",
  "grade",
  "section",
  "status",
  "enrolled_date",
  "parent_contact",
  "fee_status",
  "health_flags",
];
```

**Principal portal** — `frontend/app/(principal)/students/page.tsx`

```typescript
// Shows all fields except financial detail
const COLUMNS = [
  "student_number",
  "name",
  "grade",
  "section",
  "status",
  "attendance_pct",
  "academic_summary",
  "health_flags",
];
```

**Teacher portal** — `frontend/app/(teacher)/students/page.tsx`

```typescript
// Only class roster — no search bar, no grade filter
// Pre-filtered by backend to own classes only
const COLUMNS = [
  "student_number",
  "name",
  "section",
  "attendance_status",
  "assignment_submissions",
];
// No search input rendered — teacher cannot search outside their class
```

**Care Giver portal** — `frontend/app/(caregiver)/students/page.tsx`

```typescript
// Care group roster — health and care fields only
const COLUMNS = [
  "name",
  "allergies",
  "medications",
  "dietary_restrictions",
  "nap_schedule",
];
```

**Parent portal** — `frontend/app/(parent)/student/page.tsx`

```typescript
// Single child view — no list, no search
// fetchStudent(childId) where childId comes from JWT claims
const SECTIONS = [
  "attendance_summary",
  "assignments",
  "report_card",
  "fee_account",
];
```

**Board / Trustee portal** — `frontend/app/(governance)/students/page.tsx`

```typescript
// Aggregate view only — no table of individual students
// Calls fetchStudentAggregate() not fetchStudents()
// Renders metric cards and charts only — no student name/DOB ever shown
```

**Owner portal** — `frontend/app/(governance)/owner/students/page.tsx`

```typescript
// Full network view — school selector dropdown first
// Then student list for selected school
const COLUMNS = [
  "student_number",
  "name",
  "grade",
  "section",
  "status",
  "attendance_pct",
  "fee_account_summary",
  "health_flags",
];
// Read-only — no edit buttons rendered
```

### 8. Hide edit controls by role

Do not conditionally render edit buttons in shared components.
Instead, the backend returns `meta.permissions` in every response:

```json
{
  "data": { ... },
  "meta": {
    "tenant_id": "...",
    "role": "Teacher",
    "permissions": {
      "can_edit": false,
      "can_export": false,
      "can_create": false
    }
  },
  "errors": null
}
```

In the frontend, read `meta.permissions` to show or hide controls:

```typescript
const { data, meta } = await fetchStudents()

// Show edit button only if backend says role can edit
{meta.permissions.can_edit && <EditButton />}
{meta.permissions.can_export && <ExportButton />}
{meta.permissions.can_create && <AddStudentButton />}
```

Never hardcode `role === 'Admin'` checks in the UI — the backend is the authority.

---

## Tests to write

### Backend

```
tests/enrollment/test_student_scope.py

test_owner_sees_all_schools_students()
test_principal_sees_own_school_only()
test_teacher_sees_own_class_only()
test_teacher_cannot_see_other_class_students()
test_caregiver_sees_own_care_group_only()
test_parent_sees_own_child_only()
test_parent_cannot_see_other_students()
test_board_member_gets_empty_student_list()
test_trustee_gets_empty_student_list()
test_vendor_gets_403_on_student_endpoints()
test_field_policy_strips_financial_fields_for_vice_principal()
test_field_policy_strips_health_fields_for_teacher()
test_field_policy_strips_all_pii_for_board_member()
test_aggregate_endpoint_returns_counts_not_names()
```

### Frontend

```
tests/middleware.test.ts

test_owner_jwt_can_access_governance_owner_route()
test_teacher_jwt_redirected_from_admin_route()
test_parent_jwt_redirected_from_principal_route()
test_vendor_jwt_redirected_from_all_student_routes()
test_board_member_portal_renders_aggregate_not_student_table()
test_teacher_portal_has_no_search_bar()
test_parent_portal_shows_single_child_not_list()
test_edit_button_hidden_when_permissions_can_edit_false()
```

---

## Definition of done

- [ ] `GET /api/v1/students` returns only in-scope students for every role
- [ ] `GET /api/v1/students/{id}` returns 404 (not 403) if student is out of scope
- [ ] Field policy strips blocked fields before response leaves the BO layer
- [ ] Board Member and Trustee receive aggregate data only — no individual student records
- [ ] Vendor JWT receives 403 on any student-related endpoint
- [ ] Frontend middleware redirects mismatched roles before page renders
- [ ] No edit/export/create controls visible when `meta.permissions` says false
- [ ] Teacher portal has no student search bar
- [ ] Parent portal shows one child view, not a list
- [ ] All 14 backend scope tests pass
- [ ] All 8 frontend middleware tests pass
