from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from app.api.deps import get_current_user, get_supabase
from app.models.schemas import GlobalPromptUpdate
from app.services.gemini import DEFAULT_SYSTEM_PROMPT

router = APIRouter(prefix="/api/global-prompt", tags=["global-prompt"])


def _require_platform_admin(user: dict, supabase: Client) -> None:
    result = supabase.table("platform_admins").select("id").eq("user_id", user["id"]).execute()
    if not result.data:
        raise HTTPException(status_code=403, detail="Platform admin only")


@router.get("")
async def get_global_prompt(
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """
    Return the platform-wide base prompt (platform admin only).
    Falls back to the in-code DEFAULT_SYSTEM_PROMPT if none has been saved yet,
    flagged with is_default=True so the UI can show "(default)".
    """
    _require_platform_admin(user, supabase)

    result = (
        supabase.table("global_base_prompts")
        .select("system_text, updated_at")
        .eq("id", 1)
        .maybe_single()
        .execute()
    )
    if result and result.data and result.data.get("system_text"):
        return {
            "system_text": result.data["system_text"],
            "updated_at": result.data.get("updated_at"),
            "is_default": False,
        }
    return {"system_text": DEFAULT_SYSTEM_PROMPT, "updated_at": None, "is_default": True}


@router.put("")
async def update_global_prompt(
    data: GlobalPromptUpdate,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Create or replace the platform-wide base prompt (platform admin only)."""
    _require_platform_admin(user, supabase)

    supabase.table("global_base_prompts").upsert(
        {
            "id": 1,
            "system_text": data.system_text,
            "updated_by": user["id"],
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
    ).execute()
    return {"system_text": data.system_text, "is_default": False}
