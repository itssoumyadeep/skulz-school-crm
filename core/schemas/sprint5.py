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


class StaffUpdateSchema(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    dept: Optional[str] = None
    employment_type: Optional[Literal['Full_Time', 'Part_Time', 'Contract', 'Temporary']] = None
    start_date: Optional[date] = None
    salary: Optional[Decimal] = None
    certifications: Optional[List[Dict[str, Any]]] = None
    dbs_ref: Optional[str] = None
    dbs_expiry: Optional[date] = None
    active: Optional[bool] = None


class ContractCreateSchema(BaseModel):
    contract_type: str = 'Standard'
    start_date: date
    end_date: Optional[date] = None
    esigned: bool = False
    renewal_alert_sent: bool = False

    @model_validator(mode='after')
    def validate_dates(self) -> 'ContractCreateSchema':
        if self.end_date and self.end_date < self.start_date:
            raise ValueError('end_date cannot be earlier than start_date')
        return self


class ContractUpdateSchema(BaseModel):
    contract_type: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    esigned: Optional[bool] = None
    renewal_alert_sent: Optional[bool] = None


class AppraisalUpdateSchema(BaseModel):
    self_score: Optional[Decimal] = None
    manager_score: Optional[Decimal] = None
    outcome: Optional[str] = None
    status: Optional[Literal['Draft', 'Submitted', 'Reviewed', 'Closed']] = None
    notes: Optional[str] = None


class CPDRecordCreateSchema(BaseModel):
    activity: str
    activity_type: str
    hours: Decimal = Decimal('0.00')
    mandatory: bool = False
    completion_status: Literal['Planned', 'In_Progress', 'Completed'] = 'Planned'


class CPDRecordUpdateSchema(BaseModel):
    activity: Optional[str] = None
    activity_type: Optional[str] = None
    hours: Optional[Decimal] = None
    mandatory: Optional[bool] = None
    completion_status: Optional[Literal['Planned', 'In_Progress', 'Completed']] = None


class VendorUpdateSchema(BaseModel):
    name: Optional[str] = None
    contact_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    payment_terms: Optional[str] = None
    active: Optional[bool] = None


class RequisitionUpdateSchema(BaseModel):
    item_name: Optional[str] = None
    quantity: Optional[int] = None
    amount: Optional[Decimal] = None
    reason: Optional[str] = None
    status: Optional[Literal['Draft', 'Submitted', 'Approved', 'Rejected']] = None


class PurchaseOrderUpdateSchema(BaseModel):
    amount: Optional[Decimal] = None
    expected_delivery_date: Optional[date] = None
    status: Optional[Literal['Draft', 'Issued', 'Received', 'Closed']] = None


class DeliveryRecordUpdateSchema(BaseModel):
    amount: Optional[Decimal] = None
    notes: Optional[str] = None
    accepted: Optional[bool] = None


class InventoryCreateSchema(BaseModel):
    vendor_id: Optional[UUID4] = None
    item_name: str
    sku: str = ''
    quantity_on_hand: int = 0
    reorder_level: int = 0
    unit_cost: Decimal = Decimal('0.00')
    last_restocked: Optional[date] = None


class InventoryUpdateSchema(BaseModel):
    vendor_id: Optional[UUID4] = None
    item_name: Optional[str] = None
    sku: Optional[str] = None
    quantity_on_hand: Optional[int] = None
    reorder_level: Optional[int] = None
    unit_cost: Optional[Decimal] = None
    last_restocked: Optional[date] = None


class EventUpdateSchema(BaseModel):
    title: Optional[str] = None
    event_date: Optional[date] = None
    registration_deadline: Optional[date] = None
    location: Optional[str] = None
    description: Optional[str] = None
    fee_amount: Optional[Decimal] = None
    capacity: Optional[int] = None
    requires_permission_slip: Optional[bool] = None
    status: Optional[Literal['Draft', 'Open', 'Closed', 'Completed']] = None


class EventRegistrationUpdateSchema(BaseModel):
    registration_status: Optional[Literal['Registered', 'Waitlisted', 'Cancelled']] = None
    permission_slip_received: Optional[bool] = None
    payment_status: Optional[Literal['Pending', 'Paid', 'Waived']] = None


class EventReportUpdateSchema(BaseModel):
    attendees_count: Optional[int] = None
    revenue: Optional[Decimal] = None
    expenses: Optional[Decimal] = None
    summary: Optional[str] = None


class MessageUpdateSchema(BaseModel):
    delivery_status: Optional[Literal['Queued', 'Sent', 'Delivered', 'Failed']] = None


class NotificationRuleUpdateSchema(BaseModel):
    template_name: Optional[str] = None
    conditions: Optional[Dict[str, Any]] = None
    active: Optional[bool] = None
    priority: Optional[int] = None
    emergency: Optional[bool] = None

