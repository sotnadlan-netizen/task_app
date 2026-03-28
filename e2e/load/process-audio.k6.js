/**
 * QA-016: Load test for POST /api/process-audio
 *
 * Usage:
 *   k6 run e2e/load/process-audio.k6.js
 *   k6 run --env BASE_URL=https://your-api.com --env AUTH_TOKEN=eyJ... e2e/load/process-audio.k6.js
 *
 * Scenarios:
 *   - ramp-up: 0 → 10 VUs over 30s
 *   - sustained: 10 VUs for 60s
 *   - ramp-down: 10 → 0 VUs over 30s
 *
 * Thresholds:
 *   - 95th percentile response time < 90s (AI pipeline is slow)
 *   - Error rate < 5%
 *
 * Prerequisites:
 *   - k6 installed: https://k6.io/docs/get-started/installation/
 *   - A valid JWT in AUTH_TOKEN env var (provider role)
 *   - A small fixture audio file: e2e/fixtures/sample.webm
 *
 * Generate a 5-second silence fixture:
 *   ffmpeg -f lavfi -i anullsrc=r=16000:cl=mono -t 5 -c:a libopus e2e/fixtures/sample.webm
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";

// ── Custom metrics ──────────────────────────────────────────────────────────
const aiPipelineLatency = new Trend("ai_pipeline_latency_ms", true);
const uploadErrors      = new Rate("upload_error_rate");

// ── Config ──────────────────────────────────────────────────────────────────
const BASE_URL    = __ENV.BASE_URL    || "http://localhost:3001";
const AUTH_TOKEN  = __ENV.AUTH_TOKEN  || "";
const CLIENT_EMAIL = __ENV.CLIENT_EMAIL || "loadtest@example.com";

export const options = {
  scenarios: {
    audio_upload: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 5  },  // ramp up to 5 VUs
        { duration: "60s", target: 10 },  // ramp up to 10 VUs (sustained)
        { duration: "30s", target: 0  },  // ramp down
      ],
    },
  },
  thresholds: {
    // AI pipeline can take up to 90s for a full audio processing cycle
    "http_req_duration{name:process_audio}": ["p(95)<90000"],
    "upload_error_rate": ["rate<0.05"],
    "http_req_failed": ["rate<0.05"],
  },
};

// ── Load fixture audio once ─────────────────────────────────────────────────
// Requires: e2e/fixtures/sample.webm
// Generate with: ffmpeg -f lavfi -i anullsrc=r=16000:cl=mono -t 5 -c:a libopus e2e/fixtures/sample.webm
let audioFile;
try {
  audioFile = open("../fixtures/sample.webm", "b");
} catch {
  // Fallback: generate a minimal synthetic WebM-like binary payload (not valid audio,
  // but useful for testing the upload/auth pipeline without an actual audio file).
  // The AI step will fail gracefully with a parsing error — that's acceptable for
  // load testing the infrastructure layer.
  audioFile = new Uint8Array(4096).buffer; // 4 KB placeholder
}

// ── Main test function ──────────────────────────────────────────────────────
export default function () {
  if (!AUTH_TOKEN) {
    console.error("AUTH_TOKEN env var is required. Get it from Supabase auth.");
    return;
  }

  const headers = {
    Authorization: `Bearer ${AUTH_TOKEN}`,
  };

  const formData = {
    audio: http.file(audioFile, "sample.webm", "audio/webm"),
    clientEmail: CLIENT_EMAIL,
  };

  const t0  = Date.now();
  const res = http.post(`${BASE_URL}/api/process-audio`, formData, {
    headers,
    tags: { name: "process_audio" },
    timeout: "120s",
  });
  const elapsed = Date.now() - t0;

  aiPipelineLatency.add(elapsed);

  const ok = check(res, {
    "status is 200 or 201": (r) => r.status === 200 || r.status === 201,
    "response has session":  (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.session && typeof body.session.id === "string";
      } catch {
        return false;
      }
    },
    "response has tasks array": (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.tasks);
      } catch {
        return false;
      }
    },
  });

  if (!ok) {
    uploadErrors.add(1);
    console.warn(`[VU ${__VU}] Upload failed: HTTP ${res.status} — ${res.body?.slice(0, 200)}`);
  } else {
    uploadErrors.add(0);
  }

  // Wait between requests — AI processing is expensive; don't hammer concurrently
  sleep(Math.random() * 5 + 5); // 5–10s between requests per VU
}

// ── Teardown ────────────────────────────────────────────────────────────────
export function handleSummary(data) {
  const p95 = data.metrics["http_req_duration{name:process_audio}"]?.values?.["p(95)"];
  const errRate = data.metrics["upload_error_rate"]?.values?.rate;

  console.log("=== Load Test Summary ===");
  console.log(`p(95) latency: ${p95 ? Math.round(p95) + "ms" : "N/A"}`);
  console.log(`Error rate:    ${errRate !== undefined ? (errRate * 100).toFixed(1) + "%" : "N/A"}`);

  return {
    "e2e/load/results.json": JSON.stringify(data, null, 2),
  };
}
