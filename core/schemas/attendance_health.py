"""Pydantic schemas for attendance marking, rosters, leave requests, medical records, medication logs, and incidents."""

from datetime import date, date as DateType
from typing import Optional, List, Dict, Any
from uuid import UUID
from decimal import Decimal
from pydantic import BaseModel, Field, field_validator

ATTENDANCE_STATUSES = ['Present', 'Absent', 'Late', 'Excused', 'On Leave', 'Holiday']


class AttendanceMarkSchema(BaseModel):
    student_id: UUID
    class_id: UUID
    date: date
    status: str = "Present"  # Present, Absent, Late, Excused
    method: str = "Manual"   # Manual, QR, Biometric, Web
    period: str = "Full_Day"

    @field_validator('status')
    @classmethod
    def valid_status(cls, v: str) -> str:
        if v not in ATTENDANCE_STATUSES:
            raise ValueError(f"status must be one of {ATTENDANCE_STATUSES}")
        return v


class AttendanceUpdateSchema(BaseModel):
    status: Optional[str] = None
    method: Optional[str] = None
    period: Optional[str] = None
    notified_parent: Optional[bool] = None

    @field_validator('status')
    @classmethod
    def valid_status(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if v not in ATTENDANCE_STATUSES:
            raise ValueError(f"status must be one of {ATTENDANCE_STATUSES}")
        return v

    @field_validator('method')
    @classmethod
    def valid_method(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        allowed = ['Manual', 'QR', 'Biometric', 'Web']
        if v not in allowed:
            raise ValueError(f"method must be one of {allowed}")
        return v


class AttendanceRosterMarkSchema(BaseModel):
    student_id: UUID
    status: str

    @field_validator('status')
    @classmethod
    def valid_status(cls, v: str) -> str:
        if v not in ATTENDANCE_STATUSES:
            raise ValueError(f"status must be one of {ATTENDANCE_STATUSES}")
        return v


class AttendanceRosterBulkMarkSchema(BaseModel):
    date: date
    records: List[AttendanceRosterMarkSchema] = Field(min_length=1, max_length=500)


class LeaveRequestCreateSchema(BaseModel):
    requester_id: UUID
    requester_type: str = "Student"  # Student, Staff
    leave_type: str = "Sick"         # Sick, Casual, Annual, Unpaid, Emergency
    start_date: date
    end_date: date
    days: Decimal = Decimal("1.0")
    reason: str

    @field_validator('requester_type')
    @classmethod
    def valid_requester(cls, v: str) -> str:
        if v not in ['Student', 'Staff']:
            raise ValueError("requester_type must be Student or Staff")
        return v

    def model_post_init(self, __context) -> None:
        if self.end_date < self.start_date:
            raise ValueError('end_date cannot be earlier than start_date')


class LeaveRequestApproveSchema(BaseModel):
    status: str = "Approved"  # Approved, Rejected


class StaffSubstitutionSchema(BaseModel):
    absent_staff_id: UUID
    substitute_id: UUID
    date: date


class HealthObservationCreateSchema(BaseModel):
    student_id: UUID
    date: date
    mood: str = "Happy"
    appetite: str = "Good"
    nap_duration_mins: int = 0
    feeding_notes: Optional[str] = ""
    general_notes: Optional[str] = ""


class MedicationLogCreateSchema(BaseModel):
    student_id: UUID
    medicine_name: str
    dose: str
    notes: Optional[str] = ""
    force: bool = False
    time_administered: Optional[str] = None
    parent_notified: bool = True


class IncidentCreateSchema(BaseModel):
    incident_type: str  # Injury, Allergic_Reaction, Behavioral, Safeguarding, Facility
    severity: str = "Low"  # Low, Medium, High, Critical
    date: date
    time: str = "12:00"
    location: str
    body_part: str = ""
    description: str
    actions_taken: str
    students: List[str] = Field(default_factory=list)
    staff: List[str] = Field(default_factory=list)


class SafetyDrillCreateSchema(BaseModel):
    drill_type: str  # Fire, Lockdown, Earthquake, Severe_Weather
    scheduled_date: date
    duration_seconds: int = 120
    participation_rate: Decimal = Decimal("100.00")
    issues_noted: List[str] = Field(default_factory=list)
    signed_off: bool = True


class StaffAttendanceCreateInput(BaseModel):
    staff_id: UUID
    date: date
    check_in: str = ""
    check_out: str = ""
    method: str = "Manual"
    status: str = "Present"  # Present, Absent, Late, Half_Day, On_Leave
    substitute_id: Optional[UUID] = None
    geofence_verified: bool = False


class StaffAttendanceUpdateInput(BaseModel):
    check_in: Optional[str] = None
    check_out: Optional[str] = None
    method: Optional[str] = None
    status: Optional[str] = None
    substitute_id: Optional[UUID] = None
    geofence_verified: Optional[bool] = None


class AttendanceRosterCreateInput(BaseModel):
    class_id: UUID
    date: date
    window_start: str = "08:00"
    window_end: str = "10:00"


class RosterUpdateInput(BaseModel):
    window_start: Optional[str] = None
    window_end: Optional[str] = None


class ScheduledMedicationItemSchema(BaseModel):
    name: str
    dosage: Optional[str] = ""
    scheduled_time: Optional[str] = ""
    consent: Optional[str] = ""
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class StudentHealthUpsertInput(BaseModel):
    allergies: Optional[List[Any]] = None
    conditions: Optional[List[Any]] = None
    medications: Optional[List[Any]] = None
    vaccinations: Optional[List[Any]] = None
    doctor_name: Optional[str] = None
    doctor_phone: Optional[str] = None
    consent_flag: Optional[bool] = None
    photo_consent: Optional[bool] = None
    topical_consent: Optional[bool] = None


class HealthObservationUpdateInput(BaseModel):
    mood: Optional[str] = None
    appetite: Optional[str] = None
    nap_duration_mins: Optional[int] = None
    feeding_notes: Optional[str] = None
    general_notes: Optional[str] = None


class MedicationLogUpdateInput(BaseModel):
    medicine_name: Optional[str] = None
    dose: Optional[str] = None
    notes: Optional[str] = None
    parent_notified: Optional[bool] = None
    time_administered: Optional[str] = None


class IncidentAcknowledgeInput(BaseModel):
    actions_taken: Optional[str] = None
    escalated_to_principal: Optional[bool] = None
    parent_notified: Optional[bool] = None
    acknowledge: bool = True


class SafetyDrillUpdateInput(BaseModel):
    duration_seconds: Optional[int] = None
    participation_rate: Optional[Decimal] = None
    issues_noted: Optional[List[str]] = None
    signed_off: Optional[bool] = None


class CheckInOutSchema(BaseModel):
    student_id: UUID
    class_id: Optional[UUID] = None
    date: Optional[DateType] = None
    symptoms: Optional[List[str]] = None
    temperature_c: Optional[float] = None
    supervisor_override: bool = False
    override_reason: str = ""
    late_reason: Optional[str] = None


class AttendanceConfigUpdateSchema(BaseModel):
    expected_start_time: str = "09:00"
    grace_period_minutes: int = 15
    late_check_in_cutoff: Optional[str] = None


class PickupVerifySchema(BaseModel):
    contact_id: UUID
    pin: Optional[str] = None
    id_verified: bool = False
    admin_override: bool = False


class SupervisorAttendanceOverrideSchema(BaseModel):
    student_id: UUID
    date: DateType
    status: str = "Present"
    override_reason: str = ""
    late_reason: Optional[str] = None

    @field_validator('status')
    @classmethod
    def valid_status(cls, v: str) -> str:
        if v not in ATTENDANCE_STATUSES:
            raise ValueError(f"status must be one of {ATTENDANCE_STATUSES}")
        return v


class AttendanceRollAuditConfirmSchema(BaseModel):
    class_id: Optional[UUID] = None
    note: str = ""

