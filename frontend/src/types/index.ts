export type UserRole = "admin" | "member" | "participant";

export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high" | "critical";
export type PendingTaskStatus = "pending" | "approved" | "rejected";
export type NotificationType =
  | "task_edit_request"
  | "task_approved"
  | "task_rejected"
  | "new_session"
  | "low_capacity";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  total_capacity_min: number;
  used_capacity_min: number;
  max_members: number;
  selected_prompt_id: string | null;
  created_at: string;
}

export interface SystemPrompt {
  id: string;
  name: string;
  description: string;
  system_text?: string;   // Only returned to platform admins
  created_at: string;
}

export interface OrgMembership {
  id: string;
  user_id: string | null;
  org_id: string;
  role: UserRole;
  capacity_minutes: number;
  used_minutes: number;
  invited_email?: string | null;
  created_at: string;
  organization?: Organization;
  profile?: Profile;
}

export interface Project {
  id: string;
  org_id: string;
  name: string;
  created_at: string;
}

export interface Session {
  id: string;
  org_id: string;
  created_by: string;
  title: string;
  summary: string;
  sentiment: string;
  duration_seconds: number;
  ai_prompt_version: number;
  created_at: string;
  project_id?: string | null;
  participant_ids?: string[];
}

export interface Task {
  id: string;
  session_id: string;
  org_id: string;
  title: string;
  description: string;
  assignee_id: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  external_sync_id: string | null;
  is_locked: boolean;
  deadline: string | null;
  created_at: string;
  project_id?: string | null;
  assignee?: Profile;
}

export interface PendingTask {
  id: string;
  task_id: string;
  org_id: string;
  requested_by: string;
  field_changed: string;
  old_value: string;
  new_value: string;
  status: PendingTaskStatus;
  reviewed_by: string | null;
  created_at: string;
  task?: Task;
  requester?: Profile;
}

export interface Notification {
  id: string;
  org_id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  related_entity_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface PromptVersion {
  id: string;
  org_id: string;
  version: number;
  prompt_text: string;
  created_by: string;
  is_active: boolean;
  created_at: string;
  creator?: Profile;
}

export interface AudioProcessingResult {
  session_id: string;
  title: string;
  summary: string;
  sentiment: string;
  tasks: Array<{
    title: string;
    description: string;
    priority: TaskPriority;
  }>;
}

export interface CapacityInfo {
  capacity_minutes: number;
  used_minutes: number;
  remaining_minutes: number;
  is_low_balance: boolean;
  is_blocked: boolean;
}
