import type { ReactNode } from "react";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-[#ecebea] text-[#3e3e3c]",
  success: "bg-[#cfeac4] text-[#04844b]",
  warning: "bg-[#fef0e0] text-[#a86403]",
  danger: "bg-[#fde9e7] text-[#c23934]",
  info: "bg-[#ecf5fe] text-[#0070d2]",
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

export function Badge({
  variant = "default",
  children,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold
        ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
