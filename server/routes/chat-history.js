import express from "express";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import logger from "../utils/logger.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { validateBody } from "../middleware/validateBody.js";
import { generateEmbedding, generateRAGAnswer } from "../services/GeminiService.js";

const router = express.Router();

// ── Supabase client (service role for RPC calls) ──────────────────────────────

let _supabase = null;
function getClient() {
  if (_supabase) return _supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("[chat-history] Missing Supabase env vars");
  _supabase = createClient(url, key);
  return _supabase;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const chatHistorySchema = z.object({
  query:       z.string().min(1, "query is required").max(500),
  clientEmail: z.string().email("clientEmail must be a valid email").optional().or(z.literal("")),
  matchCount:  z.number().int().min(1).max(10).optional().default(5),
  threshold:   z.number().min(0).max(1).optional().default(0.65),
});

// ── POST /api/chat-history ────────────────────────────────────────────────────
// RAG: embed the query → vector search → Gemini answer

router.post("/", requireAuth, validateBody(chatHistorySchema), async (req, res, next) => {
  const { query, clientEmail, matchCount, threshold } = req.body;
  const providerId = req.user?.id;

  try {
    // 1. Embed the user's query
    const queryEmbedding = await generateEmbedding(query);
    if (!queryEmbedding) {
      // Embedding is best-effort — never crash the request with 503.
      // Return a 200 with a warning so the frontend can show a helpful message
      // instead of an unrecoverable error screen.
      logger.warn({ providerId }, "[chat-history] Embedding unavailable — returning degraded response");
      return res.json({
        answer: "שירות החיפוש הסמנטי אינו זמין כרגע. אנא נסה שוב בעוד מספר רגעים.",
        citations: [],
        matchCount: 0,
        warning: "EMBEDDING_UNAVAILABLE",
      });
    }

    // 2. Vector search via match_client_sessions RPC (multi-tenant: always filter by provider_id)
    const rpcParams = {
      query_embedding: queryEmbedding,
      provider_id:     providerId,
      match_count:     matchCount,
      match_threshold: threshold,
    };
    // Optional: narrow to a specific client
    if (clientEmail) rpcParams.client_email = clientEmail;

    const { data: matches, error: rpcError } = await getClient().rpc("match_client_sessions", rpcParams);

    if (rpcError) {
      logger.error({ err: rpcError.message, providerId }, "[chat-history] RPC error");
      return res.status(502).json({ error: "Vector search failed.", code: "RPC_ERROR", detail: rpcError.message });
    }

    logger.info({ providerId, matchCount: matches?.length ?? 0, clientEmail: clientEmail || "(all)" }, "[chat-history] RAG context retrieved");

    // 3. Build context string from matched sessions
    const context = (matches || [])
      .map((s, i) => {
        const date = new Date(s.created_at).toLocaleDateString("he-IL");
        return [
          `[${i + 1}] ${s.title || "Session"} — ${date}${s.client_email ? ` (${s.client_email})` : ""}`,
          `Similarity: ${(s.similarity * 100).toFixed(0)}%`,
          `Summary: ${s.summary}`,
        ].join("\n");
      })
      .join("\n\n");

    // 4. Generate RAG answer from Gemini
    const answer = await generateRAGAnswer(query, context, clientEmail || null);

    // 5. Return answer + citations (without exposing raw embeddings)
    const citations = (matches || []).map((s) => ({
      sessionId:   s.id,
      title:       s.title || s.filename,
      clientEmail: s.client_email,
      createdAt:   s.created_at,
      similarity:  Math.round(s.similarity * 100),
    }));

    res.json({ answer, citations, matchCount: matches?.length ?? 0 });

  } catch (err) {
    logger.error({ err: err.message }, "[chat-history] Unhandled error");
    next(err);
  }
});

export default router;
