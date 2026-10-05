from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.database.models import Source, User, AuditLog
from app.database.session import get_db
from app.sources.schemas import SourceCreate, SourceResponse, SourceUpdate
from app.monitoring.service import run_monitoring_for_all_products

router = APIRouter(prefix="/api/sources", tags=["sources"])


@router.get("", response_model=list[SourceResponse])
def list_sources(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Source]:
    return db.query(Source).order_by(Source.created_at.desc()).all()


@router.post("", response_model=SourceResponse, status_code=status.HTTP_201_CREATED)
def create_source(
    payload: SourceCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Source:
    source = Source(
        name=payload.name,
        source_type=payload.source_type,
        base_url=payload.base_url,
        sync_frequency=payload.sync_frequency,
        is_active=payload.is_active,
    )
    db.add(source)
    
    audit = AuditLog(user_id=user.id, action="CREATE", entity="SOURCE", details=f"Created source {source.name}")
    db.add(audit)

    db.commit()
    db.refresh(source)

    # Automatically monitor all products across all active sources including this new source site
    if source.is_active:
        run_monitoring_for_all_products(db)

    return source


@router.get("/{source_id}", response_model=SourceResponse)
def get_source(
    source_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Source:
    source = db.get(Source, source_id)
    if not source:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Source not found")
    return source


@router.patch("/{source_id}", response_model=SourceResponse)
def update_source(
    source_id: str,
    payload: SourceUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Source:
    source = db.get(Source, source_id)
    if not source:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Source not found")

    if payload.name is not None:
        source.name = payload.name
    if payload.source_type is not None:
        source.source_type = payload.source_type
    if payload.base_url is not None:
        source.base_url = payload.base_url
    if payload.sync_frequency is not None:
        source.sync_frequency = payload.sync_frequency
    if payload.is_active is not None:
        source.is_active = payload.is_active

    db.commit()
    db.refresh(source)

    if source.is_active:
        run_monitoring_for_all_products(db)

    return source


@router.delete("/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_source(
    source_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    source = db.get(Source, source_id)
    if not source:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Source not found")
    db.delete(source)
    db.commit()
