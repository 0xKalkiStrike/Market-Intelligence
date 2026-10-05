from fastapi import APIRouter, Depends
from app.auth.deps import get_current_user
from app.database.models import User

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("")
def list_reports(user: User = Depends(get_current_user)) -> list[dict]:
    return [
        {"id": "rep-1", "title": "Weekly Price Violations Summary", "type": "CSV", "generated_at": "2026-09-24"},
        {"id": "rep-2", "title": "Monthly Competitive Intelligence Audit", "type": "PDF", "generated_at": "2026-09-01"},
    ]
