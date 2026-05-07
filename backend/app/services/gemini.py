import io
import json
import logging
import time

import google.generativeai as genai

from app.config import get_settings

logger = logging.getLogger(__name__)


def _get_model() -> genai.GenerativeModel:
    settings = get_settings()
    genai.configure(api_key=settings.gemini_api_key)
    return genai.GenerativeModel("gemini-2.5-flash")


async def process_audio_with_gemini(
    audio_bytes: bytes,
    mime_type: str,
    system_prompt: str,
) -> dict:
    """
    Send audio to Gemini 2.5 Flash via the File API for reliable processing.

    Using the File API instead of inline data avoids the 20 MB inline limit,
    which can be exceeded by recordings longer than ~15-20 minutes depending
    on browser bitrate.  The file is deleted from Google's servers immediately
    after processing — zero retention.

    Returns structured JSON with title, summary, sentiment, and tasks.
    Raises if the audio cannot be transcribed (empty, silent, corrupted).
    """
    model = _get_model()

    extraction_prompt = f"""{system_prompt}

CRITICAL RULES:
1. Base your entire response ONLY on what was actually spoken in the audio.
2. Do NOT invent, imagine, or hallucinate any content whatsoever.
3. If the audio is silent, inaudible, too noisy, or cannot be meaningfully transcribed,
   respond with exactly this JSON and nothing else:
   {{"title": "AUDIO_UNPROCESSABLE", "summary": "", "sentiment": "neutral", "tasks": [], "calendar_event": {{"is_detected": false, "title": "", "suggested_date": null, "suggested_time": null, "participants": []}}}}
4. For EVERY task, explicitly extract and list a deadline if one was mentioned or implied.
   Set "deadline" to null if no deadline was stated or can be reasonably inferred.
5. Detect any mention of a follow-up meeting, next scheduled call, deadline event, or concrete next step
   that warrants a calendar entry. Populate "calendar_event" accordingly.

Respond ONLY with valid JSON in this exact structure:
{{
  "title": "string",
  "summary": "string",
  "sentiment": "positive|neutral|negative|mixed",
  "tasks": [
    {{
      "title": "string",
      "description": "string",
      "priority": "low|medium|high|critical",
      "deadline": "string or null"
    }}
  ],
  "calendar_event": {{
    "is_detected": true,
    "title": "string",
    "suggested_date": "YYYYMMDD or null",
    "suggested_time": "HHMMSS or null",
    "participants": ["string"]
  }}
}}"""

    # Strip codec params from mime_type for the File API (e.g. "audio/webm;codecs=opus" → "audio/webm")
    clean_mime = mime_type.split(";")[0].strip()
    extension = clean_mime.split("/")[-1]  # e.g. "webm"

    # Upload to Gemini File API — handles any file size, much more reliable than inline
    audio_io = io.BytesIO(audio_bytes)
    uploaded_file = genai.upload_file(
        audio_io,
        mime_type=clean_mime,
        display_name=f"meeting.{extension}",
    )

    # Wait for Google to finish processing the upload (usually instant for audio)
    max_wait = 60  # seconds
    waited = 0
    while uploaded_file.state.name == "PROCESSING" and waited < max_wait:
        time.sleep(2)
        waited += 2
        uploaded_file = genai.get_file(uploaded_file.name)

    try:
        if uploaded_file.state.name != "ACTIVE":
            raise Exception(
                f"Gemini file processing failed (state={uploaded_file.state.name}). "
                "The audio format may not be supported."
            )

        # Retry up to 3 times on rate-limit (429) with the suggested backoff
        last_exc = None
        for attempt in range(3):
            try:
                response = model.generate_content([extraction_prompt, uploaded_file])
                break
            except Exception as exc:
                last_exc = exc
                msg = str(exc)
                if "429" in msg or "quota" in msg.lower():
                    import re
                    match = re.search(r"retry_delay\s*\{[^}]*seconds:\s*(\d+)", msg)
                    wait = int(match.group(1)) + 2 if match else 35
                    logger.warning("Gemini rate-limited (attempt %d/3). Waiting %ds…", attempt + 1, wait)
                    time.sleep(wait)
                else:
                    raise
        else:
            raise last_exc
    finally:
        # Always delete — zero retention on Google's servers
        try:
            genai.delete_file(uploaded_file.name)
        except Exception:
            pass

    try:
        text = response.text.strip()
    except Exception as e:
        # Happens when Gemini blocks the response (safety filter) or returns only thinking tokens
        candidates = getattr(response, "candidates", [])
        finish_reason = candidates[0].finish_reason if candidates else "unknown"
        raise Exception(f"Gemini returned no usable text (finish_reason={finish_reason}): {e}")

    logger.info("Gemini raw response (first 500 chars): %s", text[:500])

    # Strip markdown code fences if present
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
    if text.endswith("```"):
        text = text[:-3].strip()
    if text.startswith("json"):
        text = text[4:].strip()

    try:
        result = json.loads(text)
    except json.JSONDecodeError as e:
        logger.error("JSON parse failed. Raw text: %s", text)
        raise Exception(f"Gemini response was not valid JSON: {e}")

    if result.get("title") == "AUDIO_UNPROCESSABLE":
        raise Exception(
            "The audio could not be transcribed. "
            "Please check that your microphone is working and that the meeting audio is audible."
        )

    return result


DEFAULT_SYSTEM_PROMPT = """You are a senior professional meeting summarizer with deep expertise in business communication, project management, and executive reporting. Your job is to produce summaries and task lists that decision-makers can act on immediately — nothing filler, nothing missed.

---

## 1. TITLE
Write a sharp, specific title that reflects the core topic of the meeting. Avoid generic titles like "Team Meeting" or "Weekly Sync".

---

## 2. SUMMARY
First, judge the meeting's complexity and depth:
- **Short meeting or simple topic** (e.g. quick sync, single decision, status update): Write 2–3 focused sentences covering what was decided and why it matters.
- **Long or complex meeting** (e.g. strategic planning, multiple topics, important decisions): Write a structured summary of 4–8 sentences. Cover: what was discussed, what decisions were made, what concerns or risks were raised, and what the agreed direction is.

Your summary must:
- Read like it was written by a seasoned chief of staff — precise, professional, no fluff
- Capture decisions and conclusions, not just topics
- Highlight disagreements, open questions, or risks if they came up
- Never repeat what the tasks section already says

---

## 3. SENTIMENT
Assess the overall tone: positive, neutral, negative, or mixed.

---

## 4. TASKS
This is the most critical section. Think like a project manager reviewing the meeting for real deliverables.

**Include a task ONLY if:**
- Someone was explicitly or clearly implicitly assigned to do something
- It is a concrete, completable action (not a vague idea or general discussion point)
- It will have a real impact if not done

**Do NOT include:**
- Vague intentions ("we should think about...", "maybe we'll look into...")
- Things already completed during the meeting
- Duplicate or overlapping tasks — merge them
- Administrative noise (e.g. "send calendar invite" is only relevant if it was explicitly urgent)

For each real task:
- **title**: Action-oriented, starts with a verb (e.g. "Prepare Q2 budget proposal", "Fix login bug on mobile")
- **description**: Explain exactly what needs to be done, any context that will help the assignee, and what "done" looks like
- **priority**: Assign based on urgency and impact — be honest, not everything is critical
  - critical: blocks others or has an imminent hard deadline
  - high: important, should be done this week
  - medium: needs to get done but not urgent
  - low: nice to have, can wait
- **deadline**: Extract verbatim if stated (e.g. "Sunday EOD", "by next Thursday"). If strongly implied but not stated explicitly, note it with "(implied)". Set to null if none.

If the meeting produced no real tasks, return an empty array — do not invent tasks.

---

## 5. CALENDAR EVENT
Detect any mention of a follow-up meeting, next call, deadline event, or scheduled next step.
If detected:
- is_detected: true
- title: Concise event title
- suggested_date: YYYYMMDD format, or null
- suggested_time: HHMMSS format (24-hour), or null
- participants: email addresses or names mentioned as attendees
If none mentioned: is_detected false, all other fields null/empty.

---

## LANGUAGE RULE
Detect the dominant language spoken and respond entirely in that language for all human-readable fields.
- Hebrew meeting → Hebrew title, summary, task titles and descriptions
- English meeting → English throughout
- Mixed → use the dominant language
Fixed-value fields are always in English: "sentiment", "priority" values, date/time formats."""
