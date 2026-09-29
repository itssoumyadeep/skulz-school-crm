from datetime import date
from decimal import Decimal
from typing import Any, Dict, List, Optional, Literal

from pydantic import BaseModel, EmailStr, Field, UUID4, field_validator, model_validator


class StaffCreateSchema(BaseModel):
    name: str
    role: str
    dept: str
    employment_type: Literal['Full_Time', 'Part_Time', 'Contract', 'Temporary'] = 'Full_Time'
    start_date: date
    salary: Decimal = Decimal('0.00')
    certifications: List[Dict[str, Any]] = Field(default_factory=list)
    dbs_ref: str = ''
    dbs_expiry: Optional[date] = None

    @field_validator('salary')
    @classmethod
    def salary_non_negative(cls, value: Decimal) -> Decimal:
        if value < 0:
            raise ValueError('salary must be non-negative')
        return value


class PayrollComputeSchema(BaseModel):
    staff_id: UUID4
    base_salary: Decimal
    allowances: Dict[str, Any] = Field(default_factory=dict)
    deductions: Dict[str, Any] = Field(default_factory=dict)

    @field_validator('base_salary')
    @classmethod
    def base_salary_non_negative(cls, value: Decimal) -> Decimal:
        if value < 0:
            raise ValueError('base_salary must be non-negative')
        return value


class PayrollApproveSchema(BaseModel):
    approved_by: UUID4


class AppraisalCreateSchema(BaseModel):
    staff_id: UUID4
    cycle: str
    self_score: Optional[Decimal] = None
    manager_score: Optional[Decimal] = None
    outcome: str = ''
    notes: str = ''


class VendorCreateSchema(BaseModel):
    name: str
    contact_name: str = ''
    phone: str = ''
    email: Optional[EmailStr] = None
    payment_terms: str = ''


class RequisitionCreateSchema(BaseModel):
    vendor_id: UUID4
    requester_id: UUID4
    item_name: str
    quantity: int = 1
    amount: Decimal
    reason: str = ''


class PurchaseOrderCreateSchema(BaseModel):
    vendor_id: UUID4
    requisition_id: Optional[UUID4] = None
    po_number: str
    amount: Decimal
    expected_delivery_date: Optional[date] = None


class DeliveryRecordCreateSchema(BaseModel):
    purchase_order_id: UUID4
    vendor_id: UUID4
    amount: Decimal
    notes: str = ''


class VendorInvoiceCreateSchema(BaseModel):
    vendor_id: UUID4
    purchase_order_id: Optional[UUID4] = None
    invoice_number: str
    amount: Decimal
    due_date: Optional[date] = None
    verify_only: bool = False


class EventCreateSchema(BaseModel):
    title: str
    event_date: date
    registration_deadline: date
    location: str
    description: str = ''
    fee_amount: Decimal = Decimal('0.00')
    capacity: int = 0
    requires_permission_slip: bool = True

    @model_validator(mode='after')
    def validate_dates(self) -> 'EventCreateSchema':
        if self.registration_deadline > self.event_date:
            raise ValueError('registration_deadline cannot be after event_date')
        return self


class EventRegistrationCreateSchema(BaseModel):
    participant_name: str
    participant_email: Optional[EmailStr] = None
    participant_phone: str = ''
    permission_slip_received: bool = False
    payment_status: Literal['Pending', 'Paid', 'Waived'] = 'Pending'


class EventVolunteerCreateSchema(BaseModel):
    volunteer_name: str
    role: str
    phone: str = ''


class MessageCreateSchema(BaseModel):
    channel: Literal['SMS', 'Email', 'Push', 'In_App']
    subject: str = ''
    body: str
    recipient_id: Optional[UUID4] = None
    recipient_role: str = ''
    trigger_event: str = ''
    payload: Dict[str, Any] = Field(default_factory=dict)


class NotificationRuleCreateSchema(BaseModel):
    trigger_event: str
    channel: Literal['SMS', 'Email', 'Push']
    template_name: str
    conditions: Dict[str, Any] = Field(default_factory=dict)
    active: bool = True
    priority: int = 1
    emergency: bool = False


class EmergencyBroadcastSchema(BaseModel):
    subject: str
    body: str
    recipients: List[UUID4] = Field(default_factory=list)
