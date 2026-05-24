from fastapi import APIRouter, Depends
from supabase import Client
from app.api.deps import get_current_user, get_supabase
from app.models.schemas import ProfileUpdate

router = APIRouter(prefix="/api/profile", tags=["profile"])


@router.patch("")
async def update_profile(
    data: ProfileUpdate,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Update the current user's own profile (UI language preference)."""
    result = (
        supabase.table("profiles")
        .update({"language": data.language})
        .eq("id", user["id"])
        .execute()
    )
    return result.data[0] if result.data else {}
