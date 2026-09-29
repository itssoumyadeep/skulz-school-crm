from typing import Generic, TypeVar, Optional, List, Any
from pydantic import BaseModel, Field

DataT = TypeVar('DataT')

class MetaSchema(BaseModel):
    tenant_id: Optional[str] = None
    role: Optional[str] = None
    version: str = "v1"
    timestamp: Optional[str] = None

class ErrorItem(BaseModel):
    code: str = "VALIDATION_ERROR"
    field: Optional[str] = None
    message: str

class ResponseEnvelope(BaseModel, Generic[DataT]):
    data: Optional[DataT] = None
    meta: MetaSchema = Field(default_factory=MetaSchema)
    errors: Optional[List[ErrorItem]] = None

class ErrorResponse(BaseModel):
    data: Optional[Any] = None
    meta: MetaSchema = Field(default_factory=MetaSchema)
    errors: List[ErrorItem]

def build_response(data: Any, tenant_id: str = None, role: str = None) -> dict:
    return {
        "data": data,
        "meta": {
            "tenant_id": str(tenant_id) if tenant_id else None,
            "role": role,
            "version": "v1"
        },
        "errors": None
    }

def build_error(errors: List[dict], tenant_id: str = None, role: str = None) -> dict:
    return {
        "data": None,
        "meta": {
            "tenant_id": str(tenant_id) if tenant_id else None,
            "role": role,
            "version": "v1"
        },
        "errors": errors
    }
