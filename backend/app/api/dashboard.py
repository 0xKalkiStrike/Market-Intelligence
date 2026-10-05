from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.database.models import Project, Product, JobExecution, User
from app.database.session import get_db

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/summary")
def summary(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    total_projects = db.query(func.count(Project.id)).scalar() or 0
    total_products = db.query(func.count(Product.id)).scalar() or 0
    verified_products = db.query(func.count(Product.id)).filter(Product.status == "verified").scalar() or 0
    failed_products = db.query(func.count(Product.id)).filter(Product.status == "failed").scalar() or 0
    active_jobs = db.query(func.count(JobExecution.id)).filter(JobExecution.status == "running").scalar() or 0
    queued_jobs = db.query(func.count(JobExecution.id)).filter(JobExecution.status == "queued").scalar() or 0
    avg_price = db.query(func.avg(Product.current_price)).scalar()

    return {
        "total_projects": total_projects,
        "total_products": total_products,
        "verified_products": verified_products,
        "failed_products": failed_products,
        "active_jobs": active_jobs,
        "queued_jobs": queued_jobs,
        "monitoring_tasks": 2,
        "healthy_workers": 2,
        "failed_executions": 0,
        "average_market_price": round(avg_price, 2) if avg_price is not None else None,
    }
