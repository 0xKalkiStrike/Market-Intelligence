import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import ForeignKey, String, Table, Column, UniqueConstraint, Float, Boolean, Text, Integer, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.session import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


user_roles = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", UUID(as_uuid=False), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
)

role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", UUID(as_uuid=False), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("permission_id", UUID(as_uuid=False), ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True),
)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    is_active: Mapped[bool] = mapped_column(default=True)
    is_superuser: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(default=utc_now)

    roles: Mapped[list["Role"]] = relationship(secondary=user_roles, back_populates="users")
    project_links: Mapped[list["ProjectUser"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    description: Mapped[str] = mapped_column(String(255), default="")

    users: Mapped[list["User"]] = relationship(secondary=user_roles, back_populates="roles")
    permissions: Mapped[list["Permission"]] = relationship(secondary=role_permissions, back_populates="roles")


class Permission(Base):
    __tablename__ = "permissions"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    code: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[str] = mapped_column(String(255), default="")

    roles: Mapped[list["Role"]] = relationship(secondary=role_permissions, back_populates="permissions")


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(String(1000), default="")
    owner_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    organization_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(default=utc_now, onupdate=utc_now)

    members: Mapped[list["ProjectUser"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    products: Mapped[list["Product"]] = relationship(back_populates="project", cascade="all, delete-orphan")


class ProjectUser(Base):
    __tablename__ = "project_users"
    __table_args__ = (UniqueConstraint("project_id", "user_id", name="uq_project_user"),)

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    project_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("projects.id", ondelete="CASCADE"))
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"))
    project_role: Mapped[str] = mapped_column(String(50), default="member")
    created_at: Mapped[datetime] = mapped_column(default=utc_now)

    project: Mapped["Project"] = relationship(back_populates="members")
    user: Mapped["User"] = relationship(back_populates="project_links")


class Product(Base):
    __tablename__ = "products"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    project_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    sku: Mapped[str] = mapped_column(String(100), nullable=False)
    gtin: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    brand: Mapped[str] = mapped_column(String(100), default="")
    category: Mapped[str] = mapped_column(String(100), default="")
    status: Mapped[str] = mapped_column(String(50), default="pending")  # verified, pending, failed
    target_price: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    current_price: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    specifications: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(default=utc_now, onupdate=utc_now)

    project: Mapped["Project"] = relationship(back_populates="products")
    comparisons: Mapped[list["ProductComparison"]] = relationship(back_populates="product", cascade="all, delete-orphan")


class ProductComparison(Base):
    __tablename__ = "product_comparisons"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    product_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    source_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("sources.id", ondelete="CASCADE"), nullable=False)
    source_name: Mapped[str] = mapped_column(String(100), nullable=False)
    source_product_title: Mapped[str] = mapped_column(String(255), nullable=False)
    source_product_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    price: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    price_diff: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    price_diff_percent: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    availability: Mapped[str] = mapped_column(String(50), default="In Stock")
    rating: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    reviews_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    seller: Mapped[str] = mapped_column(String(100), default="")
    match_status: Mapped[str] = mapped_column(String(50), default="exact_match")  # exact_match, partial_match, price_alert, out_of_stock, not_found
    specifications: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    last_checked_at: Mapped[datetime] = mapped_column(default=utc_now)

    product: Mapped["Product"] = relationship(back_populates="comparisons")
    source: Mapped["Source"] = relationship()


class Source(Base):
    __tablename__ = "sources"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    source_type: Mapped[str] = mapped_column(String(50), default="custom_api")  # marketplace, web_scraper, custom_api
    base_url: Mapped[str] = mapped_column(String(500), default="")
    is_active: Mapped[bool] = mapped_column(default=True)
    sync_frequency: Mapped[str] = mapped_column(String(50), default="hourly")
    created_at: Mapped[datetime] = mapped_column(default=utc_now)


class Credential(Base):
    __tablename__ = "credentials"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    provider: Mapped[str] = mapped_column(String(100), nullable=False)
    key_hint: Mapped[str] = mapped_column(String(50), default="****")
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(default=utc_now)


class JobExecution(Base):
    __tablename__ = "job_executions"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    job_name: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="queued")  # queued, running, completed, failed
    details: Mapped[str] = mapped_column(Text, default="")
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=utc_now)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    entity: Mapped[str] = mapped_column(String(100), nullable=False)
    details: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(default=utc_now)


# Phase 1: Market Data & Entity Intelligence Models

class DataSource(Base):
    __tablename__ = "data_sources"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="public_directory")  # business_directory, provider_directory, government, website, generic
    base_url: Mapped[str] = mapped_column(String(500), default="")
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(default=utc_now)


class CollectionRun(Base):
    __tablename__ = "collection_runs"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    source_name: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(50), default="ALL")
    location_filter: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="COMPLETED")  # RUNNING, COMPLETED, FAILED
    records_collected: Mapped[int] = mapped_column(Integer, default=0)
    records_valid: Mapped[int] = mapped_column(Integer, default=0)
    duplicates_detected: Mapped[int] = mapped_column(Integer, default=0)
    needs_review: Mapped[int] = mapped_column(Integer, default=0)
    errors_count: Mapped[int] = mapped_column(Integer, default=0)
    started_at: Mapped[datetime] = mapped_column(default=utc_now)
    completed_at: Mapped[Optional[datetime]] = mapped_column(default=utc_now)


class RawRecord(Base):
    __tablename__ = "raw_records"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    run_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("collection_runs.id", ondelete="SET NULL"), nullable=True)
    source_name: Mapped[str] = mapped_column(String(100), nullable=False)
    raw_payload: Mapped[str] = mapped_column(Text, nullable=False)  # JSON text
    collected_at: Mapped[datetime] = mapped_column(default=utc_now)


class Entity(Base):
    __tablename__ = "entities"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # DOCTOR, PROVIDER, DISPENSARY, CLINIC, COMPETITOR, BUSINESS, ORGANIZATION, RETAILER, MANUFACTURER, DISTRIBUTOR, SERVICE_PROVIDER, OTHER
    verification_status: Mapped[str] = mapped_column(String(50), default="UNVERIFIED", index=True)  # UNVERIFIED, VERIFIED, PARTIALLY_VERIFIED, DUPLICATE, INVALID, NEEDS_REVIEW
    freshness_status: Mapped[str] = mapped_column(String(50), default="FRESH", index=True)  # FRESH, RECENTLY_UPDATED, STALE, NEEDS_REVERIFICATION
    data_quality_score: Mapped[float] = mapped_column(Float, default=0.0)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(default=utc_now, onupdate=utc_now)

    estimated_revenue: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    rating: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    review_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    reviews_source_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    employee_count: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    locations: Mapped[list["EntityLocation"]] = relationship(back_populates="entity", cascade="all, delete-orphan")
    contacts: Mapped[list["EntityContact"]] = relationship(back_populates="entity", cascade="all, delete-orphan")
    services: Mapped[list["EntityService"]] = relationship(back_populates="entity", cascade="all, delete-orphan")
    doctor_detail: Mapped[Optional["DoctorDetail"]] = relationship(back_populates="entity", cascade="all, delete-orphan", uselist=False)
    dispensary_detail: Mapped[Optional["DispensaryDetail"]] = relationship(back_populates="entity", cascade="all, delete-orphan", uselist=False)
    competitor_detail: Mapped[Optional["CompetitorDetail"]] = relationship(back_populates="entity", cascade="all, delete-orphan", uselist=False)
    source_links: Mapped[list["EntitySourceLink"]] = relationship(back_populates="entity", cascade="all, delete-orphan")
    verification_results: Mapped[list["VerificationResult"]] = relationship(back_populates="entity", cascade="all, delete-orphan")
    outgoing_relationships: Mapped[list["EntityRelationship"]] = relationship("EntityRelationship", foreign_keys="[EntityRelationship.source_entity_id]", back_populates="source_entity", cascade="all, delete-orphan")
    incoming_relationships: Mapped[list["EntityRelationship"]] = relationship("EntityRelationship", foreign_keys="[EntityRelationship.target_entity_id]", back_populates="target_entity", cascade="all, delete-orphan")


class EntityService(Base):
    __tablename__ = "entity_services"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    entity_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    service_name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    service_category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    entity: Mapped["Entity"] = relationship(back_populates="services")


class EntityRelationship(Base):
    __tablename__ = "entity_relationships"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    source_entity_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    target_entity_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    relationship_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # Works At, Associated With, Located In, Operates In, Competes With
    evidence: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    source_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    source_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    discovered_at: Mapped[datetime] = mapped_column(default=utc_now)

    source_entity: Mapped["Entity"] = relationship("Entity", foreign_keys=[source_entity_id], back_populates="outgoing_relationships")
    target_entity: Mapped["Entity"] = relationship("Entity", foreign_keys=[target_entity_id], back_populates="incoming_relationships")



class EntityLocation(Base):
    __tablename__ = "entity_locations"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    entity_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    address: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    state: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    zip_code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    country: Mapped[str] = mapped_column(String(50), default="USA")

    entity: Mapped["Entity"] = relationship(back_populates="locations")


class EntityContact(Base):
    __tablename__ = "entity_contacts"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    entity_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    website: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    # JSON object of public social profile URLs found on the entity's own website
    # (facebook, instagram, linkedin, twitter, youtube, tiktok). Null if none found.
    social_links: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    entity: Mapped["Entity"] = relationship(back_populates="contacts")


class DoctorDetail(Base):
    __tablename__ = "doctor_details"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    entity_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("entities.id", ondelete="CASCADE"), nullable=False, unique=True)
    title: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    specialty: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    organization: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    clinic_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    license_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    services: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    estimated_revenue: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    rating: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    review_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    entity: Mapped["Entity"] = relationship(back_populates="doctor_detail")


class DispensaryDetail(Base):
    __tablename__ = "dispensary_details"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    entity_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("entities.id", ondelete="CASCADE"), nullable=False, unique=True)
    business_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    operating_hours: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    services: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    license_info: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    products_offered: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    estimated_revenue: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    rating: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    review_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    entity: Mapped["Entity"] = relationship(back_populates="dispensary_detail")


class CompetitorDetail(Base):
    __tablename__ = "competitor_details"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    entity_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("entities.id", ondelete="CASCADE"), nullable=False, unique=True)
    business_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    locations_summary: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    pricing_info: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    business_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    products_services: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    estimated_revenue: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    employee_count: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    rating: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    review_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    reviews_source_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    entity: Mapped["Entity"] = relationship(back_populates="competitor_detail")



class EntitySourceLink(Base):
    __tablename__ = "entity_source_links"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    entity_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    source_name: Mapped[str] = mapped_column(String(100), nullable=False)
    source_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    raw_record_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("raw_records.id", ondelete="SET NULL"), nullable=True)
    collected_at: Mapped[datetime] = mapped_column(default=utc_now)

    entity: Mapped["Entity"] = relationship(back_populates="source_links")


class VerificationResult(Base):
    __tablename__ = "verification_results"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    entity_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    confidence_score: Mapped[float] = mapped_column(Float, default=1.0)
    evidence: Mapped[str] = mapped_column(Text, default="")
    verified_at: Mapped[datetime] = mapped_column(default=utc_now)

    entity: Mapped["Entity"] = relationship(back_populates="verification_results")


class DuplicateCandidate(Base):
    __tablename__ = "duplicate_candidates"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    entity_id_1: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    entity_id_2: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    match_score: Mapped[float] = mapped_column(Float, nullable=False)
    match_reasons: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(50), default="PENDING")  # PENDING, MERGED, DISMISSED


class CollectionError(Base):
    __tablename__ = "collection_errors"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    run_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("collection_runs.id", ondelete="SET NULL"), nullable=True)
    source_name: Mapped[str] = mapped_column(String(100), nullable=False)
    error_message: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(default=utc_now)


# ==========================================
# PHASE 2: ADVANCED MARKET INTELLIGENCE ENGINE MODELS
# ==========================================

class PriceHistory(Base):
    __tablename__ = "price_history"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    entity_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("entities.id", ondelete="SET NULL"), nullable=True)
    competitor_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    state: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    service_name: Mapped[str] = mapped_column(String(150), default="Initial Consultation")
    previous_price: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    new_price: Mapped[float] = mapped_column(Float, nullable=False)
    initial_price: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    renewal_price: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    promotion_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    coupon_code: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    discount_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    duration_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    weekend_availability: Mapped[bool] = mapped_column(Boolean, default=False)
    same_day_availability: Mapped[bool] = mapped_column(Boolean, default=False)
    confidence: Mapped[str] = mapped_column(String(50), default="HIGH")  # HIGH, MEDIUM, LOW, VERIFIED
    source_name: Mapped[str] = mapped_column(String(100), default="Official Website")
    source_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    effective_date: Mapped[datetime] = mapped_column(default=utc_now)


class OpportunityScoreConfig(Base):
    __tablename__ = "opportunity_score_configs"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(String(100), default="Default Weighted Score Model")
    patient_pop_weight: Mapped[float] = mapped_column(Float, default=15.0)
    market_growth_weight: Mapped[float] = mapped_column(Float, default=10.0)
    competitor_density_weight: Mapped[float] = mapped_column(Float, default=10.0)
    pricing_opp_weight: Mapped[float] = mapped_column(Float, default=10.0)
    dispensary_density_weight: Mapped[float] = mapped_column(Float, default=10.0)
    physician_coverage_weight: Mapped[float] = mapped_column(Float, default=15.0)
    regulatory_ease_weight: Mapped[float] = mapped_column(Float, default=15.0)
    seo_opp_weight: Mapped[float] = mapped_column(Float, default=10.0)
    mmj_presence_weight: Mapped[float] = mapped_column(Float, default=5.0)
    updated_at: Mapped[datetime] = mapped_column(default=utc_now, onupdate=utc_now)
    updated_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)


class StateMarketMetric(Base):
    __tablename__ = "state_market_metrics"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    state: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    state_code: Mapped[str] = mapped_column(String(10), nullable=False, unique=True, index=True)
    patient_population: Mapped[int] = mapped_column(Integer, default=0)
    population_growth_rate: Mapped[float] = mapped_column(Float, default=0.0)  # Percentage
    competitor_count: Mapped[int] = mapped_column(Integer, default=0)
    dispensary_count: Mapped[int] = mapped_column(Integer, default=0)
    physician_capacity: Mapped[int] = mapped_column(Integer, default=0)
    mmj_patient_volume: Mapped[int] = mapped_column(Integer, default=0)
    mmj_revenue: Mapped[float] = mapped_column(Float, default=0.0)
    telehealth_allowed: Mapped[bool] = mapped_column(Boolean, default=True)
    avg_market_price: Mapped[float] = mapped_column(Float, default=149.0)
    mmj_price: Mapped[float] = mapped_column(Float, default=149.0)
    opportunity_score: Mapped[float] = mapped_column(Float, default=50.0)
    component_scores_json: Mapped[str] = mapped_column(Text, default="{}")
    updated_at: Mapped[datetime] = mapped_column(default=utc_now, onupdate=utc_now)


class PartnershipOpportunity(Base):
    __tablename__ = "partnership_opportunities"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    entity_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("entities.id", ondelete="SET NULL"), nullable=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    parent_company: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    brand: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    state: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    zip_code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    location_count: Mapped[int] = mapped_column(Integer, default=1)
    partnership_status: Mapped[str] = mapped_column(String(50), default="NOT_CONTACTED", index=True)  # NOT_CONTACTED, CONTACTED, FOLLOW_UP_NEEDED, INTERESTED, MEETING_SCHEDULED, PARTNER, ACTIVE_REFERRAL, INACTIVE, NOT_INTERESTED
    partnership_score: Mapped[float] = mapped_column(Float, default=50.0)
    distance_miles: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    local_patient_volume: Mapped[int] = mapped_column(Integer, default=0)
    competitor_presence_level: Mapped[str] = mapped_column(String(50), default="MEDIUM")
    internal_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    last_contacted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(default=utc_now, onupdate=utc_now)


class PhysicianCoverage(Base):
    __tablename__ = "physician_coverage"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    entity_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("entities.id", ondelete="SET NULL"), nullable=True)
    physician_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    state: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    license_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    license_status: Mapped[str] = mapped_column(String(50), default="ACTIVE")
    license_expiration: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    telehealth_eligible: Mapped[bool] = mapped_column(Boolean, default=True)
    in_person_required: Mapped[bool] = mapped_column(Boolean, default=False)
    weekly_capacity: Mapped[int] = mapped_column(Integer, default=40)
    patient_volume: Mapped[int] = mapped_column(Integer, default=0)
    appointment_volume: Mapped[int] = mapped_column(Integer, default=0)
    utilization_rate: Mapped[float] = mapped_column(Float, default=0.0)
    updated_at: Mapped[datetime] = mapped_column(default=utc_now, onupdate=utc_now)


class SeoKeyword(Base):
    __tablename__ = "seo_keywords"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    keyword: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    search_query: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(100), default="Medical Marijuana Card")
    state: Mapped[str] = mapped_column(String(50), default="FL")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(default=utc_now)


class SeoRanking(Base):
    __tablename__ = "seo_rankings"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    keyword_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("seo_keywords.id", ondelete="CASCADE"), nullable=False)
    state: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    mmj_position: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    competitor_positions_json: Mapped[str] = mapped_column(Text, default="[]")
    search_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    landing_page: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    prev_position: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    curr_position: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    position_change: Mapped[int] = mapped_column(Integer, default=0)
    checked_at: Mapped[datetime] = mapped_column(default=utc_now)


class ReviewIntelligence(Base):
    __tablename__ = "review_intelligence"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    entity_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("entities.id", ondelete="SET NULL"), nullable=True)
    entity_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    entity_type: Mapped[str] = mapped_column(String(50), default="COMPETITOR")
    overall_rating: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    total_reviews: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    rating_change: Mapped[float] = mapped_column(Float, default=0.0)
    review_volume_change: Mapped[int] = mapped_column(Integer, default=0)
    source_name: Mapped[str] = mapped_column(String(100), default="Google Reviews")
    source_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(default=utc_now, onupdate=utc_now)

    themes: Mapped[list["ReviewTheme"]] = relationship("ReviewTheme", back_populates="review_intel", cascade="all, delete-orphan")


class ReviewTheme(Base):
    __tablename__ = "review_themes"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    review_intel_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("review_intelligence.id", ondelete="CASCADE"), nullable=False)
    theme_category: Mapped[str] = mapped_column(String(100), nullable=False)  # Pricing, Scheduling, Customer Service, Physician Experience, Certification Process, Renewal, Website, Technical Problems, Communication, Wait Time
    sentiment: Mapped[str] = mapped_column(String(50), default="MIXED")  # POSITIVE, MIXED, NEGATIVE
    mention_count: Mapped[int] = mapped_column(Integer, default=1)
    summary_text: Mapped[str] = mapped_column(Text, default="")
    sample_quotes_json: Mapped[str] = mapped_column(Text, default="[]")

    review_intel: Mapped["ReviewIntelligence"] = relationship("ReviewIntelligence", back_populates="themes")


class RegulatoryRequirement(Base):
    __tablename__ = "regulatory_requirements"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    state: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    agency_name: Mapped[str] = mapped_column(String(255), nullable=False)
    rule_title: Mapped[str] = mapped_column(String(255), nullable=False)
    rule_category: Mapped[str] = mapped_column(String(100), default="Telehealth Rules")
    requirement_text: Mapped[str] = mapped_column(Text, default="")
    telehealth_allowed: Mapped[bool] = mapped_column(Boolean, default=True)
    physician_in_person_required: Mapped[bool] = mapped_column(Boolean, default=False)
    renewal_frequency_months: Mapped[int] = mapped_column(Integer, default=7)
    registration_fee: Mapped[float] = mapped_column(Float, default=75.0)
    effective_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    source_name: Mapped[str] = mapped_column(String(100), default="Department of Health")
    source_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(default=utc_now, onupdate=utc_now)


class RegulatoryChange(Base):
    __tablename__ = "regulatory_changes"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    requirement_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("regulatory_requirements.id", ondelete="SET NULL"), nullable=True)
    state: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    rule_title: Mapped[str] = mapped_column(String(255), nullable=False)
    event_type: Mapped[str] = mapped_column(String(100), default="REGULATION_CHANGED")  # NEW_REGULATION, REGULATION_CHANGED, REQUIREMENT_CHANGED, FEE_CHANGED, TELEHEALTH_RULE_CHANGED, LICENSING_CHANGE
    previous_info: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    new_info: Mapped[str] = mapped_column(Text, nullable=False)
    impact_priority: Mapped[str] = mapped_column(String(50), default="HIGH")  # CRITICAL, HIGH, MEDIUM, LOW
    source_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    effective_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    detected_at: Mapped[datetime] = mapped_column(default=utc_now)


class IntelligenceEvent(Base):
    __tablename__ = "intelligence_events"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    entity_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("entities.id", ondelete="SET NULL"), nullable=True)
    entity_name: Mapped[str] = mapped_column(String(255), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(50), default="COMPETITOR")
    state: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    previous_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    new_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    importance: Mapped[str] = mapped_column(String(50), default="MEDIUM", index=True)  # CRITICAL, HIGH, MEDIUM, LOW
    source_name: Mapped[str] = mapped_column(String(100), default="Surface Web Discovery")
    source_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    detected_at: Mapped[datetime] = mapped_column(default=utc_now, index=True)
    reviewed: Mapped[bool] = mapped_column(Boolean, default=False)
    reviewed_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)


class AlertConfig(Base):
    __tablename__ = "alert_configs"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    alert_type: Mapped[str] = mapped_column(String(100), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    priority: Mapped[str] = mapped_column(String(50), default="HIGH")  # CRITICAL, HIGH, MEDIUM, LOW
    condition_threshold: Mapped[str] = mapped_column(String(255), default="ANY")
    recipient_role: Mapped[str] = mapped_column(String(50), default="admin")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(default=utc_now)


class AlertNotification(Base):
    __tablename__ = "alert_notifications"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    config_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("alert_configs.id", ondelete="SET NULL"), nullable=True)
    alert_type: Mapped[str] = mapped_column(String(100), nullable=False)
    priority: Mapped[str] = mapped_column(String(50), default="HIGH", index=True)  # CRITICAL, HIGH, MEDIUM, LOW
    entity_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("entities.id", ondelete="SET NULL"), nullable=True)
    entity_name: Mapped[str] = mapped_column(String(255), nullable=False)
    state: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    source_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="UNREAD", index=True)  # UNREAD, READ, DISMISSED
    triggered_at: Mapped[datetime] = mapped_column(default=utc_now, index=True)


class SourceDiscovery(Base):
    __tablename__ = "source_discoveries"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    entity_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    source_name: Mapped[str] = mapped_column(String(100), nullable=False)
    source_type: Mapped[str] = mapped_column(String(50), default="Official Website")  # Government, Business Directory, Official Website, Corporate Registry, Search Engine, Public Document, Public API
    source_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    collection_method: Mapped[str] = mapped_column(String(100), default="Surface Web Collector")
    confidence_status: Mapped[str] = mapped_column(String(50), default="VERIFIED", index=True)  # VERIFIED, LIKELY, UNVERIFIED, STALE, CONFLICTING
    collector_version: Mapped[str] = mapped_column(String(50), default="v2.4")
    parser_version: Mapped[str] = mapped_column(String(50), default="v1.0")
    raw_record_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("raw_records.id", ondelete="SET NULL"), nullable=True)
    last_verified: Mapped[datetime] = mapped_column(default=utc_now)


# ==========================================
# PHASE 3: AI INTELLIGENCE & DECISION-SUPPORT ENGINE MODELS
# ==========================================

class AiProviderConfig(Base):
    __tablename__ = "ai_provider_configs"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    provider_name: Mapped[str] = mapped_column(String(50), nullable=False, default="Mock")  # OpenAI, Anthropic, Gemini, Local, Mock
    model_name: Mapped[str] = mapped_column(String(100), nullable=False, default="gpt-4o")
    api_key_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    max_tokens: Mapped[int] = mapped_column(Integer, default=2048)
    temperature: Mapped[float] = mapped_column(Float, default=0.2)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_default: Mapped[bool] = mapped_column(Boolean, default=True)
    cost_per_1k_input_tokens: Mapped[float] = mapped_column(Float, default=0.005)
    cost_per_1k_output_tokens: Mapped[float] = mapped_column(Float, default=0.015)
    updated_at: Mapped[datetime] = mapped_column(default=utc_now, onupdate=utc_now)


class AiAuditLog(Base):
    __tablename__ = "ai_audit_logs"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    user_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    intent: Mapped[str] = mapped_column(String(100), default="GENERAL_QUERY", index=True)
    entities_detected_json: Mapped[str] = mapped_column(Text, default="[]")
    generated_query: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    records_retrieved_count: Mapped[int] = mapped_column(Integer, default=0)
    model_used: Mapped[str] = mapped_column(String(100), default="GroundedEngine-v3")
    input_tokens: Mapped[int] = mapped_column(Integer, default=0)
    output_tokens: Mapped[int] = mapped_column(Integer, default=0)
    latency_ms: Mapped[float] = mapped_column(Float, default=0.0)
    confidence: Mapped[str] = mapped_column(String(50), default="HIGH")  # HIGH, MEDIUM, LOW
    response_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=utc_now, index=True)


class IntelligenceKnowledgeObject(Base):
    __tablename__ = "intelligence_knowledge_objects"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    object_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)  # MarketEvent, CompetitorChange, PriceChange, MarketOpportunity, RegulatoryChange, GeographicOpportunity, PartnershipOpportunity, SEOChange, ReviewTrend, PhysicianCapacitySignal, CrossSourceSignal, AnomalySignal
    entity_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("entities.id", ondelete="SET NULL"), nullable=True)
    entity_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    state: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    payload_json: Mapped[str] = mapped_column(Text, default="{}")
    confidence: Mapped[str] = mapped_column(String(50), default="HIGH")  # HIGH, MEDIUM, LOW
    source_name: Mapped[str] = mapped_column(String(100), default="Market Intelligence Engine")
    source_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=utc_now, index=True)


class MarketSnapshot(Base):
    __tablename__ = "market_snapshots"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    snapshot_date: Mapped[datetime] = mapped_column(default=utc_now, index=True)
    period_type: Mapped[str] = mapped_column(String(50), default="WEEKLY", index=True)  # DAILY, WEEKLY, MONTHLY, QUARTERLY
    state: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    total_entities: Mapped[int] = mapped_column(Integer, default=0)
    total_competitors: Mapped[int] = mapped_column(Integer, default=0)
    total_dispensaries: Mapped[int] = mapped_column(Integer, default=0)
    total_doctors: Mapped[int] = mapped_column(Integer, default=0)
    price_changes_count: Mapped[int] = mapped_column(Integer, default=0)
    regulatory_changes_count: Mapped[int] = mapped_column(Integer, default=0)
    new_entities_count: Mapped[int] = mapped_column(Integer, default=0)
    metrics_json: Mapped[str] = mapped_column(Text, default="{}")
    summary_json: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(default=utc_now)


class ScenarioSimulation(Base):
    __tablename__ = "scenario_simulations"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    scenario_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)  # PRICE_CHANGE, MARKET_EXPANSION, PARTNERSHIP_OUTREACH, CAPACITY_SHIFT
    target_state: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    target_entity_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    inputs_json: Mapped[str] = mapped_column(Text, default="{}")
    results_json: Mapped[str] = mapped_column(Text, default="{}")
    assumptions_json: Mapped[str] = mapped_column(Text, default="{}")
    created_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=utc_now)


class AiEvaluationItem(Base):
    __tablename__ = "ai_evaluation_items"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    category: Mapped[str] = mapped_column(String(100), nullable=False)  # PRICING, OPPORTUNITY, REGULATORY, DISPENSARY, COMPETITOR
    question: Mapped[str] = mapped_column(Text, nullable=False)
    expected_intent: Mapped[str] = mapped_column(String(100), nullable=False)
    expected_entities_json: Mapped[str] = mapped_column(Text, default="[]")
    ground_truth_answer: Mapped[str] = mapped_column(Text, nullable=False)
    last_run_score: Mapped[float] = mapped_column(Float, default=1.0)  # 0.0 to 1.0
    last_run_status: Mapped[str] = mapped_column(String(50), default="PASSED")  # PASSED, FAILED
    last_run_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class WorkloadTask(Base):
    __tablename__ = "workload_tasks"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    task_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    priority: Mapped[int] = mapped_column(Integer, default=5, index=True)
    status: Mapped[str] = mapped_column(String(50), default="QUEUED", index=True)
    payload_json: Mapped[str] = mapped_column(Text, default="{}")
    result_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    worker_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(default=utc_now, index=True)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


# ==========================================
# PHASE 4: ADVANCED AUTOMATION, FORECASTING, OPTIMIZATION & CONTINUOUS INTELLIGENCE MODELS
# ==========================================

class Watchlist(Base):
    __tablename__ = "watchlists"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(100), default="Competitor")  # Competitor, State, Pricing, Regulatory, Dispensary, Physician, SEO
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sharing_scope: Mapped[str] = mapped_column(String(50), default="PERSONAL")  # PERSONAL, TEAM, PUBLIC
    team_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(default=utc_now, onupdate=utc_now)

    items: Mapped[list["WatchlistItem"]] = relationship("WatchlistItem", back_populates="watchlist", cascade="all, delete-orphan")


class WatchlistItem(Base):
    __tablename__ = "watchlist_items"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    watchlist_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("watchlists.id", ondelete="CASCADE"), nullable=False)
    item_type: Mapped[str] = mapped_column(String(100), nullable=False)  # STATE, COMPANY, COMPETITOR, DISPENSARY, PHYSICIAN, KEYWORD, REGULATION, URL
    target_identifier: Mapped[str] = mapped_column(String(255), nullable=False)  # e.g., "FL", "Veriheal", "telehealth"
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    added_at: Mapped[datetime] = mapped_column(default=utc_now)

    watchlist: Mapped["Watchlist"] = relationship("Watchlist", back_populates="items")


class MonitoringRule(Base):
    __tablename__ = "monitoring_rules"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    trigger_event: Mapped[str] = mapped_column(String(100), nullable=False, index=True)  # PRICE_CHANGE, PRICE_DROP_PERCENT, NEW_DISPENSARY, REGULATORY_CHANGE, CAPACITY_DROP, ANOMALY_DETECTED
    condition_operator: Mapped[str] = mapped_column(String(50), default="GREATER_THAN")  # GREATER_THAN, LESS_THAN, EQUALS, CONTAINS, ANY
    condition_value: Mapped[str] = mapped_column(String(255), default="10.0")
    action_type: Mapped[str] = mapped_column(String(100), default="CREATE_ALERT")  # CREATE_ALERT, CREATE_EVENT, TRIGGER_WORKFLOW, NOTIFY_USER
    priority: Mapped[str] = mapped_column(String(50), default="HIGH")  # CRITICAL, HIGH, MEDIUM, LOW
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(default=utc_now)


class ForecastModel(Base):
    __tablename__ = "forecast_models"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    model_type: Mapped[str] = mapped_column(String(100), nullable=False)  # BASELINE, MOVING_AVERAGE, TREND_LINEAR, SEASONAL, ADVANCED_ML
    target_metric: Mapped[str] = mapped_column(String(100), nullable=False, index=True)  # APPOINTMENT_VOLUME, REVENUE, PATIENT_VOLUME, PHYSICIAN_CAPACITY, COMPETITOR_GROWTH, MARKET_DEMAND
    parameters_json: Mapped[str] = mapped_column(Text, default="{}")
    version: Mapped[str] = mapped_column(String(50), default="v1.0")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(default=utc_now)


class Forecast(Base):
    __tablename__ = "forecasts"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    model_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("forecast_models.id", ondelete="SET NULL"), nullable=True)
    metric_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    state: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    horizon_days: Mapped[int] = mapped_column(Integer, default=30)  # 7, 30, 90, 180, 365
    historical_period: Mapped[str] = mapped_column(String(100), default="Last 12 Months")
    forecast_period: Mapped[str] = mapped_column(String(100), default="Next 30 Days")
    forecast_value: Mapped[float] = mapped_column(Float, nullable=False)
    expected_range_min: Mapped[float] = mapped_column(Float, nullable=False)
    expected_range_max: Mapped[float] = mapped_column(Float, nullable=False)
    confidence: Mapped[str] = mapped_column(String(50), default="MEDIUM")  # HIGH, MEDIUM, LOW
    model_name: Mapped[str] = mapped_column(String(100), default="SeasonalTrendEngine")
    data_points_used: Mapped[int] = mapped_column(Integer, default=365)
    explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=utc_now, index=True)


class ForecastEvaluation(Base):
    __tablename__ = "forecast_evaluations"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    model_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("forecast_models.id", ondelete="SET NULL"), nullable=True)
    metric_name: Mapped[str] = mapped_column(String(100), nullable=False)
    mae: Mapped[float] = mapped_column(Float, default=0.0)  # Mean Absolute Error
    rmse: Mapped[float] = mapped_column(Float, default=0.0)  # Root Mean Squared Error
    mape: Mapped[float] = mapped_column(Float, default=0.0)  # Mean Absolute Percentage Error
    bias: Mapped[float] = mapped_column(Float, default=0.0)
    coverage: Mapped[float] = mapped_column(Float, default=0.95)
    evaluation_period: Mapped[str] = mapped_column(String(100), default="Backtest 90 Days")
    evaluated_at: Mapped[datetime] = mapped_column(default=utc_now)


class GeographicCluster(Base):
    __tablename__ = "geographic_clusters"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    cluster_name: Mapped[str] = mapped_column(String(255), nullable=False)
    cluster_type: Mapped[str] = mapped_column(String(100), nullable=False)  # HIGH_DEMAND, HIGH_COMPETITION, UNDERSERVED, PARTNERSHIP_OPPORTUNITY, PHYSICIAN_CAPACITY
    state: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    zip_codes_json: Mapped[str] = mapped_column(Text, default="[]")
    opportunity_score: Mapped[float] = mapped_column(Float, default=50.0)
    patient_pop: Mapped[int] = mapped_column(Integer, default=0)
    dispensary_count: Mapped[int] = mapped_column(Integer, default=0)
    competitor_count: Mapped[int] = mapped_column(Integer, default=0)
    physician_capacity: Mapped[int] = mapped_column(Integer, default=0)
    recommendation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=utc_now)


class CompetitorMovementScore(Base):
    __tablename__ = "competitor_movement_scores"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    competitor_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    state: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    activity_score: Mapped[float] = mapped_column(Float, default=0.0)  # 0 to 100 metric
    price_changes_count: Mapped[int] = mapped_column(Integer, default=0)
    locations_added_count: Mapped[int] = mapped_column(Integer, default=0)
    states_entered_count: Mapped[int] = mapped_column(Integer, default=0)
    seo_changes_count: Mapped[int] = mapped_column(Integer, default=0)
    momentum: Mapped[str] = mapped_column(String(50), default="STABLE")  # INCREASING, STABLE, DECREASING
    details_json: Mapped[str] = mapped_column(Text, default="{}")
    updated_at: Mapped[datetime] = mapped_column(default=utc_now, onupdate=utc_now)


class RiskSignal(Base):
    __tablename__ = "risk_signals"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    risk_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)  # PRICE_REDUCTION, COMPETITOR_EXPANSION, REGULATORY_CHANGE, PHYSICIAN_SHORTAGE, REVENUE_DECLINE, SEO_LOSS, DATA_QUALITY_DEGRADATION
    severity: Mapped[str] = mapped_column(String(50), default="HIGH", index=True)  # CRITICAL, HIGH, MEDIUM, LOW
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    evidence: Mapped[str] = mapped_column(Text, nullable=False)
    affected_area: Mapped[str] = mapped_column(String(255), nullable=False)
    source_name: Mapped[str] = mapped_column(String(100), default="Risk Intelligence Engine")
    trend: Mapped[str] = mapped_column(String(50), default="INCREASING")  # INCREASING, STABLE, DECREASING
    detected_at: Mapped[datetime] = mapped_column(default=utc_now, index=True)


class EarlyWarningSignal(Base):
    __tablename__ = "early_warning_signals"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    signal_title: Mapped[str] = mapped_column(String(255), nullable=False)
    state: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    confidence: Mapped[str] = mapped_column(String(50), default="HIGH")  # HIGH, MEDIUM, LOW
    supporting_events_json: Mapped[str] = mapped_column(Text, default="[]")
    interpretation: Mapped[str] = mapped_column(Text, nullable=False)
    recommended_review_step: Mapped[str] = mapped_column(Text, nullable=False)
    detected_at: Mapped[datetime] = mapped_column(default=utc_now, index=True)


class WorkflowDefinition(Base):
    __tablename__ = "workflow_definitions"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    trigger_type: Mapped[str] = mapped_column(String(100), nullable=False)  # COMPETITOR_PRICE_DROP, REGULATORY_CHANGE, NEW_PARTNERSHIP_OPPORTUNITY, CAPACITY_SHORTAGE, RISK_DETECTED
    condition_json: Mapped[str] = mapped_column(Text, default="{}")
    actions_json: Mapped[str] = mapped_column(Text, default="[]")
    requires_approval: Mapped[bool] = mapped_column(Boolean, default=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(default=utc_now)


class WorkflowRun(Base):
    __tablename__ = "workflow_runs"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    workflow_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("workflow_definitions.id", ondelete="SET NULL"), nullable=True)
    workflow_name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="COMPLETED", index=True)  # QUEUED, WAITING_APPROVAL, RUNNING, COMPLETED, REJECTED, FAILED
    trigger_payload_json: Mapped[str] = mapped_column(Text, default="{}")
    execution_result_json: Mapped[str] = mapped_column(Text, default="{}")
    started_at: Mapped[datetime] = mapped_column(default=utc_now)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class HumanApproval(Base):
    __tablename__ = "human_approvals"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    workflow_run_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("workflow_runs.id", ondelete="CASCADE"), nullable=True)
    action_title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    evidence: Mapped[str] = mapped_column(Text, nullable=False)
    proposed_action: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="PENDING", index=True)  # PENDING, APPROVED, REJECTED
    reviewed_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    review_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=utc_now, index=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class IntelligenceFeedback(Base):
    __tablename__ = "intelligence_feedbacks"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    target_type: Mapped[str] = mapped_column(String(100), nullable=False)  # ALERT, SIGNAL, FORECAST, OPPORTUNITY, RISK
    target_id: Mapped[str] = mapped_column(String(255), nullable=False)
    feedback: Mapped[str] = mapped_column(String(50), nullable=False)  # USEFUL, NOT_USEFUL, CORRECT, INCORRECT, FALSE_POSITIVE, CONFIRMED
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    user_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=utc_now)
    status: Mapped[str] = mapped_column(String(50), default="PENDING_REVIEW")  # PENDING_REVIEW, INVESTIGATING, RESOLVED, DISMISSED
    resolution_notes: Mapped[str] = mapped_column(Text, default="")
    resolved_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class AiCostLog(Base):
    __tablename__ = "ai_cost_logs"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    provider_name: Mapped[str] = mapped_column(String(50), nullable=False)
    model_name: Mapped[str] = mapped_column(String(100), nullable=False)
    feature_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    input_tokens: Mapped[int] = mapped_column(Integer, default=0)
    output_tokens: Mapped[int] = mapped_column(Integer, default=0)
    calculated_cost_usd: Mapped[float] = mapped_column(Float, default=0.0)
    user_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=utc_now, index=True)


class ManagementReviewItem(Base):
    __tablename__ = "management_review_queue"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    item_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)  # OPPORTUNITY, COMPETITOR_CHANGE, REGULATORY_CHANGE, CAPACITY_ISSUE, PARTNERSHIP_LEAD, ANOMALY, RISK
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    state: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    evidence: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[str] = mapped_column(String(50), default="HIGH")
    suggested_review_step: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="PENDING", index=True)  # PENDING, INVESTIGATED, ACCEPTED, REJECTED
    assigned_to: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=utc_now, index=True)


# ==========================================
# PHASE 5: ENTERPRISE OPERATIONS, GOVERNANCE & PRODUCTION READINESS MODELS
# ==========================================

class EntityAuditTrail(Base):
    __tablename__ = "entity_audit_trail"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    entity_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("entities.id", ondelete="CASCADE"), nullable=False, index=True)
    changed_by_user_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    changed_by_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)  # FIELD_CORRECTION, MANUAL_MERGE, STATUS_CHANGE, DISMISS_DUPLICATE
    field_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    old_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    new_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(default=utc_now, index=True)


class IncidentRecord(Base):
    __tablename__ = "incident_records"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    severity: Mapped[str] = mapped_column(String(50), default="MEDIUM", index=True)  # CRITICAL, HIGH, MEDIUM, LOW
    affected_component: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(50), default="OPEN", index=True)  # OPEN, INVESTIGATING, MITIGATED, RESOLVED, CLOSED
    detection_method: Mapped[str] = mapped_column(String(100), default="AUTOMATED_HEALTH_CHECK")
    description: Mapped[str] = mapped_column(Text, nullable=False)
    related_logs: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    impact: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    assigned_owner: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    root_cause: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    corrective_action: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime] = mapped_column(default=utc_now, index=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    closed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class IntegrationConnectorStatus(Base):
    __tablename__ = "integration_connector_statuses"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    connector_name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    connector_type: Mapped[str] = mapped_column(String(50), nullable=False)  # GOV_API, DIRECTORY, SEARCH, LLM, MAP, SCRAPER
    base_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="HEALTHY", index=True)  # HEALTHY, DEGRADED, UNAVAILABLE
    last_successful_request: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    last_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    latency_ms: Mapped[float] = mapped_column(Float, default=0.0)
    requests_count_24h: Mapped[int] = mapped_column(Integer, default=0)
    errors_count_24h: Mapped[int] = mapped_column(Integer, default=0)
    quota_remaining: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    data_freshness_status: Mapped[str] = mapped_column(String(50), default="CURRENT")  # CURRENT, STALE, EXPIRED
    sync_frequency: Mapped[str] = mapped_column(String(50), default="HOURLY")  # CONTINUOUS, HOURLY, DAILY, WEEKLY, MANUAL
    supported_entities: Mapped[Optional[str]] = mapped_column(String(255), default="DOCTOR,DISPENSARY,COMPETITOR")
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    last_sync_checkpoint: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(default=utc_now, onupdate=utc_now)


class AiEvaluationBenchmarkRun(Base):
    __tablename__ = "ai_evaluation_benchmark_runs"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    prompt_version: Mapped[str] = mapped_column(String(50), default="v5.0")
    model_name: Mapped[str] = mapped_column(String(100), nullable=False)
    benchmark_suite_name: Mapped[str] = mapped_column(String(100), default="EXECUTIVE_CORE_6")
    total_questions: Mapped[int] = mapped_column(Integer, default=6)
    passed_questions: Mapped[int] = mapped_column(Integer, default=0)
    accuracy_score: Mapped[float] = mapped_column(Float, default=0.0)  # 0.0 - 1.0
    groundedness_score: Mapped[float] = mapped_column(Float, default=0.0)  # 0.0 - 1.0
    hallucination_rate: Mapped[float] = mapped_column(Float, default=0.0)  # 0.0 - 1.0
    results_json: Mapped[str] = mapped_column(Text, default="[]")
    executed_at: Mapped[datetime] = mapped_column(default=utc_now, index=True)


# ==========================================
# PHASE 6: ENTERPRISE INTEGRATIONS, PLATFORM EXTENSIBILITY & COLLABORATION MODELS
# ==========================================

class ApiKey(Base):
    __tablename__ = "api_keys"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    prefix: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    hashed_key: Mapped[str] = mapped_column(String(255), nullable=False)
    user_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    scopes: Mapped[str] = mapped_column(Text, default='["intelligence:read"]')  # JSON string array
    rate_limit_per_minute: Mapped[int] = mapped_column(Integer, default=60)
    requests_count: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    last_used_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=utc_now)


class WebhookSubscription(Base):
    __tablename__ = "webhook_subscriptions"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    target_url: Mapped[str] = mapped_column(String(500), nullable=False)
    secret_key: Mapped[str] = mapped_column(String(255), nullable=False)
    event_types: Mapped[str] = mapped_column(Text, default='["*"]')  # JSON string array
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=utc_now)


class WebhookDeliveryLog(Base):
    __tablename__ = "webhook_delivery_logs"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    subscription_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("webhook_subscriptions.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    event_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    payload_json: Mapped[str] = mapped_column(Text, nullable=False)
    http_status: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="PENDING", index=True)  # SUCCESS, FAILED, RETRYING, PENDING
    attempts: Mapped[int] = mapped_column(Integer, default=1)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    delivered_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=utc_now, index=True)


class DataImport(Base):
    __tablename__ = "data_imports"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_format: Mapped[str] = mapped_column(String(50), default="CSV")  # CSV, XLSX, JSON
    entity_type: Mapped[str] = mapped_column(String(50), default="DISPENSARY")  # DOCTOR, DISPENSARY, COMPETITOR
    status: Mapped[str] = mapped_column(String(50), default="PREVIEW", index=True)  # PREVIEW, VALIDATED, COMPLETED, FAILED
    total_records: Mapped[int] = mapped_column(Integer, default=0)
    added_records: Mapped[int] = mapped_column(Integer, default=0)
    updated_records: Mapped[int] = mapped_column(Integer, default=0)
    duplicate_records: Mapped[int] = mapped_column(Integer, default=0)
    error_records: Mapped[int] = mapped_column(Integer, default=0)
    validation_report_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=utc_now, index=True)


class ExportJob(Base):
    __tablename__ = "export_jobs"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    export_name: Mapped[str] = mapped_column(String(255), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(50), default="ALL")
    format: Mapped[str] = mapped_column(String(50), default="CSV")  # CSV, XLSX, JSON
    filters_json: Mapped[str] = mapped_column(Text, default="{}")
    fields_json: Mapped[str] = mapped_column(Text, default="[]")
    status: Mapped[str] = mapped_column(String(50), default="PENDING", index=True)  # PENDING, COMPLETED, FAILED
    record_count: Mapped[int] = mapped_column(Integer, default=0)
    file_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=utc_now, index=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class CrossSystemEntityLink(Base):
    __tablename__ = "cross_system_entity_links"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    canonical_entity_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("entities.id", ondelete="CASCADE"), nullable=False, index=True)
    system_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)  # INTERNAL_EHR, STATE_DOH, NPI_REGISTRY, BUSINESS_REGISTRY
    external_system_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    match_confidence: Mapped[float] = mapped_column(Float, default=1.0)
    match_reasons: Mapped[str] = mapped_column(Text, default="[]")  # JSON array
    review_status: Mapped[str] = mapped_column(String(50), default="CONFIRMED", index=True)  # CONFIRMED, PENDING_REVIEW, DISMISSED
    created_at: Mapped[datetime] = mapped_column(default=utc_now)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class DataConflict(Base):
    __tablename__ = "data_conflicts"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    entity_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("entities.id", ondelete="CASCADE"), nullable=False, index=True)
    field_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    source_a_name: Mapped[str] = mapped_column(String(100), nullable=False)
    source_a_value: Mapped[str] = mapped_column(Text, nullable=False)
    source_a_timestamp: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    source_b_name: Mapped[str] = mapped_column(String(100), nullable=False)
    source_b_value: Mapped[str] = mapped_column(Text, nullable=False)
    source_b_timestamp: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    resolution_status: Mapped[str] = mapped_column(String(50), default="UNRESOLVED", index=True)  # UNRESOLVED, RESOLVED_SOURCE_A, RESOLVED_SOURCE_B, MANUALLY_OVERRIDDEN
    winning_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resolution_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resolved_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=utc_now, index=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class CollaborationFinding(Base):
    __tablename__ = "collaboration_findings"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(100), default="OPPORTUNITY", index=True)  # OPPORTUNITY, COMPETITOR, REGULATORY, PRICING, GEO
    entity_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("entities.id", ondelete="SET NULL"), nullable=True)
    finding_summary: Mapped[str] = mapped_column(Text, nullable=False)
    evidence_sources: Mapped[str] = mapped_column(Text, default="[]")  # JSON array of source references
    status: Mapped[str] = mapped_column(String(50), default="DRAFT", index=True)  # DRAFT, UNDER_REVIEW, ACTION_APPROVED, RESOLVED, DISMISSED
    assigned_reviewer: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    follow_up_owner: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    management_decision: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=utc_now, index=True)
    updated_at: Mapped[datetime] = mapped_column(default=utc_now, onupdate=utc_now)


class IntelligenceNote(Base):
    __tablename__ = "intelligence_notes"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    finding_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("collaboration_findings.id", ondelete="CASCADE"), nullable=True, index=True)
    entity_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("entities.id", ondelete="CASCADE"), nullable=True, index=True)
    author_email: Mapped[str] = mapped_column(String(255), nullable=False)
    note_content: Mapped[str] = mapped_column(Text, nullable=False)
    is_internal_only: Mapped[bool] = mapped_column(Boolean, default=True)  # Strictly guarded internal notes
    created_at: Mapped[datetime] = mapped_column(default=utc_now, index=True)


class IntelligenceCase(Base):
    __tablename__ = "intelligence_cases"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    case_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False, index=True)  # COMPETITOR_MOVEMENT, PRICING_CHANGE, REGULATORY_REVIEW, GEOGRAPHIC_OPPORTUNITY, PARTNERSHIP_OPPORTUNITY, DATA_QUALITY_INCIDENT, FORECAST_DEVIATION
    severity: Mapped[str] = mapped_column(String(50), default="MEDIUM", index=True)  # CRITICAL, HIGH, MEDIUM, LOW
    status: Mapped[str] = mapped_column(String(50), default="OPEN", index=True)  # OPEN, INVESTIGATING, REVIEW_REQUIRED, DECISION_RECORDED, CLOSED
    assigned_investigator: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    assigned_reviewer: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    evidence_summary: Mapped[str] = mapped_column(Text, nullable=False)
    investigation_findings: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    management_decision: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    outcome_recorded: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=utc_now, index=True)
    updated_at: Mapped[datetime] = mapped_column(default=utc_now, onupdate=utc_now)
    closed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class ReportDistributionConfig(Base):
    __tablename__ = "report_distribution_configs"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    report_type: Mapped[str] = mapped_column(String(100), nullable=False)  # EXECUTIVE_WEEKLY, MARKET_OPPORTUNITY, COMPETITOR_PRICING, REGULATORY_BULLETIN
    channel: Mapped[str] = mapped_column(String(50), default="IN_APP")  # IN_APP, EMAIL, WEBHOOK, EXPORT
    recipient_target: Mapped[str] = mapped_column(String(500), nullable=False)
    schedule_cron: Mapped[Optional[str]] = mapped_column(String(100), default="0 9 * * 1")  # e.g., weekly Monday 9am
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_distributed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    delivery_status: Mapped[str] = mapped_column(String(50), default="IDLE")  # IDLE, SUCCESS, FAILED
    created_at: Mapped[datetime] = mapped_column(default=utc_now)


# ============================================================================
# PHASE 7: ADVANCED INTELLIGENCE RESEARCH & OPTIMIZATION MODELS
# ============================================================================

class ResearchProject(Base):
    __tablename__ = "research_projects"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    organization_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(50), default="ACTIVE", index=True)  # ACTIVE, ARCHIVED, COMPLETED
    target_states: Mapped[str] = mapped_column(Text, default="[]")  # JSON array
    created_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=utc_now, index=True)
    updated_at: Mapped[datetime] = mapped_column(default=utc_now, onupdate=utc_now)

    hypotheses: Mapped[list["ResearchHypothesis"]] = relationship("ResearchHypothesis", back_populates="project", cascade="all, delete-orphan")
    findings: Mapped[list["ResearchFinding"]] = relationship("ResearchFinding", back_populates="project", cascade="all, delete-orphan")


class ResearchHypothesis(Base):
    __tablename__ = "research_hypotheses"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    project_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("research_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    hypothesis_statement: Mapped[str] = mapped_column(Text, nullable=False)
    geographic_scope: Mapped[str] = mapped_column(String(100), default="NATIONAL")  # NATIONAL, STATE, COUNTY, ZIP
    geographic_target: Mapped[str] = mapped_column(String(100), default="ALL")  # "FL", "12086", "33101"
    time_period_start: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    time_period_end: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    comparison_groups_json: Mapped[str] = mapped_column(Text, default="[]")  # JSON array
    target_metrics_json: Mapped[str] = mapped_column(Text, default="[]")  # JSON array
    status: Mapped[str] = mapped_column(String(50), default="DRAFT", index=True)  # DRAFT, TESTING, SUPPORTED, CONTRADICTED, INCONCLUSIVE
    confidence_score: Mapped[float] = mapped_column(Float, default=0.0)  # 0.0 - 1.0
    methodology_notes: Mapped[str] = mapped_column(Text, default="")
    limitations_notes: Mapped[str] = mapped_column(Text, default="")
    created_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=utc_now, index=True)
    updated_at: Mapped[datetime] = mapped_column(default=utc_now, onupdate=utc_now)

    project: Mapped["ResearchProject"] = relationship("ResearchProject", back_populates="hypotheses")
    findings: Mapped[list["ResearchFinding"]] = relationship("ResearchFinding", back_populates="hypothesis")


class ResearchFinding(Base):
    __tablename__ = "research_findings"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    project_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("research_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    hypothesis_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("research_hypotheses.id", ondelete="SET NULL"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(100), default="OPPORTUNITY", index=True)  # OPPORTUNITY, COMPETITOR, PRICING, GEOGRAPHY, REGULATORY, DEMAND
    status: Mapped[str] = mapped_column(String(50), default="DRAFT", index=True)  # DRAFT, UNDER_INVESTIGATION, EVIDENCE_REVIEWED, VALIDATED, NEEDS_REASSESSMENT, SUPERSEDED, REJECTED
    calculation_method: Mapped[str] = mapped_column(String(255), default="DESCRIPTIVE_AGGREGATE")
    sample_size: Mapped[int] = mapped_column(Integer, default=0)
    data_coverage_pct: Mapped[float] = mapped_column(Float, default=100.0)
    confidence_score: Mapped[float] = mapped_column(Float, default=0.5)  # 0.0 - 1.0
    limitations: Mapped[str] = mapped_column(Text, default="")
    contradictory_evidence: Mapped[str] = mapped_column(Text, default="")
    recommended_next_step: Mapped[str] = mapped_column(Text, default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    reviewer_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=utc_now, index=True)
    updated_at: Mapped[datetime] = mapped_column(default=utc_now, onupdate=utc_now)

    project: Mapped["ResearchProject"] = relationship("ResearchProject", back_populates="findings")
    hypothesis: Mapped[Optional["ResearchHypothesis"]] = relationship("ResearchHypothesis", back_populates="findings")
    evidence_references: Mapped[list["EvidenceReference"]] = relationship("EvidenceReference", back_populates="finding", cascade="all, delete-orphan")
    review_history: Mapped[list["ResearchReviewHistory"]] = relationship("ResearchReviewHistory", back_populates="finding", cascade="all, delete-orphan")


class EvidenceReference(Base):
    __tablename__ = "evidence_references"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    finding_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("research_findings.id", ondelete="CASCADE"), nullable=False, index=True)
    source_type: Mapped[str] = mapped_column(String(100), default="PUBLIC_SURFACE_WEB", index=True)  # INTERNAL_AGGREGATE, STATE_DOH, NPI_REGISTRY, PUBLIC_SURFACE_WEB, OSM_DIRECTORY
    source_name: Mapped[str] = mapped_column(String(255), nullable=False)
    source_uri: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    observation_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    record_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    sample_count: Mapped[int] = mapped_column(Integer, default=1)
    confidence_weight: Mapped[float] = mapped_column(Float, default=1.0)
    supporting_data_json: Mapped[str] = mapped_column(Text, default="{}")
    is_contradictory: Mapped[bool] = mapped_column(Boolean, default=False)
    verification_status: Mapped[str] = mapped_column(String(50), default="VERIFIED", index=True)  # VERIFIED, UNVERIFIED, CONFLICTING, STALE
    created_at: Mapped[datetime] = mapped_column(default=utc_now)

    finding: Mapped["ResearchFinding"] = relationship("ResearchFinding", back_populates="evidence_references")


class ResearchReviewHistory(Base):
    __tablename__ = "research_review_history"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    finding_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("research_findings.id", ondelete="CASCADE"), nullable=False, index=True)
    reviewer_email: Mapped[str] = mapped_column(String(255), nullable=False)
    previous_status: Mapped[str] = mapped_column(String(50), nullable=False)
    new_status: Mapped[str] = mapped_column(String(50), nullable=False)
    review_notes: Mapped[str] = mapped_column(Text, default="")
    rationale: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(default=utc_now, index=True)

    finding: Mapped["ResearchFinding"] = relationship("ResearchFinding", back_populates="review_history")


class ScoringModelVersion(Base):
    __tablename__ = "scoring_model_versions"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    version_tag: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)  # e.g., "v1.0-default", "v2.0-expansion"
    model_name: Mapped[str] = mapped_column(String(255), nullable=False)
    weights_json: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=utc_now, index=True)


class GeographicScoreSnapshot(Base):
    __tablename__ = "geographic_score_snapshots"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    model_version_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("scoring_model_versions.id", ondelete="CASCADE"), nullable=False, index=True)
    geographic_level: Mapped[str] = mapped_column(String(50), default="STATE", index=True)  # STATE, COUNTY, ZIP
    geographic_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)  # "FL", "12086", "33101"
    geographic_name: Mapped[str] = mapped_column(String(255), default="")
    total_score: Mapped[float] = mapped_column(Float, nullable=False)
    component_scores_json: Mapped[str] = mapped_column(Text, default="{}")
    factor_contributions_json: Mapped[str] = mapped_column(Text, default="{}")
    data_freshness_days: Mapped[int] = mapped_column(Integer, default=0)
    missing_inputs_json: Mapped[str] = mapped_column(Text, default="[]")
    calculation_date: Mapped[datetime] = mapped_column(default=utc_now, index=True)


class ScenarioDefinition(Base):
    __tablename__ = "scenario_definitions"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    scenario_type: Mapped[str] = mapped_column(String(100), default="STATE_EXPANSION", index=True)  # STATE_EXPANSION, PRICE_ADJUSTMENT, PROMOTION_CADENCE, PHYSICIAN_CAPACITY, MULTI_STRATEGY
    target_state: Mapped[str] = mapped_column(String(50), default="FL")
    baseline_assumptions_json: Mapped[str] = mapped_column(Text, default="{}")
    candidate_assumptions_json: Mapped[str] = mapped_column(Text, default="{}")
    base_case_projection_json: Mapped[str] = mapped_column(Text, default="{}")
    best_case_projection_json: Mapped[str] = mapped_column(Text, default="{}")
    downside_case_projection_json: Mapped[str] = mapped_column(Text, default="{}")
    sensitivity_matrix_json: Mapped[str] = mapped_column(Text, default="{}")
    evidence_quality_score: Mapped[float] = mapped_column(Float, default=1.0)
    limitations_json: Mapped[str] = mapped_column(Text, default="[]")
    created_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=utc_now, index=True)


class AnalyticalRun(Base):
    __tablename__ = "analytical_runs"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    analysis_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)  # DESCRIPTIVE, CORRELATION, TIME_SERIES, CHANGE_POINT, SENSITIVITY, SEGMENT_COMPARISON
    parameters_json: Mapped[str] = mapped_column(Text, default="{}")
    input_sample_size: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(50), default="COMPLETED", index=True)  # COMPLETED, INSUFFICIENT_DATA, FAILED
    results_json: Mapped[str] = mapped_column(Text, default="{}")
    confidence_intervals_json: Mapped[str] = mapped_column(Text, default="{}")
    assumptions_json: Mapped[str] = mapped_column(Text, default="[]")
    limitations_json: Mapped[str] = mapped_column(Text, default="[]")
    execution_duration_ms: Mapped[int] = mapped_column(Integer, default=0)
    executed_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    executed_at: Mapped[datetime] = mapped_column(default=utc_now, index=True)


class CompetitivePatternRecord(Base):
    __tablename__ = "competitive_pattern_records"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    pattern_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)  # SUSTAINED_PRICE_DROP, PROMOTION_SURGE, GEOGRAPHIC_EXPANSION, SERVICE_EXPANSION, APPOINTMENT_CRUNCH, REVIEW_SENTIMENT_SHIFT
    competitor_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    state: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    observation_count: Mapped[int] = mapped_column(Integer, default=1)
    time_horizon_days: Mapped[int] = mapped_column(Integer, default=30)
    confidence_score: Mapped[float] = mapped_column(Float, default=0.8)
    is_sustained: Mapped[bool] = mapped_column(Boolean, default=True)  # True = sustained trend, False = isolated spike
    supporting_records_json: Mapped[str] = mapped_column(Text, default="[]")
    is_dismissed: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    dismissal_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    dismissed_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    dismissed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    detected_at: Mapped[datetime] = mapped_column(default=utc_now, index=True)


# =============================================================================
# PHASE 8: CONTINUOUS IMPROVEMENT, PRODUCT MATURITY & INTELLIGENCE QUALITY MODELS
# =============================================================================

class QualityMetricSnapshot(Base):
    __tablename__ = "quality_metric_snapshots"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    metric_name: Mapped[str] = mapped_column(String(100), index=True)  # DATA_COMPLETENESS, DATA_FRESHNESS_HOURS, SOURCE_RELIABILITY_PCT, DUPLICATE_RECORD_RATE, CONFLICT_RECORD_RATE, MISSING_ATTRIBUTION_RATE, CITATION_CORRECTNESS_PCT
    metric_category: Mapped[str] = mapped_column(String(50), default="DATA_QUALITY", index=True)  # DATA_QUALITY, AI_QUALITY, FORECAST_QUALITY, OPERATIONAL
    measured_value: Mapped[float] = mapped_column(Float, nullable=False)
    threshold_warning: Mapped[float] = mapped_column(Float, default=80.0)
    threshold_critical: Mapped[float] = mapped_column(Float, default=60.0)
    status: Mapped[str] = mapped_column(String(20), default="HEALTHY", index=True)  # HEALTHY, WARNING, CRITICAL
    sample_count: Mapped[int] = mapped_column(Integer, default=0)
    coverage_pct: Mapped[float] = mapped_column(Float, default=100.0)
    measurement_window_days: Mapped[int] = mapped_column(Integer, default=30)
    details_json: Mapped[str] = mapped_column(Text, default="{}")
    measured_at: Mapped[datetime] = mapped_column(default=utc_now, index=True)


class QualityRemediationLog(Base):
    __tablename__ = "quality_remediation_logs"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    incident_type: Mapped[str] = mapped_column(String(100), index=True)  # STALE_DATA_REFRESH, DUPLICATE_CANDIDATE_FLAG, JOB_RETRY, QUARANTINE_RECORD, CACHE_INVALIDATION
    target_entity_type: Mapped[str] = mapped_column(String(100))
    target_entity_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    action_taken: Mapped[str] = mapped_column(String(100))
    is_automated: Mapped[bool] = mapped_column(Boolean, default=True)
    triggered_by: Mapped[str] = mapped_column(String(255), default="system")
    status: Mapped[str] = mapped_column(String(50), default="SUCCESS")  # SUCCESS, FAILED, PENDING_HUMAN_APPROVAL, REVERTED
    result_notes: Mapped[str] = mapped_column(Text, default="")
    rollback_instructions: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(default=utc_now, index=True)


class AiRegressionTestCase(Base):
    __tablename__ = "ai_regression_test_cases"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    suite_name: Mapped[str] = mapped_column(String(100), default="CORE_BENCHMARK", index=True)
    test_type: Mapped[str] = mapped_column(String(50), default="FACTUAL", index=True)  # FACTUAL, CITATION_VALIDITY, NUMERICAL, PROMPT_INJECTION, PHI_LEAKAGE, PERMISSION
    question: Mapped[str] = mapped_column(Text, nullable=False)
    expected_answer: Mapped[str] = mapped_column(Text, nullable=False)
    expected_citations_json: Mapped[str] = mapped_column(Text, default="[]")
    risk_level: Mapped[str] = mapped_column(String(20), default="MEDIUM")  # LOW, MEDIUM, HIGH, CRITICAL
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(default=utc_now)


class AiRegressionRun(Base):
    __tablename__ = "ai_regression_runs"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    suite_name: Mapped[str] = mapped_column(String(100), default="CORE_BENCHMARK", index=True)
    model_name: Mapped[str] = mapped_column(String(100), default="gpt-4o")
    prompt_version: Mapped[str] = mapped_column(String(50), default="v7.0")
    dataset_version: Mapped[str] = mapped_column(String(50), default="v1.0")
    total_cases: Mapped[int] = mapped_column(Integer, default=0)
    passed_cases: Mapped[int] = mapped_column(Integer, default=0)
    failed_cases: Mapped[int] = mapped_column(Integer, default=0)
    citation_accuracy_pct: Mapped[float] = mapped_column(Float, default=100.0)
    numerical_accuracy_pct: Mapped[float] = mapped_column(Float, default=100.0)
    injection_resistance_pct: Mapped[float] = mapped_column(Float, default=100.0)
    phi_leakage_cases: Mapped[int] = mapped_column(Integer, default=0)
    overall_score: Mapped[float] = mapped_column(Float, default=1.0)
    is_regression_detected: Mapped[bool] = mapped_column(Boolean, default=False)
    execution_time_ms: Mapped[int] = mapped_column(Integer, default=0)
    results_json: Mapped[str] = mapped_column(Text, default="[]")
    created_at: Mapped[datetime] = mapped_column(default=utc_now, index=True)


class ForecastOutcomeRecord(Base):
    __tablename__ = "forecast_outcome_records"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    forecast_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("forecasts.id", ondelete="SET NULL"), nullable=True, index=True)
    metric_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    target_state: Mapped[str] = mapped_column(String(50), default="FL", index=True)
    prediction_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    target_date: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    predicted_value: Mapped[float] = mapped_column(Float, nullable=False)
    actual_value: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    absolute_error: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    percentage_error: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    directional_correct: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    verification_source: Mapped[str] = mapped_column(String(255), default="STATE_DOH_REGISTRY")
    status: Mapped[str] = mapped_column(String(50), default="PENDING", index=True)  # PENDING, VERIFIED, DISPUTED
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=utc_now)


class RecommendationOutcomeRecord(Base):
    __tablename__ = "recommendation_outcome_records"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    finding_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("research_findings.id", ondelete="SET NULL"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    target_state: Mapped[str] = mapped_column(String(50), default="FL")
    recommendation_type: Mapped[str] = mapped_column(String(100), default="PRICING_ADJUSTMENT")
    action_recommended: Mapped[str] = mapped_column(Text, nullable=False)
    adoption_status: Mapped[str] = mapped_column(String(50), default="PROPOSED", index=True)  # PROPOSED, ACCEPTED, REJECTED, EXECUTED
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    execution_notes: Mapped[str] = mapped_column(Text, default="")
    baseline_metric_val: Mapped[float] = mapped_column(Float, default=0.0)
    measured_outcome_val: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    outcome_delta: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    is_outcome_favorable: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    adopted_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    adopted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    measured_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=utc_now, index=True)


class ModelDriftRecord(Base):
    __tablename__ = "model_drift_records"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    model_or_feature_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    drift_type: Mapped[str] = mapped_column(String(100), default="INPUT_DISTRIBUTION", index=True)  # INPUT_DISTRIBUTION, OPPORTUNITY_SCORE, PRICE_VOLATILITY, MISSING_VALUE_RATE
    baseline_period: Mapped[str] = mapped_column(String(100))
    current_period: Mapped[str] = mapped_column(String(100))
    psi_score: Mapped[float] = mapped_column(Float, default=0.0)
    ks_statistic: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    p_value: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    drift_status: Mapped[str] = mapped_column(String(50), default="STABLE", index=True)  # STABLE, MODERATE_DRIFT, SIGNIFICANT_DRIFT
    classification: Mapped[str] = mapped_column(String(100), default="MARKET_CONDITION_SHIFT")  # MARKET_CONDITION_SHIFT, DATA_QUALITY_INCIDENT, MODEL_DEGRADATION, INSUFFICIENT_EVIDENCE
    details_json: Mapped[str] = mapped_column(Text, default="{}")
    recommended_action: Mapped[str] = mapped_column(Text, default="")
    detected_at: Mapped[datetime] = mapped_column(default=utc_now, index=True)


# ============================================================================
# PHASE 9: ENTERPRISE MULTI-TENANCY, ONBOARDING & COMMERCIAL READINESS MODELS
# ============================================================================

class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    domain: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="ACTIVE", index=True)  # ACTIVE, ONBOARDING, SUSPENDED, DEACTIVATED
    plan_tier: Mapped[str] = mapped_column(String(50), default="STARTER", index=True)  # STARTER, PROFESSIONAL, ENTERPRISE
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(default=utc_now, index=True)
    updated_at: Mapped[datetime] = mapped_column(default=utc_now, onupdate=utc_now)

    members: Mapped[list["OrganizationMembership"]] = relationship("OrganizationMembership", back_populates="organization", cascade="all, delete-orphan")
    invitations: Mapped[list["OrganizationInvitation"]] = relationship("OrganizationInvitation", back_populates="organization", cascade="all, delete-orphan")
    settings: Mapped[Optional["OrganizationSettings"]] = relationship("OrganizationSettings", back_populates="organization", cascade="all, delete-orphan", uselist=False)
    subscription: Mapped[Optional["OrganizationSubscription"]] = relationship("OrganizationSubscription", back_populates="organization", cascade="all, delete-orphan", uselist=False)


class OrganizationMembership(Base):
    __tablename__ = "organization_memberships"
    __table_args__ = (UniqueConstraint("organization_id", "user_id", name="uq_org_membership_user"),)

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(50), default="ANALYST", index=True)  # OWNER, ADMIN, ANALYST, VIEWER, SERVICE_ACCOUNT
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    joined_at: Mapped[datetime] = mapped_column(default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(default=utc_now, onupdate=utc_now)

    organization: Mapped["Organization"] = relationship("Organization", back_populates="members")
    user: Mapped["User"] = relationship("User")


class OrganizationInvitation(Base):
    __tablename__ = "organization_invitations"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(50), default="ANALYST")
    token: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    invited_by_user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="PENDING", index=True)  # PENDING, ACCEPTED, REVOKED, EXPIRED
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(default=utc_now)

    organization: Mapped["Organization"] = relationship("Organization", back_populates="invitations")


class OrganizationSettings(Base):
    __tablename__ = "organization_settings"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("organizations.id", ondelete="CASCADE"), unique=True, nullable=False)
    permitted_geographic_markets_json: Mapped[str] = mapped_column(Text, default='["FL"]')
    monitored_competitors_json: Mapped[str] = mapped_column(Text, default="[]")
    custom_opportunity_weights_json: Mapped[str] = mapped_column(Text, default="{}")
    alert_thresholds_json: Mapped[str] = mapped_column(Text, default="{}")
    notification_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    onboarding_status: Mapped[str] = mapped_column(String(50), default="COMPLETED", index=True)  # PROFILE, GEO_SCOPE, COMPETITORS, TEAM_INVITE, COMPLETED
    onboarding_step: Mapped[int] = mapped_column(Integer, default=5)
    created_at: Mapped[datetime] = mapped_column(default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(default=utc_now, onupdate=utc_now)

    organization: Mapped["Organization"] = relationship("Organization", back_populates="settings")


class OrganizationSubscription(Base):
    __tablename__ = "organization_subscriptions"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("organizations.id", ondelete="CASCADE"), unique=True, nullable=False)
    plan_tier: Mapped[str] = mapped_column(String(50), default="STARTER", index=True)  # STARTER, PROFESSIONAL, ENTERPRISE
    status: Mapped[str] = mapped_column(String(50), default="ACTIVE", index=True)  # ACTIVE, TRIALING, PAST_DUE, CANCELED
    billing_cycle: Mapped[str] = mapped_column(String(50), default="MONTHLY")  # MONTHLY, ANNUAL
    current_period_start: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    current_period_end: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    cancel_at_period_end: Mapped[bool] = mapped_column(Boolean, default=False)
    provider_name: Mapped[str] = mapped_column(String(50), default="STRIPE")  # STRIPE, SANDBOX
    provider_subscription_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(default=utc_now, onupdate=utc_now)

    organization: Mapped["Organization"] = relationship("Organization", back_populates="subscription")


class BillingCustomer(Base):
    __tablename__ = "billing_customers"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("organizations.id", ondelete="CASCADE"), unique=True, nullable=False)
    provider_name: Mapped[str] = mapped_column(String(50), default="STRIPE")
    provider_customer_id: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    billing_email: Mapped[str] = mapped_column(String(255), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="usd")
    created_at: Mapped[datetime] = mapped_column(default=utc_now)


class BillingInvoice(Base):
    __tablename__ = "billing_invoices"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    invoice_number: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    amount_due_usd: Mapped[float] = mapped_column(Float, default=0.0)
    amount_paid_usd: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(50), default="PAID", index=True)  # PAID, OPEN, VOID, UNCOLLECTIBLE
    period_start: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    period_end: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    pdf_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=utc_now, index=True)


class BillingWebhookEvent(Base):
    __tablename__ = "billing_webhook_events"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    provider_name: Mapped[str] = mapped_column(String(50), default="STRIPE", index=True)
    event_id: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    payload_json: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="PROCESSED", index=True)  # PROCESSED, FAILED, IGNORED
    processed_at: Mapped[datetime] = mapped_column(default=utc_now)


class TenantUsageRecord(Base):
    __tablename__ = "tenant_usage_records"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    metric_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)  # AI_TOKENS, EXPORTS_GENERATED, API_REQUESTS, MONITORED_ENTITIES, SCENARIOS_RUN
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    period_key: Mapped[str] = mapped_column(String(20), nullable=False, index=True)  # YYYY-MM
    source_ref: Mapped[str] = mapped_column(String(255), default="")
    idempotency_key: Mapped[Optional[str]] = mapped_column(String(255), unique=True, index=True, nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(default=utc_now, index=True)


class TenantAuditLog(Base):
    __tablename__ = "tenant_audit_logs"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    actor_user_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    actor_email: Mapped[str] = mapped_column(String(255), nullable=False)
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    target_type: Mapped[str] = mapped_column(String(100), nullable=False)
    target_id: Mapped[str] = mapped_column(String(255), default="")
    metadata_json: Mapped[str] = mapped_column(Text, default="{}")
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=utc_now, index=True)


class TenantApiKey(Base):
    __tablename__ = "tenant_api_keys"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    key_prefix: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    hashed_key: Mapped[str] = mapped_column(String(255), nullable=False)
    scopes_json: Mapped[str] = mapped_column(Text, default='["intelligence:read"]')
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=utc_now)


class TenantWebhook(Base):
    __tablename__ = "tenant_webhooks"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    target_url: Mapped[str] = mapped_column(String(500), nullable=False)
    signing_secret: Mapped[str] = mapped_column(String(255), nullable=False)
    events_json: Mapped[str] = mapped_column(Text, default='["finding.validated","alert.created"]')
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(default=utc_now)








