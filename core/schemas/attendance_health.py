from datetime import date
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


class IncidentCreateSchema(BaseModel):
    incident_type: str  # Injury, Allergic_Reaction, Behavioral, Safeguarding, Facility
    severity: str = "Low"  # Low, Medium, High, Critical
    date: date
    time: str = "12:00"
    location: str
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
