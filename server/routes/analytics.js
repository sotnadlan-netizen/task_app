import express from "express";
import { db } from "../services/DatabaseService.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET /api/analytics/overview — task completion rates, session counts (provider-only)
router.get("/overview", requireAuth, async (req, res) => {
  if (req.user.role !== "provider") {
    return res.status(403).json({ error: "Forbidden: providers only" });
  }
  try {
    const overview = await db.getAnalyticsOverview(req.user.id);
    res.json(overview);
  } catch (err) {
    console.error("[analytics] ✖ GET /overview:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/sessions/export — CSV export of sessions + tasks (provider-only)
router.get("/sessions/export", requireAuth, async (req, res) => {
  if (req.user.role !== "provider") {
    return res.status(403).json({ error: "Forbidden: providers only" });
  }
  try {
    const sessions = await db.getSessionsWithTasksForExport(req.user.id);

    const escCsv = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

    const headers = ["Session ID", "Date", "Filename", "Client Email", "Summary",
      "Task Title", "Task Description", "Assignee", "Priority", "Completed"];

    const rows = [headers.map(escCsv).join(",")];

    sessions.forEach((session) => {
      const base = [
        session.id,
        new Date(session.createdAt).toISOString(),
        session.filename,
        session.clientEmail || "",
        session.summary,
      ];
      if (session.tasks.length === 0) {
        rows.push([...base, "", "", "", "", ""].map(escCsv).join(","));
      } else {
        session.tasks.forEach((task) => {
          rows.push([
            ...base,
            task.title,
            task.description || "",
            task.assignee,
            task.priority,
            task.completed ? "Yes" : "No",
          ].map(escCsv).join(","));
        });
      }
    });

    const csv = rows.join("\n");
    const filename = `sessions-export-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send("\uFEFF" + csv); // UTF-8 BOM for Excel compatibility with Hebrew text
  } catch (err) {
    console.error("[analytics] ✖ GET /sessions/export:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
