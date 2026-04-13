from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client
from app.api.deps import get_current_user, get_supabase
from app.models.schemas import QuotaUpdate, CapacityResponse

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
    target = (
        supabase.table("org_memberships")
        .select("org_id")
        .eq("id", membership_id)
        .single()
        .execute()
    )

    if not target.data:
        raise HTTPException(status_code=404, detail="Membership not found")

    # Verify admin role
    admin_check = (
        supabase.table("org_memberships")
        .select("role")
        .eq("user_id", user["id"])
        .eq("org_id", target.data["org_id"])
        .single()
        .execute()
    )

    if not admin_check.data or admin_check.data["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    result = (
        supabase.table("org_memberships")
        .update({"capacity_minutes": data.capacity_minutes})
        .eq("id", membership_id)
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
    membership = (
        supabase.table("org_memberships")
        .select("capacity_minutes, used_minutes")
        .eq("user_id", user["id"])
        .eq("org_id", org_id)
        .single()
        .execute()
    )

    if not membership.data:
        raise HTTPException(status_code=403, detail="Not a member")

    cap = membership.data["capacity_minutes"]
    used = membership.data["used_minutes"]
    remaining = cap - used

    return CapacityResponse(
        capacity_minutes=cap,
        used_minutes=used,
        remaining_minutes=remaining,
        is_low_balance=remaining <= 70,
        is_blocked=remaining <= 55,
    )
