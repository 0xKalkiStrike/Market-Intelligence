from datetime import datetime

from pydantic import BaseModel


class ProjectCreate(BaseModel):
    name: str
    description: str = ""


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class ProjectResponse(BaseModel):
    id: str
    name: str
    description: str
    owner_id: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProjectMemberAdd(BaseModel):
    user_email: str
    project_role: str = "member"


class ProjectMemberResponse(BaseModel):
    id: str
    user_id: str
    user_email: str
    project_role: str

    model_config = {"from_attributes": True}
