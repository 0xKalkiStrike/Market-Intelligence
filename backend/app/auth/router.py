from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.auth.schemas import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from app.auth.security import create_access_token, hash_password, verify_password
from app.database.models import Role, User
from app.database.session import get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> User:
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")

    is_first_user = db.query(User).count() == 0
    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        is_superuser=is_first_user,
    )
    default_role_name = "admin" if is_first_user else "analyst"
    default_role = db.query(Role).filter(Role.name == default_role_name).first()
    if not default_role:
        default_role = Role(name=default_role_name, description=f"Default {default_role_name} role")
        db.add(default_role)
        db.flush()
    user.roles.append(default_role)


    db.add(user)
    db.commit()
    db.refresh(user)
    return _to_response(user)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.query(User).filter(User.email == payload.email).first()
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account is disabled")
    token = create_access_token(subject=user.id)
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserResponse)
def me(user: User = Depends(get_current_user)) -> UserResponse:
    return _to_response(user)


def _to_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        is_superuser=user.is_superuser,
        roles=[r.name for r in user.roles],
    )


def ensure_seed_users(db: Session) -> None:
    roles = {
        "admin": "Super Administrator with full platform access",
        "analyst": "Market Analyst with read & research capabilities",
    }
    for r_name, r_desc in roles.items():
        if not db.query(Role).filter(Role.name == r_name).first():
            db.add(Role(name=r_name, description=r_desc))
    db.commit()

    admin_role = db.query(Role).filter(Role.name == "admin").first()
    analyst_role = db.query(Role).filter(Role.name == "analyst").first()

    default_accounts = [
        ("admin@mmjdocs.com", "Admin123!", "Platform Administrator", True, [admin_role]),
        ("testuser@mmjdocs.com", "Password123!", "Test User", True, [admin_role]),
        ("analyst@mmjdocs.com", "Analyst123!", "Lead Market Analyst", False, [analyst_role]),
    ]

    for email, pwd, name, is_super, r_list in default_accounts:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            new_user = User(
                email=email,
                hashed_password=hash_password(pwd),
                full_name=name,
                is_active=True,
                is_superuser=is_super,
            )
            for r in r_list:
                if r:
                    new_user.roles.append(r)
            db.add(new_user)
        else:
            if not user.is_active:
                user.is_active = True
    db.commit()

