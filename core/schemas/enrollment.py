from datetime import date, datetime
from decimal import Decimal
from typing import Optional, Literal
from uuid import UUID
from pydantic import BaseModel, Field, field_validator, EmailStr

class EnrollmentCreateSchema(BaseModel):
    first_name: str
    last_name: str
    dob: Optional[date] = None
    grade: str
    desired_start_date: Optional[date] = None
    preferred_intake: Optional[str] = None
    comments: Optional[str] = None
    save_as_draft: bool = True
    parent_name: str
    parent_relationship: str = "Parent"
    parent_email: EmailStr
    parent_phone: str
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relationship: Optional[str] = None
    medical_consent: bool = False

    @field_validator('dob')
    @classmethod
    def dob_not_future(cls, v: Optional[date]) -> Optional[date]:
        if v is not None and v >= date.today():
            raise ValueError('Date of birth cannot be today or in the future')
        return v

    @property
    def student_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()


class EnrollmentDraftUpdateSchema(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    dob: Optional[date] = None
    grade: Optional[str] = None
    desired_start_date: Optional[date] = None
    preferred_intake: Optional[str] = None
    comments: Optional[str] = None
    parent_name: Optional[str] = None
    parent_email: Optional[EmailStr] = None
    parent_phone: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relationship: Optional[str] = None
    medical_consent: Optional[bool] = None
    save_as_draft: Optional[bool] = None


class AssessmentAssignmentSchema(BaseModel):
    assessor_id: UUID
    scheduled_at: datetime
    assessment_with: Literal['Principal', 'Teacher', 'Admin'] = 'Teacher'
    assessor_name: str = ''
    comments: str = ''


class AssessmentSubmissionSchema(BaseModel):
    score: int = Field(ge=0, le=100)
    recommendation: Literal['Recommend Admission', 'Needs further review', 'Not recommended']
    notes: str


class EnrollmentRecommendationSchema(BaseModel):
    recommendation: Literal['Offered', 'Waitlisted', 'Rejected']
    reason: str


class EnrollmentDecisionSchema(BaseModel):
    decision: str  # Pending, Pending_Clarification, Under_Review, Offered, Accepted, Rejected, Waitlisted, Active
    reason: Optional[str] = None
    invoice_amount: Optional[Decimal] = Field(default=None, gt=0)

    @field_validator('decision')
    @classmethod
    def valid_decision(cls, v: str) -> str:
        allowed = ['Pending', 'Pending_Clarification', 'Under_Review', 'Offered', 'Accepted', 'Rejected', 'Waitlisted', 'Active']
        if v not in allowed:
            raise ValueError(f"Decision must be one of {allowed}")
        return v


class DocumentUploadSchema(BaseModel):
    doc_type: str  # birth_certificate, previous_school_records, photo, immunization
    file_path: str

    @field_validator('doc_type')
    @classmethod
    def valid_doc_type(cls, v: str) -> str:
        allowed = ['birth_certificate', 'previous_school_records', 'photo', 'immunization', 'proof_of_address', 'other']
        if v not in allowed:
            raise ValueError(f"Document type must be one of {allowed}")
        return v


class DocumentVerifySchema(BaseModel):
    verified: bool = True


class StudentUpdateSchema(BaseModel):
    name: Optional[str] = None
    dob: Optional[date] = None
    grade: Optional[str] = None
    section: Optional[str] = None
    class_teacher: Optional[str] = None
    status: Optional[str] = None
    class_id: Optional[UUID] = None
    enrolled_date: Optional[date] = None
    student_number: Optional[str] = None

    @field_validator('status')
    @classmethod
    def valid_status(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        allowed = ['Inquiry', 'Applied', 'Offered', 'Accepted', 'Active', 'Waitlisted', 'Rejected', 'Withdrawn']
        if v not in allowed:
            raise ValueError(f"Status must be one of {allowed}")
        return v


class EmergencyContactCreateSchema(BaseModel):
    name: str
    phone: str
    relationship: str
    medical_consent: bool = False
