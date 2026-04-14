import json
from google import genai
from google.genai import types
from app.config import get_settings


def _get_client() -> genai.Client:
    settings = get_settings()
    return genai.Client(api_key=settings.gemini_api_key)


async def process_audio_with_gemini(
    audio_bytes: bytes,
    mime_type: str,
    system_prompt: str,
) -> dict:
    """
    Send audio to Gemini 2.5 Flash for transcription and structured extraction.

    Audio is processed entirely in-memory — never written to disk.
    Uses the async google-genai client so it doesn't block the event loop.
    Returns structured JSON with title, summary, sentiment, and tasks.
    """
    client = _get_client()

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

    response = await client.aio.models.generate_content(
        model="gemini-2.5-flash",
        contents=[
            types.Content(
                role="user",
                parts=[
                    types.Part.from_bytes(data=audio_bytes, mime_type=mime_type),
                    types.Part.from_text(extraction_prompt),
                ],
            )
        ],
    )

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
   - priority: low, medium, high, or critical"""
