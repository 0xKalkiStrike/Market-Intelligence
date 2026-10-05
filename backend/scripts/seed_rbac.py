"""Seed default roles and permissions. Run after migrations: python scripts/seed_rbac.py"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database.models import Permission, Role
from app.database.session import SessionLocal

PERMISSIONS = [
    ("users:read", "View users"),
    ("users:manage", "Create/update/disable users"),
    ("projects:manage", "Create/update/delete any project"),
    ("sources:manage", "Manage sources and adapters"),
    ("credentials:manage", "Manage source credentials"),
    ("verification:run", "Trigger verification jobs"),
    ("monitoring:manage", "Manage monitoring rules"),
    ("reports:generate", "Generate and export reports"),
    ("audit:read", "View audit logs"),
    ("workers:manage", "Manage orchestration workers"),
]

ROLES = {
    "admin": [code for code, _ in PERMISSIONS],
    "manager": [
        "projects:manage",
        "sources:manage",
        "credentials:manage",
        "verification:run",
        "monitoring:manage",
        "reports:generate",
        "audit:read",
    ],
    "analyst": ["verification:run", "reports:generate"],
    "viewer": [],
}


def run() -> None:
    db = SessionLocal()
    try:
        permission_map = {}
        for code, description in PERMISSIONS:
            perm = db.query(Permission).filter(Permission.code == code).first()
            if perm is None:
                perm = Permission(code=code, description=description)
                db.add(perm)
                db.flush()
            permission_map[code] = perm

        for role_name, perm_codes in ROLES.items():
            role = db.query(Role).filter(Role.name == role_name).first()
            if role is None:
                role = Role(name=role_name, description=f"{role_name.capitalize()} role")
                db.add(role)
                db.flush()
            role.permissions = [permission_map[code] for code in perm_codes]

        db.commit()
        print("RBAC seed complete.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
