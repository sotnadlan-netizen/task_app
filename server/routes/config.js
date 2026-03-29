import express from "express";
import { db } from "../services/DatabaseService.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { validateBody, saveConfigSchema } from "../middleware/validateBody.js";
import logger from "../utils/logger.js";

const router = express.Router();

// GET /api/config — fetch active system prompt
router.get("/", requireAuth, async (_req, res) => {
  try {
    const config = await db.getPromptConfig();
    res.json(config);
  } catch (err) {
    logger.error({ err: err.message }, "[config] GET / failed");
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/config — update system prompt (provider-only); archives old version
router.put("/", requireAuth, validateBody(saveConfigSchema), async (req, res) => {
  if (req.user.role !== "provider") {
    return res.status(403).json({ error: "Forbidden: providers only" });
  }
  try {
    const current = await db.getPromptConfig();
    await db.logPromptHistory(current.systemPrompt, req.user.id);
    const config = await db.savePromptConfig(req.body);
    logger.info({ userId: req.user.id }, "[config] System prompt updated");
    res.json(config);
  } catch (err) {
    logger.error({ err: err.message }, "[config] PUT / failed");
    res.status(500).json({ error: err.message });
  }
});

// GET /api/config/history — return last 20 prompt snapshots
router.get("/history", requireAuth, async (req, res) => {
  if (req.user.role !== "provider") {
    return res.status(403).json({ error: "Forbidden: providers only" });
  }
  try {
    const history = await db.getPromptHistory(20);
    res.json(history);
  } catch (err) {
    logger.error({ err: err.message }, "[config] GET /history failed");
    res.status(500).json({ error: err.message });
  }
});

export default router;
