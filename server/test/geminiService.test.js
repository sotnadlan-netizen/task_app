import { describe, it, expect } from "vitest";
import { parseGeminiResponse } from "../utils/parseGeminiResponse.js";
import { deduplicateTasks } from "../utils/deduplicateTasks.js";
import { validateAudioBuffer } from "../utils/validateAudio.js";

// ── parseGeminiResponse ───────────────────────────────────────────────────────

describe("parseGeminiResponse", () => {
  const validPayload = {
    summary: "לקוח מעוניין ברכישת דירה.",
    tasks: [
      { title: "להעביר מסמכים", description: "להביא תלושי שכר", assignee: "Client", priority: "High" },
    ],
  };

  it("parses clean JSON", () => {
    const result = parseGeminiResponse(JSON.stringify(validPayload));
    expect(result.summary).toBe(validPayload.summary);
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].title).toBe("להעביר מסמכים");
  });

  it("strips markdown json fence (```json ... ```)", () => {
    const text = "```json\n" + JSON.stringify(validPayload) + "\n```";
    const result = parseGeminiResponse(text);
    expect(result.summary).toBe(validPayload.summary);
    expect(result.tasks).toHaveLength(1);
  });

  it("strips plain markdown fence (``` ... ```)", () => {
    const text = "```\n" + JSON.stringify(validPayload) + "\n```";
    const result = parseGeminiResponse(text);
    expect(result.summary).toBe(validPayload.summary);
  });

  it("extracts embedded JSON from surrounding prose", () => {
    const text = "Here is the analysis:\n" + JSON.stringify(validPayload) + "\nThat's all.";
    const result = parseGeminiResponse(text);
    expect(result.summary).toBe(validPayload.summary);
  });

  it("defaults summary to empty string when missing", () => {
    const result = parseGeminiResponse(JSON.stringify({ tasks: [] }));
    expect(result.summary).toBe("");
  });

  it("defaults tasks to empty array when missing", () => {
    const result = parseGeminiResponse(JSON.stringify({ summary: "hello" }));
    expect(result.tasks).toEqual([]);
  });

  it("throws when response is not JSON at all", () => {
    expect(() => parseGeminiResponse("Sorry, I cannot help with that.")).toThrow(
      /not valid JSON/i
    );
  });

  it("throws when input is not a string", () => {
    expect(() => parseGeminiResponse(null)).toThrow(/must be a string/i);
    expect(() => parseGeminiResponse(42)).toThrow(/must be a string/i);
  });
});

// ── deduplicateTasks ─────────────────────────────────────────────────────────

describe("deduplicateTasks", () => {
  it("removes exact duplicate titles", () => {
    const tasks = [
      { title: "להעביר מסמכים" },
      { title: "להעביר מסמכים" },
      { title: "לחתום חוזה" },
    ];
    expect(deduplicateTasks(tasks)).toHaveLength(2);
  });

  it("removes case-insensitive duplicates", () => {
    const tasks = [
      { title: "Approve Mortgage" },
      { title: "approve mortgage" },
      { title: "APPROVE MORTGAGE" },
    ];
    expect(deduplicateTasks(tasks)).toHaveLength(1);
  });

  it("trims whitespace when comparing titles", () => {
    const tasks = [
      { title: "  check documents  " },
      { title: "check documents" },
    ];
    expect(deduplicateTasks(tasks)).toHaveLength(1);
  });

  it("keeps first occurrence when deduplicating", () => {
    const tasks = [
      { title: "Task A", priority: "High" },
      { title: "Task A", priority: "Low" },
    ];
    const result = deduplicateTasks(tasks);
    expect(result[0].priority).toBe("High");
  });

  it("returns an empty array for empty input", () => {
    expect(deduplicateTasks([])).toEqual([]);
  });

  it("returns an empty array for non-array input", () => {
    expect(deduplicateTasks(null)).toEqual([]);
    expect(deduplicateTasks(undefined)).toEqual([]);
  });

  it("does not mutate the original array", () => {
    const original = [{ title: "A" }, { title: "A" }];
    deduplicateTasks(original);
    expect(original).toHaveLength(2);
  });
});

// ── validateAudioBuffer ───────────────────────────────────────────────────────

describe("validateAudioBuffer", () => {
  const MIN_BYTES = 10 * 1024; // must match value in validateAudio.js

  it("throws for a buffer below the minimum size", () => {
    const small = Buffer.alloc(MIN_BYTES - 1);
    expect(() => validateAudioBuffer(small)).toThrow(/too short/i);
  });

  it("does not throw for a buffer at exactly the minimum size", () => {
    const exact = Buffer.alloc(MIN_BYTES);
    expect(() => validateAudioBuffer(exact)).not.toThrow();
  });

  it("does not throw for a large buffer", () => {
    const large = Buffer.alloc(MIN_BYTES * 10);
    expect(() => validateAudioBuffer(large)).not.toThrow();
  });

  it("throws for a zero-byte buffer", () => {
    expect(() => validateAudioBuffer(Buffer.alloc(0))).toThrow(/too short/i);
  });

  it("throws when given a non-Buffer", () => {
    expect(() => validateAudioBuffer("not a buffer")).toThrow(/expected a Buffer/i);
    expect(() => validateAudioBuffer(null)).toThrow(/expected a Buffer/i);
    expect(() => validateAudioBuffer(new Uint8Array(MIN_BYTES))).toThrow(/expected a Buffer/i);
  });
});
