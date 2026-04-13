from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client
from app.api.deps import get_current_user, get_supabase
from app.models.schemas import PromptCreate

router = APIRouter(prefix="/api/prompts", tags=["prompts"])


@router.get("")
async def list_prompts(
    org_id: str = Query(...),
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """List all prompt versions for the org (admin only)."""
    membership = (
        supabase.table("org_memberships")
        .select("role")
        .eq("user_id", user["id"])
        .eq("org_id", org_id)
        .single()
        .execute()
    )

    if not membership.data or membership.data["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    result = (
        supabase.table("prompt_versions")
        .select("*")
        .eq("org_id", org_id)
        .order("version", desc=True)
        .execute()
    )

    return result.data or []


@router.post("")
async def create_prompt(
    data: PromptCreate,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Create a new prompt version (admin only). Previous active version is deactivated."""
    membership = (
        supabase.table("org_memberships")
        .select("role")
        .eq("user_id", user["id"])
        .eq("org_id", data.org_id)
        .single()
        .execute()
    )

    if not membership.data or membership.data["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    # Deactivate current
    supabase.table("prompt_versions").update({"is_active": False}).eq(
        "org_id", data.org_id
    ).execute()

    # Determine next version number
    latest = (
        supabase.table("prompt_versions")
        .select("version")
        .eq("org_id", data.org_id)
        .order("version", desc=True)
        .limit(1)
        .execute()
    )

    next_version = (latest.data[0]["version"] + 1) if latest.data else 1

    result = (
        supabase.table("prompt_versions")
        .insert({
            "org_id": data.org_id,
            "version": next_version,
            "prompt_text": data.prompt_text,
            "created_by": user["id"],
            "is_active": True,
        })
        .execute()
    )

    return result.data[0] if result.data else {}
