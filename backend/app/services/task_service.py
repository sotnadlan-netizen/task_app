from supabase import Client
from fastapi import HTTPException
from typing import Optional, List


async def create_session_and_tasks(
    supabase: Client,
    org_id: str,
    user_id: str,
    duration_seconds: int,
    ai_result: dict,
    prompt_version: int,
    project_id: Optional[str] = None,
    participant_ids: Optional[List[str]] = None,
) -> dict:
    """
    Atomically create a session and its extracted tasks.
    Deducts used minutes from the member's capacity.
    """
    # Insert session
    session_data = {
        "org_id": org_id,
        "created_by": user_id,
        "title": ai_result.get("title", "Untitled Session"),
        "summary": ai_result.get("summary", ""),
        "sentiment": ai_result.get("sentiment", "neutral"),
        "duration_seconds": duration_seconds,
        "ai_prompt_version": prompt_version,
        "participant_ids": participant_ids or [],
    }
    if project_id:
        session_data["project_id"] = project_id

    session_result = supabase.table("sessions").insert(session_data).execute()
    if not session_result.data:
        raise HTTPException(status_code=500, detail="Failed to create session")

    session = session_result.data[0]

    # Insert tasks
    tasks_data = []
    for task in ai_result.get("tasks", []):
        task_entry: dict = {
            "session_id": session["id"],
            "org_id": org_id,
            "title": task.get("title", ""),
            "description": task.get("description", ""),
            "assignee_id": None,
            "status": "todo",
            "priority": task.get("priority", "medium"),
            "is_locked": False,
        }
        if task.get("deadline"):
            task_entry["deadline"] = task["deadline"]
        if project_id:
            task_entry["project_id"] = project_id
        tasks_data.append(task_entry)

    if tasks_data:
        supabase.table("tasks").insert(tasks_data).execute()

    # Deduct capacity
    duration_minutes = max(1, duration_seconds // 60)
    membership = (
        supabase.table("org_memberships")
        .select("used_minutes")
        .eq("user_id", user_id)
        .eq("org_id", org_id)
        .single()
        .execute()
    )

    if membership.data:
        new_used = membership.data["used_minutes"] + duration_minutes
        supabase.table("org_memberships").update(
            {"used_minutes": new_used}
        ).eq("user_id", user_id).eq("org_id", org_id).execute()

    # Update org-level usage
    org = (
        supabase.table("organizations")
        .select("used_capacity_min")
        .eq("id", org_id)
        .single()
        .execute()
    )
    if org.data:
        supabase.table("organizations").update(
            {"used_capacity_min": org.data["used_capacity_min"] + duration_minutes}
        ).eq("id", org_id).execute()

    return {
        "session_id": session["id"],
        "title": session["title"],
        "summary": session["summary"],
        "sentiment": session["sentiment"],
        "tasks": ai_result.get("tasks", []),
    }


async def approve_edit_request(
    supabase: Client,
    pending_task_id: str,
    reviewer_id: str,
) -> None:
    """Approve a pending edit: apply the change to the task and notify the requester."""
    pending = (
        supabase.table("pending_tasks")
        .select("*")
        .eq("id", pending_task_id)
        .single()
        .execute()
    )

    if not pending.data:
        raise HTTPException(status_code=404, detail="Pending task not found")

    pt = pending.data

    if pt["status"] != "pending":
        raise HTTPException(status_code=400, detail="Already reviewed")

    # Apply the change to the actual task
    task = (
        supabase.table("tasks")
        .select("is_locked")
        .eq("id", pt["task_id"])
        .single()
        .execute()
    )
    if task.data and task.data["is_locked"]:
        raise HTTPException(
            status_code=400,
            detail="Task is locked (synced to external platform)",
        )

    supabase.table("tasks").update(
        {pt["field_changed"]: pt["new_value"]}
    ).eq("id", pt["task_id"]).execute()

    # Mark as approved
    supabase.table("pending_tasks").update(
        {"status": "approved", "reviewed_by": reviewer_id}
    ).eq("id", pending_task_id).execute()

    # Notify the requester
    supabase.table("notifications").insert({
        "org_id": pt["org_id"],
        "user_id": pt["requested_by"],
        "type": "task_approved",
        "title": "Edit Request Approved",
        "body": f'Your edit to "{pt["field_changed"]}" was approved.',
        "related_entity_id": pt["task_id"],
    }).execute()


async def reject_edit_request(
    supabase: Client,
    pending_task_id: str,
    reviewer_id: str,
) -> None:
    """Reject a pending edit and notify the requester."""
    pending = (
        supabase.table("pending_tasks")
        .select("*")
        .eq("id", pending_task_id)
        .single()
        .execute()
    )

    if not pending.data:
        raise HTTPException(status_code=404, detail="Pending task not found")

    pt = pending.data

    if pt["status"] != "pending":
        raise HTTPException(status_code=400, detail="Already reviewed")

    supabase.table("pending_tasks").update(
        {"status": "rejected", "reviewed_by": reviewer_id}
    ).eq("id", pending_task_id).execute()

    supabase.table("notifications").insert({
        "org_id": pt["org_id"],
        "user_id": pt["requested_by"],
        "type": "task_rejected",
        "title": "Edit Request Rejected",
        "body": f'Your edit to "{pt["field_changed"]}" was rejected.',
        "related_entity_id": pt["task_id"],
    }).execute()
