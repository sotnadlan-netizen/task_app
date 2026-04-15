from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client
from app.api.deps import get_current_user, get_supabase, check_platform_admin
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/projects", tags=["projects"])


class ProjectCreate(BaseModel):
    org_id: str
    name: str = Field(min_length=1, max_length=100)


@router.get("")
async def list_projects(
    org_id: str = Query(...),
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    if not check_platform_admin(user["id"], supabase):
        membership = (
            supabase.table("org_memberships")
            .select("role")
            .eq("user_id", user["id"])
            .eq("org_id", org_id)
            .execute()
        )
        if not membership.data:
            raise HTTPException(status_code=403, detail="Not a member of this organization")
    result = (
        supabase.table("projects")
        .select("*")
        .eq("org_id", org_id)
        .order("name")
        .execute()
    )
    return result.data or []


@router.post("")
async def create_project(
    data: ProjectCreate,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    if not check_platform_admin(user["id"], supabase):
        membership = (
            supabase.table("org_memberships")
            .select("role")
            .eq("user_id", user["id"])
            .eq("org_id", data.org_id)
            .execute()
        )
        if not membership.data:
            raise HTTPException(status_code=403, detail="Not a member of this organization")
    # Check if project with same name already exists
    existing = (
        supabase.table("projects")
        .select("id")
        .eq("org_id", data.org_id)
        .eq("name", data.name)
        .execute()
    )
    if existing.data:
        return existing.data[0]
    result = (
        supabase.table("projects")
        .insert({"org_id": data.org_id, "name": data.name})
        .execute()
    )
    return result.data[0] if result.data else {}
