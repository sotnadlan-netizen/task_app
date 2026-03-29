interface ProgressGraphProps {
  totalTasks: number;
  completedTasks: number;
  sessionCount: number;
}

export function ProgressGraph({ totalTasks, completedTasks, sessionCount }: ProgressGraphProps) {
  const pct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const remaining = totalTasks - completedTasks;

  const radius = 72;
  const stroke = 10;
  const normalizedRadius = radius - stroke / 2;
  const circumference = 2 * Math.PI * normalizedRadius;
  const offset = circumference - (pct / 100) * circumference;

  const stats = [
    { label: "Sessions Attended", value: sessionCount },
    { label: "Tasks Completed", value: completedTasks },
    { label: "Tasks Remaining", value: remaining },
  ];

  return (
    <div className="rounded-2xl glass shadow-glass p-4 md:p-6 mb-6 flex flex-col items-center">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-5">
        Monthly Goals
      </p>

      <div className="relative flex items-center justify-center mb-3">
        <svg
          height={radius * 2}
          width={radius * 2}
          className="-rotate-90"
          aria-label={`Progress: ${pct}%`}
        >
          {/* Background arc */}
          <circle
            className="text-slate-200"
            strokeWidth={stroke}
            stroke="currentColor"
            fill="transparent"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          {/* Completed arc */}
          <circle
            className="text-indigo-600 transition-all duration-700 ease-out"
            strokeWidth={stroke}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>
        {/* Center label */}
        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-slate-900 leading-none">{pct}%</span>
        </div>
      </div>

      <p className="text-sm text-slate-500 mb-6">
        {pct}% of monthly goals
      </p>

      <div className="grid grid-cols-3 gap-2 w-full max-w-xs">
        {stats.map(({ label, value }) => (
          <div
            key={label}
            className="flex flex-col items-center bg-slate-50 border border-slate-100 rounded-xl px-2 py-2.5"
          >
            <span className="text-2xl font-bold text-slate-800">{value}</span>
            <span className="text-[11px] text-slate-500 text-center mt-0.5 leading-tight">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
