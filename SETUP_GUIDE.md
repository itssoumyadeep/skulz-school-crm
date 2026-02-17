# Skulz School CRM - Setup & Usage Guide

## 🚀 Getting Started

### 1. Activate Virtual Environment

```bash
source skenv/bin/activate
```

### 2. Run Django Development Server

```bash
python manage.py runserver
```

The server will start at `http://localhost:8000`

### 3. Create a Superuser (Admin Account)

```bash
python manage.py createsuperuser
```

Follow the prompts to create an admin user. You'll need:

- Username
- Email
- Password

### 4. Access the Application

#### Dashboard & CRUD Interface

Go to `http://localhost:8000` - This is the main admin dashboard

#### Django Admin Panel

Go to `http://localhost:8000/admin` - Login with your superuser credentials

#### API Endpoint

Go to `http://localhost:8000/api/data/` - JSON response from Django

---

## 📊 Data Models

### Core Entities

1. **Student** - Main entity
   - Personal information (name, email, DOB)
   - Grade/Class assignment
   - Parent relationships (Many-to-Many)
   - Subject enrollment (Many-to-Many)
   - Bus assignment
   - Address
   - Enrollment date
   - Active status

2. **Parent** - Guardian information
   - Type: Father, Mother, or Guardian
   - Contact information (email, phone)
   - Address
   - Relationship to students (Many-to-Many)

3. **Grade** - Class/Grade level
   - Grade name (e.g., Grade 1, Grade 2)
   - Multiple students per grade

4. **Subject** - Course information
   - Subject name
   - Multiple students per subject

5. **Bus** - Transportation
   - Bus number/License plate
   - Capacity
   - Route assignment
   - Driver information
   - Student assignments

6. **Route** - Bus routes
   - Route name
   - Start and end locations
   - Bus stops

7. **Address** - Reusable address model
   - Street address
   - City, State, Postal code, Country
   - Used by both Students and Parents

8. **Attendance** - Daily attendance tracking
   - Unique per student per date
   - Status: Present, Absent, Late, Excused
   - Remarks field
   - Recorded by field

---

## 🎯 Features Available

### Dashboard

- Quick statistics (total students, parents, buses, grades, subjects)
- Active student count
- Quick action buttons
- System information

### Student Management

- ✅ Create new students
- ✅ View student details (with recent attendance)
- ✅ Edit student information
- ✅ Delete students
- ✅ Assign parents
- ✅ Enroll in subjects
- ✅ Assign bus
- ✅ View attendance history

### Parent Management

- ✅ Create parent records
- ✅ View parent details with children
- ✅ Edit parent information
- ✅ Delete parents
- ✅ Link multiple children

### Academic Management

- ✅ Manage grades/classes
- ✅ Create and edit subjects
- ✅ Track student enrollment

### Transportation

- ✅ Manage bus fleet
- ✅ Create and manage routes
- ✅ Track student bus assignments
- ✅ View students per bus

### Attendance

- ✅ Record daily attendance
- ✅ Mark status (Present, Absent, Late, Excused)
- ✅ Add remarks for absences
- ✅ View attendance history by student

---

## 🗄️ Database

The project uses **SQLite** (`db.sqlite3`) for development.

**Tables created:**

- Address
- Grade
- Subject
- Route
- Bus
- Parent
- Student
- Attendance
- Django auth tables (Users, Groups, Permissions)

---

## 🎨 UI Design

- **Bootstrap 5** for styling
- **Responsive design** for desktop and mobile
- **Sidebar navigation** for easy access
- **Table views** for list management
- **Form validation** with Django forms
- **Color-coded badges** for status indicators

---

## 📝 URL Structure

```
/ or /dashboard/          → Main dashboard
/students/                → Student list
/students/create/         → Create new student
/students/<id>/           → View student details
/students/<id>/edit/      → Edit student
/students/<id>/delete/    → Delete student

/parents/                 → Parent list
/parents/create/          → Create new parent
/parents/<id>/            → View parent details
/parents/<id>/edit/       → Edit parent
/parents/<id>/delete/     → Delete parent

/grades/                  → Grade list
/grades/create/           → Create new grade
/grades/<id>/edit/        → Edit grade
/grades/<id>/delete/      → Delete grade

/subjects/                → Subject list
/subjects/create/         → Create new subject
/subjects/<id>/edit/      → Edit subject
/subjects/<id>/delete/    → Delete subject

/routes/                  → Route list
/routes/create/           → Create new route
/routes/<id>/edit/        → Edit route
/routes/<id>/delete/      → Delete route

/buses/                   → Bus list
/buses/create/            → Create new bus
/buses/<id>/              → View bus details
/buses/<id>/edit/         → Edit bus
/buses/<id>/delete/       → Delete bus

/attendance/              → Attendance list
/attendance/create/       → Record attendance
/attendance/<id>/edit/    → Edit attendance
/attendance/<id>/delete/  → Delete attendance

/admin/                   → Django admin panel
/api/data/                → API endpoint
```

---

## 🔄 Database Relationships

```
Student
├── Grade (ForeignKey) → One-to-Many
├── Parents (ManyToMany) → Many-to-Many
├── Subjects (ManyToMany) → Many-to-Many
├── Address (ForeignKey) → One-to-One/Optional
├── Bus (ForeignKey) → One-to-Many
└── Attendance (Reverse ForeignKey) → One-to-Many

Parent
├── Address (ForeignKey) → One-to-One/Optional
└── Students (ManyToMany) ← Many-to-Many

Bus
├── Route (ForeignKey) → Many-to-One
└── Students (Reverse ForeignKey) → One-to-Many

Grade
└── Students (Reverse ForeignKey) → One-to-Many

Subject
└── Students (Reverse ForeignKey) → One-to-Many

Attendance
└── Student (ForeignKey) → Many-to-One
```

---

## 🚀 Next Steps

1. **Run the server**: `python manage.py runserver`
2. **Create superuser**: `python manage.py createsuperuser`
3. **Add test data** via Django admin or forms
4. **Build React UI** for frontend (already configured for CORS)
5. **Deploy to production** when ready

---

## 📦 Dependencies

- Django 5.2.11
- Django REST Framework 3.16.1
- django-cors-headers 4.9.0
- Pillow (for image handling if needed)

---

## ✅ Ready for React Frontend

The backend is fully configured with:

- CORS headers enabled for `http://localhost:5173`
- RESTful API structure
- JSON responses on `/api/` endpoints
- Static file serving capability

You can now build your React frontend using Vite!

---

## 📝 Notes

- All models have timestamps (`created_at`, `updated_at`)
- Attendance records are unique per student per date
- Address model is reusable for both Students and Parents
- Parent type selection (Father/Mother/Guardian)
- Student active/inactive status tracking
- Bus capacity tracking

---

For more help, check Django documentation:
https://docs.djangoproject.com/
