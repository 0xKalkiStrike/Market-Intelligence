from datetime import datetime
from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user, get_optional_current_user
from app.database.models import JobExecution, User
from app.database.session import get_db

class JobCreate(BaseModel):
    job_name: str
    details: str = ""

class JobResponse(BaseModel):
    id: str
    job_name: str
    status: str
    details: str
    error_message: str | None
    created_at: datetime

    model_config = {"from_attributes": True}

router = APIRouter(prefix="/api/jobs", tags=["jobs"])

@router.get("", response_model=list[JobResponse])
def list_jobs(
    user: User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
) -> list[JobExecution]:
    return db.query(JobExecution).order_by(JobExecution.created_at.desc()).all()


@router.post("", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
def trigger_job(
    payload: JobCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JobExecution:
    job = JobExecution(
        job_name=payload.job_name,
        details=payload.details,
        status="completed",
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job
