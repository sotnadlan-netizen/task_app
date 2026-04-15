import json
import google.generativeai as genai
from app.config import get_settings


def get_gemini_model():
    settings = get_settings()
    genai.configure(api_key=settings.gemini_api_key)
    return genai.GenerativeModel("gemini-2.5-flash")


async def process_audio_with_gemini(
    audio_bytes: bytes,
    mime_type: str,
    system_prompt: str,
) -> dict:
    """
    Send audio to Gemini 2.5 Flash for transcription and structured extraction.

    Audio is processed entirely in-memory — never written to disk.
    Returns structured JSON with title, summary, sentiment, and tasks.
    The output language matches the language spoken in the meeting.
    """
    model = get_gemini_model()

    extraction_prompt = f"""{system_prompt}

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

    audio_part = {
        "mime_type": mime_type,
        "data": audio_bytes,
    }

    response = model.generate_content([extraction_prompt, audio_part])

    text = response.text.strip()
    # Strip markdown code fences if present
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
    if text.endswith("```"):
        text = text[:-3].strip()
    if text.startswith("json"):
        text = text[4:].strip()

    return json.loads(text)


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
