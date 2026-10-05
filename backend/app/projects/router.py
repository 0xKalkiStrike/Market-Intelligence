from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user, require_project_member
from app.database.models import Project, ProjectUser, User
from app.database.session import get_db
from app.projects.schemas import (
    ProjectCreate,
    ProjectMemberAdd,
    ProjectMemberResponse,
    ProjectResponse,
    ProjectUpdate,
)

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=list[ProjectResponse])
def list_projects(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[Project]:
    if user.is_superuser:
        return db.query(Project).order_by(Project.created_at.desc()).all()
    owned = db.query(Project).filter(Project.owner_id == user.id)
    member_ids = [link.project_id for link in user.project_links]
    member = db.query(Project).filter(Project.id.in_(member_ids)) if member_ids else None
    projects = {p.id: p for p in owned}
    if member is not None:
        for p in member:
            projects[p.id] = p
    return sorted(projects.values(), key=lambda p: p.created_at, reverse=True)


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(payload: ProjectCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Project:
    project = Project(name=payload.name, description=payload.description, owner_id=user.id)
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project: Project = Depends(require_project_member)) -> Project:
    return project


@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project(payload: ProjectUpdate, project: Project = Depends(require_project_member), db: Session = Depends(get_db)) -> Project:
    if payload.name is not None:
        project.name = payload.name
    if payload.description is not None:
        project.description = payload.description
    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project: Project = Depends(require_project_member), user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> None:
    if project.owner_id != user.id and not user.is_superuser:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the owner can delete this project")
    db.delete(project)
    db.commit()


@router.get("/{project_id}/members", response_model=list[ProjectMemberResponse])
def list_members(project: Project = Depends(require_project_member), db: Session = Depends(get_db)) -> list[ProjectMemberResponse]:
    links = db.query(ProjectUser).filter(ProjectUser.project_id == project.id).all()
    return [
        ProjectMemberResponse(id=link.id, user_id=link.user_id, user_email=link.user.email, project_role=link.project_role)
        for link in links
    ]


@router.post("/{project_id}/members", response_model=ProjectMemberResponse, status_code=status.HTTP_201_CREATED)
def add_member(payload: ProjectMemberAdd, project: Project = Depends(require_project_member), db: Session = Depends(get_db)) -> ProjectMemberResponse:
    target = db.query(User).filter(User.email == payload.user_email).first()
    if target is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    existing = (
        db.query(ProjectUser)
        .filter(ProjectUser.project_id == project.id, ProjectUser.user_id == target.id)
        .first()
    )
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "User is already a member")
    link = ProjectUser(project_id=project.id, user_id=target.id, project_role=payload.project_role)
    db.add(link)
    db.commit()
    db.refresh(link)
    return ProjectMemberResponse(id=link.id, user_id=link.user_id, user_email=target.email, project_role=link.project_role)


@router.delete("/{project_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(member_id: str, project: Project = Depends(require_project_member), db: Session = Depends(get_db)) -> None:
    link = db.query(ProjectUser).filter(ProjectUser.id == member_id, ProjectUser.project_id == project.id).first()
    if link is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found")
    db.delete(link)
    db.commit()
