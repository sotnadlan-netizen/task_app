/**
 * Zod-based request body validation middleware factory.
 *
 * Usage:
 *   import { z } from "zod";
 *   import { validateBody } from "../middleware/validateBody.js";
 *
 *   router.post("/", validateBody(z.object({ title: z.string().min(1) })), handler);
 *
 * On failure: returns 400 with a structured error listing every field problem.
 * On success: req.body is replaced with the Zod-parsed (coerced + stripped) value.
 */
import { z } from "zod";

export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: result.error.issues.map((issue) => ({
          path:    issue.path.join(".") || "(root)",
          message: issue.message,
        })),
      });
    }
    req.body = result.data; // use coerced / stripped value going forward
    next();
  };
}

// ── Reusable schemas ──────────────────────────────────────────────────────────

export const createTaskSchema = z.object({
  sessionId:   z.string().uuid("sessionId must be a valid UUID"),
  title:       z.string().min(1, "title is required").max(500),
  description: z.string().max(2000).optional().default(""),
  assignee:    z.enum(["Advisor", "Client"]),
  priority:    z.enum(["High", "Medium", "Low"]),
});

export const updateTaskDetailsSchema = z.object({
  title:       z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional(),
  priority:    z.enum(["High", "Medium", "Low"]).optional(),
}).refine(
  (d) => d.title !== undefined || d.description !== undefined || d.priority !== undefined,
  { message: "At least one of title, description, or priority is required" },
);

export const bulkCompleteSchema = z.object({
  taskIds:   z.array(z.string().uuid()).min(1, "taskIds must be a non-empty array"),
  completed: z.boolean(),
});

export const saveConfigSchema = z.object({
  systemPrompt: z.string().min(10, "systemPrompt must be at least 10 characters").max(20_000),
});

export const processAudioSchema = z.object({
  sessionId:    z.string().uuid("sessionId must be a valid UUID").optional(),
  providerId:   z.string().optional(),
  clientEmail:  z.string().email("clientEmail must be a valid email address").optional().or(z.literal("")),
  systemPrompt: z.string().min(10).max(20_000).optional(),
});
