from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from app.api.deps import get_current_user, get_supabase
from app.models.schemas import SystemPromptCreate, SystemPromptUpdate

router = APIRouter(prefix="/api/system-prompts", tags=["system-prompts"])


def _require_platform_admin(user: dict, supabase: Client) -> None:
    result = supabase.table("platform_admins").select("id").eq("user_id", user["id"]).execute()
    if not result.data:
        raise HTTPException(status_code=403, detail="Platform admin only")


def _is_platform_admin(user: dict, supabase: Client) -> bool:
    result = supabase.table("platform_admins").select("id").eq("user_id", user["id"]).execute()
    return bool(result.data)


@router.get("")
async def list_system_prompts(
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """
    List all system prompts.
    - Platform admins receive full data including system_text.
    - Org users receive only id, name, description (never system_text).
    """
    result = (
        supabase.table("system_prompts")
        .select("*")
        .order("created_at", desc=True)
        .execute()
    )
    prompts = result.data or []

    if not _is_platform_admin(user, supabase):
        # Strip system_text so org admins can never read it
        prompts = [
            {
                "id": p["id"],
                "name": p["name"],
                "description": p["description"],
                "created_at": p["created_at"],
            }
            for p in prompts
        ]

    return prompts


@router.post("")
async def create_system_prompt(
    data: SystemPromptCreate,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Create a new system prompt (platform admin only)."""
    _require_platform_admin(user, supabase)

    result = (
        supabase.table("system_prompts")
        .insert(
            {
                "name": data.name,
                "description": data.description,
                "system_text": data.system_text,
                "created_by": user["id"],
            }
        )
        .execute()
    )
    return result.data[0] if result.data else {}


@router.patch("/{prompt_id}")
async def update_system_prompt(
    prompt_id: str,
    data: SystemPromptUpdate,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Update an existing system prompt (platform admin only)."""
    _require_platform_admin(user, supabase)

    update_data = data.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = (
        supabase.table("system_prompts")
        .update(update_data)
        .eq("id", prompt_id)
        .execute()
    )
    return result.data[0] if result.data else {}


@router.delete("/{prompt_id}")
async def delete_system_prompt(
    prompt_id: str,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Delete a system prompt (platform admin only)."""
    _require_platform_admin(user, supabase)

    supabase.table("system_prompts").delete().eq("id", prompt_id).execute()
    return {"deleted": True}
