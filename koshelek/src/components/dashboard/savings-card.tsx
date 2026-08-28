import { Lightbulb } from "lucide-react";
import { formatTenge } from "@/lib/format";
import type { SavingsOpportunity } from "@/lib/analytics";

export function SavingsCard({ opportunities, totalPotential }: { opportunities: SavingsOpportunity[]; totalPotential: number }) {
  if (opportunities.length === 0) return null;
  return (
    <div className="rounded-xl bg-warning-bg p-3 flex items-start gap-3">
      <Lightbulb size={18} className="text-warning shrink-0 mt-0.5" />
      <div className="min-w-0">
        <div className="text-sm font-semibold text-warning">Можно сократить до {formatTenge(totalPotential)}</div>
        <div className="text-xs text-foreground/70 mt-0.5">
          Основная возможность экономии — {opportunities.map((o) => o.name.toLowerCase()).slice(0, 2).join(" и ")}
        </div>
      </div>
    </div>
  );
}
