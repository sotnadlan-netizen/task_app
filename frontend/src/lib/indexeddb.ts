import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "audio-recorder";
const DB_VERSION = 2; // v2: encrypted chunks (v1 plain-text chunks are auto-cleared on upgrade)
const STORE_NAME = "audio-chunks";
const SESSION_KEY_PREFIX = "audio_enc_key_";

interface EncryptedChunkRecord {
  id: number;
  sessionKey: string;
  encryptedData: ArrayBuffer;
  iv: ArrayBuffer; // 12-byte AES-GCM IV, unique per chunk
  timestamp: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // v1 stored plain-text Blobs — wipe them before creating the v2 encrypted store
        if (oldVersion < 2 && db.objectStoreNames.contains(STORE_NAME)) {
          db.deleteObjectStore(STORE_NAME);
        }
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: "id",
            autoIncrement: true,
          });
          store.createIndex("sessionKey", "sessionKey", { unique: false });
        }
      },
    });
  }
  return dbPromise;
}

// ─── Key generation & sessionStorage management ───────────────────────────────

export async function generateEncryptionKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,             // exportable so we can persist it in sessionStorage
    ["encrypt", "decrypt"]
  );
}

export async function exportKeyToBase64(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", key);
  return btoa(String.fromCharCode(...new Uint8Array(raw)));
}

export async function importKeyFromBase64(base64: string): Promise<CryptoKey> {
  const raw = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "raw",
    raw,
    { name: "AES-GCM" },
    false,            // non-exportable after import — cannot be extracted again
    ["encrypt", "decrypt"]
  );
}

/** Persist the base64 key in sessionStorage (survives refresh, dies when tab closes). */
export function storeSessionKey(sessionKey: string, base64Key: string): void {
  sessionStorage.setItem(SESSION_KEY_PREFIX + sessionKey, base64Key);
}

/** Retrieve the base64 key from sessionStorage, or null if the tab was closed. */
export function loadSessionKey(sessionKey: string): string | null {
  return sessionStorage.getItem(SESSION_KEY_PREFIX + sessionKey);
}

/** Remove the key from sessionStorage — called after upload or discard. */
export function clearSessionKey(sessionKey: string): void {
  sessionStorage.removeItem(SESSION_KEY_PREFIX + sessionKey);
}

// ─── Encrypted chunk storage ──────────────────────────────────────────────────

/**
 * Encrypt a raw audio Blob with AES-GCM and write the ciphertext + IV to IndexedDB.
 * Each chunk gets its own random 12-byte IV.
 */
export async function appendEncryptedChunk(
  sessionKey: string,
  key: CryptoKey,
  chunkBlob: Blob
): Promise<void> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = await chunkBlob.arrayBuffer();
  const encryptedData = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintext
  );

  const db = await getDB();
  await db.add(STORE_NAME, {
    sessionKey,
    encryptedData,
    iv: iv.buffer.slice(0) as ArrayBuffer,
    timestamp: Date.now(),
  } as Omit<EncryptedChunkRecord, "id">);
}

/**
 * Decrypt all stored chunks for a session and reassemble them into a Blob.
 * Returns null if no chunks exist.
 */
export async function decryptAndMergeChunks(
  sessionKey: string,
  key: CryptoKey,
  mimeType: string
): Promise<Blob | null> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const index = tx.store.index("sessionKey");
  const records = (await index.getAll(sessionKey)) as EncryptedChunkRecord[];
  await tx.done;

  if (records.length === 0) return null;

  const sorted = records.sort((a, b) => a.timestamp - b.timestamp);
  const decryptedBuffers: ArrayBuffer[] = [];

  for (const record of sorted) {
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(record.iv) },
      key,
      record.encryptedData
    );
    decryptedBuffers.push(plain);
  }

  return new Blob(decryptedBuffers, { type: mimeType });
}

// ─── Session lifecycle ────────────────────────────────────────────────────────

/** Return all session keys that still have chunks in IndexedDB. */
export async function getUnfinishedSessions(): Promise<string[]> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const allRecords = (await tx.store.getAll()) as EncryptedChunkRecord[];
  await tx.done;
  const sessions = new Set(allRecords.map((r) => r.sessionKey));
  return Array.from(sessions);
}

/**
 * Delete all IndexedDB chunks for a session.
 * Always call clearSessionKey() alongside this to leave zero trace.
 */
export async function clearSession(sessionKey: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const index = tx.store.index("sessionKey");
  let cursor = await index.openCursor(sessionKey);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}
