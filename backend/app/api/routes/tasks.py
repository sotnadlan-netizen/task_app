from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client
from app.api.deps import get_current_user, get_supabase, check_platform_admin
from app.models.schemas import TaskUpdate, TaskCreate, EditRequestCreate, EditRequestReview
from app.services.task_service import approve_edit_request, reject_edit_request

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.get("")
async def list_tasks(
    org_id: str = Query(...),
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """List all tasks for the given org (filtered by RLS)."""
    if not check_platform_admin(user["id"], supabase):
        membership = (
            supabase.table("org_memberships")
            .select("role")
            .eq("user_id", user["id"])
            .eq("org_id", org_id)
            .execute()
        )
        if not membership.data:
            raise HTTPException(status_code=403, detail="Not a member of this organization")

    result = (
        supabase.table("tasks")
        .select("*")
        .eq("org_id", org_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []


@router.post("")
async def create_task(
    data: TaskCreate,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Create a task manually (member/admin only)."""
    if not check_platform_admin(user["id"], supabase):
        membership_res = (
            supabase.table("org_memberships")
            .select("role")
            .eq("user_id", user["id"])
            .eq("org_id", data.org_id)
            .limit(1)
            .execute()
        )
        membership_data = membership_res.data[0] if membership_res.data else None
        if not membership_data or membership_data["role"] == "participant":
            raise HTTPException(status_code=403, detail="Participants cannot create tasks")

    task_data: dict = {
        "org_id": data.org_id,
        "title": data.title,
        "description": data.description,
        "priority": data.priority.value,
        "status": data.status.value,
        "is_locked": False,
    }
    if data.session_id:
        task_data["session_id"] = data.session_id
    if data.project_id:
        task_data["project_id"] = data.project_id

    result = supabase.table("tasks").insert(task_data).execute()
    return result.data[0] if result.data else {}


@router.delete("/{task_id}")
async def delete_task(
    task_id: str,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Delete a task (member/admin only). Locked tasks cannot be deleted."""
    task = supabase.table("tasks").select("*").eq("id", task_id).single().execute()

    if not task.data:
        raise HTTPException(status_code=404, detail="Task not found")

    if task.data["is_locked"]:
        raise HTTPException(status_code=400, detail="Task is locked")

    if not check_platform_admin(user["id"], supabase):
        membership_res = (
            supabase.table("org_memberships")
            .select("role")
            .eq("user_id", user["id"])
            .eq("org_id", task.data["org_id"])
            .limit(1)
            .execute()
        )
        membership_data = membership_res.data[0] if membership_res.data else None
        if not membership_data or membership_data["role"] == "participant":
            raise HTTPException(status_code=403, detail="Participants cannot delete tasks")

    supabase.table("tasks").delete().eq("id", task_id).execute()
    return {"deleted": True}


@router.patch("/{task_id}")
async def update_task(
    task_id: str,
    data: TaskUpdate,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Update a task (member/admin only). Locked tasks cannot be edited."""
    task = supabase.table("tasks").select("*").eq("id", task_id).single().execute()

    if not task.data:
        raise HTTPException(status_code=404, detail="Task not found")

    if task.data["is_locked"]:
        raise HTTPException(
            status_code=400,
            detail="Task is locked (synced to external platform)",
        )

    # Verify user role
    if not check_platform_admin(user["id"], supabase):
        membership_res = (
            supabase.table("org_memberships")
            .select("role")
            .eq("user_id", user["id"])
            .eq("org_id", task.data["org_id"])
            .limit(1)
            .execute()
        )
        membership_data = membership_res.data[0] if membership_res.data else None
        if not membership_data or membership_data["role"] == "participant":
            raise HTTPException(status_code=403, detail="Participants cannot directly edit tasks")

    update_data = data.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = supabase.table("tasks").update(update_data).eq("id", task_id).execute()
    return result.data[0] if result.data else {}


@router.post("/edit-request")
async def create_edit_request(
    data: EditRequestCreate,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """
    Participant submits an edit request (goes to pending_tasks).
    Only moves to tasks table after Member/Admin approval.
    """
    task = supabase.table("tasks").select("*").eq("id", data.task_id).single().execute()

    if not task.data:
        raise HTTPException(status_code=404, detail="Task not found")

    if task.data["is_locked"]:
        raise HTTPException(status_code=400, detail="Task is locked")

    pending = {
        "task_id": data.task_id,
        "org_id": task.data["org_id"],
        "requested_by": user["id"],
        "field_changed": data.field_changed,
        "old_value": data.old_value,
        "new_value": data.new_value,
        "status": "pending",
    }

    result = supabase.table("pending_tasks").insert(pending).execute()

    # Notify members/admins in the org
    members = (
        supabase.table("org_memberships")
        .select("user_id")
        .eq("org_id", task.data["org_id"])
        .in_("role", ["member", "admin"])
        .execute()
    )

    if members.data:
        notifications = [
            {
                "org_id": task.data["org_id"],
                "user_id": m["user_id"],
                "type": "task_edit_request",
                "title": "New Edit Request",
                "body": f'A participant wants to change "{data.field_changed}" on task "{task.data["title"]}".',
                "related_entity_id": result.data[0]["id"] if result.data else None,
            }
            for m in members.data
        ]
        supabase.table("notifications").insert(notifications).execute()

    return result.data[0] if result.data else {}


@router.patch("/edit-request/{pending_task_id}")
async def review_edit_request(
    pending_task_id: str,
    data: EditRequestReview,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Member/Admin approves or rejects a pending edit request."""
    # Verify the reviewer has at least member role
    pending = (
        supabase.table("pending_tasks")
        .select("org_id")
        .eq("id", pending_task_id)
        .single()
        .execute()
    )

    if not pending.data:
        raise HTTPException(status_code=404, detail="Pending task not found")

    membership = (
        supabase.table("org_memberships")
        .select("role")
        .eq("user_id", user["id"])
        .eq("org_id", pending.data["org_id"])
        .single()
        .execute()
    )

    if not membership.data or membership.data["role"] == "participant":
        raise HTTPException(status_code=403, detail="Only members/admins can review")

    if data.status == "approved":
        await approve_edit_request(supabase, pending_task_id, user["id"])
    else:
        await reject_edit_request(supabase, pending_task_id, user["id"])

    return {"status": data.status}
