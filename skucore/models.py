from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.contrib.auth.models import User


# ============ SCHOOL & SUBSCRIPTION MODELS ============

class School(models.Model):
    """Represents a school in the system"""
    name = models.CharField(max_length=255, unique=True)
    code = models.CharField(max_length=50, unique=True)  # School code for identification
    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=20)
    website = models.URLField(blank=True, null=True)
    
    # Address
    street_address = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=20)
    country = models.CharField(max_length=100, default='Canada')
    
    # Admin/Contact
    principal_name = models.CharField(max_length=100, blank=True, null=True)
    admin_email = models.EmailField(blank=True, null=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
    
    def __str__(self):
        return self.name


class Subscription(models.Model):
    """Manages subscription details for schools"""
    PLAN_CHOICES = [
        ('free', 'Free'),
        ('basic', 'Basic'),
        ('pro', 'Professional'),
        ('enterprise', 'Enterprise'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('suspended', 'Suspended'),
        ('cancelled', 'Cancelled'),
    ]
    
    school = models.OneToOneField(School, on_delete=models.CASCADE, related_name='subscription')
    plan = models.CharField(max_length=20, choices=PLAN_CHOICES, default='free')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    
    # Billing
    max_students = models.IntegerField(default=0)  # 0 = unlimited
    max_users = models.IntegerField(default=5)
    
    # Dates
    start_date = models.DateField(auto_now_add=True)
    end_date = models.DateField(null=True, blank=True)
    renewal_date = models.DateField(null=True, blank=True)
    
    # Additional info
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name_plural = "Subscriptions"
    
    def __str__(self):
        school_name = self.school.name if self.school else "No School"
        return f"{school_name} - {self.get_plan_display()} ({self.get_status_display()})"


class UserSchool(models.Model):
    """Maps users to schools (many-to-many with extra data)"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='user_schools')
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='user_schools', null=True, blank=True)
    is_primary = models.BooleanField(default=False)  # User's default school
    is_active = models.BooleanField(default=True)
    added_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('user', 'school')
    
    def __str__(self):
        school_name = self.school.name if self.school else "No School"
        return f"{self.user.username} - {school_name}"


# User Role Model
class UserRole(models.Model):
    ROLE_CHOICES = [
        ('teacher', 'Teacher'),
        ('operator', 'Operator'),
        ('readonly', 'Read-Only'),
        ('admin', 'Administrator'),
        ('principal', 'Principal'),
        ('vice_principal', 'Vice Principal'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='user_role')
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='user_roles', null=True, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    department = models.CharField(max_length=100, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "User Roles"

    def __str__(self):
        school_name = self.school.name if self.school else "No School"
        return f"{self.user.username} - {self.get_role_display()} ({school_name})"


# Address Model - Reusable for Student and Parent
class Address(models.Model):
    street_address = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=20)
    country = models.CharField(max_length=100, default='Canada')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Addresses"

    def __str__(self):
        return f"{self.street_address}, {self.city}, {self.state}"


# Grade/Class Model
class Grade(models.Model):
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='grades', null=True, blank=True)
    grade_name = models.CharField(max_length=50)  # e.g., "Grade 1", "Grade 2", etc.
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['grade_name']
        unique_together = ('school', 'grade_name')

    def __str__(self):
        school_name = self.school.name if self.school else "No School"
        return f"{self.grade_name} ({school_name})"


# Subject Model
class Subject(models.Model):
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='subjects', null=True, blank=True)
    subject_name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('school', 'subject_name')

    def __str__(self):
        school_name = self.school.name if self.school else "No School"
        return f"{self.subject_name} ({school_name})"


# Route Model
class Route(models.Model):
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='routes', null=True, blank=True)
    route_name = models.CharField(max_length=100)
    start_location = models.CharField(max_length=255)
    end_location = models.CharField(max_length=255)
    stops = models.TextField(blank=True, null=True)  # Comma-separated or JSON
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('school', 'route_name')

    def __str__(self):
        school_name = self.school.name if self.school else "No School"
        return f"{self.route_name} ({school_name})"


# Bus Model
class Bus(models.Model):
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='buses', null=True, blank=True)
    bus_number = models.CharField(max_length=50)  # License plate or bus ID
    capacity = models.IntegerField(validators=[MinValueValidator(1)])
    route = models.ForeignKey(Route, on_delete=models.PROTECT, related_name='buses')
    driver_name = models.CharField(max_length=100)
    driver_phone = models.CharField(max_length=20)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Buses"
        unique_together = ('school', 'bus_number')

    def __str__(self):
        school_name = self.school.name if self.school else "No School"
        return f"{self.bus_number} - {self.route.route_name} ({school_name})"


# Parent Model
class Parent(models.Model):
    PARENT_TYPE_CHOICES = [
        ('father', 'Father'),
        ('mother', 'Mother'),
        ('guardian', 'Guardian'),
    ]
    
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='parents', null=True, blank=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    parent_type = models.CharField(max_length=20, choices=PARENT_TYPE_CHOICES)
    email = models.EmailField()
    phone_number = models.CharField(max_length=20)
    address = models.ForeignKey(Address, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['last_name', 'first_name']
        unique_together = ('school', 'email')

    def __str__(self):
        school_name = self.school.name if self.school else "No School"
        return f"{self.first_name} {self.last_name} ({self.get_parent_type_display()}) - {school_name}"


# Student Model
class Student(models.Model):
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='students', null=True, blank=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField()
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    date_of_birth = models.DateField()
    enrollment_date = models.DateField(auto_now_add=True)
    photo = models.ImageField(upload_to='student_photos/', blank=True, null=True)
    
    # Relationships
    grade = models.ForeignKey(Grade, on_delete=models.SET_NULL, null=True, related_name='students')
    parents = models.ManyToManyField(Parent, related_name='students')
    subjects = models.ManyToManyField(Subject, related_name='students')
    address = models.ForeignKey(Address, on_delete=models.SET_NULL, null=True, blank=True)
    bus = models.ForeignKey(Bus, on_delete=models.SET_NULL, null=True, blank=True, related_name='students')
    
    # Status
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['last_name', 'first_name']
        unique_together = ('school', 'email')

    def __str__(self):
        school_name = self.school.name if self.school else "No School"
        return f"{self.first_name} {self.last_name} - {school_name}"


# Attendance Model
class Attendance(models.Model):
    ATTENDANCE_CHOICES = [
        ('present', 'Present'),
        ('absent', 'Absent'),
        ('late', 'Late'),
        ('excused', 'Excused'),
    ]
    
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='attendance_records', null=True, blank=True)
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='attendance_records')
    date = models.DateField()
    status = models.CharField(max_length=20, choices=ATTENDANCE_CHOICES)
    remarks = models.TextField(blank=True, null=True)
    recorded_by = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Attendance"
        unique_together = ('school', 'student', 'date')
        ordering = ['-date']

    def __str__(self):
        school_name = self.school.name if self.school else "No School"
        return f"{self.student} - {self.date} - {self.get_status_display()} ({school_name})"


# Student Onboarding Request Model
class StudentOnboardingRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending Approval'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('completed', 'Completed (Student Created)'),
    ]
    
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='onboarding_requests', null=True, blank=True)
    
    # Requester information
    requested_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='onboarding_requests')
    
    # Student information to be created
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField()
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    date_of_birth = models.DateField()
    photo = models.ImageField(upload_to='onboarding_photos/', blank=True, null=True)
    
    # Related data
    grade = models.ForeignKey(Grade, on_delete=models.SET_NULL, null=True, blank=True)
    parents = models.ManyToManyField(Parent, blank=True)
    subjects = models.ManyToManyField(Subject, blank=True)
    address = models.ForeignKey(Address, on_delete=models.SET_NULL, null=True, blank=True)
    bus = models.ForeignKey(Bus, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Status and approval
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_onboarding')
    rejection_reason = models.TextField(blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    
    # Link to created student (after approval and creation)
    created_student = models.OneToOneField(Student, on_delete=models.SET_NULL, null=True, blank=True, related_name='onboarding_request')

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        school_name = self.school.name if self.school else "No School"
        return f"Onboarding: {self.first_name} {self.last_name} - {self.get_status_display()} ({school_name})"

# Record/Attachment Model
class Record(models.Model):
    RECORD_TYPE_CHOICES = [
        ('birth_certificate', 'Birth Certificate'),
        ('vaccination', 'Vaccination Records'),
        ('medical_report', 'Medical Report'),
        ('previous_school', 'Previous School Records'),
        ('identity_proof', 'Identity Proof'),
        ('other', 'Other'),
    ]
    
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='records', null=True, blank=True)
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='records', null=True, blank=True)
    onboarding_request = models.ForeignKey('StudentOnboardingRequest', on_delete=models.CASCADE, related_name='records', null=True, blank=True)
    record_type = models.CharField(max_length=50, choices=RECORD_TYPE_CHOICES)
    file = models.FileField(upload_to='student_records/%Y/%m/')
    description = models.TextField(blank=True, null=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='uploaded_records')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        school_name = self.school.name if self.school else "No School"
        if self.student:
            return f"{self.student} - {self.get_record_type_display()} ({school_name})"
        elif self.onboarding_request:
            return f"{self.onboarding_request.first_name} {self.onboarding_request.last_name} (Onboarding) - {self.get_record_type_display()} ({school_name})"
        return f"Record - {self.get_record_type_display()} ({school_name})"