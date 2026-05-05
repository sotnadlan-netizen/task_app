import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: boolean;
  gradient?: string;
}

export function Card({ children, className = "", padding = true, gradient = "from-white/80 to-white/60" }: CardProps) {
  return (
    <div
      className={`bg-gradient-to-br ${gradient} rounded-3xl border border-white shadow-[0_4px_24px_rgba(0,0,0,0.06)]
        ${padding ? "p-6" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h3 className={`text-lg font-semibold text-gray-800 ${className}`}>
      {children}
    </h3>
  );
}
