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
import { useLanguage } from "@/providers/language-provider";

interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  error: string | null;
}

export interface ApproveOptions {
  projectId?: string;
  participantIds?: string[];
  promptId?: string;
  onSuccess?: (sessionId: string) => void;
}

export function useRecording() {
  const { session } = useSupabase();
  const { currentOrg, capacity } = useOrganization();
  const { t } = useLanguage();

  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    error: null,
  });
  const [processing, setProcessing] = useState(false);

  // Review state: after stopping, the merged blob is held here for the user to
  // play back and explicitly Approve (upload) or Discard — no auto-upload.
  const [reviewBlob, setReviewBlob] = useState<Blob | null>(null);
  const [reviewUrl, setReviewUrl] = useState<string | null>(null);

  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionKeyRef = useRef<string>("");
  const mimeTypeRef = useRef<string>("audio/webm");
  // Duration frozen at stop, so it survives the Approve step even after reset.
  const reviewDurationRef = useRef<number>(0);

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
        error: t("recording.blockedAlert"),
      }));
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setMediaStream(stream);

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
        error: err instanceof Error ? err.message : t("recording.micError"),
      }));
    }
  }, [capacity, startTimer, t]);

  // ── Stop recording → enter REVIEW state (no upload) ──────────────────────────
  // Merges the encrypted chunks into a single blob and hands it to the UI for
  // playback. Nothing is sent to the backend until approveRecording() is called.
  const stopRecording = useCallback(async () => {
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
      if (!key) throw new Error(t("recording.keyMissing"));

      const blob = await decryptAndMergeChunks(sessionKey, key, mimeTypeRef.current);
      if (!blob) throw new Error(t("recording.noAudio"));

      // Freeze duration and expose the blob for review. The IndexedDB chunks +
      // session key are intentionally retained until Approve or Discard.
      reviewDurationRef.current = state.duration;
      setReviewBlob(blob);
      setReviewUrl(URL.createObjectURL(blob));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : t("recording.processFailed"),
      }));
    } finally {
      setProcessing(false);
      setMediaStream(null);
    }
  }, [state.duration, stopTimer, t]);

  // ── Approve → upload the reviewed blob to the backend ────────────────────────
  const approveRecording = useCallback(async (opts?: ApproveOptions) => {
    if (!reviewBlob) return;

    setProcessing(true);
    setState((prev) => ({ ...prev, error: null }));

    const sessionKey = sessionKeyRef.current;

    try {
      const formData = new FormData();
      formData.append("audio", reviewBlob, "recording.webm");
      formData.append("org_id", currentOrg?.id || "");
      formData.append("duration_seconds", String(reviewDurationRef.current));
      if (opts?.projectId) {
        formData.append("project_id", opts.projectId);
      }
      if (opts?.participantIds && opts.participantIds.length > 0) {
        formData.append("participant_ids", opts.participantIds.join(","));
      }
      if (opts?.promptId) {
        formData.append("prompt_id", opts.promptId);
      }

      const token = session?.access_token;
      if (!token) throw new Error(t("recording.notAuthenticated"));

      const result = await api.processAudio(formData, token) as { session_id?: string };
      if (result?.session_id) opts?.onSuccess?.(result.session_id);

      // ── Aggressive cleanup: zero trace on the client device ──────────────────
      await clearSession(sessionKey);
      clearSessionKey(sessionKey);
      cryptoKeyRef.current = null;
      if (reviewUrl) URL.revokeObjectURL(reviewUrl);
      setReviewUrl(null);
      setReviewBlob(null);
      setState((prev) => ({ ...prev, duration: 0 }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : t("recording.processFailed"),
      }));
    } finally {
      setProcessing(false);
    }
  }, [reviewBlob, reviewUrl, currentOrg, session, t]);

  // ── Discard → drop the reviewed blob, no upload ──────────────────────────────
  const discardRecording = useCallback(async () => {
    const sessionKey = sessionKeyRef.current;
    try {
      await clearSession(sessionKey);
    } catch {
      // best-effort cleanup
    }
    clearSessionKey(sessionKey);
    cryptoKeyRef.current = null;
    if (reviewUrl) URL.revokeObjectURL(reviewUrl);
    setReviewUrl(null);
    setReviewBlob(null);
    reviewDurationRef.current = 0;
    setState({ isRecording: false, isPaused: false, duration: 0, error: null });
  }, [reviewUrl]);

  return {
    ...state,
    processing,
    mediaStream,
    reviewBlob,
    reviewUrl,
    startRecording,
    stopRecording,
    approveRecording,
    discardRecording,
  };
}
