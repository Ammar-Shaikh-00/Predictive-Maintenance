from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.base import ORMBase


class AuditLogCreate(BaseModel):
    user_id: Optional[str] = None
    action_type: str
    resource_type: str
    resource_id: Optional[str] = None
    details: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


class AuditLogRead(ORMBase):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    user_id: Optional[str] = None
    action_type: str
    resource_type: str
    resource_id: Optional[str] = None
    details: Optional[str] = None
    # ORM attribute is metadata_json (column name "metadata")
    metadata: Optional[Dict[str, Any]] = Field(
        default=None,
        validation_alias="metadata_json",
        serialization_alias="metadata",
    )
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

