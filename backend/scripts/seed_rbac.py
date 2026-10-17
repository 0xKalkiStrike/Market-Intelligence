"""Seed Enterprise RBAC roles and permissions (Phase 5). Run with: python scripts/seed_rbac.py"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.auth.rbac import ENTERPRISE_ROLES
from app.database.models import Permission, Role
from app.database.session import SessionLocal

ALL_PERMISSIONS = [
    ("system:manage", "Full system configuration, workers, and infrastructure control"),
    ("users:manage", "Create, update, disable users and role assignments"),
    ("projects:manage", "Create, update, delete projects"),
    ("sources:manage", "Manage data sources and external connectors"),
    ("credentials:manage", "Manage API source credentials"),
    ("collection:run", "Trigger data collection and ingestion jobs"),
    ("verification:run", "Trigger entity verification jobs"),
    ("monitoring:manage", "Manage continuous monitoring rules"),
    ("reports:generate", "Generate and export executive reports"),
    ("intelligence:read", "View market intelligence, competitors, and trends"),
    ("internal_metrics:read", "View restricted MMJ-DOCS appointment, revenue, and capacity metrics"),
    ("partnerships:manage", "Manage dispensary CRM partnership pipelines"),
    ("workflows:approve", "Authorize human approval gates for business workflows"),
    ("regulatory:review", "Review and sign off on regulatory compliance changes"),
    ("data_quality:correct", "Perform manual entity field corrections and duplicate resolutions"),
    ("ai:query", "Issue queries to AI Market Assistant"),
    ("ai:admin", "Configure AI models, budgets, and regression benchmarks"),
    ("audit:read", "View audit trails, change history, and security events"),
    ("backup:manage", "Trigger backups, restore tests, and disaster recovery"),
]


def run() -> None:
    db = SessionLocal()
    try:
        permission_map = {}
        for code, description in ALL_PERMISSIONS:
            perm = db.query(Permission).filter(Permission.code == code).first()
            if perm is None:
                perm = Permission(code=code, description=description)
                db.add(perm)
                db.flush()
            else:
                perm.description = description
            permission_map[code] = perm

        # Seed all 7 Enterprise Roles
        for role_key, role_info in ENTERPRISE_ROLES.items():
            role = db.query(Role).filter(Role.name == role_key).first()
            if role is None:
                role = Role(name=role_key, description=role_info["description"])
                db.add(role)
                db.flush()
            else:
                role.description = role_info["description"]

            # Map permissions
            mapped_perms = [
                permission_map[p] for p in role_info["permissions"] if p in permission_map
            ]
            role.permissions = mapped_perms

        # Ensure legacy aliases exist
        legacy_roles = {
            "admin": [p for p in permission_map.values()],
            "manager": [permission_map[c] for c in ["projects:manage", "sources:manage", "reports:generate", "audit:read", "intelligence:read"] if c in permission_map],
            "viewer": [permission_map[c] for c in ["intelligence:read"] if c in permission_map],
        }
        for legacy_name, perms in legacy_roles.items():
            r = db.query(Role).filter(Role.name == legacy_name).first()
            if r is None:
                r = Role(name=legacy_name, description=f"{legacy_name.capitalize()} role")
                db.add(r)
                db.flush()
            r.permissions = perms

        db.commit()
        print(f"Enterprise RBAC seed complete: {len(ENTERPRISE_ROLES)} enterprise roles and {len(ALL_PERMISSIONS)} permissions seeded successfully.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
