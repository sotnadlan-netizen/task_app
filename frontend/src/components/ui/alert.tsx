import type { ReactNode } from "react";
import { AlertTriangle, Info, CheckCircle, XCircle } from "lucide-react";

type AlertVariant = "info" | "success" | "warning" | "error";

const variantStyles: Record<AlertVariant, string> = {
  info: "bg-[#ecf5fe] border-[#b3d9f6] text-[#04518c]",
  success: "bg-[#ddf0d4] border-[#a3d99b] text-[#0b6b3a]",
  warning: "bg-[#fef0e0] border-[#fcd9a8] text-[#8a4d04]",
  error: "bg-[#fde9e7] border-[#f5c2bd] text-[#a61a14]",
};

const icons: Record<AlertVariant, typeof Info> = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
};

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Alert({
  variant = "info",
  title,
  children,
  className = "",
}: AlertProps) {
  const Icon = icons[variant];

  return (
    <div
      role="alert"
      className={`flex gap-3 p-4 rounded border ${variantStyles[variant]} ${className}`}
    >
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div>
        {title && <p className="font-semibold mb-1">{title}</p>}
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
}
