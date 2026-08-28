"use client";

import { useState } from "react";
import { Plus, Trash2, CheckCircle2 } from "lucide-react";
import { formatDate, formatTenge } from "@/lib/format";

export type PaymentDto = {
  id: string;
  amount: number;
  expectedDate: string | null;
  receivedDate: string | null;
  status: "EXPECTED" | "RECEIVED" | "OVERDUE";
  comment: string | null;
};

export function PaymentsSection({
  contractId,
  payments,
  contractAmount,
  onChange,
}: {
  contractId: string;
  payments: PaymentDto[];
  contractAmount: number;
  onChange: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [amount, setAmount] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [saving, setSaving] = useState(false);

  const received = payments.filter((p) => p.status === "RECEIVED").reduce((s, p) => s + p.amount, 0);
  const expected = payments.filter((p) => p.status !== "RECEIVED").reduce((s, p) => s + p.amount, 0);

  async function add() {
    setSaving(true);
    await fetch(`/api/contracts/${contractId}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(amount), expectedDate: expectedDate ? new Date(expectedDate).toISOString() : null }),
    });
    setSaving(false);
    setAdding(false);
    setAmount("");
    setExpectedDate("");
    onChange();
  }

  async function markReceived(id: string) {
    await fetch(`/api/contracts/${contractId}/payments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "RECEIVED", receivedDate: new Date().toISOString() }),
    });
    onChange();
  }

  async function remove(id: string) {
    await fetch(`/api/contracts/${contractId}/payments/${id}`, { method: "DELETE" });
    onChange();
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Контроль оплаты</h3>
        <button className="btn btn-secondary btn-sm" onClick={() => setAdding((v) => !v)}>
          <Plus size={14} /> Добавить
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
        <div className="rounded-lg bg-[#f4f5fa] p-2">
          <div className="text-xs text-muted">Сумма договора</div>
          <div className="font-semibold text-sm">{formatTenge(contractAmount)}</div>
        </div>
        <div className="rounded-lg bg-success-bg p-2">
          <div className="text-xs text-success">Получено</div>
          <div className="font-semibold text-sm text-success">{formatTenge(received)}</div>
        </div>
        <div className="rounded-lg bg-warning-bg p-2">
          <div className="text-xs text-warning">Ожидается</div>
          <div className="font-semibold text-sm text-warning">{formatTenge(expected)}</div>
        </div>
      </div>
      {adding && (
        <div className="flex gap-2 mb-3">
          <input className="input" placeholder="Сумма" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <input type="date" className="input" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
          <button className="btn btn-primary btn-sm shrink-0" disabled={saving || !amount} onClick={add}>
            Ок
          </button>
        </div>
      )}
      <div className="space-y-1.5">
        {payments.length === 0 && <p className="text-sm text-muted">Оплаты не добавлены</p>}
        {payments.map((p) => (
          <div key={p.id} className="flex items-center gap-2 text-sm py-1.5 border-b border-border last:border-0">
            <span className={`badge ${p.status === "RECEIVED" ? "badge-success" : p.status === "OVERDUE" ? "badge-danger" : "badge-warning"}`}>
              {p.status === "RECEIVED" ? "Получено" : p.status === "OVERDUE" ? "Просрочено" : "Ожидается"}
            </span>
            <span className="flex-1 font-semibold">{formatTenge(p.amount)}</span>
            <span className="text-xs text-muted">
              {p.receivedDate ? `Оплачено ${formatDate(p.receivedDate)}` : p.expectedDate ? `Ожидается ${formatDate(p.expectedDate)}` : ""}
            </span>
            {p.status !== "RECEIVED" && (
              <button onClick={() => markReceived(p.id)} className="p-1 rounded hover:bg-success-bg text-success" title="Отметить полученным">
                <CheckCircle2 size={15} />
              </button>
            )}
            <button onClick={() => remove(p.id)} className="p-1 rounded hover:bg-danger-bg text-danger">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
