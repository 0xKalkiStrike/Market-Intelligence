from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.database.models import Product, Source, ProductComparison, User
from app.database.session import get_db

router = APIRouter(prefix="/api/pricing", tags=["pricing"])


@router.get("")
def price_matrix(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[dict]:
    products = db.query(Product).all()
    sources = db.query(Source).all()
    
    matrix = []
    for prod in products:
        row = {
            "product_id": prod.id,
            "sku": prod.sku,
            "title": prod.title,
            "brand": prod.brand,
            "excel_base_price": prod.current_price,
            "target_price": prod.target_price,
            "sources": {}
        }
        for comp in prod.comparisons:
            row["sources"][comp.source_name] = {
                "source_id": comp.source_id,
                "price": comp.price,
                "price_diff": comp.price_diff,
                "price_diff_percent": comp.price_diff_percent,
                "availability": comp.availability,
                "seller": comp.seller,
                "rating": comp.rating,
                "match_status": comp.match_status,
                "url": comp.source_product_url,
            }
        matrix.append(row)

    return matrix
