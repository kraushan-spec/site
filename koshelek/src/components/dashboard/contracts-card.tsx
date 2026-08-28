import Link from "next/link";
import { formatTenge } from "@/lib/format";
import { contractTermProgress, STAGE_LABELS } from "@/lib/contracts";
import type { Contract } from "@prisma/client";

const RISK_BADGE: Record<string, string> = {
  LOW: "badge-success",
  MEDIUM: "badge-warning",
  HIGH: "badge-danger",
};
const RISK_LABEL: Record<string, string> = { LOW: "Низкий", MEDIUM: "Средний", HIGH: "Высокий" };

export function ContractsCard({
  summary,
}: {
  summary: {
    activeCount: number;
    amountTotal: number;
    received: number;
    expected: number;
    needingAttention: number;
    endingSoon: number;
    highlighted: Contract[];
  };
}) {
  const today = new Date();
  return (
    <div className="card p-4 lg:col-span-2">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Тендеры и договоры</h3>
        <Link href="/tenders" className="text-xs font-semibold text-primary">
          Все
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-xl bg-info-bg p-3">
          <div className="text-lg font-bold text-info">{summary.activeCount}</div>
          <div className="text-xs text-muted">Действующих договоров</div>
          <div className="text-sm font-semibold mt-1">{formatTenge(summary.amountTotal)} общая сумма</div>
        </div>
        <div className="rounded-xl bg-success-bg p-3">
          <div className="text-lg font-bold text-success">{formatTenge(summary.received)}</div>
          <div className="text-xs text-muted">Получено</div>
          <div className="text-sm font-semibold mt-1">{formatTenge(summary.expected)} ожидается</div>
        </div>
      </div>
      {(summary.needingAttention > 0 || summary.endingSoon > 0) && (
        <div className="flex gap-2 mb-3 flex-wrap">
          {summary.needingAttention > 0 && (
            <span className="badge badge-danger">⚠ {summary.needingAttention} требуют внимания</span>
          )}
          {summary.endingSoon > 0 && (
            <span className="badge badge-warning">⏳ {summary.endingSoon} заканчиваются в течение 30 дней</span>
          )}
        </div>
      )}
      <div className="space-y-2">
        {summary.highlighted.map((c) => {
          const progress = contractTermProgress(
            { startDate: c.startDate, endDate: c.endDate, stage: c.stage, amount: c.amount },
            today,
          );
          return (
            <Link
              key={c.id}
              href={`/tenders/${c.id}`}
              className="block rounded-xl border border-border p-3 hover:bg-[#f9fafc]"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">
                    Договор №{c.contractNumber ?? c.id.slice(0, 6)}
                  </div>
                  <div className="text-xs text-muted truncate">{c.title}</div>
                </div>
                <span className={`badge ${RISK_BADGE[c.riskLevel]} shrink-0`}>{RISK_LABEL[c.riskLevel]}</span>
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-muted">
                <span>{STAGE_LABELS[c.stage]}</span>
                <span className="font-semibold text-foreground">{formatTenge(c.amount)}</span>
              </div>
              {progress && (
                <div className="mt-2 h-1.5 rounded-full bg-[#f1f2f8] overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${progress.elapsedPct}%` }} />
                </div>
              )}
            </Link>
          );
        })}
        {summary.highlighted.length === 0 && (
          <p className="text-sm text-muted py-6 text-center">Договоров пока нет</p>
        )}
      </div>
    </div>
  );
}
