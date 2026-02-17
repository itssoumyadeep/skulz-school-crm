# Multi-Tenancy Implementation Guide

## Overview

The Skulz School CRM has been upgraded to support multi-tenancy (SaaS model). This allows multiple schools to use the application with complete data isolation - no data sharing between schools.

## Key Features

✅ **Complete Data Isolation** - Each school's data is completely separate
✅ **School Selection at Login** - Users select their school before logging in
✅ **Role-Based Access** - Admins are tied to specific schools
✅ **Subscription Management** - Track subscription plans (Free, Basic, Pro, Enterprise)
✅ **User-School Mapping** - Users can have access to multiple schools
✅ **Seamless School Switching** - Users can switch between schools they have access to

## Architecture

### New Models

#### 1. **School Model**

```python
- name: School name (unique)
- code: School code for identification
- email: School contact email
- phone_number: Contact phone
- website: School website URL
- address fields: Complete school address
- principal_name: Principal name
- admin_email: Admin contact email
- is_active: Enable/disable school
```

#### 2. **Subscription Model**

```python
- school: Foreign Key to School (one-to-one)
- plan: CHOICES = ['free', 'basic', 'pro', 'enterprise']
- status: CHOICES = ['active', 'inactive', 'suspended', 'cancelled']
- max_students: Number of students allowed (0 = unlimited)
- max_users: Number of users allowed
- start_date, end_date, renewal_date: Subscription dates
```

#### 3. **UserSchool Model**

```python
- user: Foreign Key to User
- school: Foreign Key to School
- is_primary: User's default school
- is_active: Active/inactive status
- Unique together: (user, school)
```

### Modified Models

All core models now have a `school` ForeignKey field (nullable):

- **Grade** - Grades are school-specific
- **Subject** - Subjects are school-specific
- **Route** - Bus routes are school-specific
- **Bus** - Buses are school-specific
- **Parent** - Parents belong to a school (unique_together: school, email)
- **Student** - Students belong to a school (unique_together: school, email)
- **Attendance** - Attendance is school-specific (unique_together: school, student, date)
- **StudentOnboardingRequest** - Onboarding is school-specific
- **Record** - Records are school-specific
- **UserRole** - User roles are now school-specific

## Authentication Flow

```
1. User navigates to /login/
2. Login page displays dropdown with available schools
3. User selects school + enters credentials
4. CustomLoginView validates:
   - Username/password are correct
   - User has access to selected school via UserSchool
5. On successful login:
   - User logged in
   - school_id stored in session
   - Redirected to portal_redirect()
6. Middleware ensures school context on all requests
```

## Middleware: SchoolContextMiddleware

**Location:** `skucore/middleware.py`

### Functions:

1. Ensures school_id is in session on all requests
2. Sets `request.school` object for easy access
3. Redirects to school selection if needed
4. Handles school not found scenarios

### Exempt URLs (don't require school):

- /login/
- /logout/
- /admin/
- /static/
- /media/
- /api/

## Views

### CustomLoginView

**File:** `skucore/portal_views.py`

- Custom Django LoginView with school selection
- Validates user has access to selected school
- Sets session['school_id'] and session['school_name']
- Redirects to portal_redirect on success

### school_selection_view

**File:** `skucore/portal_views.py`

- Allows authenticated users to switch schools
- Shows only schools they have access to
- Updates session with new school context
- Redirects to portal_redirect

## Templates

### login.html

**Location:** `skucore/templates/core/login.html`

- Displays list of active schools in dropdown
- Styled with gradient background matching app theme
- Shows school code alongside school name
- Displays error messages

### school_selection.html

**Location:** `skucore/templates/core/school_selection.html`

- Shows all schools user has access to
- Marks primary school
- Allows switching to different school
- Part of authenticated portal

## Setup & Configuration

### Step 1: Initial Setup (Already Done)

Run the setup script to create default school:

```bash
python setup_multi_tenancy.py
```

This:

- Creates "Default School" with code "DEFAULT"
- Creates Pro subscription for default school
- Links all superusers to default school

### Step 2: Create Schools

**Option A: Django Admin**

1. Go to `/admin/`
2. Navigate to "Schools"
3. Click "Add School"
4. Fill in details:
   - Name (unique)
   - Code (unique, e.g., "SCHOOL001")
   - Email
   - Phone
   - Address details
5. Save

**Option B: Python Shell**

```bash
python manage.py shell
```

```python
from skucore.models import School, Subscription

school = School.objects.create(
    name="Your School Name",
    code="SCHOOL001",
    email="admin@school.edu",
    phone_number="+1-555-1234",
    street_address="123 School St",
    city="Toronto",
    state="Ontario",
    postal_code="M1A 1A1",
    country="Canada",
    principal_name="Principal Name",
    admin_email="principal@school.edu",
    is_active=True
)

# Create subscription
Subscription.objects.create(
    school=school,
    plan='pro',  # free, basic, pro, enterprise
    status='active',
    max_students=500,
    max_users=25
)
```

### Step 3: Add Users to Schools

**Option A: Django Admin**

1. Go to `/admin/`
2. Navigate to "User Schools"
3. Click "Add User School"
4. Select User and School
5. Optionally mark as Primary
6. Save

**Option B: Python Shell**

```bash
python manage.py shell
```

```python
from django.contrib.auth.models import User
from skucore.models import UserSchool, School

user = User.objects.get(username='soumyadeep')
school = School.objects.get(code='SCHOOL001')

user_school = UserSchool.objects.create(
    user=user,
    school=school,
    is_primary=True,
    is_active=True
)
```

### Step 4: Assign Roles

User roles must also be assigned per school:

```bash
python manage.py shell
```

```python
from skucore.models import UserRole
from django.contrib.auth.models import User

user = User.objects.get(username='soumyadeep')
school = School.objects.get(code='SCHOOL001')

role = UserRole.objects.create(
    user=user,
    school=school,
    role='admin',  # teacher, operator, readonly, admin, principal, vice_principal
    is_active=True
)
```

## Usage

### For End Users

**Login:**

1. Go to http://localhost:8000/login/
2. Select school from dropdown
3. Enter username and password
4. Click Login

**Switch Schools:**

1. Click "Switch School" link (if available)
2. Select different school
3. Click "Switch School" button

### For Developers

**Access Current School in Views:**

```python
@login_required
def my_view(request):
    school = request.school
    # Use school to filter data
    students = Student.objects.filter(school=school)
    return render(request, 'template.html', {'students': students})
```

**Get School from Session:**

```python
school_id = request.session.get('school_id')
school_name = request.session.get('school_name')
```

**Query Students for Current School:**

```python
students = Student.objects.filter(school=request.school)
```

## Data Migration

Existing data (created before multi-tenancy) is associated with the "Default School":

1. All existing students/parents/grades/etc. have `school=None` initially
2. Run setup script to create Default School
3. Manually assign existing records to schools:

```bash
python manage.py shell
```

```python
from skucore.models import Student, School

default_school = School.objects.get(code='DEFAULT')

# Bulk update all students to default school
Student.objects.filter(school__isnull=True).update(school=default_school)
```

## Important Considerations

### Unique Fields Changed

Some fields that were globally unique are now school-unique:

- ❌ `Parent.email` (was globally unique)
- ✅ `Parent.email` + `Parent.school` (now school-unique)

- ❌ `Student.email` (was globally unique)
- ✅ `Student.email` + `Student.school` (now school-unique)

### Permission Checks

All permission checks now include school context:

```python
# Before
if user_role.role == 'admin':
    # Allow

# After - Must also check school
if user_role.role == 'admin' and user_role.school == request.school:
    # Allow
```

### Filtering Best Practices

```python
# ✅ CORRECT - Filter by school
students = Student.objects.filter(school=request.school)

# ❌ WRONG - No school filter
students = Student.objects.all()

# ✅ CORRECT - With related school
students = Student.objects.filter(
    school=request.school
).select_related('school')
```

## Security

### Data Isolation

- Middleware ensures `request.school` is always set for authenticated requests
- All views should filter querysets by `request.school`
- Session stores school_id, preventing cross-school access
- UserSchool model enforces user-school relationships

### Best Practices

1. ✅ Always filter by `request.school`
2. ✅ Check `UserSchool` before operations
3. ✅ Use select_related('school') for performance
4. ✅ Validate school access in permissions decorators
5. ❌ Never allow accessing data from other schools
6. ❌ Never expose school_id in URLs without validation

## Troubleshooting

### User Can't Login

1. Check `UserSchool` record exists
2. Verify `UserSchool.is_active = True`
3. Check `School.is_active = True`
4. Verify `Subscription.status = 'active'`

### Permission Errors

1. Check `UserRole` exists for school
2. Verify role matches required permission
3. Check all middleware is installed

### Data Not Showing

1. Verify filtering by `request.school`
2. Confirm records have `school` FK set
3. Check session has valid `school_id`

## Future Enhancements

1. **Billing Integration** - Stripe/PayPal integration for subscriptions
2. **Usage Analytics** - Track student count, active users per school
3. **Custom Branding** - Allow schools to customize theme/logo
4. **Advanced Permissions** - Department-level access control
5. **Data Export** - GDPR-compliant data export per school
6. **API Keys** - Per-school API access for integrations
7. **Audit Logging** - Track changes per school
8. **Backup/Restore** - School-specific backups

## Support

For issues or questions about multi-tenancy:

1. Check this documentation
2. Review troubleshooting section
3. Check Django logs for errors
4. Review middleware.py for school context flow
