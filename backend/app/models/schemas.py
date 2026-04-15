from pydantic import BaseModel, Field
from enum import Enum
from typing import Optional
from datetime import datetime


class UserRole(str, Enum):
    admin = "admin"
    member = "member"
    participant = "participant"


class TaskStatus(str, Enum):
    todo = "todo"
    in_progress = "in_progress"
    done = "done"


class TaskPriority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class PendingTaskStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


# --- Request Schemas ---

class EditRequestCreate(BaseModel):
    task_id: str
    field_changed: str
    old_value: str
    new_value: str


class EditRequestReview(BaseModel):
    status: PendingTaskStatus


class PromptCreate(BaseModel):
    org_id: str
    prompt_text: str = Field(min_length=10, max_length=10000)


class QuotaUpdate(BaseModel):
    capacity_minutes: int = Field(ge=0)


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    assignee_id: Optional[str] = None


class TaskCreate(BaseModel):
    org_id: str
    title: str
    description: str = ""
    priority: TaskPriority = TaskPriority.medium
    status: TaskStatus = TaskStatus.todo
    session_id: Optional[str] = None


# --- Response Schemas ---

class TaskExtracted(BaseModel):
    title: str
    description: str
    priority: TaskPriority = TaskPriority.medium


class AudioProcessingResult(BaseModel):
    session_id: str
    title: str
    summary: str
    sentiment: str
    tasks: list[TaskExtracted]


class CapacityResponse(BaseModel):
    capacity_minutes: int
    used_minutes: int
    remaining_minutes: int
    is_low_balance: bool
    is_blocked: bool


class HealthResponse(BaseModel):
    status: str = "healthy"
    version: str = "1.0.0"
    timestamp: datetime
