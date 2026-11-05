"""Pydantic schemas for school setup configuration, dataset schemas, template metadata, and CSV import payloads."""

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class TenantConfigUpdateInput(BaseModel):
    name: Optional[str] = None
    region: Optional[str] = None
    type: Optional[str] = None
    subscription_tier: Optional[Literal["Basic", "Standard", "Enterprise"]] = None
    config: Optional[Dict[str, Any]] = None


class TenantDeactivateInput(BaseModel):
    reason: str = Field(min_length=3, max_length=500)
    force: bool = False


SetupDataset = Literal[
    "students",
    "teachers",
    "parents",
    "admins",
    "owners",
    "principals",
    "vendors",
    "assessments",
    "attendance",
    "curriculums",
    "events",
    "fee-structures",
    "marks",
    "lesson-plans",
    "leave-plans",
    "purchase-orders",
    "staff-details",
    "staff-attendances",
    "messages",
]


class SchoolSetupImportSchema(BaseModel):
    dataset: SetupDataset
    records: List[Dict[str, Any]] = Field(min_length=1, max_length=500)