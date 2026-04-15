from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from app.api.deps import get_current_user, get_supabase

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


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

    membership = (
        supabase.table("org_memberships")
        .select("role")
        .eq("user_id", user["id"])
        .eq("org_id", session.data["org_id"])
        .single()
        .execute()
    )
    if not membership.data or membership.data["role"] == "participant":
        raise HTTPException(status_code=403, detail="Participants cannot delete sessions")

    supabase.table("sessions").delete().eq("id", session_id).execute()
    return {"deleted": True}
