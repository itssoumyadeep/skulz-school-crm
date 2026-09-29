from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


class CustomReportCreateSchema(BaseModel):
    name: str
    fields: List[str] = Field(default_factory=list)
    filters: Dict[str, Any] = Field(default_factory=dict)
    group_by: List[str] = Field(default_factory=list)

    @field_validator('name')
    @classmethod
    def validate_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError('Report name cannot be empty')
        return cleaned


class ReportScheduleCreateSchema(BaseModel):
    cron_expression: str
    destination: str = 'email'
    active: bool = True

    @field_validator('cron_expression')
    @classmethod
    def validate_cron(cls, value: str) -> str:
        parts = value.strip().split()
        if len(parts) < 5:
            raise ValueError('cron_expression must have at least 5 parts')
        return value.strip()


class WebhookSubscriptionCreateSchema(BaseModel):
    event_type: str
    target_url: str
    secret: str
    active: bool = True
    retry_limit: int = 5


class WebhookDispatchSchema(BaseModel):
    event_type: str
    payload: Dict[str, Any] = Field(default_factory=dict)


class DashboardFilterSchema(BaseModel):
    period: Optional[str] = None
    as_of: Optional[datetime] = None
