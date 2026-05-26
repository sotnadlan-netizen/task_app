from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client
from app.api.deps import get_current_user, get_supabase, check_platform_admin
from app.models.schemas import TicketCreate, TicketUpdate, TicketMessageCreate

router = APIRouter(prefix="/api/tickets", tags=["tickets"])

# Embed the author + organization so the UI can show names without extra queries.
TICKET_SELECT = (
    "*, author:profiles!tickets_user_id_fkey(email,full_name),"
    " organization:organizations!tickets_org_id_fkey(name)"
)
MESSAGE_SELECT = "*, author:profiles!ticket_messages_user_id_fkey(email,full_name)"


def _is_org_admin(user_id: str, org_id: str, supabase: Client) -> bool:
    """True if the user is a platform admin or an admin of the given org."""
    if check_platform_admin(user_id, supabase):
        return True
    membership = (
        supabase.table("org_memberships")
        .select("role")
        .eq("user_id", user_id)
        .eq("org_id", org_id)
        .limit(1)
        .execute()
    )
    data = membership.data[0] if membership.data else None
    return bool(data and data["role"] == "admin")


def _can_access_ticket(user_id: str, ticket: dict, supabase: Client) -> bool:
    """A user may view/discuss a ticket if they authored it, are an admin of its
    org, or are a platform admin."""
    if ticket.get("user_id") == user_id:
        return True
    return _is_org_admin(user_id, ticket["org_id"], supabase)


@router.get("")
async def list_tickets(
    org_id: str = Query(...),
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """List tickets for the given org.

    Org admins / platform admins see every ticket; other members see only the
    tickets they filed themselves.
    """
    if not check_platform_admin(user["id"], supabase):
        membership = (
            supabase.table("org_memberships")
            .select("role")
            .eq("user_id", user["id"])
            .eq("org_id", org_id)
            .limit(1)
            .execute()
        )
        if not membership.data:
            raise HTTPException(status_code=403, detail="Not a member of this organization")

    query = (
        supabase.table("tickets")
        .select(TICKET_SELECT)
        .eq("org_id", org_id)
        .order("created_at", desc=True)
    )

    if not _is_org_admin(user["id"], org_id, supabase):
        query = query.eq("user_id", user["id"])

    result = query.execute()
    return result.data or []


@router.get("/all")
async def list_all_tickets(
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Global cross-org ticket list — platform admins only."""
    if not check_platform_admin(user["id"], supabase):
        raise HTTPException(status_code=403, detail="Platform admin only")

    result = (
        supabase.table("tickets")
        .select(TICKET_SELECT)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []


@router.post("")
async def create_ticket(
    data: TicketCreate,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """File a ticket. Any member of the org may submit one (incl. participants)."""
    if not check_platform_admin(user["id"], supabase):
        membership = (
            supabase.table("org_memberships")
            .select("role")
            .eq("user_id", user["id"])
            .eq("org_id", data.org_id)
            .limit(1)
            .execute()
        )
        if not membership.data:
            raise HTTPException(status_code=403, detail="Not a member of this organization")

    ticket_data = {
        "org_id": data.org_id,
        "user_id": user["id"],
        "type": data.type.value,
        "title": data.title,
        "description": data.description,
        "priority": data.priority.value,
        "metadata": data.metadata,
    }

    result = supabase.table("tickets").insert(ticket_data).execute()
    return result.data[0] if result.data else {}


@router.patch("/{ticket_id}")
async def update_ticket(
    ticket_id: str,
    data: TicketUpdate,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Update a ticket (status/priority/etc). Admins only."""
    ticket = supabase.table("tickets").select("*").eq("id", ticket_id).single().execute()

    if not ticket.data:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if not _is_org_admin(user["id"], ticket.data["org_id"], supabase):
        raise HTTPException(status_code=403, detail="Only admins can update tickets")

    update_data = data.model_dump(exclude_none=True)
    # Pydantic enums → their string values for the DB.
    for enum_field in ("status", "priority"):
        if enum_field in update_data and hasattr(update_data[enum_field], "value"):
            update_data[enum_field] = update_data[enum_field].value
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = supabase.table("tickets").update(update_data).eq("id", ticket_id).execute()
    return result.data[0] if result.data else {}


@router.get("/{ticket_id}/messages")
async def list_ticket_messages(
    ticket_id: str,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Chat thread for a ticket. Visible to the author, the ticket's org admins,
    and platform admins."""
    ticket = supabase.table("tickets").select("*").eq("id", ticket_id).single().execute()
    if not ticket.data:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if not _can_access_ticket(user["id"], ticket.data, supabase):
        raise HTTPException(status_code=403, detail="Not allowed to view this ticket")

    result = (
        supabase.table("ticket_messages")
        .select(MESSAGE_SELECT)
        .eq("ticket_id", ticket_id)
        .order("created_at", desc=False)
        .execute()
    )
    return result.data or []


@router.post("/{ticket_id}/messages")
async def create_ticket_message(
    ticket_id: str,
    data: TicketMessageCreate,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Post a message to a ticket's chat thread."""
    ticket = supabase.table("tickets").select("*").eq("id", ticket_id).single().execute()
    if not ticket.data:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if not _can_access_ticket(user["id"], ticket.data, supabase):
        raise HTTPException(status_code=403, detail="Not allowed to post to this ticket")

    message = {
        "ticket_id": ticket_id,
        "org_id": ticket.data["org_id"],
        "user_id": user["id"],
        "body": data.body,
    }

    result = supabase.table("ticket_messages").insert(message).execute()
    # Re-fetch with the author embed so the client renders the name immediately.
    if result.data:
        created = (
            supabase.table("ticket_messages")
            .select(MESSAGE_SELECT)
            .eq("id", result.data[0]["id"])
            .single()
            .execute()
        )
        return created.data or result.data[0]
    return {}
