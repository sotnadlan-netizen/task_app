import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock @google/generative-ai before importing the service ──────────────────
const mockGenerateContent = vi.fn();
vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    }),
  })),
}));

// Set required env var before importing
process.env.GOOGLE_API_KEY = "test-key";

const { analyzeAudio } = await import("./GeminiService.js");

describe("GeminiService.analyzeAudio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockResponse(text) {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => text },
    });
  }

  it("parses a clean JSON response", async () => {
    const payload = {
      summary: "Test summary",
      tasks: [{ title: "Task 1", description: "Desc", assignee: "Advisor", priority: "High" }],
    };
    mockResponse(JSON.stringify(payload));

    const result = await analyzeAudio("base64data", "audio/webm", "system prompt");
    expect(result.summary).toBe("Test summary");
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].title).toBe("Task 1");
  });

  it("strips markdown code fences (```json ... ```)", async () => {
    const payload = { summary: "Fenced", tasks: [] };
    mockResponse("```json\n" + JSON.stringify(payload) + "\n```");

    const result = await analyzeAudio("base64data", "audio/webm", "system prompt");
    expect(result.summary).toBe("Fenced");
  });

  it("strips plain code fences (``` ... ```)", async () => {
    const payload = { summary: "Plain fence", tasks: [] };
    mockResponse("```\n" + JSON.stringify(payload) + "\n```");

    const result = await analyzeAudio("base64data", "audio/webm", "system prompt");
    expect(result.summary).toBe("Plain fence");
  });

  it("extracts JSON from surrounding noise text", async () => {
    const payload = { summary: "Noise", tasks: [] };
    mockResponse("Here is the result:\n" + JSON.stringify(payload) + "\nThat's all.");

    const result = await analyzeAudio("base64data", "audio/webm", "system prompt");
    expect(result.summary).toBe("Noise");
  });

  it("throws a descriptive error when response is not JSON at all", async () => {
    mockResponse("Sorry, I cannot process this audio.");

    await expect(analyzeAudio("base64data", "audio/webm", "system prompt")).rejects.toThrow(
      "AI response was not valid JSON"
    );
  });

  it("throws when GOOGLE_API_KEY is missing", async () => {
    const savedKey = process.env.GOOGLE_API_KEY;
    delete process.env.GOOGLE_API_KEY;

    await expect(analyzeAudio("base64data", "audio/webm", "system prompt")).rejects.toThrow(
      "GOOGLE_API_KEY is not set"
    );

    process.env.GOOGLE_API_KEY = savedKey;
  });

  it("propagates Gemini API errors", async () => {
    mockGenerateContent.mockRejectedValue(new Error("Quota exceeded"));

    await expect(analyzeAudio("base64data", "audio/webm", "system prompt")).rejects.toThrow(
      "Quota exceeded"
    );
  });
});
