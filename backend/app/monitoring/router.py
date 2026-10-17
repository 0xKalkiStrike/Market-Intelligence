from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.database.models import Product, Source, ProductComparison, User
from app.database.session import get_db
from app.products.schemas import ProductComparisonResponse
from app.monitoring.service import run_monitoring_for_all_products

router = APIRouter(prefix="/api/monitoring", tags=["monitoring"])


@router.get("")
def list_monitoring_tasks(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[dict]:
    products = db.query(Product).all()
    sources = db.query(Source).filter(Source.is_active).all()

    tasks = []
    for source in sources:
        tasks.append({
            "id": f"mon-src-{source.id[:8]}",
            "source_id": source.id,
            "target": f"{source.name} Monitor",
            "source_type": source.source_type,
            "base_url": source.base_url,
            "status": "active" if source.is_active else "disabled",
            "interval": source.sync_frequency,
            "products_count": len(products),
            "last_run": "Just now",
        })

    if not tasks:
        # Default empty fallback representation if no sources added yet
        tasks = [
            {"id": "mon-demo", "target": "No Active Sources Configured", "status": "idle", "interval": "manual", "products_count": len(products), "last_run": "N/A"}
        ]
    return tasks


@router.post("/run-all")
def run_all_monitoring(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    summary = run_monitoring_for_all_products(db)
    return summary


@router.get("/comparisons", response_model=list[ProductComparisonResponse])
def get_all_comparisons(
    product_id: Optional[str] = Query(None),
    source_id: Optional[str] = Query(None),
    match_status: Optional[str] = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ProductComparison]:
    query = db.query(ProductComparison)
    if product_id:
        query = query.filter(ProductComparison.product_id == product_id)
    if source_id:
        query = query.filter(ProductComparison.source_id == source_id)
    if match_status:
        query = query.filter(ProductComparison.match_status == match_status)
    return query.order_by(ProductComparison.last_checked_at.desc()).all()
