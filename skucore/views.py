from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.decorators import api_view
from datetime import datetime, timedelta
import calendar

#Remove the Code Later
from django.http import JsonResponse
from django.db import connection

def db_info(request):
    """Temporary debug endpoint - remove after checking"""
    db = connection.settings_dict
    from skucore.models import Student, School, UserSchool
    return JsonResponse({
        'engine': db['ENGINE'],
        'database': db.get('NAME', 'N/A'),
        'host': db.get('HOST', 'N/A'),
        'total_students': Student.objects.count(),
        'total_schools': School.objects.count(),
        'schools': list(School.objects.values('id', 'name', 'is_active')),
        'user_schools': list(UserSchool.objects.values('user__username', 'school__name')),
    })



from .models import (
    Student, Parent, Grade, Subject, Bus, Route, 
    Attendance, Address, StudentOnboardingRequest, Record
)
from .forms import (
    StudentForm, ParentForm, GradeForm, SubjectForm, 
    BusForm, RouteForm, AttendanceForm, AddressForm, RecordForm
)
from .permissions import user_is_operator, user_is_admin


def python_home(request):
    return render(request, 'core/index.html', {"message": "Hello from Django Templates!"})


@api_view(['GET'])
def api_data(request):
    return Response({"message": "Hello React, this is JSON from Python!"})


# Dashboard
@login_required
def dashboard(request):
    can_create_student = user_is_admin(request.user)
    context = {
        'total_students': Student.objects.count(),
        'total_parents': Parent.objects.count(),
        'total_grades': Grade.objects.count(),
        'total_subjects': Subject.objects.count(),
        'total_buses': Bus.objects.count(),
        'active_students': Student.objects.filter(is_active=True).count(),
        'can_create_student': can_create_student,
        'pending_onboarding': StudentOnboardingRequest.objects.filter(status='pending').count(),
    }
    return render(request, 'core/dashboard.html', context)


# =============== STUDENT CRUD ===============
def student_list(request):
    students = Student.objects.filter(school=request.school).select_related('grade', 'bus')
    # Pass permission to template
    can_create_student = user_is_admin(request.user)
    return render(request, 'core/student/list.html', {'students': students, 'can_create_student': can_create_student})


def student_create(request):
    # Only Admins can create students directly
    # Teachers and Operators must use onboarding workflow
    if not user_is_admin(request.user):
        messages.error(request, 'You must use the onboarding workflow to request a new student. Go to your portal and submit a student onboarding request.')
        return redirect('portal_redirect')
    
    if request.method == 'POST':
        form = StudentForm(request.POST, request.FILES, school=request.school)
        if form.is_valid():
            student = form.save(commit=False)
            student.school = request.school
            student.save()
            messages.success(request, f'Student {student.first_name} {student.last_name} created successfully!')
            return redirect('student_list')
    else:
        form = StudentForm(school=request.school)
    return render(request, 'core/student/form.html', {'form': form, 'title': 'Create Student'})


def student_detail(request, pk):
    student = get_object_or_404(Student, pk=pk, school=request.school)
    attendance_records = student.attendance_records.all()[:10]
    
    # Handle adding new records
    if request.method == 'POST' and 'add_record' in request.POST:
        record_form = RecordForm(request.POST, request.FILES)
        if record_form.is_valid():
            record = record_form.save(commit=False)
            record.student = student
            record.uploaded_by = request.user
            record.save()
            messages.success(request, f'Record added successfully!')
            return redirect('student_detail', pk=pk)
    else:
        record_form = RecordForm()
    
    # Get all records for this student
    records = student.records.all()
    
    return render(request, 'core/student/detail.html', {
        'student': student,
        'attendance_records': attendance_records,
        'records': records,
        'record_form': record_form,
    })


def student_update(request, pk):
    # Only Admins can edit students directly
    if not user_is_admin(request.user):
        messages.error(request, 'You do not have permission to edit student records.')
        return redirect('portal_redirect')
    
    student = get_object_or_404(Student, pk=pk, school=request.school)
    if request.method == 'POST':
        form = StudentForm(request.POST, request.FILES, instance=student, school=request.school)
        if form.is_valid():
            form.save()
            messages.success(request, f'Student {student.first_name} {student.last_name} updated successfully!')
            return redirect('student_detail', pk=student.pk)
    else:
        form = StudentForm(instance=student, school=request.school)
    return render(request, 'core/student/form.html', {'form': form, 'title': 'Update Student', 'student': student})


def student_delete(request, pk):
    # Only Admins can delete students
    if not user_is_admin(request.user):
        messages.error(request, 'You do not have permission to delete student records.')
        return redirect('portal_redirect')
    
    student = get_object_or_404(Student, pk=pk, school=request.school)
    if request.method == 'POST':
        name = f'{student.first_name} {student.last_name}'
        student.delete()
        messages.success(request, f'Student {name} deleted successfully!')
        return redirect('student_list')
    return render(request, 'core/confirm_delete.html', {'object': student, 'object_type': 'Student'})


# =============== PARENT CRUD ===============
def parent_list(request):
    parents = Parent.objects.filter(school=request.school).select_related('address')
    return render(request, 'core/parent/list.html', {'parents': parents})


def parent_create(request):
    if request.method == 'POST':
        form = ParentForm(request.POST)
        if form.is_valid():
            parent = form.save(commit=False)
            parent.school = request.school
            parent.save()
            messages.success(request, f'Parent {parent.first_name} {parent.last_name} created successfully!')
            return redirect('parent_list')
    else:
        form = ParentForm()
    return render(request, 'core/parent/form.html', {'form': form, 'title': 'Create Parent'})


def parent_detail(request, pk):
    parent = get_object_or_404(Parent, pk=pk, school=request.school)
    return render(request, 'core/parent/detail.html', {'parent': parent})


def parent_update(request, pk):
    parent = get_object_or_404(Parent, pk=pk, school=request.school)
    if request.method == 'POST':
        form = ParentForm(request.POST, instance=parent)
        if form.is_valid():
            form.save()
            messages.success(request, f'Parent {parent.first_name} {parent.last_name} updated successfully!')
            return redirect('parent_detail', pk=parent.pk)
    else:
        form = ParentForm(instance=parent)
    return render(request, 'core/parent/form.html', {'form': form, 'title': 'Update Parent', 'parent': parent})


def parent_delete(request, pk):
    parent = get_object_or_404(Parent, pk=pk, school=request.school)
    if request.method == 'POST':
        name = f'{parent.first_name} {parent.last_name}'
        parent.delete()
        messages.success(request, f'Parent {name} deleted successfully!')
        return redirect('parent_list')
    return render(request, 'core/confirm_delete.html', {'object': parent, 'object_type': 'Parent'})


# =============== GRADE CRUD ===============
def grade_list(request):
    grades = Grade.objects.filter(school=request.school)
    return render(request, 'core/grade/list.html', {'grades': grades})


def grade_create(request):
    if request.method == 'POST':
        form = GradeForm(request.POST)
        if form.is_valid():
            grade = form.save(commit=False)
            grade.school = request.school
            grade.save()
            messages.success(request, f'Grade {grade.grade_name} created successfully!')
            return redirect('grade_list')
    else:
        form = GradeForm()
    return render(request, 'core/grade/form.html', {'form': form, 'title': 'Create Grade'})


def grade_update(request, pk):
    grade = get_object_or_404(Grade, pk=pk, school=request.school)
    if request.method == 'POST':
        form = GradeForm(request.POST, instance=grade)
        if form.is_valid():
            form.save()
            messages.success(request, f'Grade {grade.grade_name} updated successfully!')
            return redirect('grade_list')
    else:
        form = GradeForm(instance=grade)
    return render(request, 'core/grade/form.html', {'form': form, 'title': 'Update Grade', 'grade': grade})


def grade_delete(request, pk):
    grade = get_object_or_404(Grade, pk=pk, school=request.school)
    if request.method == 'POST':
        grade_name = grade.grade_name
        grade.delete()
        messages.success(request, f'Grade {grade_name} deleted successfully!')
        return redirect('grade_list')
    return render(request, 'core/confirm_delete.html', {'object': grade, 'object_type': 'Grade'})


# =============== SUBJECT CRUD ===============
def subject_list(request):
    subjects = Subject.objects.filter(school=request.school)
    return render(request, 'core/subject/list.html', {'subjects': subjects})


def subject_create(request):
    if request.method == 'POST':
        form = SubjectForm(request.POST)
        if form.is_valid():
            subject = form.save(commit=False)
            subject.school = request.school
            subject.save()
            messages.success(request, f'Subject {subject.subject_name} created successfully!')
            return redirect('subject_list')
    else:
        form = SubjectForm()
    return render(request, 'core/subject/form.html', {'form': form, 'title': 'Create Subject'})


def subject_update(request, pk):
    subject = get_object_or_404(Subject, pk=pk, school=request.school)
    if request.method == 'POST':
        form = SubjectForm(request.POST, instance=subject)
        if form.is_valid():
            form.save()
            messages.success(request, f'Subject {subject.subject_name} updated successfully!')
            return redirect('subject_list')
    else:
        form = SubjectForm(instance=subject)
    return render(request, 'core/subject/form.html', {'form': form, 'title': 'Update Subject', 'subject': subject})


def subject_delete(request, pk):
    subject = get_object_or_404(Subject, pk=pk, school=request.school)
    if request.method == 'POST':
        subject_name = subject.subject_name
        subject.delete()
        messages.success(request, f'Subject {subject_name} deleted successfully!')
        return redirect('subject_list')
    return render(request, 'core/confirm_delete.html', {'object': subject, 'object_type': 'Subject'})


# =============== ROUTE CRUD ===============
def route_list(request):
    routes = Route.objects.filter(school=request.school)
    return render(request, 'core/route/list.html', {'routes': routes})


def route_create(request):
    if request.method == 'POST':
        form = RouteForm(request.POST)
        if form.is_valid():
            route = form.save(commit=False)
            route.school = request.school
            route.save()
            messages.success(request, f'Route {route.route_name} created successfully!')
            return redirect('route_list')
    else:
        form = RouteForm()
    return render(request, 'core/route/form.html', {'form': form, 'title': 'Create Route'})


def route_update(request, pk):
    route = get_object_or_404(Route, pk=pk, school=request.school)
    if request.method == 'POST':
        form = RouteForm(request.POST, instance=route)
        if form.is_valid():
            form.save()
            messages.success(request, f'Route {route.route_name} updated successfully!')
            return redirect('route_list')
    else:
        form = RouteForm(instance=route)
    return render(request, 'core/route/form.html', {'form': form, 'title': 'Update Route', 'route': route})


def route_delete(request, pk):
    route = get_object_or_404(Route, pk=pk, school=request.school)
    if request.method == 'POST':
        route_name = route.route_name
        route.delete()
        messages.success(request, f'Route {route_name} deleted successfully!')
        return redirect('route_list')
    return render(request, 'core/confirm_delete.html', {'object': route, 'object_type': 'Route'})


# =============== BUS CRUD ===============
def bus_list(request):
    buses = Bus.objects.filter(school=request.school).select_related('route')
    return render(request, 'core/bus/list.html', {'buses': buses})


def bus_create(request):
    if request.method == 'POST':
        form = BusForm(request.POST)
        if form.is_valid():
            bus = form.save(commit=False)
            bus.school = request.school
            bus.save()
            messages.success(request, f'Bus {bus.bus_number} created successfully!')
            return redirect('bus_list')
    else:
        form = BusForm()
    return render(request, 'core/bus/form.html', {'form': form, 'title': 'Create Bus'})


def bus_detail(request, pk):
    bus = get_object_or_404(Bus, pk=pk, school=request.school)
    students = bus.students.all()
    return render(request, 'core/bus/detail.html', {'bus': bus, 'students': students})


def bus_update(request, pk):
    bus = get_object_or_404(Bus, pk=pk, school=request.school)
    if request.method == 'POST':
        form = BusForm(request.POST, instance=bus)
        if form.is_valid():
            form.save()
            messages.success(request, f'Bus {bus.bus_number} updated successfully!')
            return redirect('bus_detail', pk=bus.pk)
    else:
        form = BusForm(instance=bus)
    return render(request, 'core/bus/form.html', {'form': form, 'title': 'Update Bus', 'bus': bus})


def bus_delete(request, pk):
    bus = get_object_or_404(Bus, pk=pk, school=request.school)
    if request.method == 'POST':
        bus_number = bus.bus_number
        bus.delete()
        messages.success(request, f'Bus {bus_number} deleted successfully!')
        return redirect('bus_list')
    return render(request, 'core/confirm_delete.html', {'object': bus, 'object_type': 'Bus'})


# =============== ATTENDANCE CRUD ===============
def attendance_list(request):
    # Get selected date from request, default to today
    date_str = request.GET.get('date')
    month_str = request.GET.get('month')
    year_str = request.GET.get('year')
    
    if date_str:
        try:
            selected_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            selected_date = datetime.now().date()
    else:
        selected_date = datetime.now().date()
    
    # Handle month/year navigation
    if month_str and year_str:
        try:
            current_month = int(month_str)
            current_year = int(year_str)
        except (ValueError, TypeError):
            current_month = selected_date.month
            current_year = selected_date.year
    else:
        current_month = selected_date.month
        current_year = selected_date.year
    
    # Get attendance for selected date
    attendance = Attendance.objects.filter(date=selected_date, school=request.school).select_related('student').order_by('student__first_name')
    
    # Get all dates with attendance records for calendar highlighting
    all_attendance_dates = Attendance.objects.filter(school=request.school).values_list('date', flat=True).distinct()
    dates_with_records = set(all_attendance_dates)
    
    # Generate calendar for selected month
    cal = calendar.monthcalendar(current_year, current_month)
    
    # Calculate previous and next month/year
    if current_month == 1:
        prev_month, prev_year = 12, current_year - 1
    else:
        prev_month, prev_year = current_month - 1, current_year
    
    if current_month == 12:
        next_month, next_year = 1, current_year + 1
    else:
        next_month, next_year = current_month + 1, current_year
    
    context = {
        'attendance': attendance,
        'selected_date': selected_date,
        'calendar': cal,
        'current_month': current_month,
        'current_year': current_year,
        'dates_with_records': dates_with_records,
        'month_name': calendar.month_name[current_month],
        'prev_month': prev_month,
        'prev_year': prev_year,
        'next_month': next_month,
        'next_year': next_year,
    }
    return render(request, 'core/attendance/list.html', context)


def attendance_create(request):
    if request.method == 'POST':
        form = AttendanceForm(request.POST)
        if form.is_valid():
            attendance = form.save(commit=False)
            attendance.school = request.school
            attendance.save()
            messages.success(request, f'Attendance recorded successfully!')
            return redirect('attendance_list')
    else:
        form = AttendanceForm()
    return render(request, 'core/attendance/form.html', {'form': form, 'title': 'Record Attendance'})


def attendance_update(request, pk):
    attendance = get_object_or_404(Attendance, pk=pk, school=request.school)
    if request.method == 'POST':
        form = AttendanceForm(request.POST, instance=attendance)
        if form.is_valid():
            form.save()
            messages.success(request, f'Attendance updated successfully!')
            return redirect('attendance_list')
    else:
        form = AttendanceForm(instance=attendance)
    return render(request, 'core/attendance/form.html', {'form': form, 'title': 'Update Attendance', 'attendance': attendance})


def attendance_delete(request, pk):
    attendance = get_object_or_404(Attendance, pk=pk, school=request.school)
    if request.method == 'POST':
        attendance.delete()
        messages.success(request, f'Attendance record deleted successfully!')
        return redirect('attendance_list')
    return render(request, 'core/confirm_delete.html', {'object': attendance, 'object_type': 'Attendance'})

