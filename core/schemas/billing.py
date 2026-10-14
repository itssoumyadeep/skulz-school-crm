from datetime import date
from decimal import Decimal
from typing import Any, Dict, List, Optional, Literal
from uuid import UUID

from pydantic import BaseModel, Field, UUID4, field_validator, model_validator


class FeeStructureCreateSchema(BaseModel):
    grade: str
    term: str
    components: List[Dict[str, Any]] = Field(default_factory=list)
    discount_rules: List[Dict[str, Any]] = Field(default_factory=list)
    penalty_rules: Dict[str, Any] = Field(default_factory=dict)
    version: str = "1.0"


class InvoiceCreateSchema(BaseModel):
    student_id: UUID4
    parent_id: UUID4
    fee_struct_id: Optional[UUID4] = None
    invoice_date: date
    due_date: date
    line_items: List[Dict[str, Any]] = Field(default_factory=list)
    invoice_type: str = "Tuition"

    @model_validator(mode="after")
    def validate_dates(self) -> "InvoiceCreateSchema":
        if self.due_date < self.invoice_date:
            raise ValueError("due_date cannot be earlier than invoice_date")
        if not self.line_items:
            raise ValueError("line_items cannot be empty")
        return self


class BulkInvoiceGenerateSchema(BaseModel):
    fee_struct_id: UUID4
    invoice_date: date
    due_date: date

    @model_validator(mode="after")
    def validate_dates(self) -> "BulkInvoiceGenerateSchema":
        if self.due_date < self.invoice_date:
            raise ValueError("due_date cannot be earlier than invoice_date")
        return self


class PaymentCreateSchema(BaseModel):
    invoice_id: UUID4
    parent_id: UUID4
    amount: Decimal
    method: Literal["Card", "UPI", "Bank_Transfer", "Cash", "Cheque"] = "Card"
    txn_ref: Optional[str] = None

    @field_validator("amount")
    @classmethod
    def amount_positive(cls, value: Decimal) -> Decimal:
        if value <= 0:
            raise ValueError("amount must be greater than zero")
        return value


class ParentCheckoutCreateSchema(BaseModel):
    invoice_id: UUID4
    amount: Decimal

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, value: Decimal) -> Decimal:
        if value <= 0:
            raise ValueError("amount must be greater than zero")
        if value.as_tuple().exponent < -2:
            raise ValueError("amount must have at most two decimal places")
        return value


class RefundCreateSchema(BaseModel):
    refund_amount: Decimal
    reason: Optional[str] = None

    @field_validator("refund_amount")
    @classmethod
    def refund_positive(cls, value: Decimal) -> Decimal:
        if value <= 0:
            raise ValueError("refund_amount must be greater than zero")
        return value


class DiscountWaiverCreateSchema(BaseModel):
    invoice_id: UUID4
    student_id: UUID4
    discount_type: Literal["Sibling", "Early_Bird", "Financial_Aid", "Staff_Child", "Discretionary"]
    amount: Decimal
    reason: str

    @field_validator("amount")
    @classmethod
    def amount_positive(cls, value: Decimal) -> Decimal:
        if value <= 0:
            raise ValueError("amount must be greater than zero")
        return value


class ReconciliationFilterSchema(BaseModel):
    period: str


class ReceiptResponseSchema(BaseModel):
    receipt_id: str
    payment_id: UUID
    invoice_id: UUID
    amount: Decimal
    status: str


class FeeAccountSummarySchema(BaseModel):
    bo: str
    student_id: str
    student_name: str
    total_invoiced: float
    total_paid: float
    outstanding_balance: float
    next_due_date: Optional[str]
    invoices_count: int
    invoices: List[Dict[str, Any]]
