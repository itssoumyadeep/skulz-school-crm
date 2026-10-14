from typing import Any, Dict, List, Literal

from pydantic import BaseModel, Field


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