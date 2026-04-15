import io
import json
import time

import google.generativeai as genai

from app.config import get_settings


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
   {{"title": "AUDIO_UNPROCESSABLE", "summary": "", "sentiment": "neutral", "tasks": []}}

Respond ONLY with valid JSON in this exact structure:
{{
  "title": "string",
  "summary": "string",
  "sentiment": "positive|neutral|negative|mixed",
  "tasks": [
    {{
      "title": "string",
      "description": "string",
      "priority": "low|medium|high|critical"
    }}
  ]
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

        response = model.generate_content([extraction_prompt, uploaded_file])
    finally:
        # Always delete — zero retention on Google's servers
        try:
            genai.delete_file(uploaded_file.name)
        except Exception:
            pass

    text = response.text.strip()

    # Strip markdown code fences if present
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
    if text.endswith("```"):
        text = text[:-3].strip()
    if text.startswith("json"):
        text = text[4:].strip()

    result = json.loads(text)

    if result.get("title") == "AUDIO_UNPROCESSABLE":
        raise Exception(
            "The audio could not be transcribed. "
            "Please check that your microphone is working and that the meeting audio is audible."
        )

    return result


DEFAULT_SYSTEM_PROMPT = """You are a meeting assistant AI. Analyze the provided audio and extract:

1. **Title**: A concise title for the meeting/session.
2. **Summary**: A brief summary of the key points discussed (2-4 sentences).
3. **Sentiment**: The overall tone of the meeting (positive, neutral, negative, mixed).
4. **Tasks**: A list of actionable tasks extracted from the discussion. For each task include:
   - title: Short, actionable task title
   - description: Detailed description of what needs to be done
   - priority: low, medium, high, or critical

IMPORTANT — Language rule:
Detect the language spoken in the meeting and respond entirely in that language.
- If the participants speak Hebrew, write the title, summary, and all task titles and descriptions in Hebrew.
- If the participants speak English, write everything in English.
- If mixed, use the dominant language.
The "sentiment" field must always be one of: positive, neutral, negative, mixed (in English, always).
The "priority" field must always be one of: low, medium, high, critical (in English, always)."""
