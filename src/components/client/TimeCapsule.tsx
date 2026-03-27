import { CalendarDays, FileAudio, Circle } from "lucide-react";

interface TimeCapsuleProps {
  summary: string;
  createdAt: string;
  filename: string;
}

export function TimeCapsule({ summary, createdAt, filename }: TimeCapsuleProps) {
  if (!summary) return null;

  const bullets = summary
    .split(/\.\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const formattedDate = new Date(createdAt).toLocaleDateString("he-IL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 shadow-sm p-6 mb-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-indigo-400 mb-1">
            Last Session
          </p>
          <h3 className="text-base font-semibold text-slate-800 truncate max-w-xs">
            {filename}
          </h3>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-white border border-slate-100 rounded-full px-3 py-1.5 shadow-sm whitespace-nowrap">
          <CalendarDays className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
          {formattedDate}
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-4">
        <FileAudio className="h-3.5 w-3.5 text-indigo-300 shrink-0" />
        <span className="truncate">{filename}</span>
      </div>

      <ul className="space-y-2">
        {bullets.map((point, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600 leading-relaxed">
            <Circle className="h-1.5 w-1.5 mt-[7px] shrink-0 fill-indigo-400 text-indigo-400" />
            <span>{point}{point.endsWith(".") ? "" : "."}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
