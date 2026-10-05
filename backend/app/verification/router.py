from fastapi import APIRouter, Depends
from app.auth.deps import get_current_user
from app.database.models import User

router = APIRouter(prefix="/api/verification", tags=["verification"])


@router.get("")
def list_verifications(user: User = Depends(get_current_user)) -> list[dict]:
    return [
        {"id": "v-101", "sku": "SKU-9921", "title": "Wireless Headphones", "match_confidence": 0.98, "status": "VERIFIED"},
        {"id": "v-102", "sku": "SKU-4412", "title": "Ergonomic Desk Chair", "match_confidence": 0.45, "status": "FLAGGED"},
    ]
