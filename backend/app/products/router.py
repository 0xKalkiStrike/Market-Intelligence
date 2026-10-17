from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.database.models import Product, Project, Source, ProductComparison, User, AuditLog
from app.database.session import get_db
from app.products.schemas import (
    ProductCreate,
    ProductResponse,
    ProductDetailResponse,
    ProductComparisonResponse,
    ProductUpdate,
)
from app.products.excel_parser import parse_excel_or_csv
from app.monitoring.service import run_monitoring_for_product

router = APIRouter(prefix="/api/products", tags=["products"])


@router.get("", response_model=list[ProductResponse])
def list_products(
    project_id: Optional[str] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Product]:
    query = db.query(Product)
    if project_id:
        query = query.filter(Product.project_id == project_id)
    elif not user.is_superuser:
        owned_ids = [p.id for p in db.query(Project.id).filter(Project.owner_id == user.id).all()]
        member_ids = [link.project_id for link in user.project_links]
        allowed_project_ids = list(set(owned_ids + member_ids))
        if not allowed_project_ids:
            return []
        query = query.filter(Product.project_id.in_(allowed_project_ids))
    return query.order_by(Product.created_at.desc()).all()


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Product:
    project = None
    if payload.project_id and payload.project_id.strip():
        project = db.get(Project, payload.project_id)
    
    if not project:
        project = db.query(Project).filter(Project.owner_id == user.id).first()
        if not project:
            project = Project(
                name="Default Scraped Products Project",
                description="Auto-created project for products",
                owner_id=user.id
            )
            db.add(project)
            db.commit()
            db.refresh(project)
        payload.project_id = project.id

    product = Product(
        project_id=payload.project_id,

        sku=payload.sku,
        gtin=payload.gtin,
        title=payload.title,
        brand=payload.brand,
        category=payload.category,
        target_price=payload.target_price,
        current_price=payload.current_price,
        url=payload.url,
        image_url=payload.image_url,
        specifications=payload.specifications,
        status="pending",
    )
    db.add(product)
    
    # Audit log
    audit = AuditLog(user_id=user.id, action="CREATE", entity="PRODUCT", details=f"Created product SKU {product.sku}")
    db.add(audit)
    
    db.commit()
    db.refresh(product)

    # Automatically monitor against active sources
    active_sources = db.query(Source).filter(Source.is_active).all()
    if active_sources:
        run_monitoring_for_product(db, product, active_sources)
        db.refresh(product)

    return product


@router.post("/upload-excel", status_code=status.HTTP_201_CREATED)
async def upload_products_excel(
    project_id: Optional[str] = Form(None),
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    try:
        project = None
        if project_id and project_id.strip() and project_id != "null" and project_id != "undefined":
            project = db.get(Project, project_id)

        if not project:
            # Check if user has an existing project
            project = db.query(Project).filter(Project.owner_id == user.id).first()
            if not project:
                # Auto-create Default Project for the user
                project = Project(
                    name="Default Scraped Products Project",
                    description="Auto-created project for imported Excel scraped products",
                    owner_id=user.id
                )
                db.add(project)
                db.commit()
                db.refresh(project)

        target_project_id = project.id

        contents = await file.read()
        parsed_items = parse_excel_or_csv(contents, file.filename)

        if not parsed_items:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Uploaded file contains no valid product rows.")

        created_count = 0
        updated_count = 0
        created_products = []

        for item in parsed_items:
            # Check if product with same SKU exists in project
            existing = db.query(Product).filter(Product.project_id == target_project_id, Product.sku == item["sku"]).first()
            if existing:
                existing.title = item["title"]
                existing.brand = item["brand"]
                existing.category = item["category"]
                existing.current_price = item["current_price"] or existing.current_price
                existing.target_price = item["target_price"] or existing.target_price
                existing.gtin = item["gtin"] or existing.gtin
                existing.url = item["url"] or existing.url
                existing.image_url = item["image_url"] or existing.image_url
                existing.specifications = item["specifications"] or existing.specifications
                updated_count += 1
                created_products.append(existing)
            else:
                prod = Product(
                    project_id=target_project_id,
                    sku=item["sku"],
                    gtin=item["gtin"],
                    title=item["title"],
                    brand=item["brand"],
                    category=item["category"],
                    current_price=item["current_price"],
                    target_price=item["target_price"],
                    url=item["url"],
                    image_url=item["image_url"],
                    specifications=item["specifications"],
                    status="pending",
                )
                db.add(prod)
                created_count += 1
                created_products.append(prod)

        db.commit()

        # Automatically trigger cross-source monitoring across all active Sources for ALL products in project
        from app.monitoring.service import run_monitoring_for_all_products
        monitoring_result = run_monitoring_for_all_products(db, project_id=target_project_id)

        audit = AuditLog(
            user_id=user.id,
            action="EXCEL_UPLOAD",
            entity="PRODUCT",
            details=f"Uploaded {file.filename}: Created {created_count}, Updated {updated_count}, Monitored {monitoring_result['products_monitored']} products across {monitoring_result['sources_count']} sources"
        )
        db.add(audit)
        db.commit()

        return {
            "filename": file.filename,
            "created_products": created_count,
            "updated_products": updated_count,
            "total_parsed": len(parsed_items),
            "sources_monitored": monitoring_result["sources_count"],
            "comparisons_generated": monitoring_result["total_comparisons_generated"],
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Error processing file '{file.filename}': {str(e)}")


@router.get("/{product_id}", response_model=ProductDetailResponse)
def get_product(
    product_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Product:
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")
    if product.status == "pending" or not product.comparisons:
        active_sources = db.query(Source).filter(Source.is_active).all()
        run_monitoring_for_product(db, product, active_sources)
        db.refresh(product)
    return product


@router.post("/{product_id}/monitor", response_model=list[ProductComparisonResponse])
def trigger_product_monitoring(
    product_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ProductComparison]:
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")

    active_sources = db.query(Source).filter(Source.is_active).all()
    if not active_sources:
        from app.monitoring.service import ensure_default_sources
        active_sources = ensure_default_sources(db)

    comps = run_monitoring_for_product(db, product, active_sources)
    return comps


@router.get("/{product_id}/comparisons", response_model=list[ProductComparisonResponse])
def get_product_comparisons(
    product_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ProductComparison]:
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")

    return db.query(ProductComparison).filter(ProductComparison.product_id == product_id).all()


@router.patch("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: str,
    payload: ProductUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Product:
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")

    if payload.title is not None:
        product.title = payload.title
    if payload.brand is not None:
        product.brand = payload.brand
    if payload.category is not None:
        product.category = payload.category
    if payload.status is not None:
        product.status = payload.status
    if payload.target_price is not None:
        product.target_price = payload.target_price
    if payload.current_price is not None:
        product.current_price = payload.current_price
    if payload.url is not None:
        product.url = payload.url
    if payload.image_url is not None:
        product.image_url = payload.image_url
    if payload.specifications is not None:
        product.specifications = payload.specifications

    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")
    db.delete(product)
    db.commit()
