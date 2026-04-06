import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Mic, MicOff, Square, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

interface Props {
  open: boolean;
  onClose: () => void;
  onRecordingComplete: (blob: Blob, clientEmail: string) => void;
}

function formatTime(seconds: number) {
  const m = String(Math.floor(seconds / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function RecordDialog({ open, onClose, onRecordingComplete }: Props) {
  const [phase, setPhase] = useState<"idle" | "requesting" | "recording" | "stopping">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [bars, setBars] = useState<number[]>(Array(24).fill(10));
  const [error, setError] = useState<string | null>(null);
  const [clientEmail, setClientEmail] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      stopEverything();
      setPhase("idle");
      setElapsed(0);
      setError(null);
      setBars(Array(24).fill(10));
      setClientEmail("");
    }
  }, [open]);

  function stopEverything() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close();
    }
    mediaRecorderRef.current = null;
    streamRef.current = null;
    audioCtxRef.current = null;
    analyserRef.current = null;
  }

  function drawWaveform() {
    if (!analyserRef.current) return;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(data);
    // Sample 24 evenly-spaced buckets for visual bars
    const step = Math.floor(data.length / 24);
    const newBars = Array.from({ length: 24 }, (_, i) => {
      const val = data[i * step] || 0;
      return Math.max(6, (val / 255) * 100);
    });
    setBars(newBars);
    animFrameRef.current = requestAnimationFrame(drawWaveform);
  }

  async function startRecording() {
    setError(null);
    setPhase("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Wire up Web Audio analyser for real-time waveform
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);
      analyserRef.current = analyser;

      // MediaRecorder
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.start(200);

      setPhase("recording");
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((t) => t + 1), 1000);
      drawWaveform();
    } catch (err: unknown) {
      setPhase("idle");
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      const isDenied =
        err instanceof DOMException &&
        (err.name === "NotAllowedError" || err.name === "PermissionDeniedError");

      if (isDenied && isIOS) {
        setError(
          "Microphone access is blocked. On iPhone: go to Settings → Safari → Microphone and set it to Allow, then reload the page."
        );
      } else if (isDenied) {
        setError(
          "Microphone access was denied. Click the lock icon in your browser's address bar and allow Microphone access, then try again."
        );
      } else {
        setError("Could not access the microphone. Please ensure no other app is using it and try again.");
      }
    }
  }

  async function stopRecording() {
    if (!mediaRecorderRef.current) return;

    // Enforce minimum recording length — Gemini needs real audio to analyse
    if (elapsed < 2) {
      setError("Recording too short. Please record at least 2 seconds.");
      return;
    }

    setPhase("stopping");

    if (timerRef.current) clearInterval(timerRef.current);
    cancelAnimationFrame(animFrameRef.current);

    const capturedEmail = clientEmail;
    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      stopEverything();
      onRecordingComplete(blob, capturedEmail);
    };
    mediaRecorderRef.current.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }

  // Allow starting with empty email — session can be assigned to client later
  const canStart = clientEmail === "" || isValidEmail(clientEmail);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 shadow-2xl">
        {/* Header */}
        <div className="bg-slate-900 px-6 pt-6 pb-5">
          <DialogHeader>
            <DialogTitle className="text-white text-lg font-bold">Record Meeting</DialogTitle>
            <DialogDescription className="text-slate-400 text-sm mt-1">
              {phase === "idle" && "Enter the client's email (optional), then start recording."}
              {phase === "requesting" && "Requesting microphone access..."}
              {phase === "recording" && "Recording in progress — speak naturally."}
              {phase === "stopping" && "Processing recording..."}
            </DialogDescription>
          </DialogHeader>

          {/* Waveform + Timer */}
          <div className="mt-6 mb-2">
            {/* Timer */}
            <div className="flex items-center justify-center gap-2 mb-5">
              <div
                className={`h-2 w-2 rounded-full ${
                  phase === "recording" ? "bg-red-500 animate-pulse" : "bg-slate-600"
                }`}
              />
              <span className="text-3xl font-mono font-bold text-white tabular-nums tracking-wider">
                {formatTime(elapsed)}
              </span>
            </div>

            {/* Waveform bars */}
            <div className="flex items-center justify-center gap-[3px] h-16" aria-hidden="true">
              {bars.map((height, i) => (
                <motion.div
                  key={i}
                  className="w-1 rounded-full bg-primary"
                  animate={{
                    height: phase === "recording" ? `${Math.max(4, height * 56 / 255)}px` : "4px",
                    opacity: phase === "recording" ? 0.5 + (height / 255) * 0.5 : 0.25,
                  }}
                  transition={{ duration: 0.08, ease: "easeOut" }}
                  style={{ minHeight: "4px" }}
                />
              ))}
            </div>

            {/* Privacy badge */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 mt-3">
              <svg className="w-4 h-4 shrink-0 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="text-sm font-medium text-primary">Privacy protected</span>
              <span className="text-sm text-muted-foreground">· Processed in-memory. Never saved to disk.</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white px-6 py-5 space-y-3">
          {/* Client email input — only shown in idle phase */}
          {phase === "idle" && (
            <div>
              <label htmlFor="record-client-email" className="text-xs font-medium text-slate-700 mb-1 block">
                Client Email <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <Input
                id="record-client-email"
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="client@example.com — or leave blank to assign later"
                autoFocus
              />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5">
              <MicOff className="h-4 w-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {phase === "idle" && (
            <Button
              onClick={startRecording}
              disabled={!canStart}
              className="w-full h-12 text-sm font-semibold bg-red-600 hover:bg-red-700 gap-2 disabled:opacity-50"
            >
              <Mic className="h-4 w-4" />
              Start Recording
            </Button>
          )}

          {phase === "requesting" && (
            <Button disabled className="w-full h-12">
              <Loader2 className="h-4 w-4 animate-spin" />
              Requesting microphone...
            </Button>
          )}

          {phase === "recording" && (
            <div className="relative flex items-center justify-center">
              <motion.div
                className="absolute rounded-full bg-primary/20 pointer-events-none"
                animate={{ scale: [1, 1.7], opacity: [0.5, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                style={{ width: 80, height: 80 }}
                aria-hidden="true"
              />
              <motion.div
                className="absolute rounded-full bg-primary/10 pointer-events-none"
                animate={{ scale: [1, 2.1], opacity: [0.3, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
                style={{ width: 80, height: 80 }}
                aria-hidden="true"
              />
              <Button
                onClick={stopRecording}
                className="relative z-10 w-full h-12 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 gap-2"
              >
                <Square className="h-4 w-4 fill-white" />
                Stop & Analyze
              </Button>
            </div>
          )}

          {phase === "stopping" && (
            <Button disabled className="w-full h-12">
              <Loader2 className="h-4 w-4 animate-spin" />
              Preparing recording...
            </Button>
          )}

          <Button variant="ghost" onClick={onClose} className="w-full h-9 text-slate-500">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
