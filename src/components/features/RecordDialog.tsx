import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Square, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    } catch (_err) {
      setPhase("idle");
      setError("Microphone access denied. Please allow mic permissions and try again.");
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

  const canStart = isValidEmail(clientEmail);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 shadow-2xl">
        {/* Header */}
        <div className="bg-slate-900 px-6 pt-6 pb-5">
          <DialogHeader>
            <DialogTitle className="text-white text-lg font-bold">Record Meeting</DialogTitle>
            <DialogDescription className="text-slate-400 text-sm mt-1">
              {phase === "idle" && "Enter the client's email, then start recording."}
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
            <div className="flex items-center justify-center gap-0.5 h-16">
              {bars.map((h, i) => (
                <div
                  key={i}
                  className="w-1.5 rounded-full transition-all duration-75"
                  style={{
                    height: phase === "recording" ? `${h}%` : "8%",
                    backgroundColor:
                      phase === "recording"
                        ? `hsl(${239 + i * 0.5}, 84%, ${55 + h * 0.1}%)`
                        : "#334155",
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white px-6 py-5 space-y-3">
          {/* Client email input — only shown in idle phase */}
          {phase === "idle" && (
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">
                Client Email
              </label>
              <Input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="client@example.com"
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
            <Button
              onClick={stopRecording}
              className="w-full h-12 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 gap-2"
            >
              <Square className="h-4 w-4 fill-white" />
              Stop & Analyze
            </Button>
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
