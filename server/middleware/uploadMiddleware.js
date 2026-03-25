import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Multer middleware for audio uploads.
 * - Strict audio/* mimetype check (rejects non-audio at the middleware layer)
 * - 100 MB max file size
 * - Temp files land in /uploads/ and are deleted immediately after processing
 */
export const uploadAudio = multer({
  dest: path.join(__dirname, "../../uploads/"),
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
