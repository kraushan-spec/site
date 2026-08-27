"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, CheckCircle2 } from "lucide-react";
import { CreditFormModal, type CreditDto } from "./credit-form-modal";
import { StrategyPanel } from "./strategy-panel";
import { CommentThread } from "@/components/comments/comment-thread";
import { ExportButton } from "@/components/export-button";
import { formatDate, formatTenge } from "@/lib/format";
import { creditTotals, nearestCreditPayment } from "@/lib/finance";

export function CreditsView() {
  const [credits, setCredits] = useState<CreditDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CreditDto | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/credits");
    const data = await res.json();
    setCredits(data.credits ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(id: string) {
    if (!confirm("Удалить кредит?")) return;
    await fetch(`/api/credits/${id}`, { method: "DELETE" });
    load();
  }

  async function handleClose(id: string) {
    await fetch(`/api/credits/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isClosed: true }),
    });
    load();
  }

  const creditLikes = credits.map((c) => ({ ...c, currentBalance: c.currentBalance }));
  const totals = creditTotals(creditLikes);
  const nearest = nearestCreditPayment(
    credits.map((c) => ({ ...c })),
    new Date(),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-6">
          <div>
            <div className="text-xs text-muted">Общий остаток долга</div>
            <div className="text-xl font-bold">{formatTenge(totals.totalBalance)}</div>
          </div>
          <div>
            <div className="text-xs text-muted">Ежемесячно</div>
            <div className="text-xl font-bold">{formatTenge(totals.totalMonthly)}</div>
          </div>
          <div>
            <div className="text-xs text-muted">Приблизительные проценты</div>
            <div className="text-xl font-bold">{formatTenge(totals.approxRemainingInterest)}</div>
          </div>
        </div>
        <div className="flex gap-2">
          <ExportButton scope="credits" />
          <button className="btn btn-primary" onClick={() => { setEditing(null); setModalOpen(true); }}>
            <Plus size={16} /> Добавить кредит
          </button>
        </div>
      </div>

      {nearest && (
        <div className="card p-3 bg-warning-bg border-none text-sm">
          Ближайший платёж: <b>{nearest.credit.bank} — {formatTenge(nearest.credit.monthlyPayment)}</b> до{" "}
          {formatDate(nearest.date)}
        </div>
      )}

      <div className="card divide-y divide-border">
        {loading && <div className="p-6 text-center text-sm text-muted">Загрузка...</div>}
        {!loading && credits.length === 0 && (
          <div className="p-10 text-center text-sm text-muted">Кредиты не добавлены</div>
        )}
        {credits.map((c) => {
          const pct = Math.max(0, Math.min(100, Math.round((c.currentBalance / c.principal) * 100)));
          return (
            <div key={c.id} className={c.isClosed ? "opacity-50" : ""}>
              <div className="p-4 cursor-pointer" onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold flex items-center gap-2">
                      {c.bank} · {c.name}
                      {c.isClosed && <span className="badge badge-success">закрыт</span>}
                    </div>
                    <div className="text-xs text-muted">
                      {c.interestRate}% годовых{c.apr ? ` · ГЭСВ ${c.apr}%` : ""} · платёж {c.paymentDay} числа
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold">{formatTenge(c.currentBalance)}</div>
                    <div className="text-xs text-muted">из {formatTenge(c.principal)}</div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {!c.isClosed && (
                      <button onClick={(e) => { e.stopPropagation(); handleClose(c.id); }} className="p-1.5 rounded-lg hover:bg-success-bg text-success" title="Отметить закрытым">
                        <CheckCircle2 size={15} />
                      </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); setEditing(c); setModalOpen(true); }} className="p-1.5 rounded-lg hover:bg-[#eceefb] text-muted">
                      <Pencil size={15} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }} className="p-1.5 rounded-lg hover:bg-danger-bg text-danger">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-[#f1f2f8] overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex justify-between text-[11px] text-muted mt-1">
                  <span>Ежемес. {formatTenge(c.monthlyPayment)}</span>
                  <span>Осталось {c.remainingPayments} мес. · до {formatDate(c.endDate)}</span>
                </div>
              </div>
              {expandedId === c.id && (
                <div className="px-4 pb-4 bg-[#fafbfd]">
                  {c.comment && <p className="text-xs text-muted mb-2 italic">{c.comment}</p>}
                  <CommentThread entityType="CREDIT" entityId={c.id} compact />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <StrategyPanel credits={creditLikes} />

      {modalOpen && (
        <CreditFormModal
          initial={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); load(); }}
        />
      )}
    </div>
  );
}
