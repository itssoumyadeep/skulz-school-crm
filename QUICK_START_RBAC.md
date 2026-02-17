# 🚀 Quick Start: Role-Based Access Control

## ⚡ 5-Minute Setup

### 1. **Create Your First Users**

From Django Admin (`http://localhost:8000/admin/`):

1. Go to **Users** → Add User
   - Username: `teacher1`
   - Password: Set password
   - Save

2. Go to **User Roles** → Add User Role
   - User: `teacher1`
   - Role: `Teacher`
   - Save

3. Repeat for Principal:
   - Username: `principal1`
   - Role: `Principal`

### 2. **Test the Workflow**

**Browser 1 (Teacher):**

```
1. Login: teacher1 / password
2. Visit: http://localhost:8000/
3. Redirected to: Teacher Portal
4. Click: "+ Request Student Onboarding"
5. Fill form and submit
```

**Browser 2 (Principal):**

```
1. Login: principal1 / password
2. Visit: http://localhost:8000/
3. Redirected to: Principal Portal
4. See: Pending Onboarding (1)
5. Click: "Review Requests"
6. Click: "Approve/Reject"
7. Choose: Approve
8. ✅ Student created!
```

---

## 📋 Role Mapping

| Role         | Default Portal URL        | Key Features                      |
| ------------ | ------------------------- | --------------------------------- |
| 👨‍🏫 Teacher   | `/portal/teacher/`        | Request onboarding, view students |
| ⚙️ Operator  | `/portal/operator/`       | Full student management           |
| 👁️ Read-Only | `/portal/readonly/`       | View-only access                  |
| 🔐 Admin     | `/portal/admin/`          | Full system access                |
| 👨‍💼 Principal | `/portal/principal/`      | **Approve onboarding**            |
| 👨‍💼 VP        | `/portal/vice-principal/` | **Approve onboarding**            |

---

## 🎯 Key URLs

```
Auto-redirect to portal:       /portal/
Onboarding requests list:      /onboarding/
Create new request:            /onboarding/create/
Pending approvals (for VP):    /onboarding/pending-approvals/
Django Admin:                  /admin/
```

---

## 🔑 Permission Rules

**Can Initiate Onboarding:**

- Teacher ✓
- Operator ✓

**Can Approve Onboarding:**

- Principal ✓
- Vice Principal ✓
- Administrator ✓

**Can Edit Students:**

- Teacher ✓
- Operator ✓
- Administrator ✓
- Principal ✓
- Vice Principal ✓

**Read-Only User:**

- Cannot create, edit, or delete ✗

---

## 📊 Onboarding Request Statuses

```
pending ⏳    → Waiting for approval
completed ✅ → Approved and student created
rejected ❌  → Rejected, can resubmit
```

---

## 💡 Quick Tips

1. **Auto-Redirect:** Users visiting `/` or `/portal/` are automatically sent to their portal
2. **Role Assignment:** Done via Django Admin → User Roles
3. **Student Creation:** Only happens after approval (not during request)
4. **Rejection Reason:** Required when rejecting a request
5. **Audit Trail:** All approvals timestamped and attributed

---

## 🧪 Test Credentials (After Setup)

```
Teacher:      teacher1 / password
Operator:     operator1 / password
Principal:    principal1 / password
VP:           vp1 / password
Read-Only:    readonly1 / password
Admin:        (superuser account)
```

---

## ✅ You're Ready!

The system is fully operational. Start with:

1. Create user roles in Django Admin
2. Login with different roles
3. Submit an onboarding request as Teacher
4. Approve it as Principal
5. Verify student was created

**Happy managing!** 🎓
