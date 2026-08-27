import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  tone?: "primary" | "success" | "danger" | "warning" | "info";
}) {
  const toneClasses: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success-bg text-success",
    danger: "bg-danger-bg text-danger",
    warning: "bg-warning-bg text-warning",
    info: "bg-info-bg text-info",
  };
  return (
    <div className="card p-4 flex flex-col gap-3 min-w-0">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted uppercase tracking-wide truncate">{label}</span>
        <div className={`icon-badge ${toneClasses[tone]} w-9 h-9`}>
          <Icon size={17} />
        </div>
      </div>
      <div>
        <div className="text-xl lg:text-2xl font-bold truncate">{value}</div>
        {sub && <div className="text-xs text-muted mt-0.5 truncate">{sub}</div>}
      </div>
    </div>
  );
}
