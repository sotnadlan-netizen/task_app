import express from "express";
import { db } from "../services/DatabaseService.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    let sessions;
    if (req.user.role === "client") {
      sessions = await db.getSessionsByClientEmail(req.user.email);
    } else {
      sessions = await db.getSessionsByProvider(req.user.id);
    }
    res.json(sessions);
  } catch (err) {
    console.error("[sessions] ✖ Error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
