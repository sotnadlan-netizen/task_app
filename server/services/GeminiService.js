import { GoogleGenerativeAI } from "@google/generative-ai";
import { parseGeminiResponse } from "../utils/parseGeminiResponse.js";

const MODEL              = process.env.GEMINI_MODEL        || "gemini-2.5-flash";
const DEBUG              = process.env.DEBUG_GEMINI        === "true";
const REQUEST_TIMEOUT_MS = parseInt(process.env.GEMINI_TIMEOUT_MS || "90000", 10);
const MAX_RETRIES        = 3;
const BASE_DELAY_MS      = 1000;

const JSON_FORMAT_INSTRUCTION = `IMPORTANT: Respond ONLY with a single valid JSON object.
No markdown, no code fences, no extra text before or after.
Required format:
{
  "title": "short 5-word Hebrew headline",
  "summary": "brief summary of the conversation",
  "sentiment": "Positive",
  "followUpQuestions": [
    "What is the client's timeline for signing?",
    "Has the client compared rates at other banks?"
  ],
  "tasks": [
    {
      "title": "task title",
      "description": "detailed description",
      "assignee": "Advisor",
      "priority": "High"
    }
  ]
}
Field descriptions:
- "title": a concise 4–6 word Hebrew headline summarizing the session topic
- "summary": a brief summary of the conversation
- "sentiment": overall emotional tone of the client in the session
- "followUpQuestions": 2–4 clarifying questions the advisor should ask in the next session to fill any information gaps
- "tasks": list of action items extracted from the session
Valid assignee values: "Advisor" | "Client"
Valid priority values: "High" | "Medium" | "Low"
Valid sentiment values: "Positive" | "Neutral" | "At-Risk"
  - "Positive": client is engaged, optimistic, moving forward confidently
  - "Neutral": no strong signals either way
  - "At-Risk": client expressed hesitation, frustration, confusion, or financial stress`;

// ── Retry helpers ─────────────────────────────────────────────────────────────

const RETRYABLE_PATTERNS = [
  /429/, /RESOURCE_EXHAUSTED/,
  /503/, /UNAVAILABLE/i,
  /500/, /Internal Server Error/i,
];

function isRetryable(err) {
  const msg = err?.message || "";
  return RETRYABLE_PATTERNS.some((p) => p.test(msg));
}

async function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Gemini request timed out after ${ms / 1000}s`)),
      ms
    );
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function withRetry(fn) {
  let lastErr;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_RETRIES && isRetryable(err)) {
        const jitter = Math.random() * 500;
        const delay  = BASE_DELAY_MS * Math.pow(2, attempt) + jitter;
        console.warn(
          `[gemini] ⚠ Transient error (attempt ${attempt + 1}/${MAX_RETRIES + 1}), ` +
          `retrying in ${Math.round(delay)}ms — ${err.message.slice(0, 120)}`
        );
        await new Promise((r) => setTimeout(r, delay));
      } else {
        throw err;
      }
    }
  }
  throw lastErr;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Send base64-encoded audio to Gemini and return the parsed JSON result.
 *
 * @param {string} base64Audio
 * @param {string} mimeType
 * @param {string} systemPrompt
 * @returns {{ summary: string, tasks: Array, usage: object|null }}
 */
export async function analyzeAudio(base64Audio, mimeType, systemPrompt) {
  if (!process.env.GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY is not set in .env");
  }

  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

  // AI-010: structured output via responseSchema — guarantees valid JSON without relying solely on prompt
  const responseSchema = {
    type: "object",
    properties: {
      title:             { type: "string" },
      summary:           { type: "string" },
      sentiment:         { type: "string", enum: ["Positive", "Neutral", "At-Risk"] },
      followUpQuestions: { type: "array", items: { type: "string" } },
      tasks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title:       { type: "string" },
            description: { type: "string" },
            assignee:    { type: "string", enum: ["Advisor", "Client"] },
            priority:    { type: "string", enum: ["High", "Medium", "Low"] },
          },
          required: ["title", "description", "assignee", "priority"],
        },
      },
    },
    required: ["title", "summary", "sentiment", "followUpQuestions", "tasks"],
  };

  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: systemPrompt,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  if (DEBUG) {
    console.log("[gemini] systemInstruction (first 400 chars):", systemPrompt.slice(0, 400));
    console.log("[gemini] audio base64 length:", base64Audio.length);
  }

  console.log(`[gemini] ▶ Sending to model: ${MODEL}`);

  const t0 = Date.now();

  const result = await withRetry(() =>
    withTimeout(
      model.generateContent([
        { inlineData: { mimeType, data: base64Audio } },
        JSON_FORMAT_INSTRUCTION,
      ]),
      REQUEST_TIMEOUT_MS
    )
  );

  const elapsed = Date.now() - t0;
  const text    = result.response.text().trim();

  console.log(`[gemini] ▶ Response received in ${elapsed}ms`);

  const usage = result.response.usageMetadata ?? null;
  if (usage) {
    console.log(
      `[gemini] tokens — prompt: ${usage.promptTokenCount}, ` +
      `output: ${usage.candidatesTokenCount}, total: ${usage.totalTokenCount}`
    );
  }

  if (DEBUG) {
    console.log("[gemini] Full raw response:", text);
  }

  const parsed = parseGeminiResponse(text);
  return { ...parsed, usage };
}
