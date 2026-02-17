# Role-Based Access Management & Student Onboarding System

## 🎯 Overview

Your Skulz School CRM now features a comprehensive **Role-Based Access Control (RBAC)** system with **6 different portals** and a **multi-level student onboarding approval workflow**.

---

## 👥 User Roles & Permissions

### 1. **Teacher** 👨‍🏫

- **Access Level:** Medium
- **Capabilities:**
  - View active students
  - Record and view attendance
  - Initiate student onboarding requests
  - View their own onboarding requests
- **Portal:** `/portal/teacher/`

### 2. **Operator** ⚙️

- **Access Level:** High
- **Capabilities:**
  - Full student management (create, read, update, delete)
  - Full parent management
  - View all onboarding requests
  - Initiate student onboarding requests
  - Track system-wide requests
- **Portal:** `/portal/operator/`

### 3. **Read-Only User** 👁️

- **Access Level:** Low
- **Capabilities:**
  - View student records
  - View parent information
  - View attendance records
  - **Cannot** make any modifications
- **Portal:** `/portal/readonly/`

### 4. **Administrator** 🔐

- **Access Level:** Full
- **Capabilities:**
  - Full system access
  - Manage all entities
  - Access Django admin panel
  - View all onboarding requests
  - System configuration
- **Portal:** `/portal/admin/`

### 5. **Principal** 👨‍💼

- **Access Level:** High
- **Capabilities:**
  - **Approve/Reject student onboarding requests**
  - View all student records
  - View system statistics
  - Access approval dashboard
  - Full reporting
- **Portal:** `/portal/principal/`
- **Special Authority:** Can approve onboarding

### 6. **Vice Principal** 👨‍💼

- **Access Level:** High
- **Capabilities:**
  - **Approve/Reject student onboarding requests**
  - View all student records
  - View system statistics
  - Access approval dashboard
  - Full reporting
- **Portal:** `/portal/vice-principal/`
- **Special Authority:** Can approve onboarding

---

## 📋 Student Onboarding Workflow

### Process Flow

```
1. INITIATION
   ↓
   (Teacher or Operator submits onboarding request)
   ↓
2. PENDING APPROVAL
   ↓
   (Request waits for Principal or Vice Principal to review)
   ↓
3. DECISION POINT
   ├─→ APPROVED: Student record created automatically
   ├─→ REJECTED: Requestor notified, must resubmit
   ↓
4. COMPLETED/REJECTED
```

### Step-by-Step Process

#### **For Requesters (Teacher/Operator):**

1. Go to `/portal/` or your portal directly
2. Click **"+ Request Student Onboarding"**
3. Fill in student details:
   - Personal information (name, email, DOB)
   - Grade/Class assignment
   - Contact information
   - Parent assignments
   - Subject enrollment
   - Bus assignment (optional)
4. Submit for approval
5. Status: **Pending Approval** ⏳

#### **For Approvers (Principal/Vice Principal):**

1. Go to `/portal/principal/` or `/portal/vice-principal/`
2. View **"Pending Onboarding Requests"** section
3. Click **"Review"** to open approval form
4. Review student details completely
5. **Make Decision:**
   - **Approve:** Student record created immediately in system
   - **Reject:** Provide rejection reason, requestor gets notification
6. Status updated: **Completed** ✅ or **Rejected** ❌

---

## 🔑 How to Set Up User Roles

### Via Django Admin

1. Go to `http://localhost:8000/admin/`
2. Click **"User Roles"**
3. Click **"Add User Role"**
4. Select existing Django User
5. Choose Role from dropdown
6. Save

### Example: Create a Principal

```
User: john.doe (must be created first in Django Users)
Role: Principal
Department: Administration
Is Active: ✓ Checked
```

---

## 🌐 Portal URLs

```
Home/Dashboard          http://localhost:8000/
Auto-redirect          http://localhost:8000/portal/

Teacher Portal         http://localhost:8000/portal/teacher/
Operator Portal        http://localhost:8000/portal/operator/
Read-Only Portal       http://localhost:8000/portal/readonly/
Admin Portal           http://localhost:8000/portal/admin/
Principal Portal       http://localhost:8000/portal/principal/
Vice Principal Portal  http://localhost:8000/portal/vice-principal/

Onboarding Requests    http://localhost:8000/onboarding/
Create Request         http://localhost:8000/onboarding/create/
Pending Approvals      http://localhost:8000/onboarding/pending-approvals/
```

---

## 🔐 Permission Controls

### Database Models

#### **UserRole Model**

- Links Django User to CRM Role
- Stores department information
- Activation status tracking

#### **StudentOnboardingRequest Model**

- Captures all student information before approval
- Tracks request status (pending → approved/rejected → completed)
- Links to approver and created student
- Stores rejection reasons

---

## 📊 Onboarding Request Statuses

| Status           | Meaning                      | Can Edit? | Next Action             |
| ---------------- | ---------------------------- | --------- | ----------------------- |
| **pending** ⏳   | Awaiting approval            | No        | Principal/VP reviews    |
| **approved** 👀  | Approved, ready to create    | No        | Auto-created as student |
| **completed** ✅ | Student created successfully | No        | View student record     |
| **rejected** ❌  | Rejected by approver         | No        | Requestor must resubmit |

---

## 🛡️ Security Features

1. **Role-Based Access Control:** Users can only access their assigned portal
2. **Approval Workflow:** Students cannot be created without approval
3. **Audit Trail:** All approvals are timestamped and attributed
4. **Permission Decorators:** Backend enforces role checks on all views
5. **Read-Only Access:** Some users cannot modify any data

---

## 💻 Technical Architecture

### Permission System (skucore/permissions.py)

**Helper Functions:**

- `get_user_role(user)` - Get user's role
- `can_initiate_onboarding(user)` - Check if can request (Teacher/Operator)
- `can_approve_onboarding(user)` - Check if can approve (Principal/VP/Admin)
- `can_edit_students(user)` - Check if can edit students
- `can_delete_students(user)` - Check if can delete students

**Decorators:**

```python
@principal_required
def principal_only_view(request):
    pass

@role_required('teacher', 'operator')
def teacher_or_operator_view(request):
    pass

@can_approve_onboarding_required
def approval_required_view(request):
    pass
```

### Portal Views (skucore/portal_views.py)

**Portal Views:**

- `teacher_portal()` - Teacher dashboard
- `operator_portal()` - Operator dashboard
- `readonly_portal()` - Read-only dashboard
- `admin_portal()` - Admin dashboard
- `principal_portal()` - Principal dashboard with pending approvals
- `vice_principal_portal()` - Vice Principal dashboard

**Onboarding Views:**

- `onboarding_request_list()` - View all requests
- `onboarding_request_create()` - Submit new request
- `onboarding_request_detail()` - View request details
- `onboarding_request_approve()` - Approve/reject request
- `onboarding_pending_approvals()` - Approval dashboard

---

## 📝 Database Relationships

```
User (Django)
  ├─ OneToOne → UserRole (our model)
  │              └─ role = ('teacher', 'operator', 'readonly', 'admin', 'principal', 'vice_principal')
  │
  └─ OneToMany → StudentOnboardingRequest (as requested_by)
  └─ OneToMany → StudentOnboardingRequest (as approved_by, nullable)

StudentOnboardingRequest
  ├─ ForeignKey → User (requested_by)
  ├─ ForeignKey → User (approved_by, nullable)
  ├─ ForeignKey → Grade
  ├─ ForeignKey → Address
  ├─ ForeignKey → Bus
  ├─ ManyToMany → Parent
  ├─ ManyToMany → Subject
  └─ OneToOne → Student (created_student, nullable)
```

---

## 🚀 Example Workflows

### Workflow 1: Teacher Submits Student Request

1. **Teacher logs in** → Directed to Teacher Portal
2. **Teacher clicks** "+ Request Student Onboarding"
3. **Teacher fills** student form completely
4. **Teacher clicks** "Submit for Approval"
5. **Status:** `pending` ⏳
6. **Principal notified** (via pending approvals list)

### Workflow 2: Principal Approves Request

1. **Principal logs in** → Directed to Principal Portal
2. **Sees** "Pending Approvals: 1"
3. **Principal clicks** "Review Requests"
4. **Principal reviews** student details
5. **Principal clicks** "Approve/Reject"
6. **Principal selects** "Approve"
7. **System automatically:**
   - Creates Student record
   - Links to parents
   - Assigns to subjects
   - Assigns to bus
8. **Status changes to:** `completed` ✅
9. **Links to created student record** are shown

### Workflow 3: Principal Rejects Request

1. **Principal opens** request approval form
2. **Principal selects** "Reject"
3. **Principal provides** rejection reason (e.g., "Missing parent information")
4. **Status changes to:** `rejected` ❌
5. **Teacher receives notification** to resubmit
6. **Teacher can create** new request with corrections

---

## 📚 Files Created/Modified

### New Files

- `skucore/permissions.py` - Role-based permissions system
- `skucore/portal_views.py` - Portal and onboarding views
- `skucore/templates/core/portals/` - 6 portal templates
- `skucore/templates/core/onboarding/` - 5 onboarding templates

### Modified Files

- `skucore/models.py` - Added UserRole and StudentOnboardingRequest
- `skucore/forms.py` - Added onboarding forms
- `skucore/admin.py` - Registered new models
- `skubackend/urls.py` - Added all portal and onboarding routes

---

## 🧪 Testing the System

### Create Test Users

```bash
python manage.py shell
```

```python
from django.contrib.auth.models import User
from skucore.models import UserRole

# Create test users
teacher = User.objects.create_user('teacher1', 'teacher@school.com', 'password123')
operator = User.objects.create_user('operator1', 'operator@school.com', 'password123')
principal = User.objects.create_user('principal1', 'principal@school.com', 'password123')
vice_principal = User.objects.create_user('vp1', 'vp@school.com', 'password123')

# Assign roles
UserRole.objects.create(user=teacher, role='teacher')
UserRole.objects.create(user=operator, role='operator')
UserRole.objects.create(user=principal, role='principal')
UserRole.objects.create(user=vice_principal, role='vice_principal')
```

### Test Onboarding Flow

1. **Login as Teacher:** http://localhost:8000/
2. **Go to Teacher Portal:** Automatically redirected
3. **Create Onboarding Request:** Fill and submit
4. **Login as Principal:** http://localhost:8000/
5. **Review Requests:** In Principal Portal
6. **Approve Request:** Student should be created
7. **Verify:** Go to Students list, see new student

---

## 🎓 Next Steps with React Frontend

When building your React UI, you can:

1. **Add login/authentication page**
2. **Create React components** for each portal
3. **Call Django APIs** to fetch role information
4. **Display role-specific UI** based on user role
5. **Implement onboarding form** in React
6. **Add approval interface** for managers

**API endpoints to use:**

```
GET  /api/data/                    - Current user info
POST /onboarding/create/           - Submit request
GET  /onboarding/                  - List requests
POST /onboarding/<id>/approve/     - Approve/reject
```

---

## 📞 Support & Documentation

For more information:

- Django Permissions: https://docs.djangoproject.com/en/4.0/topics/auth/
- Decorators: Check `skucore/permissions.py`
- Models: Check `skucore/models.py`
- Views: Check `skucore/portal_views.py`

---

**System Ready! 🚀** Your role-based access control and student onboarding system is now live!
