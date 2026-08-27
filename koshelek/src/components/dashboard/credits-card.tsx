import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { formatTenge } from "@/lib/format";
import type { Credit } from "@prisma/client";
import type { creditTotals } from "@/lib/finance";

export function CreditsCard({
  credits,
  totals,
}: {
  credits: Credit[];
  totals: ReturnType<typeof creditTotals>;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Кредиты</h3>
        <div className="text-right text-xs">
          <div className="text-muted">
            Общий долг: <span className="font-semibold text-foreground">{formatTenge(totals.totalBalance)}</span>
          </div>
          <div className="text-muted">
            Ежемесячно: <span className="font-semibold text-foreground">{formatTenge(totals.totalMonthly)}</span>
          </div>
        </div>
      </div>
      {credits.length === 0 ? (
        <p className="text-sm text-muted py-6 text-center">Кредиты не добавлены</p>
      ) : (
        <div className="space-y-2">
          {credits.map((c) => {
            const pct = Math.max(0, Math.min(100, Math.round((c.currentBalance / c.principal) * 100)));
            return (
              <div key={c.id} className="flex items-center gap-3 py-1.5">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate">{c.bank}</div>
                  <div className="text-xs text-muted truncate">{c.name}</div>
                </div>
                <div className="w-24 shrink-0">
                  <div className="h-1.5 rounded-full bg-[#f1f2f8] overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-[10px] text-muted mt-0.5">{formatTenge(c.currentBalance)}</div>
                </div>
                <div className="text-xs text-muted w-16 text-right shrink-0">{c.remainingPayments} мес.</div>
              </div>
            );
          })}
        </div>
      )}
      <Link
        href="/credits"
        className="mt-3 flex items-center justify-between px-3 py-2 rounded-xl bg-primary/5 text-primary text-sm font-semibold hover:bg-primary/10"
      >
        Как быстрее погасить кредиты?
        <ChevronRight size={16} />
      </Link>
    </div>
  );
}
