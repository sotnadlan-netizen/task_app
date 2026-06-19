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
  language?: "en" | "he";
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  total_capacity_min: number;
  used_capacity_min: number;
  max_members: number;
  selected_prompt_id: string | null;
  logo_url: string | null;
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

export interface CalendarEvent {
  is_detected: boolean;
  title: string;
  suggested_date: string | null;
  suggested_time: string | null;
  participants: string[];
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
  system_prompt_id?: string | null;
  created_at: string;
  project_id?: string | null;
  participant_ids?: string[];
  calendar_event?: CalendarEvent | null;
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
  scheduled_at: string | null;
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

export type TicketType = "manual_complaint" | "system_error";
export type TicketStatus = "open" | "in_progress" | "resolved";
export type TicketPriority = "low" | "medium" | "high" | "critical";

export interface Ticket {
  id: string;
  org_id: string;
  user_id: string;
  type: TicketType;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Embedded by the API for display (optional).
  author?: Pick<Profile, "email" | "full_name"> | null;
  organization?: { name: string } | null;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  org_id: string;
  user_id: string;
  body: string;
  created_at: string;
  author?: Pick<Profile, "email" | "full_name"> | null;
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

// Platform-wide base prompt ("how to do the job"). Platform admins only.
export interface GlobalPrompt {
  system_text: string;
  updated_at: string | null;
  is_default: boolean;  // true when no row saved yet — using the in-code default
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
