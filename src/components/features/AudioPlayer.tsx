import { useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2, Loader2, AlertCircle } from "lucide-react";
import { apiFetch } from "@/lib/apiClient";

interface AudioPlayerProps {
  sessionId: string;
}

export function AudioPlayer({ sessionId }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [url, setUrl]           = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [playing, setPlaying]   = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    setLoadingUrl(true);
    apiFetch(`/api/sessions/${sessionId}/audio`)
      .then(async (res) => {
        if (res.status === 404) { setError("No audio recorded for this session."); return; }
        if (!res.ok) throw new Error("Failed to load audio");
        const data = await res.json();
        setUrl(data.url);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingUrl(false));
  }, [sessionId]);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) { el.pause(); setPlaying(false); }
    else { el.play().then(() => setPlaying(true)).catch(() => setPlaying(false)); }
  };

  const handleTimeUpdate = () => {
    const el = audioRef.current;
    if (!el) return;
    setProgress(el.duration ? el.currentTime / el.duration : 0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = audioRef.current;
    if (!el || !el.duration) return;
    el.currentTime = parseFloat(e.target.value) * el.duration;
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  if (loadingUrl)
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-400">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading audio…
      </div>
    );
  if (error)
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-400">
        <AlertCircle className="h-3.5 w-3.5 text-slate-300" /> {error}
      </div>
    );

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      {url && (
        <audio
          ref={audioRef}
          src={url}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
          onEnded={() => setPlaying(false)}
        />
      )}
      <button
        onClick={togglePlay}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
      >
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
      </button>
      <div className="flex flex-1 items-center gap-2 min-w-0">
        <span className="text-[11px] tabular-nums text-slate-400 shrink-0">
          {fmt(audioRef.current?.currentTime ?? 0)}
        </span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={progress}
          onChange={handleSeek}
          className="h-1.5 flex-1 cursor-pointer accent-indigo-600"
        />
        <span className="text-[11px] tabular-nums text-slate-400 shrink-0">
          {fmt(duration)}
        </span>
      </div>
      <Volume2 className="h-3.5 w-3.5 text-slate-300 shrink-0" />
    </div>
  );
}
