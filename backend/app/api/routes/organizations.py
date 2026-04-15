from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client
from app.api.deps import get_current_user, get_supabase, check_platform_admin
from app.models.schemas import QuotaUpdate, CapacityResponse, OrgCreate, OrgUpdate, MemberAdd, MemberRoleUpdate, OrgPromptSelect

router = APIRouter(prefix="/api/organizations", tags=["organizations"])


@router.get("")
async def list_user_organizations(
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """List organizations the current user belongs to."""
    result = (
        supabase.table("org_memberships")
        .select("*, organization:organizations(*)")
        .eq("user_id", user["id"])
        .execute()
    )
    return result.data or []


@router.get("/{org_id}/members")
async def list_org_members(
    org_id: str,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """List all members of an organization (admin only)."""
    if not check_platform_admin(user["id"], supabase):
        membership_res = (
            supabase.table("org_memberships")
            .select("role")
            .eq("user_id", user["id"])
            .eq("org_id", org_id)
            .limit(1)
            .execute()
        )
        membership = membership_res.data[0] if membership_res.data else None
        if not membership or membership["role"] not in ("admin", "member"):
            raise HTTPException(status_code=403, detail="Member access required")

    result = (
        supabase.table("org_memberships")
        .select("*, profile:profiles(*)")
        .eq("org_id", org_id)
        .order("created_at")
        .execute()
    )

    return result.data or []


@router.patch("/members/{membership_id}/quota")
async def update_member_quota(
    membership_id: str,
    data: QuotaUpdate,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Update a member's capacity quota (admin only)."""
    # Get the membership being updated to find org_id
    target_res = (
        supabase.table("org_memberships")
        .select("org_id")
        .eq("id", membership_id)
        .limit(1)
        .execute()
    )
    target_data = target_res.data[0] if target_res.data else None

    if not target_data:
        raise HTTPException(status_code=404, detail="Membership not found")

    # Verify admin role
    if not check_platform_admin(user["id"], supabase):
        admin_check_res = (
            supabase.table("org_memberships")
            .select("role")
            .eq("user_id", user["id"])
            .eq("org_id", target_data["org_id"])
            .limit(1)
            .execute()
        )
        admin_check_data = admin_check_res.data[0] if admin_check_res.data else None
        if not admin_check_data or admin_check_data["role"] != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")

    result = (
        supabase.table("org_memberships")
        .update({"capacity_minutes": data.capacity_minutes})
        .eq("id", membership_id)
        .execute()
    )

    return result.data[0] if result.data else {}


@router.post("")
async def create_org(
    data: OrgCreate,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Create a new organization (platform admin only)."""
    is_admin = supabase.table("platform_admins").select("id").eq("user_id", user["id"]).execute()
    if not is_admin.data:
        raise HTTPException(status_code=403, detail="Platform admin only")

    result = supabase.table("organizations").insert({
        "name": data.name,
        "total_capacity_min": data.total_capacity_min,
        "max_members": data.max_members,
    }).execute()
    return result.data[0] if result.data else {}


@router.patch("/{org_id}")
async def update_org(
    org_id: str,
    data: OrgUpdate,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Update org name/capacity (platform admin only)."""
    is_admin = supabase.table("platform_admins").select("id").eq("user_id", user["id"]).execute()
    if not is_admin.data:
        raise HTTPException(status_code=403, detail="Platform admin only")

    update_data = data.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = supabase.table("organizations").update(update_data).eq("id", org_id).execute()
    return result.data[0] if result.data else {}


@router.delete("/{org_id}")
async def delete_org(
    org_id: str,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Delete an organization (platform admin only)."""
    is_admin = supabase.table("platform_admins").select("id").eq("user_id", user["id"]).execute()
    if not is_admin.data:
        raise HTTPException(status_code=403, detail="Platform admin only")

    supabase.table("organizations").delete().eq("id", org_id).execute()
    return {"deleted": True}


@router.post("/{org_id}/members")
async def add_org_member(
    org_id: str,
    data: MemberAdd,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Add a member or participant to an org (admin or member)."""
    if not check_platform_admin(user["id"], supabase):
        membership_res = supabase.table("org_memberships").select("role").eq("user_id", user["id"]).eq("org_id", org_id).limit(1).execute()
        membership = membership_res.data[0] if membership_res.data else None
        if not membership or membership["role"] not in ("admin", "member"):
            raise HTTPException(status_code=403, detail="Insufficient permissions")

    # Look up profile by email
    profile_res = supabase.table("profiles").select("id").eq("email", data.email).limit(1).execute()
    profile_data = profile_res.data[0] if profile_res.data else None

    if profile_data:
        insert_payload = {"user_id": profile_data["id"], "org_id": org_id, "role": data.role.value, "capacity_minutes": 0}
    else:
        insert_payload = {"invited_email": data.email, "org_id": org_id, "role": data.role.value, "capacity_minutes": 0}

    result = supabase.table("org_memberships").insert(insert_payload).execute()
    return result.data[0] if result.data else {}


@router.delete("/{org_id}/members/{membership_id}")
async def remove_org_member(
    org_id: str,
    membership_id: str,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Remove a member from an org (admin only)."""
    if not check_platform_admin(user["id"], supabase):
        membership_res = supabase.table("org_memberships").select("role").eq("user_id", user["id"]).eq("org_id", org_id).limit(1).execute()
        membership = membership_res.data[0] if membership_res.data else None
        if not membership or membership["role"] != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")

    supabase.table("org_memberships").delete().eq("id", membership_id).eq("org_id", org_id).execute()
    return {"deleted": True}


@router.patch("/{org_id}/members/{membership_id}/role")
async def update_member_role(
    org_id: str,
    membership_id: str,
    data: MemberRoleUpdate,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Change a member's role (admin only)."""
    if not check_platform_admin(user["id"], supabase):
        membership_res = supabase.table("org_memberships").select("role").eq("user_id", user["id"]).eq("org_id", org_id).limit(1).execute()
        membership = membership_res.data[0] if membership_res.data else None
        if not membership or membership["role"] != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")

    result = supabase.table("org_memberships").update({"role": data.role.value}).eq("id", membership_id).eq("org_id", org_id).execute()
    return result.data[0] if result.data else {}


@router.patch("/{org_id}/prompt")
async def select_org_prompt(
    org_id: str,
    data: OrgPromptSelect,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Set or clear the global system prompt for this org (admin only)."""
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
        supabase.table("organizations")
        .update({"selected_prompt_id": data.prompt_id})
        .eq("id", org_id)
        .execute()
    )
    return result.data[0] if result.data else {}


@router.get("/{org_id}/capacity", response_model=CapacityResponse)
async def get_capacity(
    org_id: str,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Get the current user's capacity info for this org."""
    membership_res = (
        supabase.table("org_memberships")
        .select("capacity_minutes, used_minutes")
        .eq("user_id", user["id"])
        .eq("org_id", org_id)
        .limit(1)
        .execute()
    )
    membership = membership_res.data[0] if membership_res.data else None

    if not membership:
        raise HTTPException(status_code=403, detail="Not a member")

    cap = membership["capacity_minutes"]
    used = membership["used_minutes"]
    remaining = cap - used

    return CapacityResponse(
        capacity_minutes=cap,
        used_minutes=used,
        remaining_minutes=remaining,
        is_low_balance=remaining <= 10,
        is_blocked=remaining <= 0,
    )
