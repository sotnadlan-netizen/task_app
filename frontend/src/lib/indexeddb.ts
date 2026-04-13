import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "audio-recorder";
const DB_VERSION = 1;
const STORE_NAME = "audio-chunks";

interface AudioChunkRecord {
  id: number;
  sessionKey: string;
  chunk: Blob;
  timestamp: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
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

export async function appendAudioChunk(
  sessionKey: string,
  chunk: Blob
): Promise<void> {
  const db = await getDB();
  await db.add(STORE_NAME, {
    sessionKey,
    chunk,
    timestamp: Date.now(),
  } as Omit<AudioChunkRecord, "id">);
}

export async function getAudioChunks(sessionKey: string): Promise<Blob[]> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const index = tx.store.index("sessionKey");
  const records = (await index.getAll(sessionKey)) as AudioChunkRecord[];
  await tx.done;
  return records
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((r) => r.chunk);
}

export async function getUnfinishedSessions(): Promise<string[]> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const allRecords = (await tx.store.getAll()) as AudioChunkRecord[];
  await tx.done;

  const sessions = new Set(allRecords.map((r) => r.sessionKey));
  return Array.from(sessions);
}

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

export async function mergeChunksToBlob(
  sessionKey: string
): Promise<Blob | null> {
  const chunks = await getAudioChunks(sessionKey);
  if (chunks.length === 0) return null;
  return new Blob(chunks, { type: chunks[0].type || "audio/webm" });
}
