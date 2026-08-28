"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil, Trash2, ShieldAlert, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import { ContractFormModal, type ContractDto } from "./contract-form-modal";
import { StageStepper } from "./stage-stepper";
import { PaymentsSection, type PaymentDto } from "./payments-section";
import { ActsSection, type ActDto } from "./acts-section";
import { DocumentsSection, type DocumentDto, type ExtractionDto } from "./documents-section";
import { ChangesTimeline, type ChangeDto } from "./changes-timeline";
import { CommentThread } from "@/components/comments/comment-thread";
import { ExportButton } from "@/components/export-button";
import { formatDate, formatTenge } from "@/lib/format";
import { contractTermProgress, STAGE_LABELS } from "@/lib/contracts";

type FullContract = ContractDto & {
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  riskReason: string | null;
  source: string;
  payments: PaymentDto[];
  acts: ActDto[];
  documents: DocumentDto[];
  changes: ChangeDto[];
  extractions: ExtractionDto[];
};

const RISK_BADGE: Record<string, string> = { LOW: "badge-success", MEDIUM: "badge-warning", HIGH: "badge-danger" };
const RISK_LABEL: Record<string, string> = { LOW: "Низкий риск", MEDIUM: "Средний риск", HIGH: "Высокий риск" };
const SOURCE_LABEL: Record<string, string> = { MANUAL: "Вручную введено", API: "Госзакупки / API", AI: "AI-анализ" };

export function ContractDetailView({ id }: { id: string }) {
  const router = useRouter();
  const [contract, setContract] = useState<FullContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/contracts/${id}`);
    if (res.status === 404) {
      setContract(null);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setContract(data.contract);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function changeStage(stage: string) {
    await fetch(`/api/contracts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
    load();
  }

  async function handleDelete() {
    if (!confirm("Удалить договор и всю его историю без возможности восстановления?")) return;
    await fetch(`/api/contracts/${id}`, { method: "DELETE" });
    router.push("/tenders");
  }

  if (loading) return <div className="p-10 text-center text-sm text-muted">Загрузка...</div>;
  if (!contract) return <div className="p-10 text-center text-sm text-muted">Договор не найден</div>;

  const progress = contractTermProgress(
    { startDate: contract.startDate ? new Date(contract.startDate) : null, endDate: contract.endDate ? new Date(contract.endDate) : null, stage: contract.stage, amount: contract.amount },
    new Date(),
  );

  const showWarranty = contract.warrantyStart || contract.warrantyEnd || contract.stage === "WARRANTY";

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <Link href="/tenders" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ArrowLeft size={15} /> Все договоры
      </Link>

      <div className="card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold">Договор №{contract.contractNumber ?? contract.id.slice(0, 6)}</h1>
              <span className={`badge ${RISK_BADGE[contract.riskLevel]}`}>{RISK_LABEL[contract.riskLevel]}</span>
              <span className="badge badge-neutral">{SOURCE_LABEL[contract.source] ?? contract.source}</span>
            </div>
            <p className="text-sm text-muted mt-0.5">{contract.title}</p>
          </div>
          <div className="flex gap-2">
            <ExportButton scope="contract" params={{ id: contract.id }} label="Excel" />
            <button className="btn btn-outline btn-sm" onClick={() => setEditOpen(true)}>
              <Pencil size={14} /> Изменить
            </button>
            <button className="btn btn-outline btn-sm text-danger" onClick={handleDelete}>
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {contract.riskLevel !== "LOW" && contract.riskReason && (
          <div className={`rounded-xl p-3 mb-3 flex items-start gap-2 ${contract.riskLevel === "HIGH" ? "bg-danger-bg" : "bg-warning-bg"}`}>
            <ShieldAlert size={16} className={contract.riskLevel === "HIGH" ? "text-danger shrink-0 mt-0.5" : "text-warning shrink-0 mt-0.5"} />
            <p className={`text-sm ${contract.riskLevel === "HIGH" ? "text-danger" : "text-warning"}`}>{contract.riskReason}</p>
          </div>
        )}

        <StageStepper stage={contract.stage} onChange={changeStage} />

        <div className="grid sm:grid-cols-4 gap-3 mt-4 text-sm">
          <div>
            <div className="text-xs text-muted">Заказчик</div>
            <div className="font-medium">{contract.customer || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-muted">Сумма договора</div>
            <div className="font-semibold">{formatTenge(contract.amount)}</div>
          </div>
          <div>
            <div className="text-xs text-muted">Способ закупки</div>
            <div className="font-medium">{contract.procurementMethod || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-muted">БИН поставщика</div>
            <div className="font-medium">{contract.bin || "—"}</div>
          </div>
        </div>

        {progress && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-muted mb-1">
              <span>{formatDate(contract.startDate!)} → {formatDate(contract.endDate!)}</span>
              <span>Осталось {progress.remainingDays} дн.</span>
            </div>
            <div className="h-2 rounded-full bg-[#f1f2f8] overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${progress.elapsedPct}%` }} />
            </div>
            <div className="flex justify-between text-[11px] text-muted mt-1">
              <span>Прошло: {progress.elapsedPct}%</span>
              <span>Осталось: {progress.remainingPct}%</span>
            </div>
          </div>
        )}
      </div>

      {showWarranty && (
        <div className="card p-4 bg-info-bg border-none">
          <div className="flex items-center gap-2 font-semibold text-sm text-info mb-1">
            <Shield size={16} /> Гарантийный период
          </div>
          <p className="text-sm text-foreground/80">
            {contract.warrantyStart ? formatDate(contract.warrantyStart) : "—"} → {contract.warrantyEnd ? formatDate(contract.warrantyEnd) : "—"}
          </p>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <PaymentsSection contractId={id} payments={contract.payments} contractAmount={contract.amount} onChange={load} />
        <ActsSection contractId={id} acts={contract.acts} onChange={load} />
      </div>

      <DocumentsSection contractId={id} documents={contract.documents} extractions={contract.extractions} onChange={load} />

      <ChangesTimeline changes={contract.changes} />

      <div className="card p-4">
        <CommentThread entityType="CONTRACT" entityId={id} />
      </div>

      {editOpen && (
        <ContractFormModal
          initial={contract}
          onClose={() => setEditOpen(false)}
          onSaved={() => { setEditOpen(false); load(); }}
        />
      )}
    </div>
  );
}
