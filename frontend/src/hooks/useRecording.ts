"use client";

import { useState, useRef, useCallback } from "react";
import {
  appendEncryptedChunk,
  clearSession,
  clearSessionKey,
  decryptAndMergeChunks,
  exportKeyToBase64,
  generateEncryptionKey,
  storeSessionKey,
} from "@/lib/indexeddb";
import { api } from "@/lib/api";
import { useSupabase } from "@/providers/supabase-provider";
import { useOrganization } from "@/providers/organization-provider";

interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  error: string | null;
}

export function useRecording() {
  const { session } = useSupabase();
  const { currentOrg, capacity } = useOrganization();

  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    error: null,
  });
  const [processing, setProcessing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionKeyRef = useRef<string>("");
  const mimeTypeRef = useRef<string>("audio/webm");

  // In-memory encryption key for the active recording session
  const cryptoKeyRef = useRef<CryptoKey | null>(null);

  // Track all pending encrypted IndexedDB writes so stopRecording can await them
  const pendingWritesRef = useRef<Promise<void>[]>([]);

  // ── Timer helpers ────────────────────────────────────────────────────────────
  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => {
      setState((prev) => ({ ...prev, duration: prev.duration + 1 }));
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // ── Start recording ──────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (capacity?.is_blocked) {
      setState((prev) => ({
        ...prev,
        error: "Recording blocked: insufficient capacity (≤55 minutes remaining)",
      }));
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const sessionKey = `recording_${Date.now()}`;
      sessionKeyRef.current = sessionKey;
      pendingWritesRef.current = [];

      // Generate a fresh AES-GCM-256 key for this session
      const encKey = await generateEncryptionKey();
      cryptoKeyRef.current = encKey;

      // Export and persist in sessionStorage (survives refresh, dies when tab closes)
      const base64Key = await exportKeyToBase64(encKey);
      storeSessionKey(sessionKey, base64Key);

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      mimeTypeRef.current = mimeType;

      const mediaRecorder = new MediaRecorder(stream, { mimeType });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && cryptoKeyRef.current) {
          // Encrypt and write to IndexedDB; track the promise for flush-before-merge
          const p = appendEncryptedChunk(sessionKey, cryptoKeyRef.current, event.data);
          pendingWritesRef.current.push(p);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // 1-second timeslices for crash safety

      setState({ isRecording: true, isPaused: false, duration: 0, error: null });
      startTimer();
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Failed to access microphone",
      }));
    }
  }, [capacity, startTimer]);

  // ── Stop recording ───────────────────────────────────────────────────────────
  const stopRecording = useCallback(async (opts?: { projectId?: string; participantIds?: string[] }) => {
    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder || mediaRecorder.state === "inactive") return;

    stopTimer();
    setState((prev) => ({ ...prev, isRecording: false, isPaused: false }));
    setProcessing(true);

    // 1. Wait for onstop — guarantees the final ondataavailable chunk has been dispatched
    // 2. Wait for all pending IndexedDB writes — guarantees every chunk is persisted
    //    before we attempt to read them back for decryption + merge
    await new Promise<void>((resolve) => {
      mediaRecorder.addEventListener("stop", () => resolve(), { once: true });
      mediaRecorder.stop();
    });
    await Promise.all(pendingWritesRef.current);

    const sessionKey = sessionKeyRef.current;
    const key = cryptoKeyRef.current;

    try {
      if (!key) throw new Error("Encryption key missing — cannot assemble audio");

      const blob = await decryptAndMergeChunks(sessionKey, key, mimeTypeRef.current);
      if (!blob) throw new Error("No audio data recorded");

      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");
      formData.append("org_id", currentOrg?.id || "");
      formData.append("duration_seconds", String(state.duration));
      if (opts?.projectId) {
        formData.append("project_id", opts.projectId);
      }
      if (opts?.participantIds && opts.participantIds.length > 0) {
        formData.append("participant_ids", opts.participantIds.join(","));
      }

      const token = session?.access_token;
      if (!token) throw new Error("Not authenticated");

      await api.processAudio(formData, token);

      // ── Aggressive cleanup: zero trace on the client device ──────────────────
      await clearSession(sessionKey);
      clearSessionKey(sessionKey);
      cryptoKeyRef.current = null;
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Failed to process audio",
      }));
    } finally {
      setProcessing(false);
    }
  }, [currentOrg, session, state.duration, stopTimer]);

  return {
    ...state,
    processing,
    startRecording,
    stopRecording,
  };
}
