from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib.auth import authenticate, login
from django.contrib import messages
from django.utils import timezone
from django.core.exceptions import PermissionDenied
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.contrib.auth.views import LoginView as DjangoLoginView
from datetime import datetime

from .models import (
    Student, Parent, Grade, Subject, Bus, Route, 
    Attendance, Address, StudentOnboardingRequest, UserRole, Record,
    School, UserSchool
)
from .forms import StudentOnboardingRequestForm, OnboardingApprovalForm, ParentForm
from .permissions import (
    get_user_role, can_initiate_onboarding, can_approve_onboarding,
    can_edit_students, user_is_readonly, user_is_operator, user_is_teacher,
    principal_required, vice_principal_required, admin_required,
    role_required, can_approve_onboarding_required
)


# ============ AUTHENTICATION VIEWS ============

class CustomLoginView(DjangoLoginView):
    """Custom login view that requires school selection"""
    template_name = 'core/login.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['schools'] = School.objects.filter(subscription__status='active')
        return context
    
    def post(self, request, *args, **kwargs):
        username = request.POST.get('username')
        password = request.POST.get('password')
        school_id = request.POST.get('school')
        
        if not school_id:
            messages.error(request, 'Please select a school.')
            return self.get(request, *args, **kwargs)
        
        # Authenticate user
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            # Try to get or create UserSchool record
            school = School.objects.filter(id=school_id, is_active=True).first()
            
            if not school:
                messages.error(request, 'The selected school is not available.')
                return self.get(request, *args, **kwargs)
            
            # Get or create UserSchool record
            user_school, created = UserSchool.objects.get_or_create(
                user=user,
                school=school,
                defaults={'is_active': True}
            )
            
            # If it exists but is_active is False, activate it
            if not created and not user_school.is_active:
                user_school.is_active = True
                user_school.save()
            
            # Login user and set school in session
            login(request, user)
            request.session['school_id'] = int(school_id)
            request.session['school_name'] = school.name
            
            # Redirect to portal
            return redirect('portal_redirect')
        else:
            messages.error(request, 'Invalid username or password.')
            return self.get(request, *args, **kwargs)


def school_selection_view(request):
    """Allow user to switch school after login"""
    if not request.user.is_authenticated:
        return redirect('login')
    
    user_schools = UserSchool.objects.filter(
        user=request.user,
        is_active=True
    ).select_related('school')
    
    if request.method == 'POST':
        school_id = request.POST.get('school_id')
        user_school = user_schools.filter(school_id=school_id).first()
        
        if user_school:
            request.session['school_id'] = int(school_id)
            request.session['school_name'] = user_school.school.name
            messages.success(request, f'Switched to {user_school.school.name}')
            return redirect('portal_redirect')
        else:
            messages.error(request, 'Invalid school selection.')
    
    context = {'schools': user_schools}
    return render(request, 'core/school_selection.html', context)


@login_required
def portal_redirect(request):
    """Redirect user to their appropriate portal based on role"""
    user_role = get_user_role(request.user)
    
    portal_map = {
        'teacher': 'teacher_portal',
        'operator': 'operator_portal',
        'readonly': 'readonly_portal',
        'admin': 'admin_portal',
        'principal': 'principal_portal',
        'vice_principal': 'vice_principal_portal',
    }
    
    if user_role and user_role in portal_map:
        return redirect(portal_map[user_role])
    
    return redirect('dashboard')


@login_required
@require_http_methods(["POST"])
def create_parent_inline(request):
    """AJAX endpoint to create a parent inline during onboarding"""
    if not can_initiate_onboarding(request.user):
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    form = ParentForm(request.POST)
    if form.is_valid():
        parent = form.save()
        return JsonResponse({
            'success': True,
            'parent': {
                'id': parent.id,
                'name': f"{parent.first_name} {parent.last_name}",
                'parent_type': parent.get_parent_type_display(),
                'email': parent.email,
                'phone': parent.phone_number,
            }
        })
    else:
        return JsonResponse({
            'success': False,
            'errors': form.errors
        })


@login_required
def teacher_portal(request):
    """Teacher Portal - can view and manage students, record attendance"""
    if not user_is_teacher(request.user):
        raise PermissionDenied("You do not have access to the teacher portal.")
    
    context = {
        'portal_name': 'Teacher Portal',
        'role': 'Teacher',
        'students': Student.objects.filter(is_active=True),
        'pending_onboarding': StudentOnboardingRequest.objects.filter(
            requested_by=request.user,
            status='pending'
        ),
        'approved_onboarding': StudentOnboardingRequest.objects.filter(
            requested_by=request.user,
            status='approved'
        ),
        'my_requests': StudentOnboardingRequest.objects.filter(requested_by=request.user),
    }
    return render(request, 'core/portals/teacher_portal.html', context)


@login_required
def operator_portal(request):
    """Operator Portal - manage all student records, requests, and operations"""
    if not user_is_operator(request.user):
        raise PermissionDenied("You do not have access to the operator portal.")
    
    context = {
        'portal_name': 'Operator Portal',
        'role': 'Operator',
        'total_students': Student.objects.count(),
        'active_students': Student.objects.filter(is_active=True).count(),
        'pending_onboarding': StudentOnboardingRequest.objects.filter(status='pending'),
        'my_requests': StudentOnboardingRequest.objects.filter(requested_by=request.user),
        'recent_requests': StudentOnboardingRequest.objects.all()[:10],
    }
    return render(request, 'core/portals/operator_portal.html', context)


@login_required
def readonly_portal(request):
    """Read-Only Portal - can only view data"""
    if not user_is_readonly(request.user):
        raise PermissionDenied("You do not have access to the read-only portal.")
    
    context = {
        'portal_name': 'Read-Only Portal',
        'role': 'Read-Only User',
        'students': Student.objects.all(),
        'parents': Parent.objects.all(),
        'attendance': Attendance.objects.all().order_by('-date')[:50],
    }
    return render(request, 'core/portals/readonly_portal.html', context)


@login_required
def admin_portal(request):
    """Administrator Portal - full system access"""
    if not (request.user.is_superuser or get_user_role(request.user) == 'admin'):
        raise PermissionDenied("You do not have access to the admin portal.")
    
    context = {
        'portal_name': 'Administrator Portal',
        'role': 'Administrator',
        'total_users': UserRole.objects.count(),
        'total_students': Student.objects.count(),
        'total_parents': Parent.objects.count(),
        'pending_onboarding': StudentOnboardingRequest.objects.filter(status='pending'),
        'recent_onboarding': StudentOnboardingRequest.objects.all()[:10],
    }
    return render(request, 'core/portals/admin_portal.html', context)


@principal_required
def principal_portal(request):
    """Principal Portal - approve requests, manage school-wide operations"""
    context = {
        'portal_name': 'Principal Portal',
        'role': 'Principal',
        'pending_onboarding': StudentOnboardingRequest.objects.filter(status='pending'),
        'total_students': Student.objects.count(),
        'active_students': Student.objects.filter(is_active=True).count(),
        'recent_approvals': StudentOnboardingRequest.objects.filter(
            approved_by=request.user
        )[:10],
    }
    return render(request, 'core/portals/principal_portal.html', context)


@role_required('vice_principal')
def vice_principal_portal(request):
    """Vice Principal Portal - approve requests, manage operations"""
    context = {
        'portal_name': 'Vice Principal Portal',
        'role': 'Vice Principal',
        'pending_onboarding': StudentOnboardingRequest.objects.filter(status='pending'),
        'total_students': Student.objects.count(),
        'active_students': Student.objects.filter(is_active=True).count(),
        'recent_approvals': StudentOnboardingRequest.objects.filter(
            approved_by=request.user
        )[:10],
    }
    return render(request, 'core/portals/vice_principal_portal.html', context)


# ============ ONBOARDING REQUEST VIEWS ============

@login_required
def onboarding_request_list(request):
    """List onboarding requests based on user role"""
    user_role = get_user_role(request.user)
    
    if can_approve_onboarding(request.user):
        # Approvers see all pending requests for their school
        requests = StudentOnboardingRequest.objects.filter(status='pending', school=request.school)
    elif can_initiate_onboarding(request.user):
        # Requesters see their own requests for their school
        requests = StudentOnboardingRequest.objects.filter(requested_by=request.user, school=request.school)
    else:
        raise PermissionDenied("You do not have permission to view onboarding requests.")
    
    context = {
        'requests': requests,
        'can_approve': can_approve_onboarding(request.user),
        'can_initiate': can_initiate_onboarding(request.user),
    }
    return render(request, 'core/onboarding/request_list.html', context)


@login_required
def onboarding_request_create(request):
    """Create a new student onboarding request"""
    if not can_initiate_onboarding(request.user):
        raise PermissionDenied("You do not have permission to initiate student onboarding.")
    
    if request.method == 'POST':
        form = StudentOnboardingRequestForm(request.POST, request.FILES)
        if form.is_valid():
            onboarding = form.save(commit=False)
            onboarding.requested_by = request.user
            onboarding.school = request.school
            
            # Handle address_text field (free text address from user)
            address_text = form.cleaned_data.get('address_text', '')
            if address_text:
                # You can either:
                # 1. Create an Address object from the text
                # 2. Store it in a notes field
                # For now, we'll just pass it through (address will be None)
                pass
            
            onboarding.save()
            form.save_m2m()  # Save many-to-many relations (parents, subjects)
            
            # Debug: Print what we're receiving
            import sys
            print(f"DEBUG: request.FILES keys: {list(request.FILES.keys())}", file=sys.stderr)
            print(f"DEBUG: request.POST keys: {list(request.POST.keys())}", file=sys.stderr)
            
            # Handle records uploaded during onboarding
            # Parse form fields with pattern: record_file_N, record_type_N, record_description_N
            records_created = 0
            record_indices = set()
            
            # Find all record indices by looking for form fields with pattern record_file_*
            for key in list(request.FILES.keys()):
                if key.startswith('record_file_'):
                    idx = key.split('_')[-1]  # Extract number after last underscore
                    record_indices.add(idx)
                    print(f"DEBUG: Found record file index: {idx}", file=sys.stderr)
            
            # Process each record
            for idx in record_indices:
                file_key = f'record_file_{idx}'
                type_key = f'record_type_{idx}'
                desc_key = f'record_description_{idx}'
                
                file_obj = request.FILES.get(file_key)
                record_type = request.POST.get(type_key)
                description = request.POST.get(desc_key, '')
                
                print(f"DEBUG: Processing record {idx}: file={file_obj}, type={record_type}", file=sys.stderr)
                
                if file_obj and record_type:
                    try:
                        record = Record.objects.create(
                            school=request.school,
                            onboarding_request=onboarding,
                            record_type=record_type,
                            file=file_obj,
                            description=description,
                            uploaded_by=request.user,
                        )
                        records_created += 1
                        print(f"SUCCESS: Created record {record.id}", file=sys.stderr)
                    except Exception as e:
                        print(f"ERROR creating record: {e}", file=sys.stderr)
                        messages.warning(request, f"Some records could not be uploaded: {str(e)}")
            
            print(f"DEBUG: Total records created: {records_created}", file=sys.stderr)
            
            messages.success(request, f'Onboarding request for {onboarding.first_name} {onboarding.last_name} created successfully! Waiting for approval.')

            return redirect('onboarding_request_list')
    else:
        form = StudentOnboardingRequestForm()
    
    return render(request, 'core/onboarding/request_form.html', {'form': form, 'title': 'Create Student Onboarding Request'})


@login_required
def onboarding_request_detail(request, pk):
    """View onboarding request details"""
    onboarding = get_object_or_404(StudentOnboardingRequest, pk=pk, school=request.school)
    
    # Check permissions
    is_requester = onboarding.requested_by == request.user
    can_approve = can_approve_onboarding(request.user)
    
    if not (is_requester or can_approve or request.user.is_superuser):
        raise PermissionDenied("You do not have permission to view this request.")
    
    # Get records for this onboarding request
    records = onboarding.records.all()
    
    context = {
        'onboarding': onboarding,
        'is_requester': is_requester,
        'can_approve': can_approve,
        'records': records,
    }
    return render(request, 'core/onboarding/request_detail.html', context)


@can_approve_onboarding_required
def onboarding_request_approve(request, pk):
    """Approve or reject an onboarding request"""
    onboarding = get_object_or_404(StudentOnboardingRequest, pk=pk, school=request.school)
    
    if onboarding.status != 'pending':
        messages.error(request, 'This request has already been processed.')
        return redirect('onboarding_request_list')
    
    if request.method == 'POST':
        form = OnboardingApprovalForm(request.POST)
        if form.is_valid():
            status = form.cleaned_data['status']
            
            if status == 'approved':
                # Create the student record
                student = Student.objects.create(
                    first_name=onboarding.first_name,
                    last_name=onboarding.last_name,
                    email=onboarding.email,
                    phone_number=onboarding.phone_number,
                    date_of_birth=onboarding.date_of_birth,
                    grade=onboarding.grade,
                    address=onboarding.address,
                    bus=onboarding.bus,
                    photo=onboarding.photo,
                    is_active=True,
                )
                
                # Add parents and subjects
                for parent in onboarding.parents.all():
                    student.parents.add(parent)
                for subject in onboarding.subjects.all():
                    student.subjects.add(subject)
                
                # Move records from onboarding request to student
                for record in onboarding.records.all():
                    record.student = student
                    record.onboarding_request = None
                    record.save()
                
                # Update onboarding request
                onboarding.status = 'completed'
                onboarding.approved_by = request.user
                onboarding.approved_at = timezone.now()
                onboarding.created_student = student
                onboarding.save()
                
                messages.success(request, f'Student {onboarding.first_name} {onboarding.last_name} has been approved and created!')
            
            elif status == 'rejected':
                onboarding.status = 'rejected'
                onboarding.rejection_reason = form.cleaned_data.get('rejection_reason')
                onboarding.approved_by = request.user
                onboarding.approved_at = timezone.now()
                onboarding.save()
                
                messages.warning(request, f'Onboarding request for {onboarding.first_name} {onboarding.last_name} has been rejected.')
            
            return redirect('onboarding_request_detail', pk=onboarding.pk)
    else:
        form = OnboardingApprovalForm()
    
    # Get records associated with this onboarding request
    records = onboarding.records.all()
    import sys
    print(f"DEBUG APPROVE VIEW: Found {records.count()} records for onboarding {onboarding.id}", file=sys.stderr)
    for rec in records:
        print(f"  - Record: {rec.id}, type: {rec.record_type}, file: {rec.file}", file=sys.stderr)
    
    context = {
        'onboarding': onboarding,
        'form': form,
        'records': records,
    }
    return render(request, 'core/onboarding/request_approve.html', context)


@login_required
def onboarding_pending_approvals(request):
    """Show all pending onboarding requests for approvers"""
    if not can_approve_onboarding(request.user):
        raise PermissionDenied("You do not have permission to approve onboarding requests.")
    
    pending = StudentOnboardingRequest.objects.filter(status='pending', school=request.school)
    
    context = {
        'pending_requests': pending,
        'count': pending.count(),
    }
    return render(request, 'core/onboarding/pending_approvals.html', context)
