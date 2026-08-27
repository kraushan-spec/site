"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { formatDate, formatTenge } from "@/lib/format";

export type ActDto = {
  id: string;
  number: string | null;
  amount: number | null;
  date: string | null;
  status: "CREATED" | "SENT" | "APPROVED" | "PAID" | "OVERDUE";
  penalty: number | null;
  comment: string | null;
};

const STATUS_LABEL: Record<ActDto["status"], string> = {
  CREATED: "Создан",
  SENT: "Отправлен",
  APPROVED: "Утверждён",
  PAID: "Оплачен",
  OVERDUE: "Просрочен",
};
const STATUS_BADGE: Record<ActDto["status"], string> = {
  CREATED: "badge-neutral",
  SENT: "badge-info",
  APPROVED: "badge-success",
  PAID: "badge-success",
  OVERDUE: "badge-danger",
};

export function ActsSection({ contractId, acts, onChange }: { contractId: string; acts: ActDto[]; onChange: () => void }) {
  const [adding, setAdding] = useState(false);
  const [number, setNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");

  async function add() {
    await fetch(`/api/contracts/${contractId}/acts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ number: number || null, amount: amount ? Number(amount) : null, date: date ? new Date(date).toISOString() : null }),
    });
    setAdding(false);
    setNumber("");
    setAmount("");
    setDate("");
    onChange();
  }

  async function setStatus(id: string, status: ActDto["status"]) {
    await fetch(`/api/contracts/${contractId}/acts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    onChange();
  }

  async function remove(id: string) {
    await fetch(`/api/contracts/${contractId}/acts/${id}`, { method: "DELETE" });
    onChange();
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Контроль актов</h3>
        <button className="btn btn-secondary btn-sm" onClick={() => setAdding((v) => !v)}>
          <Plus size={14} /> Добавить акт
        </button>
      </div>
      {adding && (
        <div className="flex flex-wrap gap-2 mb-3">
          <input className="input flex-1 min-w-[100px]" placeholder="№ акта" value={number} onChange={(e) => setNumber(e.target.value)} />
          <input className="input flex-1 min-w-[100px]" placeholder="Сумма" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <input type="date" className="input flex-1 min-w-[130px]" value={date} onChange={(e) => setDate(e.target.value)} />
          <button className="btn btn-primary btn-sm" onClick={add}>Ок</button>
        </div>
      )}
      <div className="space-y-1.5">
        {acts.length === 0 && <p className="text-sm text-muted">Акты не добавлены</p>}
        {acts.map((a) => (
          <div key={a.id} className="flex items-center gap-2 text-sm py-1.5 border-b border-border last:border-0">
            <span className="font-semibold">№{a.number ?? "—"}</span>
            <span className="text-muted">{a.amount ? formatTenge(a.amount) : ""}</span>
            <span className="text-xs text-muted">{a.date ? formatDate(a.date) : ""}</span>
            {a.penalty ? <span className="badge badge-danger">неустойка {formatTenge(a.penalty)}</span> : null}
            <select
              className="ml-auto text-xs border border-border rounded-lg px-2 py-1"
              value={a.status}
              onChange={(e) => setStatus(a.id, e.target.value as ActDto["status"])}
            >
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <span className={`badge ${STATUS_BADGE[a.status]}`}>{STATUS_LABEL[a.status]}</span>
            <button onClick={() => remove(a.id)} className="p-1 rounded hover:bg-danger-bg text-danger">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
