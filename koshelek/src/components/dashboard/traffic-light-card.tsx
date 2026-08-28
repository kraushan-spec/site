import { CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";
import type { TrafficLight } from "@/lib/finance";
import { TrendLineChart } from "@/components/charts/trend-line-chart";
import { formatTenge } from "@/lib/format";

const CONFIG = {
  GREEN: { label: "Под контролем", icon: CheckCircle2, bg: "bg-success-bg", text: "text-success" },
  YELLOW: { label: "Нужно сократить расходы", icon: AlertTriangle, bg: "bg-warning-bg", text: "text-warning" },
  RED: { label: "Риск нехватки денег", icon: AlertCircle, bg: "bg-danger-bg", text: "text-danger" },
} as const;

export function TrafficLightCard({
  trafficLight,
  safeDailyLimit,
  dailySeries,
}: {
  trafficLight: TrafficLight;
  safeDailyLimit: number;
  dailySeries: { day: number; income: number; expense: number }[];
}) {
  const cfg = CONFIG[trafficLight.status];
  const Icon = cfg.icon;
  return (
    <div className="card p-4 lg:col-span-2">
      <h3 className="font-semibold text-sm mb-3">Финансовая ситуация</h3>
      <div className="grid md:grid-cols-[220px_1fr] gap-4">
        <div className={`rounded-xl p-4 ${cfg.bg} flex flex-col gap-2`}>
          <div className={`flex items-center gap-2 font-bold ${cfg.text}`}>
            <Icon size={20} />
            {cfg.label}
          </div>
          <p className="text-xs text-foreground/80 leading-relaxed">{trafficLight.reason}</p>
          <div className="mt-auto pt-2 border-t border-black/5">
            <div className="text-[11px] text-muted">Безопасно можно потратить</div>
            <div className="text-lg font-bold">{formatTenge(safeDailyLimit)} / день</div>
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold text-muted mb-1 px-1">Динамика за месяц</div>
          <TrendLineChart data={dailySeries} />
        </div>
      </div>
    </div>
  );
}
