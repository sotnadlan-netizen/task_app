import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const DEBUG = process.env.DEBUG_GEMINI === "true";

const JSON_FORMAT_INSTRUCTION = `IMPORTANT: Respond ONLY with a single valid JSON object.
No markdown, no code fences, no extra text before or after.
Required format:
{
  "summary": "brief summary of the conversation",
  "tasks": [
    {
      "title": "task title",
      "description": "detailed description",
      "assignee": "Advisor",
      "priority": "High"
    }
  ]
}
Valid assignee values: "Advisor" | "Client"
Valid priority values: "High" | "Medium" | "Low"`;

/**
 * Send base64-encoded audio to Gemini and return the parsed JSON result.
 * Throws on AI errors; calling code handles classification (quota, auth, etc.).
 */
export async function analyzeAudio(base64Audio, mimeType, systemPrompt) {
  if (!process.env.GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY is not set in .env");
  }

  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: systemPrompt,
  });

  if (DEBUG) {
    console.log("[gemini] systemInstruction (first 400 chars):", systemPrompt.slice(0, 400));
    console.log("[gemini] audio base64 length:", base64Audio.length);
  }

  console.log(`[gemini] ▶ Sending to model: ${MODEL}`);

  const t0 = Date.now();
  const result = await model.generateContent([
    { inlineData: { mimeType, data: base64Audio } },
    JSON_FORMAT_INSTRUCTION,
  ]);
  const elapsed = Date.now() - t0;

  let text = result.response.text().trim();
  console.log(`[gemini] ▶ Response received in ${elapsed}ms`);

  if (DEBUG) {
    console.log("[gemini] Full raw response:", text);
  }

  // Strip markdown code fences if the model wrapped the JSON anyway
  text = text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();

  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("AI response was not valid JSON. Raw: " + text.slice(0, 200));
  }
}
