from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class ProductCreate(BaseModel):
    project_id: str
    sku: str
    gtin: Optional[str] = None
    title: str
    brand: str = ""
    category: str = ""
    target_price: Optional[float] = None
    current_price: Optional[float] = None
    url: Optional[str] = None
    image_url: Optional[str] = None
    specifications: Optional[str] = None


class ProductUpdate(BaseModel):
    title: Optional[str] = None
    brand: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    target_price: Optional[float] = None
    current_price: Optional[float] = None
    url: Optional[str] = None
    image_url: Optional[str] = None
    specifications: Optional[str] = None


class ProductComparisonResponse(BaseModel):
    id: str
    product_id: str
    source_id: str
    source_name: str
    source_product_title: str
    source_product_url: Optional[str]
    price: Optional[float]
    price_diff: Optional[float]
    price_diff_percent: Optional[float]
    availability: str
    rating: Optional[float]
    reviews_count: Optional[int]
    seller: str
    match_status: str
    specifications: Optional[str]
    last_checked_at: datetime

    model_config = {"from_attributes": True}


class ProductResponse(BaseModel):
    id: str
    project_id: str
    sku: str
    gtin: Optional[str]
    title: str
    brand: str
    category: str
    status: str
    target_price: Optional[float]
    current_price: Optional[float]
    url: Optional[str] = None
    image_url: Optional[str] = None
    specifications: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProductDetailResponse(ProductResponse):
    comparisons: list[ProductComparisonResponse] = []
