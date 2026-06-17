from pydantic import BaseModel, Field
from enum import Enum
from typing import Literal, Optional
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


class TicketType(str, Enum):
    manual_complaint = "manual_complaint"
    system_error = "system_error"


class TicketStatus(str, Enum):
    open = "open"
    in_progress = "in_progress"
    resolved = "resolved"


class TicketPriority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


# --- Request Schemas ---

class EditRequestCreate(BaseModel):
    task_id: str
    field_changed: str
    old_value: str
    new_value: str


class EditRequestReview(BaseModel):
    status: PendingTaskStatus


class GlobalPromptUpdate(BaseModel):
    # The platform-wide base prompt ("how to do the job"). Platform admin only.
    system_text: str = Field(min_length=10, max_length=20000)


class QuotaUpdate(BaseModel):
    capacity_minutes: int = Field(ge=0)


class ProfileUpdate(BaseModel):
    language: Literal["en", "he"]


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    assignee_id: Optional[str] = None
    project_id: Optional[str] = None
    deadline: Optional[str] = None
    scheduled_at: Optional[str] = None  # ISO 8601 timestamp, or empty string to clear


class TaskCreate(BaseModel):
    org_id: str
    title: str
    description: str = ""
    priority: TaskPriority = TaskPriority.medium
    status: TaskStatus = TaskStatus.todo
    session_id: Optional[str] = None
    project_id: Optional[str] = None


class TicketCreate(BaseModel):
    org_id: str
    type: TicketType = TicketType.manual_complaint
    title: str = Field(min_length=1, max_length=300)
    description: str = ""
    priority: TicketPriority = TicketPriority.medium
    metadata: dict = Field(default_factory=dict)


class TicketUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TicketStatus] = None
    priority: Optional[TicketPriority] = None


class TicketMessageCreate(BaseModel):
    body: str = Field(min_length=1, max_length=10000)


class OrgCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    total_capacity_min: int = Field(ge=0)
    max_members: int = Field(ge=1)


class OrgUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    total_capacity_min: Optional[int] = Field(None, ge=0)
    max_members: Optional[int] = Field(None, ge=1)
    logo_url: Optional[str] = Field(None, max_length=1000)


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
    prompt_id: Optional[str] = None  # None = no mission overlay (global base prompt only)


class OrgPromptAssignmentUpdate(BaseModel):
    # Full replacement set of system_prompt ids this org is allowed to choose from.
    prompt_ids: list[str] = Field(default_factory=list)


class TaskExtracted(BaseModel):
    title: str
    description: str
    priority: TaskPriority = TaskPriority.medium
    deadline: Optional[str] = None
    scheduled_at: Optional[str] = None


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
