from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from app.api.deps import get_current_user, get_supabase, check_platform_admin
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


class SessionUpdate(BaseModel):
    project_id: Optional[str] = None
    participant_ids: Optional[List[str]] = None


@router.delete("/{session_id}")
async def delete_session(
    session_id: str,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Delete a session and all its tasks (member/admin only). Tasks cascade via FK."""
    session = (
        supabase.table("sessions")
        .select("org_id")
        .eq("id", session_id)
        .single()
        .execute()
    )
    if not session.data:
        raise HTTPException(status_code=404, detail="Session not found")

    if not check_platform_admin(user["id"], supabase):
        membership = (
            supabase.table("org_memberships")
            .select("role")
            .eq("user_id", user["id"])
            .eq("org_id", session.data["org_id"])
            .limit(1)
            .execute()
        )
        membership_data = membership.data[0] if membership.data else None
        if not membership_data or membership_data["role"] == "participant":
            raise HTTPException(status_code=403, detail="Participants cannot delete sessions")

    supabase.table("sessions").delete().eq("id", session_id).execute()
    return {"deleted": True}


@router.patch("/{session_id}")
async def update_session(
    session_id: str,
    data: SessionUpdate,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Update a session's project_id or participant_ids (member/admin only)."""
    session = (
        supabase.table("sessions")
        .select("org_id")
        .eq("id", session_id)
        .single()
        .execute()
    )
    if not session.data:
        raise HTTPException(status_code=404, detail="Session not found")
    if not check_platform_admin(user["id"], supabase):
        membership = (
            supabase.table("org_memberships")
            .select("role")
            .eq("user_id", user["id"])
            .eq("org_id", session.data["org_id"])
            .limit(1)
            .execute()
        )
        membership_data = membership.data[0] if membership.data else None
        if not membership_data or membership_data["role"] == "participant":
            raise HTTPException(status_code=403, detail="Insufficient permissions")
    update_data = data.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = (
        supabase.table("sessions")
        .update(update_data)
        .eq("id", session_id)
        .execute()
    )

    # Cascade project change to all related tasks
    if "project_id" in update_data:
        supabase.table("tasks").update(
            {"project_id": update_data["project_id"]}
        ).eq("session_id", session_id).execute()

    return result.data[0] if result.data else {}
