import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from supabase import Client
from app.api.deps import get_current_user, get_supabase, check_platform_admin
from app.models.schemas import QuotaUpdate, CapacityResponse, OrgCreate, OrgUpdate, MemberAdd, MemberRoleUpdate, OrgPromptSelect, OrgPromptAssignmentUpdate

router = APIRouter(prefix="/api/organizations", tags=["organizations"])

# Allowed logo content types → file extension.
ALLOWED_LOGO_TYPES = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "image/gif": "gif",
}
MAX_LOGO_BYTES = 2 * 1024 * 1024  # 2 MB


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


@router.post("/{org_id}/logo")
async def upload_org_logo(
    org_id: str,
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Upload an organization logo (platform admin or that org's admin).

    Stores the image in the public ``org-logos`` bucket and saves the public URL
    on ``organizations.logo_url``. Audio is never persisted to disk — but logos
    are deliberate, user-supplied branding assets, so they live in storage.
    """
    # ── Authorization: platform admin OR org admin ──────────────────────────
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
        if not membership or membership["role"] != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")

    content_type = (file.content_type or "").lower()
    ext = ALLOWED_LOGO_TYPES.get(content_type)
    if not ext:
        raise HTTPException(status_code=400, detail="Unsupported image type")

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(data) > MAX_LOGO_BYTES:
        raise HTTPException(status_code=400, detail="Logo too large (max 2 MB)")

    # Unique path per upload doubles as cache-busting for the public CDN URL.
    path = f"{org_id}/logo-{uuid.uuid4().hex}.{ext}"
    storage = supabase.storage.from_("org-logos")
    try:
        storage.upload(path, data, {"content-type": content_type})
    except Exception as exc:  # noqa: BLE001 — surface storage errors to the client
        raise HTTPException(status_code=500, detail=f"Logo upload failed: {exc}")

    public_url = storage.get_public_url(path)

    result = (
        supabase.table("organizations")
        .update({"logo_url": public_url})
        .eq("id", org_id)
        .execute()
    )
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


@router.get("/{org_id}/available-prompts")
async def list_org_available_prompts(
    org_id: str,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """
    List the system prompts this org may choose from (headline + description only).
    Visible to any member of the org and to platform admins. system_text is never returned.
    """
    if not check_platform_admin(user["id"], supabase):
        membership = (
            supabase.table("org_memberships")
            .select("id")
            .eq("user_id", user["id"])
            .eq("org_id", org_id)
            .limit(1)
            .execute()
        )
        if not membership.data:
            raise HTTPException(status_code=403, detail="Not a member of this organization")

    assignments = (
        supabase.table("org_system_prompts")
        .select("prompt_id, system_prompts(id, name, description, created_at)")
        .eq("org_id", org_id)
        .execute()
    )

    prompts = []
    for row in assignments.data or []:
        sp = row.get("system_prompts")
        if sp:
            prompts.append(
                {
                    "id": sp["id"],
                    "name": sp["name"],
                    "description": sp.get("description", ""),
                    "created_at": sp.get("created_at"),
                }
            )
    return prompts


@router.get("/{org_id}/assigned-prompts")
async def get_org_assigned_prompts(
    org_id: str,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Return the system_prompt ids assigned to this org (platform admin only)."""
    if not check_platform_admin(user["id"], supabase):
        raise HTTPException(status_code=403, detail="Platform admin only")

    result = (
        supabase.table("org_system_prompts")
        .select("prompt_id")
        .eq("org_id", org_id)
        .execute()
    )
    return [row["prompt_id"] for row in (result.data or [])]


@router.put("/{org_id}/assigned-prompts")
async def set_org_assigned_prompts(
    org_id: str,
    data: OrgPromptAssignmentUpdate,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Replace the full set of system prompts this org may choose from (platform admin only)."""
    if not check_platform_admin(user["id"], supabase):
        raise HTTPException(status_code=403, detail="Platform admin only")

    # Replace the assignment set: clear existing, then insert the new ids.
    supabase.table("org_system_prompts").delete().eq("org_id", org_id).execute()

    unique_ids = list(dict.fromkeys(data.prompt_ids))  # de-dupe, preserve order
    if unique_ids:
        supabase.table("org_system_prompts").insert(
            [{"org_id": org_id, "prompt_id": pid} for pid in unique_ids]
        ).execute()

    # If the org's current default selection is no longer assigned, clear it.
    org_row = (
        supabase.table("organizations")
        .select("selected_prompt_id")
        .eq("id", org_id)
        .single()
        .execute()
    )
    selected = (org_row.data or {}).get("selected_prompt_id")
    if selected and selected not in unique_ids:
        supabase.table("organizations").update({"selected_prompt_id": None}).eq("id", org_id).execute()

    return {"prompt_ids": unique_ids}


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
