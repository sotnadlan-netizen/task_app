import express from "express";
import { db } from "../services/DatabaseService.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET /api/analytics/overview — task completion rates and session counts for the provider
router.get("/overview", requireAuth, async (req, res) => {
  if (req.user.role !== "provider") {
    return res.status(403).json({ error: "Forbidden: providers only" });
  }

  try {
    const stats = await db.getAnalyticsOverview(req.user.id);
    res.json(stats);
  } catch (err) {
    console.error("[analytics] ✖ GET /overview:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
