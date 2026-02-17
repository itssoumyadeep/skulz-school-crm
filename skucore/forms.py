from django import forms
from .models import (
    Student, Parent, Grade, Subject, Bus, Route, 
    Attendance, Address, StudentOnboardingRequest, Record
)


class AddressForm(forms.ModelForm):
    class Meta:
        model = Address
        fields = ['street_address', 'city', 'state', 'postal_code', 'country']
        widgets = {
            'street_address': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Street Address'}),
            'city': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'City'}),
            'state': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'State/Province'}),
            'postal_code': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Postal Code'}),
            'country': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Country'}),
        }


class GradeForm(forms.ModelForm):
    class Meta:
        model = Grade
        fields = ['grade_name', 'description']
        widgets = {
            'grade_name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'e.g., Grade 1, Grade 2'}),
            'description': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
        }


class SubjectForm(forms.ModelForm):
    class Meta:
        model = Subject
        fields = ['subject_name', 'description']
        widgets = {
            'subject_name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'e.g., Mathematics, English'}),
            'description': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
        }


class RouteForm(forms.ModelForm):
    class Meta:
        model = Route
        fields = ['route_name', 'start_location', 'end_location', 'stops']
        widgets = {
            'route_name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'e.g., Route A, Route B'}),
            'start_location': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Starting point'}),
            'end_location': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Ending point'}),
            'stops': forms.Textarea(attrs={'class': 'form-control', 'rows': 3, 'placeholder': 'Enter stops (comma-separated)'}),
        }


class BusForm(forms.ModelForm):
    class Meta:
        model = Bus
        fields = ['bus_number', 'capacity', 'route', 'driver_name', 'driver_phone']
        widgets = {
            'bus_number': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Bus number/License plate'}),
            'capacity': forms.NumberInput(attrs={'class': 'form-control', 'placeholder': 'Capacity'}),
            'route': forms.Select(attrs={'class': 'form-control'}),
            'driver_name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Driver name'}),
            'driver_phone': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Driver phone'}),
        }


class ParentForm(forms.ModelForm):
    class Meta:
        model = Parent
        fields = ['first_name', 'last_name', 'parent_type', 'email', 'phone_number', 'address']
        widgets = {
            'first_name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'First name'}),
            'last_name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Last name'}),
            'parent_type': forms.Select(attrs={'class': 'form-control'}),
            'email': forms.EmailInput(attrs={'class': 'form-control', 'placeholder': 'Email'}),
            'phone_number': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Phone number'}),
            'address': forms.Select(attrs={'class': 'form-control'}),
        }


class StudentForm(forms.ModelForm):
    parents = forms.ModelMultipleChoiceField(
        queryset=Parent.objects.none(),  # Will be set in __init__
        widget=forms.CheckboxSelectMultiple,
        required=False
    )
    subjects = forms.ModelMultipleChoiceField(
        queryset=Subject.objects.none(),  # Will be set in __init__
        widget=forms.CheckboxSelectMultiple,
        required=False
    )

    class Meta:
        model = Student
        fields = ['first_name', 'last_name', 'email', 'phone_number', 
                  'date_of_birth', 'photo', 'grade', 'address', 'bus', 'is_active', 'parents', 'subjects']
        exclude = ['school']  # Exclude school - it will be set by the view
        widgets = {
            'first_name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'First name'}),
            'last_name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Last name'}),
            'email': forms.EmailInput(attrs={'class': 'form-control', 'placeholder': 'Email'}),
            'phone_number': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Phone number'}),
            'date_of_birth': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
            'photo': forms.FileInput(attrs={'class': 'form-control', 'accept': 'image/*'}),
            'grade': forms.Select(attrs={'class': 'form-control'}),
            'address': forms.Select(attrs={'class': 'form-control'}),
            'bus': forms.Select(attrs={'class': 'form-control'}),
            'is_active': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
        }
    
    def __init__(self, *args, school=None, **kwargs):
        super().__init__(*args, **kwargs)
        # Filter parents and subjects by school if provided
        if school:
            self.fields['parents'].queryset = Parent.objects.filter(school=school)
            self.fields['subjects'].queryset = Subject.objects.filter(school=school)
            self.fields['grade'].queryset = Grade.objects.filter(school=school)
            self.fields['bus'].queryset = Bus.objects.filter(school=school)
        else:
            # Fallback to all if no school provided (for non-school-aware contexts)
            self.fields['parents'].queryset = Parent.objects.all()
            self.fields['subjects'].queryset = Subject.objects.all()


class AttendanceForm(forms.ModelForm):
    class Meta:
        model = Attendance
        fields = ['student', 'date', 'status', 'remarks', 'recorded_by']
        widgets = {
            'student': forms.Select(attrs={'class': 'form-control'}),
            'date': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
            'status': forms.Select(attrs={'class': 'form-control'}),
            'remarks': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
            'recorded_by': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Recorded by (name)'}),
        }


class StudentOnboardingRequestForm(forms.ModelForm):
    # Add a custom address field for Mapbox integration
    address_text = forms.CharField(
        label='Address',
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Start typing your address...',
            'id': 'address-input',
            'autocomplete': 'off'
        })
    )
    
    # Parents field - ModelMultipleChoiceField to select existing or newly created parents
    parents = forms.ModelMultipleChoiceField(
        queryset=Parent.objects.all(),
        widget=forms.CheckboxSelectMultiple,
        required=False,
        label='Parents/Guardians'
    )
    
    subjects = forms.ModelMultipleChoiceField(
        queryset=Subject.objects.all(),
        widget=forms.CheckboxSelectMultiple,
        required=False
    )

    class Meta:
        model = StudentOnboardingRequest
        fields = ['first_name', 'last_name', 'email', 'phone_number', 
                  'date_of_birth', 'photo', 'grade', 'bus', 'subjects', 'parents']
        widgets = {
            'first_name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'First name'}),
            'last_name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Last name'}),
            'email': forms.EmailInput(attrs={'class': 'form-control', 'placeholder': 'Email'}),
            'phone_number': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Phone number'}),
            'date_of_birth': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
            'photo': forms.FileInput(attrs={'class': 'form-control', 'accept': 'image/*'}),
            'grade': forms.Select(attrs={'class': 'form-control'}),
            'bus': forms.Select(attrs={'class': 'form-control'}),
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Remove the address field from the form as we're using custom address field
        if 'address' in self.fields:
            del self.fields['address']


class OnboardingApprovalForm(forms.Form):
    """Form for approving or rejecting onboarding requests"""
    STATUS_CHOICES = [
        ('approved', 'Approve'),
        ('rejected', 'Reject'),
    ]
    
    status = forms.ChoiceField(choices=STATUS_CHOICES, widget=forms.RadioSelect)
    rejection_reason = forms.CharField(
        required=False,
        widget=forms.Textarea(attrs={
            'class': 'form-control',
            'rows': 3,
            'placeholder': 'Provide reason for rejection (only required if rejecting)'
        })
    )

    def clean(self):
        cleaned_data = super().clean()
        status = cleaned_data.get('status')
        rejection_reason = cleaned_data.get('rejection_reason')
        
        if status == 'rejected' and not rejection_reason:
            raise forms.ValidationError("Rejection reason is required when rejecting a request.")
        
        return cleaned_data

class RecordForm(forms.ModelForm):
    class Meta:
        model = Record
        fields = ['record_type', 'file', 'description']
        widgets = {
            'record_type': forms.Select(attrs={'class': 'form-control'}),
            'file': forms.FileInput(attrs={'class': 'form-control', 'accept': '*/*'}),
            'description': forms.Textarea(attrs={'class': 'form-control', 'rows': 2, 'placeholder': 'Optional description of this record'}),
        }