"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ContractFormModal, type ContractDto } from "./contract-form-modal";
import { GoszakupkiPanel } from "./goszakupki-panel";
import { ExportButton } from "@/components/export-button";
import { formatTenge } from "@/lib/format";
import { contractTermProgress, STAGE_LABELS } from "@/lib/contracts";

type ContractRow = ContractDto & {
  payments: { amount: number; status: string }[];
  _count: { documents: number; changes: number };
  riskLevel: string;
};

const RISK_BADGE: Record<string, string> = { LOW: "badge-success", MEDIUM: "badge-warning", HIGH: "badge-danger" };
const RISK_LABEL: Record<string, string> = { LOW: "Низкий", MEDIUM: "Средний", HIGH: "Высокий" };

const STATUS_FILTERS = [
  { key: "active", label: "Действующие" },
  { key: "all", label: "Все" },
  { key: "closed", label: "Завершённые" },
  { key: "attention", label: "Требуют внимания" },
  { key: "ending7", label: "Заканчиваются за 7 дней" },
  { key: "ending30", label: "Заканчиваются за 30 дней" },
];

export function TendersView() {
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("active");
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/contracts?status=${status}`);
    const data = await res.json();
    setContracts(data.contracts ?? []);
    setLoading(false);
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const totalAmount = contracts.reduce((s, c) => s + c.amount, 0);
  const totalReceived = contracts.reduce(
    (s, c) => s + c.payments.filter((p) => p.status === "RECEIVED").reduce((a, p) => a + p.amount, 0),
    0,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-6">
          <div>
            <div className="text-xs text-muted">Договоров</div>
            <div className="text-xl font-bold">{contracts.length}</div>
          </div>
          <div>
            <div className="text-xs text-muted">Общая сумма</div>
            <div className="text-xl font-bold">{formatTenge(totalAmount)}</div>
          </div>
          <div>
            <div className="text-xs text-muted">Получено</div>
            <div className="text-xl font-bold text-success">{formatTenge(totalReceived)}</div>
          </div>
        </div>
        <div className="flex gap-2">
          <ExportButton scope="tenders" />
          <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
            <Plus size={16} /> Добавить договор
          </button>
        </div>
      </div>

      <GoszakupkiPanel onImported={load} />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setStatus(f.key)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold ${
              status === f.key ? "bg-primary text-white" : "bg-[#f1f2f8] text-foreground/70"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {loading && <div className="card p-6 text-center text-sm text-muted md:col-span-2">Загрузка...</div>}
        {!loading && contracts.length === 0 && (
          <div className="card p-10 text-center text-sm text-muted md:col-span-2">Договоров не найдено</div>
        )}
        {contracts.map((c) => {
          const progress = contractTermProgress(
            { startDate: c.startDate ? new Date(c.startDate) : null, endDate: c.endDate ? new Date(c.endDate) : null, stage: c.stage, amount: c.amount },
            new Date(),
          );
          const received = c.payments.filter((p) => p.status === "RECEIVED").reduce((a, p) => a + p.amount, 0);
          return (
            <Link key={c.id} href={`/tenders/${c.id}`} className="card p-4 hover:shadow-md transition-shadow block">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <div className="font-semibold truncate">Договор №{c.contractNumber ?? c.id.slice(0, 6)}</div>
                  <div className="text-xs text-muted truncate">{c.title}</div>
                </div>
                <span className={`badge ${RISK_BADGE[c.riskLevel]} shrink-0`}>{RISK_LABEL[c.riskLevel]}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted mb-2">
                <span>{STAGE_LABELS[c.stage]}</span>
                <span className="font-semibold text-foreground">{formatTenge(c.amount)}</span>
              </div>
              {progress && (
                <>
                  <div className="h-1.5 rounded-full bg-[#f1f2f8] overflow-hidden mb-1">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${progress.elapsedPct}%` }} />
                  </div>
                  <div className="text-[11px] text-muted mb-2">
                    Прошло {progress.elapsedPct}% · осталось {progress.remainingDays} дн.
                  </div>
                </>
              )}
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">Получено {formatTenge(received)}</span>
                <span className="text-muted">{c._count.documents} документ.</span>
              </div>
            </Link>
          );
        })}
      </div>

      {modalOpen && (
        <ContractFormModal
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); load(); }}
        />
      )}
    </div>
  );
}
