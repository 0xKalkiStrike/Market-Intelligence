from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class SourceCreate(BaseModel):
    name: str
    source_type: str = "marketplace"
    base_url: str = ""
    sync_frequency: str = "hourly"
    is_active: bool = True


class SourceUpdate(BaseModel):
    name: Optional[str] = None
    source_type: Optional[str] = None
    base_url: Optional[str] = None
    sync_frequency: Optional[str] = None
    is_active: Optional[bool] = None


class SourceResponse(BaseModel):
    id: str
    name: str
    source_type: str
    base_url: str
    is_active: bool
    sync_frequency: str
    created_at: datetime

    model_config = {"from_attributes": True}
