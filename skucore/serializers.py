from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    Address, Grade, Subject, Route, Bus, Parent,
    Student, Attendance, Record, StudentOnboardingRequest,
    School, UserRole
)


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = ['id', 'street_address', 'city', 'state', 'postal_code', 'country']


class GradeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Grade
        fields = ['id', 'grade_name', 'description', 'school', 'created_at']
        read_only_fields = ['id', 'created_at', 'school']


class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = ['id', 'subject_name', 'description', 'school', 'created_at']
        read_only_fields = ['id', 'created_at', 'school']


class RouteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Route
        fields = ['id', 'route_name', 'start_location', 'end_location', 'stops', 'school', 'created_at']
        read_only_fields = ['id', 'created_at', 'school']


class BusSerializer(serializers.ModelSerializer):
    route_detail = RouteSerializer(source='route', read_only=True)
    route = serializers.PrimaryKeyRelatedField(queryset=Route.objects.all())

    class Meta:
        model = Bus
        fields = [
            'id', 'bus_number', 'capacity', 'driver_name', 'driver_phone',
            'route', 'route_detail', 'school', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'school']


class ParentSerializer(serializers.ModelSerializer):
    address_detail = AddressSerializer(source='address', read_only=True)
    address = serializers.PrimaryKeyRelatedField(
        queryset=Address.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = Parent
        fields = [
            'id', 'first_name', 'last_name', 'parent_type', 'email',
            'phone_number', 'address', 'address_detail', 'school',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'school']


class RecordSerializer(serializers.ModelSerializer):
    uploaded_by_username = serializers.CharField(source='uploaded_by.username', read_only=True)

    class Meta:
        model = Record
        fields = [
            'id', 'record_type', 'file', 'description',
            'uploaded_by', 'uploaded_by_username', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'uploaded_by']


class StudentSerializer(serializers.ModelSerializer):
    grade_detail = GradeSerializer(source='grade', read_only=True)
    bus_detail = BusSerializer(source='bus', read_only=True)
    parents_detail = ParentSerializer(source='parents', many=True, read_only=True)
    subjects_detail = SubjectSerializer(source='subjects', many=True, read_only=True)
    records = RecordSerializer(many=True, read_only=True)

    grade = serializers.PrimaryKeyRelatedField(
        queryset=Grade.objects.all(), required=False, allow_null=True
    )
    bus = serializers.PrimaryKeyRelatedField(
        queryset=Bus.objects.all(), required=False, allow_null=True
    )
    parents = serializers.PrimaryKeyRelatedField(
        queryset=Parent.objects.all(), many=True, required=False
    )
    subjects = serializers.PrimaryKeyRelatedField(
        queryset=Subject.objects.all(), many=True, required=False
    )

    class Meta:
        model = Student
        fields = [
            'id', 'first_name', 'last_name', 'email', 'phone_number',
            'date_of_birth', 'enrollment_date', 'photo', 'is_active',
            'grade', 'grade_detail',
            'bus', 'bus_detail',
            'parents', 'parents_detail',
            'subjects', 'subjects_detail',
            'records', 'school', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'enrollment_date', 'created_at', 'updated_at', 'school']


class AttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    student = serializers.PrimaryKeyRelatedField(queryset=Student.objects.all())

    def get_student_name(self, obj):
        return f"{obj.student.first_name} {obj.student.last_name}"

    class Meta:
        model = Attendance
        fields = [
            'id', 'student', 'student_name', 'date', 'status',
            'remarks', 'recorded_by', 'school', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'school']


class StudentOnboardingSerializer(serializers.ModelSerializer):
    requested_by_username = serializers.CharField(source='requested_by.username', read_only=True)
    approved_by_username = serializers.CharField(source='approved_by.username', read_only=True, allow_null=True)

    class Meta:
        model = StudentOnboardingRequest
        fields = [
            'id', 'first_name', 'last_name', 'email', 'phone_number',
            'date_of_birth', 'photo', 'grade', 'bus', 'status',
            'requested_by', 'requested_by_username',
            'approved_by', 'approved_by_username',
            'rejection_reason', 'school', 'created_at', 'approved_at'
        ]
        read_only_fields = [
            'id', 'requested_by', 'approved_by', 'status',
            'created_at', 'approved_at', 'school'
        ]


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_staff']
        read_only_fields = ['id']
