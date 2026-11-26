"""Pydantic schemas for Caregiver MVP-2 CareEvents, CareMedia, and Parent Daily Feed."""

from datetime import date, datetime
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field
from uuid import UUID


CareEventType = Literal[
    "diaper",
    "meal",
    "bottle",
    "nap_start",
    "nap_end",
    "water",
    "mood",
    "note",
    "health_screen",
    "sleep_check",
]


class CareEventItemSchema(BaseModel):
    student_id: UUID
    event_type: CareEventType
    occurred_at: Optional[datetime] = None
    payload: Dict[str, Any] = Field(default_factory=dict)
    parent_visible: bool = True


class CareEventCreateSchema(BaseModel):
    # Supports single event, explicit batch list, or shared event across student_ids
    student_id: Optional[UUID] = None
    student_ids: Optional[List[UUID]] = None
    event_type: Optional[CareEventType] = None
    occurred_at: Optional[datetime] = None
    payload: Dict[str, Any] = Field(default_factory=dict)
    parent_visible: bool = True
    events: Optional[List[CareEventItemSchema]] = None
    supervisor_override: bool = False
    override_reason: Optional[str] = None
    supervisor_pin: Optional[str] = None
    attendance_date: Optional[date] = None


class SupervisorPinVerifySchema(BaseModel):
    student_id: UUID
    supervisor_pin: str
    override_reason: str = ""


class CareEventUpdateSchema(BaseModel):
    event_type: Optional[CareEventType] = None
    payload: Optional[Dict[str, Any]] = None
    parent_visible: Optional[bool] = None
    occurred_at: Optional[datetime] = None


class LearningObservationCreateSchema(BaseModel):
    student_id: UUID
    framework: str = "ELECT"
    domains: List[str] = Field(default_factory=list)
    note: str
    media_ids: List[UUID] = Field(default_factory=list)
    shared_with_family: bool = False
    observed_on: Optional[date] = None
    activity_plan_id: Optional[UUID] = None
    supervisor_override: bool = False
    override_reason: Optional[str] = None
    supervisor_pin: Optional[str] = None
    attendance_date: Optional[date] = None


class LearningObservationUpdateSchema(BaseModel):
    framework: Optional[str] = None
    domains: Optional[List[str]] = None
    note: Optional[str] = None
    media_ids: Optional[List[UUID]] = None
    shared_with_family: Optional[bool] = None
