import express from "express";
import { db } from "../services/DatabaseService.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", requireAuth, async (_req, res) => {
  try {
    const config = await db.getPromptConfig();
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/", requireAuth, async (req, res) => {
  try {
    const config = await db.savePromptConfig(req.body);
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
