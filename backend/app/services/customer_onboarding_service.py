"""Customer Onboarding Service - Multi-step guided wizard for new organizations."""
import json
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database.models import (
    Organization,
    OrganizationSettings,
    ResearchProject,
    User,
)
from app.services.tenant_audit_service import TenantAuditService
from app.services.tenant_membership_service import TenantMembershipService


ONBOARDING_STEPS = {
    1: "PROFILE",
    2: "GEO_SCOPE",
    3: "COMPETITORS",
    4: "TEAM_INVITE",
    5: "COMPLETED",
}


class CustomerOnboardingService:

    @staticmethod
    def get_onboarding_status(db: Session, organization_id: str) -> Dict[str, Any]:
        """Fetch current onboarding step, status, and accumulated setup data."""
        org = db.execute(select(Organization).where(Organization.id == organization_id)).scalar_one_or_none()
        if not org:
            raise ValueError("Organization not found")

        settings = db.execute(select(OrganizationSettings).where(OrganizationSettings.organization_id == organization_id)).scalar_one_or_none()
        if not settings:
            # Create default settings if missing
            now = datetime.now(timezone.utc).replace(tzinfo=None)
            settings = OrganizationSettings(
                id=str(uuid.uuid4()),
                organization_id=org.id,
                permitted_geographic_markets_json='["FL"]',
                monitored_competitors_json="[]",
                onboarding_status="PROFILE",
                onboarding_step=1,
                created_at=now,
                updated_at=now,
            )
            db.add(settings)
            db.commit()
            db.refresh(settings)

        geo_markets = json.loads(settings.permitted_geographic_markets_json or "[]")
        competitors = json.loads(settings.monitored_competitors_json or "[]")

        return {
            "organization_id": org.id,
            "organization_name": org.name,
            "organization_slug": org.slug,
            "plan_tier": org.plan_tier,
            "onboarding_step": settings.onboarding_step,
            "onboarding_status": settings.onboarding_status,
            "is_completed": settings.onboarding_status == "COMPLETED",
            "profile": {
                "name": org.name,
                "domain": org.domain,
                "notification_email": settings.notification_email,
            },
            "geographic_markets": geo_markets,
            "monitored_competitors": competitors,
        }

    @staticmethod
    def update_profile_step(
        db: Session,
        organization_id: str,
        name: str,
        domain: Optional[str],
        notification_email: Optional[str],
        actor_user: User,
    ) -> Dict[str, Any]:
        """Step 1: Save organization profile."""
        org = db.execute(select(Organization).where(Organization.id == organization_id)).scalar_one_or_none()
        if not org:
            raise ValueError("Organization not found")

        settings = db.execute(select(OrganizationSettings).where(OrganizationSettings.organization_id == organization_id)).scalar_one_or_none()

        org.name = name.strip()
        if domain:
            org.domain = domain.strip()
        if settings:
            settings.notification_email = notification_email.strip() if notification_email else None
            settings.onboarding_step = max(settings.onboarding_step, 2)
            if settings.onboarding_status == "PROFILE":
                settings.onboarding_status = "GEO_SCOPE"

        db.commit()
        TenantAuditService.log_event(
            db=db,
            organization_id=organization_id,
            actor_user_id=actor_user.id,
            actor_email=actor_user.email,
            action="ONBOARDING_PROFILE_UPDATED",
            target_type="ORGANIZATION",
            target_id=organization_id,
            metadata={"name": name, "domain": domain},
        )
        return CustomerOnboardingService.get_onboarding_status(db, organization_id)

    @staticmethod
    def update_geo_scope_step(
        db: Session,
        organization_id: str,
        geographic_markets: List[str],
        actor_user: User,
    ) -> Dict[str, Any]:
        """Step 2: Save permitted geographic markets."""
        settings = db.execute(select(OrganizationSettings).where(OrganizationSettings.organization_id == organization_id)).scalar_one_or_none()
        if not settings:
            raise ValueError("Organization settings not found")

        clean_markets = [m.strip().upper() for m in geographic_markets if m.strip()]
        if not clean_markets:
            clean_markets = ["FL"]

        settings.permitted_geographic_markets_json = json.dumps(clean_markets)
        settings.onboarding_step = max(settings.onboarding_step, 3)
        if settings.onboarding_status in ("PROFILE", "GEO_SCOPE"):
            settings.onboarding_status = "COMPETITORS"

        db.commit()
        TenantAuditService.log_event(
            db=db,
            organization_id=organization_id,
            actor_user_id=actor_user.id,
            actor_email=actor_user.email,
            action="ONBOARDING_GEO_SCOPE_UPDATED",
            target_type="ORGANIZATION_SETTINGS",
            target_id=settings.id,
            metadata={"markets": clean_markets},
        )
        return CustomerOnboardingService.get_onboarding_status(db, organization_id)

    @staticmethod
    def update_competitors_step(
        db: Session,
        organization_id: str,
        competitors: List[str],
        actor_user: User,
    ) -> Dict[str, Any]:
        """Step 3: Save monitored competitors watchlist."""
        settings = db.execute(select(OrganizationSettings).where(OrganizationSettings.organization_id == organization_id)).scalar_one_or_none()
        if not settings:
            raise ValueError("Organization settings not found")

        clean_comps = [c.strip() for c in competitors if c.strip()]
        settings.monitored_competitors_json = json.dumps(clean_comps)
        settings.onboarding_step = max(settings.onboarding_step, 4)
        if settings.onboarding_status in ("PROFILE", "GEO_SCOPE", "COMPETITORS"):
            settings.onboarding_status = "TEAM_INVITE"

        db.commit()
        TenantAuditService.log_event(
            db=db,
            organization_id=organization_id,
            actor_user_id=actor_user.id,
            actor_email=actor_user.email,
            action="ONBOARDING_COMPETITORS_UPDATED",
            target_type="ORGANIZATION_SETTINGS",
            target_id=settings.id,
            metadata={"competitors": clean_comps},
        )
        return CustomerOnboardingService.get_onboarding_status(db, organization_id)

    @staticmethod
    def send_team_invitations_step(
        db: Session,
        organization_id: str,
        invitations: List[Dict[str, str]],
        actor_user: User,
    ) -> Dict[str, Any]:
        """Step 4: Dispatch team invitations."""
        settings = db.execute(select(OrganizationSettings).where(OrganizationSettings.organization_id == organization_id)).scalar_one_or_none()
        if not settings:
            raise ValueError("Organization settings not found")

        invited_count = 0
        for inv in invitations:
            email = inv.get("email", "").strip()
            role = inv.get("role", "ANALYST").strip().upper()
            if email:
                try:
                    TenantMembershipService.create_invitation(
                        db=db,
                        organization_id=organization_id,
                        email=email,
                        role=role,
                        actor_user=actor_user,
                    )
                    invited_count += 1
                except Exception:
                    pass  # Skip duplicates or invalid emails gracefully

        settings.onboarding_step = max(settings.onboarding_step, 5)
        if settings.onboarding_status in ("PROFILE", "GEO_SCOPE", "COMPETITORS", "TEAM_INVITE"):
            settings.onboarding_status = "COMPLETED"

        db.commit()
        return CustomerOnboardingService.get_onboarding_status(db, organization_id)

    @staticmethod
    def complete_onboarding(
        db: Session,
        organization_id: str,
        seed_sample_workspace: bool,
        actor_user: User,
    ) -> Dict[str, Any]:
        """Step 5: Finalize onboarding and optionally seed sample workspace."""
        settings = db.execute(select(OrganizationSettings).where(OrganizationSettings.organization_id == organization_id)).scalar_one_or_none()
        if not settings:
            raise ValueError("Organization settings not found")

        settings.onboarding_step = 5
        settings.onboarding_status = "COMPLETED"

        if seed_sample_workspace:
            # Create a sample research project labeled clearly as sample
            existing_sample = db.execute(
                select(ResearchProject).where(
                    ResearchProject.organization_id == organization_id,
                    ResearchProject.title == "[Sample] Florida Medical Market Expansion",
                )
            ).scalar_one_or_none()

            if not existing_sample:
                now = datetime.now(timezone.utc).replace(tzinfo=None)
                sample_proj = ResearchProject(
                    id=str(uuid.uuid4()),
                    organization_id=organization_id,
                    title="[Sample] Florida Medical Market Expansion",
                    description="Sample benchmark analysis of Orlando and Tampa dispensaries and doctor density.",
                    status="ACTIVE",
                    target_states='["FL"]',
                    created_by=actor_user.email,
                    created_at=now,
                    updated_at=now,
                )
                db.add(sample_proj)

        db.commit()
        TenantAuditService.log_event(
            db=db,
            organization_id=organization_id,
            actor_user_id=actor_user.id,
            actor_email=actor_user.email,
            action="ONBOARDING_COMPLETED",
            target_type="ORGANIZATION",
            target_id=organization_id,
            metadata={"seeded_sample": seed_sample_workspace},
        )
        return CustomerOnboardingService.get_onboarding_status(db, organization_id)
