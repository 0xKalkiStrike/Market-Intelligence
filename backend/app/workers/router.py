from fastapi import APIRouter, Depends
from app.auth.deps import get_current_user
from app.database.models import User

router = APIRouter(prefix="/api/workers", tags=["workers"])


@router.get("")
def list_workers(user: User = Depends(get_current_user)) -> list[dict]:
    return [
        {"id": "worker-us-east-1", "node": "ip-10-0-1-12", "status": "HEALTHY", "active_tasks": 3, "cpu": "14%", "ram": "42%"},
        {"id": "worker-eu-west-1", "node": "ip-10-0-2-44", "status": "HEALTHY", "active_tasks": 1, "cpu": "8%", "ram": "29%"},
    ]
