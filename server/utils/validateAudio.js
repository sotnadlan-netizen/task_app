/**
 * Minimum buffer size proxy for ~3 seconds of audio.
 * At 16 kbps (lowest-quality webm/opus), 3 s ≈ 6 KB.
 * 10 KB provides a small safety margin without false-positives on real recordings.
 * Accurate duration requires codec-specific parsing; this heuristic covers
 * the common "empty accidental click" scenario that generates near-zero-byte files.
 */
const MIN_BYTES = 10 * 1024; // 10 KB

/**
 * Validate that an audio buffer represents at least ~3 seconds of audio.
 * @param {Buffer} buffer
 * @throws {Error} if the buffer is too small
 */
export function validateAudioBuffer(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error("Invalid audio: expected a Buffer.");
  }
  if (buffer.length < MIN_BYTES) {
    throw new Error(
      `Audio recording is too short (${(buffer.length / 1024).toFixed(1)} KB). ` +
      `Please record at least 3 seconds of audio before submitting.`
    );
  }
}
