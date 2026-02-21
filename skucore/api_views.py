from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from django.shortcuts import get_object_or_404
from django.utils import timezone

from .models import (
    Student, Parent, Grade, Subject, Bus, Route,
    Attendance, Address, Record, StudentOnboardingRequest
)
from .serializers import (
    StudentSerializer, ParentSerializer, GradeSerializer,
    SubjectSerializer, BusSerializer, RouteSerializer,
    AttendanceSerializer, AddressSerializer, RecordSerializer,
    StudentOnboardingSerializer
)
from .permissions import user_is_admin


# ============================================================
# AUTH ENDPOINTS
# ============================================================

@api_view(['POST'])
@permission_classes([AllowAny])
def api_login(request):
    """
    POST /api/auth/login/
    Body: { "username": "admin", "password": "yourpassword" }
    Returns: { "token": "...", "user_id": 1, "username": "admin" }
    """
    username = request.data.get('username')
    password = request.data.get('password')

    if not username or not password:
        return Response(
            {'error': 'Username and password are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    user = authenticate(username=username, password=password)
    if not user:
        return Response(
            {'error': 'Invalid credentials'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    token, _ = Token.objects.get_or_create(user=user)
    return Response({
        'token': token.key,
        'user_id': user.id,
        'username': user.username,
        'email': user.email,
        'is_staff': user.is_staff,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_logout(request):
    """
    POST /api/auth/logout/
    Header: Authorization: Token <your_token>
    """
    request.user.auth_token.delete()
    return Response({'message': 'Logged out successfully'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_me(request):
    """
    GET /api/auth/me/
    Returns current user info and school context
    """
    user = request.user
    school = getattr(request, 'school', None)
    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'is_staff': user.is_staff,
        'school': {
            'id': school.id,
            'name': school.name,
            'code': school.code,
        } if school else None
    })


# ============================================================
# BASE VIEWSET
# ============================================================

class SchoolFilteredViewSet(viewsets.ModelViewSet):
    """Base viewset that auto-filters queryset by school and sets school on create."""
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        school = getattr(self.request, 'school', None)
        if school:
            return self.queryset.filter(school=school)
        return self.queryset.none()

    def perform_create(self, serializer):
        school = getattr(self.request, 'school', None)
        serializer.save(school=school)


# ============================================================
# GRADE VIEWSET
# ============================================================

class GradeViewSet(SchoolFilteredViewSet):
    """
    GET    /api/grades/           - List all grades
    POST   /api/grades/           - Create grade
    GET    /api/grades/{id}/      - Retrieve grade
    PUT    /api/grades/{id}/      - Update grade
    PATCH  /api/grades/{id}/      - Partial update
    DELETE /api/grades/{id}/      - Delete grade
    """
    queryset = Grade.objects.all()
    serializer_class = GradeSerializer


# ============================================================
# SUBJECT VIEWSET
# ============================================================

class SubjectViewSet(SchoolFilteredViewSet):
    """
    GET    /api/subjects/         - List all subjects
    POST   /api/subjects/         - Create subject
    GET    /api/subjects/{id}/    - Retrieve subject
    PUT    /api/subjects/{id}/    - Update subject
    PATCH  /api/subjects/{id}/    - Partial update
    DELETE /api/subjects/{id}/    - Delete subject
    """
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer


# ============================================================
# ROUTE VIEWSET
# ============================================================

class RouteViewSet(SchoolFilteredViewSet):
    """
    GET    /api/routes/           - List all routes
    POST   /api/routes/           - Create route
    GET    /api/routes/{id}/      - Retrieve route
    PUT    /api/routes/{id}/      - Update route
    PATCH  /api/routes/{id}/      - Partial update
    DELETE /api/routes/{id}/      - Delete route
    """
    queryset = Route.objects.all()
    serializer_class = RouteSerializer


# ============================================================
# BUS VIEWSET
# ============================================================

class BusViewSet(SchoolFilteredViewSet):
    """
    GET    /api/buses/                      - List all buses
    POST   /api/buses/                      - Create bus
    GET    /api/buses/{id}/                 - Retrieve bus
    PUT    /api/buses/{id}/                 - Update bus
    PATCH  /api/buses/{id}/                 - Partial update
    DELETE /api/buses/{id}/                 - Delete bus
    GET    /api/buses/{id}/students/        - List students on this bus
    """
    queryset = Bus.objects.select_related('route').all()
    serializer_class = BusSerializer

    @action(detail=True, methods=['get'])
    def students(self, request, pk=None):
        """GET /api/buses/{id}/students/ - Get all students on this bus"""
        bus = self.get_object()
        students = bus.students.filter(school=request.school)
        serializer = StudentSerializer(students, many=True)
        return Response(serializer.data)


# ============================================================
# PARENT VIEWSET
# ============================================================

class ParentViewSet(SchoolFilteredViewSet):
    """
    GET    /api/parents/          - List all parents
    POST   /api/parents/          - Create parent
    GET    /api/parents/{id}/     - Retrieve parent
    PUT    /api/parents/{id}/     - Update parent
    PATCH  /api/parents/{id}/     - Partial update
    DELETE /api/parents/{id}/     - Delete parent
    GET    /api/parents/{id}/students/ - List children of this parent
    """
    queryset = Parent.objects.select_related('address').all()
    serializer_class = ParentSerializer

    @action(detail=True, methods=['get'])
    def students(self, request, pk=None):
        """GET /api/parents/{id}/students/ - Get all children of this parent"""
        parent = self.get_object()
        students = parent.students.filter(school=request.school)
        serializer = StudentSerializer(students, many=True)
        return Response(serializer.data)


# ============================================================
# STUDENT VIEWSET
# ============================================================

class StudentViewSet(SchoolFilteredViewSet):
    """
    GET    /api/students/                       - List all students
    POST   /api/students/                       - Create student (admin only)
    GET    /api/students/{id}/                  - Retrieve student
    PUT    /api/students/{id}/                  - Update student (admin only)
    PATCH  /api/students/{id}/                  - Partial update (admin only)
    DELETE /api/students/{id}/                  - Delete student (admin only)
    GET    /api/students/active/                - List only active students
    GET    /api/students/{id}/attendance/       - Student's attendance history
    POST   /api/students/{id}/records/          - Upload a record for student
    GET    /api/students/{id}/records/          - List records for student
    """
    queryset = Student.objects.select_related('grade', 'bus').prefetch_related(
        'parents', 'subjects', 'records'
    ).all()
    serializer_class = StudentSerializer

    def create(self, request, *args, **kwargs):
        if not user_is_admin(request.user):
            return Response(
                {'error': 'Only admins can create students directly. Use the onboarding workflow.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        if not user_is_admin(request.user):
            return Response(
                {'error': 'Only admins can update student records.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not user_is_admin(request.user):
            return Response(
                {'error': 'Only admins can delete student records.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def active(self, request):
        """GET /api/students/active/ - List only active students"""
        students = self.get_queryset().filter(is_active=True)
        serializer = self.get_serializer(students, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def attendance(self, request, pk=None):
        """GET /api/students/{id}/attendance/ - Get attendance history for a student"""
        student = self.get_object()
        records = student.attendance_records.all().order_by('-date')

        # Optional filter by date range
        from_date = request.query_params.get('from_date')
        to_date = request.query_params.get('to_date')
        if from_date:
            records = records.filter(date__gte=from_date)
        if to_date:
            records = records.filter(date__lte=to_date)

        serializer = AttendanceSerializer(records, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get', 'post'])
    def records(self, request, pk=None):
        """
        GET  /api/students/{id}/records/ - List all documents/records for a student
        POST /api/students/{id}/records/ - Upload a new document/record
        """
        student = self.get_object()

        if request.method == 'POST':
            serializer = RecordSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save(
                    student=student,
                    school=request.school,
                    uploaded_by=request.user
                )
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        records = student.records.all()
        serializer = RecordSerializer(records, many=True)
        return Response(serializer.data)


# ============================================================
# ATTENDANCE VIEWSET
# ============================================================

class AttendanceViewSet(SchoolFilteredViewSet):
    """
    GET    /api/attendance/               - List attendance records
    POST   /api/attendance/               - Create single attendance record
    GET    /api/attendance/{id}/          - Retrieve attendance record
    PUT    /api/attendance/{id}/          - Update attendance record
    PATCH  /api/attendance/{id}/          - Partial update
    DELETE /api/attendance/{id}/          - Delete attendance record
    POST   /api/attendance/bulk/          - Create multiple attendance records
    GET    /api/attendance/by_date/       - Get attendance for a specific date (?date=YYYY-MM-DD)
    GET    /api/attendance/summary/       - Attendance summary for a date (?date=YYYY-MM-DD)
    """
    queryset = Attendance.objects.select_related('student').all()
    serializer_class = AttendanceSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        # Optional filter by student
        student_id = self.request.query_params.get('student_id')
        if student_id:
            qs = qs.filter(student_id=student_id)
        return qs

    @action(detail=False, methods=['post'])
    def bulk(self, request):
        """
        POST /api/attendance/bulk/
        Body: [
            {"student": 1, "date": "2026-02-19", "status": "present"},
            {"student": 2, "date": "2026-02-19", "status": "absent"},
            ...
        ]
        """
        if not isinstance(request.data, list):
            return Response(
                {'error': 'Expected a list of attendance records'},
                status=status.HTTP_400_BAD_REQUEST
            )

        created = []
        errors = []

        for idx, item in enumerate(request.data):
            serializer = AttendanceSerializer(data=item)
            if serializer.is_valid():
                serializer.save(school=request.school)
                created.append(serializer.data)
            else:
                errors.append({'index': idx, 'errors': serializer.errors})

        if errors:
            return Response(
                {'created': created, 'errors': errors},
                status=status.HTTP_207_MULTI_STATUS
            )

        return Response(
            {'message': f'{len(created)} attendance records created', 'data': created},
            status=status.HTTP_201_CREATED
        )

    @action(detail=False, methods=['get'])
    def by_date(self, request):
        """
        GET /api/attendance/by_date/?date=2026-02-19
        Returns all attendance records for a specific date
        """
        date = request.query_params.get('date')
        if not date:
            return Response(
                {'error': 'date query parameter is required (YYYY-MM-DD)'},
                status=status.HTTP_400_BAD_REQUEST
            )
        records = self.get_queryset().filter(date=date)
        serializer = self.get_serializer(records, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """
        GET /api/attendance/summary/?date=2026-02-19
        Returns count of present, absent, late, excused for a date
        """
        date = request.query_params.get('date')
        if not date:
            return Response(
                {'error': 'date query parameter is required (YYYY-MM-DD)'},
                status=status.HTTP_400_BAD_REQUEST
            )
        records = self.get_queryset().filter(date=date)
        summary = {
            'date': date,
            'total': records.count(),
            'present': records.filter(status='present').count(),
            'absent': records.filter(status='absent').count(),
            'late': records.filter(status='late').count(),
            'excused': records.filter(status='excused').count(),
        }
        return Response(summary)


# ============================================================
# ONBOARDING VIEWSET
# ============================================================

class OnboardingViewSet(SchoolFilteredViewSet):
    """
    GET    /api/onboarding/               - List onboarding requests
    POST   /api/onboarding/               - Submit new onboarding request
    GET    /api/onboarding/{id}/          - Retrieve request
    GET    /api/onboarding/pending/       - List pending requests
    POST   /api/onboarding/{id}/approve/  - Approve request (admin only)
    POST   /api/onboarding/{id}/reject/   - Reject request (admin only)
    """
    queryset = StudentOnboardingRequest.objects.all()
    serializer_class = StudentOnboardingSerializer

    def perform_create(self, serializer):
        if not self.request.school:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'school': 'No active school context. Please select a school before submitting an onboarding request.'})
        serializer.save(
            school=self.request.school,
            requested_by=self.request.user
        )

    @action(detail=False, methods=['get'])
    def pending(self, request):
        """GET /api/onboarding/pending/ - List all pending onboarding requests"""
        if not user_is_admin(request.user):
            return Response(
                {'error': 'Only admins can view pending onboarding requests'},
                status=status.HTTP_403_FORBIDDEN
            )
        pending = self.get_queryset().filter(status='pending')
        serializer = self.get_serializer(pending, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """POST /api/onboarding/{id}/approve/ - Approve and auto-create student"""
        if not user_is_admin(request.user):
            return Response(
                {'error': 'Only admins can approve onboarding requests'},
                status=status.HTTP_403_FORBIDDEN
            )
        onboarding = self.get_object()
        if onboarding.status != 'pending':
            return Response(
                {'error': f'Request is already {onboarding.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create the student from onboarding data
        student = Student.objects.create(
            school=onboarding.school,
            first_name=onboarding.first_name,
            last_name=onboarding.last_name,
            email=onboarding.email,
            phone_number=onboarding.phone_number,
            date_of_birth=onboarding.date_of_birth,
            photo=onboarding.photo,
            grade=onboarding.grade,
            bus=onboarding.bus,
            address=onboarding.address,
        )
        student.parents.set(onboarding.parents.all())
        student.subjects.set(onboarding.subjects.all())

        onboarding.status = 'completed'
        onboarding.approved_by = request.user
        onboarding.approved_at = timezone.now()
        onboarding.created_student = student
        onboarding.save()

        return Response({
            'message': 'Onboarding request approved and student created',
            'student_id': student.id,
            'student': StudentSerializer(student).data
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """POST /api/onboarding/{id}/reject/ - Reject an onboarding request"""
        if not user_is_admin(request.user):
            return Response(
                {'error': 'Only admins can reject onboarding requests'},
                status=status.HTTP_403_FORBIDDEN
            )
        onboarding = self.get_object()
        if onboarding.status != 'pending':
            return Response(
                {'error': f'Request is already {onboarding.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        reason = request.data.get('rejection_reason', '')
        onboarding.status = 'rejected'
        onboarding.approved_by = request.user
        onboarding.rejection_reason = reason
        onboarding.save()

        return Response({'message': 'Onboarding request rejected', 'reason': reason})
