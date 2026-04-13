"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  appendAudioChunk,
  clearSession,
  getUnfinishedSessions,
  mergeChunksToBlob,
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

interface CrashRecovery {
  sessionKey: string;
  exists: boolean;
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
  const [crashRecovery, setCrashRecovery] = useState<CrashRecovery | null>(
    null
  );

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionKeyRef = useRef<string>("");

  // Check for unfinished sessions on mount (crash recovery)
  useEffect(() => {
    async function checkCrashRecovery() {
      try {
        const sessions = await getUnfinishedSessions();
        if (sessions.length > 0) {
          setCrashRecovery({ sessionKey: sessions[0], exists: true });
        }
      } catch {
        // IndexedDB not available
      }
    }
    checkCrashRecovery();
  }, []);

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

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          await appendAudioChunk(sessionKey, event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // 1-second timeslice for crash safety

      setState({
        isRecording: true,
        isPaused: false,
        duration: 0,
        error: null,
      });
      startTimer();
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error:
          err instanceof Error
            ? err.message
            : "Failed to access microphone",
      }));
    }
  }, [capacity, startTimer]);

  const stopRecording = useCallback(async () => {
    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder || mediaRecorder.state === "inactive") return;

    stopTimer();
    mediaRecorder.stop();

    setState((prev) => ({ ...prev, isRecording: false, isPaused: false }));

    setProcessing(true);
    try {
      const blob = await mergeChunksToBlob(sessionKeyRef.current);
      if (!blob) throw new Error("No audio data recorded");

      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");
      formData.append("org_id", currentOrg?.id || "");
      formData.append("duration_seconds", String(state.duration));

      const token = session?.access_token;
      if (!token) throw new Error("Not authenticated");

      await api.processAudio(formData, token);

      // Upload successful — clear IndexedDB
      await clearSession(sessionKeyRef.current);
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error:
          err instanceof Error ? err.message : "Failed to process audio",
      }));
    } finally {
      setProcessing(false);
    }
  }, [currentOrg, session, state.duration, stopTimer]);

  const recoverCrashedSession = useCallback(async () => {
    if (!crashRecovery) return;

    setProcessing(true);
    try {
      const blob = await mergeChunksToBlob(crashRecovery.sessionKey);
      if (!blob) throw new Error("No recoverable audio found");

      const formData = new FormData();
      formData.append("audio", blob, "recovered-recording.webm");
      formData.append("org_id", currentOrg?.id || "");
      formData.append("recovered", "true");

      const token = session?.access_token;
      if (!token) throw new Error("Not authenticated");

      await api.processAudio(formData, token);
      await clearSession(crashRecovery.sessionKey);
      setCrashRecovery(null);
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error:
          err instanceof Error
            ? err.message
            : "Failed to recover audio",
      }));
    } finally {
      setProcessing(false);
    }
  }, [crashRecovery, currentOrg, session]);

  const discardCrashedSession = useCallback(async () => {
    if (!crashRecovery) return;
    await clearSession(crashRecovery.sessionKey);
    setCrashRecovery(null);
  }, [crashRecovery]);

  return {
    ...state,
    processing,
    crashRecovery,
    startRecording,
    stopRecording,
    recoverCrashedSession,
    discardCrashedSession,
  };
}
