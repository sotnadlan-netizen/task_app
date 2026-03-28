/**
 * Parse a raw string from the Gemini API into a structured { summary, tasks } object.
 * Handles:
 *   - Clean JSON responses
 *   - Responses wrapped in ```json ... ``` markdown fences
 *   - JSON embedded inside surrounding prose
 *
 * @param {string} text - Raw text from Gemini
 * @returns {{ summary: string, tasks: Array }}
 * @throws {Error} if no valid JSON can be extracted
 */
export function parseGeminiResponse(text) {
  if (typeof text !== "string") {
    throw new Error("parseGeminiResponse: input must be a string");
  }

  let cleaned = text.trim();

  // Strip markdown code fences (```json ... ``` or ``` ... ```)
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Fallback: extract the first {...} block from the text
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error(
        "AI response was not valid JSON. Raw: " + text.slice(0, 300)
      );
    }
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      throw new Error(
        "AI response was not valid JSON (embedded block). Raw: " + text.slice(0, 300)
      );
    }
  }

  const VALID_SENTIMENTS = ["Positive", "Neutral", "At-Risk"];

  return {
    title:              typeof parsed.title === "string" ? parsed.title.trim() : "",
    summary:            typeof parsed.summary === "string" ? parsed.summary : "",
    sentiment:          VALID_SENTIMENTS.includes(parsed.sentiment) ? parsed.sentiment : "Neutral",
    followUpQuestions:  Array.isArray(parsed.followUpQuestions)
                          ? parsed.followUpQuestions.filter((q) => typeof q === "string")
                          : [],
    tasks:              Array.isArray(parsed.tasks) ? parsed.tasks : [],
  };
}
