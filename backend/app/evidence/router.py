from fastapi import APIRouter, Depends
from app.auth.deps import get_current_user
from app.database.models import User

router = APIRouter(prefix="/api/evidence", tags=["evidence"])


@router.get("")
def list_evidence(user: User = Depends(get_current_user)) -> list[dict]:
    return [
        {"id": "ev-01", "product_sku": "SKU-9921", "source": "Amazon", "snapshot_type": "HTML_DOM", "captured_at": "2026-09-26"},
        {"id": "ev-02", "product_sku": "SKU-4412", "source": "Walmart", "snapshot_type": "SCREENSHOT", "captured_at": "2026-09-25"},
    ]
