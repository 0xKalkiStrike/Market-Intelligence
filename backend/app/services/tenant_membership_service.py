"""Tenant Membership Service - Organizations, Memberships, Roles, and Invitations."""
import secrets
import re
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import select, and_, func

from app.database.models import (
    Organization,
    OrganizationMembership,
    OrganizationInvitation,
    OrganizationSettings,
    OrganizationSubscription,
    User,
    Project,
    ResearchProject,
)
from app.services.tenant_audit_service import TenantAuditService


VALID_ROLES = {"OWNER", "ADMIN", "ANALYST", "VIEWER", "SERVICE_ACCOUNT"}
ROLE_HIERARCHY = {
    "OWNER": 100,
    "ADMIN": 80,
    "ANALYST": 50,
    "VIEWER": 20,
    "SERVICE_ACCOUNT": 40,
}


def slugify(text: str) -> str:
    """Generate clean URL slug from name."""
    s = text.lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_-]+", "-", s)
    s = re.sub(r"^-+|-+$", "", s)
    return s or "workspace"


class TenantMembershipService:

    @staticmethod
    def ensure_default_organization(db: Session) -> Organization:
        """Seed default Enterprise organization if database has none."""
        default_slug = "mmj-docs-primary"
        stmt = select(Organization).where(Organization.slug == default_slug)
        org = db.execute(stmt).scalar_one_or_none()
        
        if org:
            return org

        now = datetime.now(timezone.utc).replace(tzinfo=None)
        org_id = "e1000000-0000-0000-0000-000000000001"
        
        org = Organization(
            id=org_id,
            name="MMJ-DOCS Enterprise Primary",
            slug=default_slug,
            domain="mmj-docs.internal",
            status="ACTIVE",
            plan_tier="ENTERPRISE",
            is_demo=False,
            created_at=now,
            updated_at=now,
        )
        db.add(org)
        db.flush()

        # Settings
        settings = OrganizationSettings(
            id=str(uuid.uuid4()),
            organization_id=org.id,
            permitted_geographic_markets_json='["FL", "OK", "OH", "PA", "MI", "CA", "CO"]',
            monitored_competitors_json="[]",
            onboarding_status="COMPLETED",
            onboarding_step=5,
            created_at=now,
            updated_at=now,
        )
        db.add(settings)

        # Subscription
        sub = OrganizationSubscription(
            id=str(uuid.uuid4()),
            organization_id=org.id,
            plan_tier="ENTERPRISE",
            status="ACTIVE",
            billing_cycle="ANNUAL",
            current_period_start=now,
            current_period_end=now + timedelta(days=365),
            cancel_at_period_end=False,
            provider_name="SANDBOX",
            created_at=now,
            updated_at=now,
        )
        db.add(sub)

        # Attach all existing users
        users = db.execute(select(User)).scalars().all()
        for u in users:
            role = "OWNER" if u.is_superuser else "ANALYST"
            membership = OrganizationMembership(
                id=str(uuid.uuid4()),
                organization_id=org.id,
                user_id=u.id,
                role=role,
                is_active=True,
                joined_at=now,
                updated_at=now,
            )
            db.add(membership)

        # Backfill projects
        projects = db.execute(select(Project).where(Project.organization_id.is_(None))).scalars().all()
        for p in projects:
            p.organization_id = org.id

        r_projects = db.execute(select(ResearchProject).where(ResearchProject.organization_id.is_(None))).scalars().all()
        for rp in r_projects:
            rp.organization_id = org.id

        db.commit()
        db.refresh(org)
        return org

    @staticmethod
    def create_organization(
        db: Session,
        name: str,
        domain: Optional[str] = None,
        plan_tier: str = "STARTER",
        owner_user: Optional[User] = None,
        is_demo: bool = False,
    ) -> Organization:
        """Create a new tenant organization with isolated settings and owner."""
        base_slug = slugify(name)
        slug = base_slug
        counter = 1
        while db.execute(select(Organization).where(Organization.slug == slug)).scalar_one_or_none():
            slug = f"{base_slug}-{counter}"
            counter += 1

        now = datetime.now(timezone.utc).replace(tzinfo=None)
        org = Organization(
            id=str(uuid.uuid4()),
            name=name.strip(),
            slug=slug,
            domain=domain.strip() if domain else None,
            status="ACTIVE",
            plan_tier=plan_tier.upper(),
            is_demo=is_demo,
            created_at=now,
            updated_at=now,
        )
        db.add(org)
        db.flush()

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

        sub = OrganizationSubscription(
            id=str(uuid.uuid4()),
            organization_id=org.id,
            plan_tier=plan_tier.upper(),
            status="ACTIVE",
            billing_cycle="MONTHLY",
            current_period_start=now,
            current_period_end=now + timedelta(days=30),
            provider_name="SANDBOX",
            created_at=now,
            updated_at=now,
        )
        db.add(sub)

        if owner_user:
            membership = OrganizationMembership(
                id=str(uuid.uuid4()),
                organization_id=org.id,
                user_id=owner_user.id,
                role="OWNER",
                is_active=True,
                joined_at=now,
                updated_at=now,
            )
            db.add(membership)

        db.commit()
        db.refresh(org)

        if owner_user:
            TenantAuditService.log_event(
                db=db,
                organization_id=org.id,
                actor_user_id=owner_user.id,
                actor_email=owner_user.email,
                action="ORGANIZATION_CREATED",
                target_type="ORGANIZATION",
                target_id=org.id,
                metadata={"name": org.name, "plan_tier": plan_tier, "slug": org.slug},
            )

        return org

    @staticmethod
    def get_user_organizations(db: Session, user_id: str) -> List[Dict[str, Any]]:
        """List all active organizations for a user."""
        stmt = (
            select(Organization, OrganizationMembership.role)
            .join(OrganizationMembership, Organization.id == OrganizationMembership.organization_id)
            .where(
                and_(
                    OrganizationMembership.user_id == user_id,
                    OrganizationMembership.is_active,
                    Organization.status != "DEACTIVATED",
                )
            )
            .order_by(Organization.created_at.asc())
        )
        rows = db.execute(stmt).all()
        return [
            {
                "id": org.id,
                "name": org.name,
                "slug": org.slug,
                "domain": org.domain,
                "status": org.status,
                "plan_tier": org.plan_tier,
                "is_demo": org.is_demo,
                "role": role,
            }
            for org, role in rows
        ]

    @staticmethod
    def list_members(db: Session, organization_id: str) -> List[Dict[str, Any]]:
        """List all members of an organization."""
        stmt = (
            select(OrganizationMembership, User)
            .join(User, OrganizationMembership.user_id == User.id)
            .where(
                and_(
                    OrganizationMembership.organization_id == organization_id,
                    OrganizationMembership.is_active,
                )
            )
            .order_by(OrganizationMembership.joined_at.asc())
        )
        rows = db.execute(stmt).all()
        return [
            {
                "membership_id": m.id,
                "user_id": u.id,
                "email": u.email,
                "full_name": getattr(u, "full_name", "") or u.email.split("@")[0],
                "role": m.role,
                "is_active": m.is_active,
                "joined_at": m.joined_at.isoformat(),
            }
            for m, u in rows
        ]

    @staticmethod
    def add_member(
        db: Session,
        organization_id: str,
        user_id: str,
        role: str,
        actor_user: User,
    ) -> OrganizationMembership:
        """Add a registered user to an organization."""
        role = role.upper()
        if role not in VALID_ROLES:
            raise ValueError(f"Invalid role '{role}'. Must be one of {list(VALID_ROLES)}")

        # Check existing membership
        stmt = select(OrganizationMembership).where(
            and_(
                OrganizationMembership.organization_id == organization_id,
                OrganizationMembership.user_id == user_id,
            )
        )
        existing = db.execute(stmt).scalar_one_or_none()
        if existing:
            if not existing.is_active:
                existing.is_active = True
                existing.role = role
                existing.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
                db.commit()
                db.refresh(existing)
                return existing
            raise ValueError("User is already a member of this organization")

        now = datetime.now(timezone.utc).replace(tzinfo=None)
        membership = OrganizationMembership(
            id=str(uuid.uuid4()),
            organization_id=organization_id,
            user_id=user_id,
            role=role,
            is_active=True,
            joined_at=now,
            updated_at=now,
        )
        db.add(membership)
        db.commit()
        db.refresh(membership)

        TenantAuditService.log_event(
            db=db,
            organization_id=organization_id,
            actor_user_id=actor_user.id,
            actor_email=actor_user.email,
            action="MEMBER_ADDED",
            target_type="USER",
            target_id=user_id,
            metadata={"role": role},
        )
        return membership

    @staticmethod
    def update_member_role(
        db: Session,
        organization_id: str,
        target_user_id: str,
        new_role: str,
        actor_user: User,
    ) -> OrganizationMembership:
        """Update role for a member."""
        new_role = new_role.upper()
        if new_role not in VALID_ROLES:
            raise ValueError(f"Invalid role '{new_role}'. Must be one of {list(VALID_ROLES)}")

        stmt = select(OrganizationMembership).where(
            and_(
                OrganizationMembership.organization_id == organization_id,
                OrganizationMembership.user_id == target_user_id,
                OrganizationMembership.is_active,
            )
        )
        membership = db.execute(stmt).scalar_one_or_none()
        if not membership:
            raise ValueError("Member not found in organization")

        if membership.role == "OWNER" and new_role != "OWNER":
            # Check if there is another OWNER
            owners_count = db.execute(
                select(func.count(OrganizationMembership.id)).where(
                    and_(
                        OrganizationMembership.organization_id == organization_id,
                        OrganizationMembership.role == "OWNER",
                        OrganizationMembership.is_active,
                    )
                )
            ).scalar() or 0
            if owners_count <= 1:
                raise ValueError("Cannot demote the sole owner of an organization. Transfer ownership first.")

        old_role = membership.role
        membership.role = new_role
        membership.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
        db.commit()
        db.refresh(membership)

        TenantAuditService.log_event(
            db=db,
            organization_id=organization_id,
            actor_user_id=actor_user.id,
            actor_email=actor_user.email,
            action="MEMBER_ROLE_UPDATED",
            target_type="USER",
            target_id=target_user_id,
            metadata={"old_role": old_role, "new_role": new_role},
        )
        return membership

    @staticmethod
    def remove_member(
        db: Session,
        organization_id: str,
        target_user_id: str,
        actor_user: User,
    ) -> bool:
        """Remove a member from an organization."""
        stmt = select(OrganizationMembership).where(
            and_(
                OrganizationMembership.organization_id == organization_id,
                OrganizationMembership.user_id == target_user_id,
                OrganizationMembership.is_active,
            )
        )
        membership = db.execute(stmt).scalar_one_or_none()
        if not membership:
            raise ValueError("Member not found in organization")

        if membership.role == "OWNER":
            owners_count = db.execute(
                select(func.count(OrganizationMembership.id)).where(
                    and_(
                        OrganizationMembership.organization_id == organization_id,
                        OrganizationMembership.role == "OWNER",
                        OrganizationMembership.is_active,
                    )
                )
            ).scalar() or 0
            if owners_count <= 1:
                raise ValueError("Cannot remove the sole owner of an organization.")

        membership.is_active = False
        membership.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
        db.commit()

        TenantAuditService.log_event(
            db=db,
            organization_id=organization_id,
            actor_user_id=actor_user.id,
            actor_email=actor_user.email,
            action="MEMBER_REMOVED",
            target_type="USER",
            target_id=target_user_id,
            metadata={"removed_role": membership.role},
        )
        return True

    @staticmethod
    def transfer_ownership(
        db: Session,
        organization_id: str,
        current_owner_user: User,
        new_owner_user_id: str,
    ) -> bool:
        """Transfer organization ownership to another existing member."""
        if current_owner_user.id == new_owner_user_id:
            return True

        # Check target is active member
        stmt = select(OrganizationMembership).where(
            and_(
                OrganizationMembership.organization_id == organization_id,
                OrganizationMembership.user_id == new_owner_user_id,
                OrganizationMembership.is_active,
            )
        )
        target_membership = db.execute(stmt).scalar_one_or_none()
        if not target_membership:
            raise ValueError("Target user is not an active member of this organization")

        # Demote current owner to ADMIN
        curr_stmt = select(OrganizationMembership).where(
            and_(
                OrganizationMembership.organization_id == organization_id,
                OrganizationMembership.user_id == current_owner_user.id,
                OrganizationMembership.is_active,
            )
        )
        curr_membership = db.execute(curr_stmt).scalar_one_or_none()
        if curr_membership:
            curr_membership.role = "ADMIN"

        target_membership.role = "OWNER"
        db.commit()

        TenantAuditService.log_event(
            db=db,
            organization_id=organization_id,
            actor_user_id=current_owner_user.id,
            actor_email=current_owner_user.email,
            action="OWNERSHIP_TRANSFERRED",
            target_type="USER",
            target_id=new_owner_user_id,
            metadata={"previous_owner_id": current_owner_user.id},
        )
        return True

    # ----------------------------------------------------
    # Invitations
    # ----------------------------------------------------
    @staticmethod
    def create_invitation(
        db: Session,
        organization_id: str,
        email: str,
        role: str,
        actor_user: User,
    ) -> OrganizationInvitation:
        """Generate a secure team invitation with 7-day expiration."""
        email = email.strip().lower()
        role = role.upper()
        if role not in VALID_ROLES:
            raise ValueError(f"Invalid role '{role}'. Must be one of {list(VALID_ROLES)}")

        # Check if already active member
        stmt_user = select(User).where(User.email == email)
        u = db.execute(stmt_user).scalar_one_or_none()
        if u:
            m_stmt = select(OrganizationMembership).where(
                and_(
                    OrganizationMembership.organization_id == organization_id,
                    OrganizationMembership.user_id == u.id,
                    OrganizationMembership.is_active,
                )
            )
            if db.execute(m_stmt).scalar_one_or_none():
                raise ValueError("User is already a member of this organization")

        # Revoke any prior pending invitation for this email
        prior_stmt = select(OrganizationInvitation).where(
            and_(
                OrganizationInvitation.organization_id == organization_id,
                OrganizationInvitation.email == email,
                OrganizationInvitation.status == "PENDING",
            )
        )
        for inv in db.execute(prior_stmt).scalars().all():
            inv.status = "REVOKED"

        now = datetime.now(timezone.utc).replace(tzinfo=None)
        token = secrets.token_urlsafe(32)
        invitation = OrganizationInvitation(
            id=str(uuid.uuid4()),
            organization_id=organization_id,
            email=email,
            role=role,
            token=token,
            invited_by_user_id=actor_user.id,
            status="PENDING",
            expires_at=now + timedelta(days=7),
            created_at=now,
        )
        db.add(invitation)
        db.commit()
        db.refresh(invitation)

        TenantAuditService.log_event(
            db=db,
            organization_id=organization_id,
            actor_user_id=actor_user.id,
            actor_email=actor_user.email,
            action="INVITATION_CREATED",
            target_type="INVITATION",
            target_id=invitation.id,
            metadata={"email": email, "role": role},
        )
        return invitation

    @staticmethod
    def accept_invitation(
        db: Session,
        token: str,
        user: User,
    ) -> OrganizationMembership:
        """Accept an invitation and bind user to the tenant organization."""
        stmt = select(OrganizationInvitation).where(OrganizationInvitation.token == token)
        invitation = db.execute(stmt).scalar_one_or_none()
        if not invitation:
            raise ValueError("Invalid invitation token")

        if invitation.status != "PENDING":
            raise ValueError(f"Invitation is no longer pending (status: {invitation.status})")

        now = datetime.now(timezone.utc).replace(tzinfo=None)
        if invitation.expires_at < now:
            invitation.status = "EXPIRED"
            db.commit()
            raise ValueError("Invitation has expired")

        # Create or reactivate membership
        membership = TenantMembershipService.add_member(
            db=db,
            organization_id=invitation.organization_id,
            user_id=user.id,
            role=invitation.role,
            actor_user=user,
        )

        invitation.status = "ACCEPTED"
        db.commit()

        TenantAuditService.log_event(
            db=db,
            organization_id=invitation.organization_id,
            actor_user_id=user.id,
            actor_email=user.email,
            action="INVITATION_ACCEPTED",
            target_type="INVITATION",
            target_id=invitation.id,
            metadata={"role": invitation.role},
        )
        return membership

    @staticmethod
    def revoke_invitation(
        db: Session,
        organization_id: str,
        invitation_id: str,
        actor_user: User,
    ) -> bool:
        """Revoke a pending invitation."""
        stmt = select(OrganizationInvitation).where(
            and_(
                OrganizationInvitation.id == invitation_id,
                OrganizationInvitation.organization_id == organization_id,
            )
        )
        inv = db.execute(stmt).scalar_one_or_none()
        if not inv:
            raise ValueError("Invitation not found")

        inv.status = "REVOKED"
        db.commit()

        TenantAuditService.log_event(
            db=db,
            organization_id=organization_id,
            actor_user_id=actor_user.id,
            actor_email=actor_user.email,
            action="INVITATION_REVOKED",
            target_type="INVITATION",
            target_id=invitation_id,
            metadata={"email": inv.email},
        )
        return True

    @staticmethod
    def list_invitations(db: Session, organization_id: str) -> List[Dict[str, Any]]:
        """List invitations for an organization."""
        stmt = (
            select(OrganizationInvitation)
            .where(OrganizationInvitation.organization_id == organization_id)
            .order_by(OrganizationInvitation.created_at.desc())
        )
        invs = db.execute(stmt).scalars().all()
        return [
            {
                "id": inv.id,
                "email": inv.email,
                "role": inv.role,
                "token": inv.token,
                "status": inv.status,
                "expires_at": inv.expires_at.isoformat(),
                "created_at": inv.created_at.isoformat(),
            }
            for inv in invs
        ]
