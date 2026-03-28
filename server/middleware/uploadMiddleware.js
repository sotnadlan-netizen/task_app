import multer from "multer";

/**
 * Multer middleware for audio uploads.
 * - Uses memoryStorage: no disk I/O, no ephemeral-filesystem dependency on Render.
 * - Strict audio/* mimetype check (rejects non-audio at the middleware layer).
 * - 100 MB max file size.
 * - req.file.buffer is passed directly to Gemini — no temp file to clean up.
 */
export const uploadAudio = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const mime = file.mimetype.split(";")[0].trim();
    if (mime.startsWith("audio/")) {
      cb(null, true);
    } else {
      cb(Object.assign(new Error("Only audio files are accepted."), { status: 415 }), false);
    }
  },
});
