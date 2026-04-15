from fastapi import Depends, HTTPException, Header
from supabase import create_client, Client
from app.config import get_settings, Settings
import jwt


def get_supabase(settings: Settings = Depends(get_settings)) -> Client:
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


async def get_current_user(
    authorization: str = Header(...),
    settings: Settings = Depends(get_settings),
    supabase: Client = Depends(get_supabase),
) -> dict:
    """Validate JWT and return user info with org memberships."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization.removeprefix("Bearer ")

    try:
        # Verify with Supabase
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid token")

        user = user_response.user
        return {
            "id": user.id,
            "email": user.email,
            "token": token,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")


def check_platform_admin(user_id: str, supabase: Client) -> bool:
    """Return True if the user is a platform admin."""
    result = supabase.table("platform_admins").select("id").eq("user_id", user_id).limit(1).execute()
    return bool(result.data)


async def require_role(
    role: str,
    org_id: str,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
) -> dict:
    """Check that the user has the required role in the given org."""
    result = (
        supabase.table("org_memberships")
        .select("*")
        .eq("user_id", user["id"])
        .eq("org_id", org_id)
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=403, detail="Not a member of this organization")

    membership = result.data
    role_hierarchy = {"participant": 0, "member": 1, "admin": 2}

    if role_hierarchy.get(membership["role"], -1) < role_hierarchy.get(role, 99):
        raise HTTPException(status_code=403, detail=f"Requires {role} role or higher")

    return {**user, "membership": membership, "role": membership["role"]}
