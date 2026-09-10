from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from auth import get_current_user

router = APIRouter(prefix="/projects/{project_id}/tasks", tags=["tasks"])


def _require_membership(project_id: int, user: models.User, db: Session) -> None:
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


def _get_task_or_404(project_id: int, task_id: int, db: Session) -> models.Task:
    task = (
        db.query(models.Task)
        .filter(models.Task.id == task_id, models.Task.project_id == project_id)
        .first()
    )
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task


@router.post("", response_model=schemas.TaskOut, status_code=status.HTTP_201_CREATED)
def create_task(
    project_id: int,
    task_in: schemas.TaskCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_membership(project_id, current_user, db)

    if task_in.assignee_id is not None:
        assignee_is_member = (
            db.query(models.ProjectMember)
            .filter(
                models.ProjectMember.project_id == project_id,
                models.ProjectMember.user_id == task_in.assignee_id,
            )
            .first()
        )
        if not assignee_is_member:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assignee must be a member of this project",
            )

    task = models.Task(project_id=project_id, **task_in.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.get("", response_model=List[schemas.TaskOut])
def list_tasks(
    project_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_membership(project_id, current_user, db)
    return db.query(models.Task).filter(models.Task.project_id == project_id).all()


@router.get("/{task_id}", response_model=schemas.TaskOut)
def get_task(
    project_id: int,
    task_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_membership(project_id, current_user, db)
    return _get_task_or_404(project_id, task_id, db)


@router.patch("/{task_id}", response_model=schemas.TaskOut)
def update_task(
    project_id: int,
    task_id: int,
    task_in: schemas.TaskUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Partial update — used for editing task details AND for moving a task
    between To Do / In Progress / Done (send just {"status": "in_progress"}).
    """
    _require_membership(project_id, current_user, db)
    task = _get_task_or_404(project_id, task_id, db)

    updates = task_in.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(task, field, value)

    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    project_id: int,
    task_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_membership(project_id, current_user, db)
    task = _get_task_or_404(project_id, task_id, db)
    db.delete(task)
    db.commit()
