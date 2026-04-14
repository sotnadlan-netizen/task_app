from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from supabase import Client
from app.api.deps import get_current_user, get_supabase, require_role
from app.services.gemini import process_audio_with_gemini, DEFAULT_SYSTEM_PROMPT
from app.services.task_service import create_session_and_tasks
from app.config import get_settings

router = APIRouter(prefix="/api/audio", tags=["audio"])

ALLOWED_MIME_TYPES = {"audio/webm", "audio/ogg", "audio/wav", "audio/mp4", "audio/mpeg"}


@router.post("/process")
async def process_audio(
    audio: UploadFile = File(...),
    org_id: str = Form(...),
    duration_seconds: int = Form(0),
    recovered: str = Form("false"),
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """
    Process uploaded audio through Gemini 2.5 Flash.

    Privacy: Audio is read into memory, sent to Gemini, then discarded.
    Zero disk footprint on our servers.
    """
    settings = get_settings()

    # Validate membership and role (must be at least 'member')
    # Use maybeSingle() — .single() raises an exception when 0 rows are returned,
    # which would cause a 500 instead of the intended 403.
    membership = (
        supabase.table("org_memberships")
        .select("*")
        .eq("user_id", user["id"])
        .eq("org_id", org_id)
        .maybe_single()
        .execute()
    )

    if not membership.data:
        raise HTTPException(status_code=403, detail="Not a member of this organization")

    if membership.data["role"] == "participant":
        raise HTTPException(status_code=403, detail="Participants cannot record")

    # Check capacity
    remaining = membership.data["capacity_minutes"] - membership.data["used_minutes"]
    if remaining <= 55:
        raise HTTPException(status_code=403, detail="Insufficient capacity (≤55 minutes)")

    # Read audio into memory (never touch disk)
    audio_bytes = await audio.read()

    max_bytes = settings.max_audio_size_mb * 1024 * 1024
    if len(audio_bytes) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"Audio file too large (max {settings.max_audio_size_mb}MB)",
        )

    mime_type = audio.content_type or "audio/webm"
    if mime_type not in ALLOWED_MIME_TYPES:
        mime_type = "audio/webm"

    # Get active prompt for this org (may not exist → fall back to default)
    prompt_result = (
        supabase.table("prompt_versions")
        .select("*")
        .eq("org_id", org_id)
        .eq("is_active", True)
        .maybe_single()
        .execute()
    )

    system_prompt = DEFAULT_SYSTEM_PROMPT
    prompt_version = 0
    if prompt_result.data:
        system_prompt = prompt_result.data["prompt_text"]
        prompt_version = prompt_result.data["version"]

    # Process with Gemini (in-memory only)
    try:
        ai_result = await process_audio_with_gemini(audio_bytes, mime_type, system_prompt)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI processing failed: {str(e)}")
    finally:
        # Ensure audio is garbage collected
        del audio_bytes

    # Create session and tasks
    result = await create_session_and_tasks(
        supabase=supabase,
        org_id=org_id,
        user_id=user["id"],
        duration_seconds=duration_seconds,
        ai_result=ai_result,
        prompt_version=prompt_version,
    )

    return result
