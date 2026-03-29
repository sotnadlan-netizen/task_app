import express from "express";
import { db } from "../services/DatabaseService.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import logger from "../utils/logger.js";

const router = express.Router();

router.post("/", requireAuth, async (req, res) => {
  try {
    await db.createProfile({
      id:    req.user.id,
      email: req.user.email,
      role:  req.user.role,
    });
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err: err.message }, "[profiles] POST / failed");
    res.status(500).json({ error: err.message });
  }
});

export default router;
