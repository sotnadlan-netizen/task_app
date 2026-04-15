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
    project_id: Optional[str] = None


class TaskCreate(BaseModel):
    org_id: str
    title: str
    description: str = ""
    priority: TaskPriority = TaskPriority.medium
    status: TaskStatus = TaskStatus.todo
    session_id: Optional[str] = None
    project_id: Optional[str] = None


class OrgCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    total_capacity_min: int = Field(ge=0)
    max_members: int = Field(ge=1)


class OrgUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    total_capacity_min: Optional[int] = Field(None, ge=0)
    max_members: Optional[int] = Field(None, ge=1)


class MemberAdd(BaseModel):
    email: str
    role: UserRole = UserRole.participant


class MemberRoleUpdate(BaseModel):
    role: UserRole


# --- Response Schemas ---

class SystemPromptCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str = Field(default="", max_length=500)
    system_text: str = Field(min_length=10, max_length=20000)


class SystemPromptUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    system_text: Optional[str] = Field(None, min_length=10, max_length=20000)


class OrgPromptSelect(BaseModel):
    prompt_id: Optional[str] = None  # None = clear selection (fall back to prompt_versions)


class TaskExtracted(BaseModel):
    title: str
    description: str
    priority: TaskPriority = TaskPriority.medium
    deadline: Optional[str] = None


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
