from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

import models
import schemas
from database import get_db
from auth import get_current_user

router = APIRouter(prefix="/projects", tags=["projects"])


def _get_project_or_404(project_id: int, db: Session) -> models.Project:
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


def _get_membership_or_403(
    project_id: int, user: models.User, db: Session
) -> models.ProjectMember:
    """Confirms the user belongs to this project. Raises 403 if not."""
    membership = (
        db.query(models.ProjectMember)
        .filter(
            models.ProjectMember.project_id == project_id,
            models.ProjectMember.user_id == user.id,
        )
        .first()
    )
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this project",
        )
    return membership


@router.post("", response_model=schemas.ProjectDetailOut, status_code=status.HTTP_201_CREATED)
def create_project(
    project_in: schemas.ProjectCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = models.Project(
        name=project_in.name,
        description=project_in.description,
        owner_id=current_user.id,
    )
    db.add(project)
    db.flush()  # get project.id before commit

    # Creator is automatically an admin member of their own project.
    membership = models.ProjectMember(
        project_id=project.id, user_id=current_user.id, role=models.MemberRole.admin
    )
    db.add(membership)
    db.commit()
    db.refresh(project)
    return project


@router.get("", response_model=List[schemas.ProjectOut])
def list_my_projects(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(models.Project)
        .join(models.ProjectMember)
        .filter(models.ProjectMember.user_id == current_user.id)
        .all()
    )


@router.get("/{project_id}", response_model=schemas.ProjectDetailOut)
def get_project(
    project_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_membership_or_403(project_id, current_user, db)
    project = (
        db.query(models.Project)
        .options(joinedload(models.Project.members).joinedload(models.ProjectMember.user))
        .filter(models.Project.id == project_id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


@router.put("/{project_id}", response_model=schemas.ProjectOut)
def update_project(
    project_id: int,
    project_in: schemas.ProjectCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _get_project_or_404(project_id, db)
    if project.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the project owner can edit this project",
        )
    project.name = project_in.name
    project.description = project_in.description
    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _get_project_or_404(project_id, db)
    if project.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the project owner can delete this project",
        )
    db.delete(project)  # cascade deletes members + tasks, see models.py
    db.commit()


@router.post(
    "/{project_id}/members", response_model=schemas.MemberOut, status_code=status.HTTP_201_CREATED
)
def add_member(
    project_id: int,
    member_in: schemas.MemberAdd,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    membership = _get_membership_or_403(project_id, current_user, db)
    if membership.role != models.MemberRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only project admins can add members",
        )

    user_to_add = db.query(models.User).filter(models.User.email == member_in.email).first()
    if not user_to_add:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No user found with that email — they need to sign up first",
        )

    existing = (
        db.query(models.ProjectMember)
        .filter(
            models.ProjectMember.project_id == project_id,
            models.ProjectMember.user_id == user_to_add.id,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This user is already a member of the project",
        )

    new_membership = models.ProjectMember(
        project_id=project_id, user_id=user_to_add.id, role=member_in.role
    )
    db.add(new_membership)
    db.commit()
    db.refresh(new_membership)
    return new_membership


@router.delete("/{project_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(
    project_id: int,
    user_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    membership = _get_membership_or_403(project_id, current_user, db)
    project = _get_project_or_404(project_id, db)

    is_self_leaving = user_id == current_user.id
    if membership.role != models.MemberRole.admin and not is_self_leaving:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only project admins can remove other members",
        )
    if user_id == project.owner_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The project owner cannot be removed",
        )

    target = (
        db.query(models.ProjectMember)
        .filter(
            models.ProjectMember.project_id == project_id,
            models.ProjectMember.user_id == user_id,
        )
        .first()
    )
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    db.delete(target)
    db.commit()
