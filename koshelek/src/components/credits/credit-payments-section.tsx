"use client";

import { useState } from "react";
import { Plus, Trash2, History } from "lucide-react";
import { formatDate, formatTenge } from "@/lib/format";

export type CreditPaymentDto = {
  id: string;
  amount: number;
  paidDate: string;
  comment: string | null;
};

export function CreditPaymentsSection({
  creditId,
  payments,
  onChange,
}: {
  creditId: string;
  payments: CreditPaymentDto[];
  onChange: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [amount, setAmount] = useState("");
  const [paidDate, setPaidDate] = useState(new Date().toISOString().slice(0, 10));
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const total = payments.reduce((s, p) => s + p.amount, 0);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!amount) return;
    setSaving(true);
    try {
      await fetch(`/api/credits/${creditId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          paidDate: new Date(paidDate).toISOString(),
          comment: comment || null,
        }),
      });
      setAmount("");
      setComment("");
      setAdding(false);
      onChange();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    await fetch(`/api/credits/${creditId}/payments/${id}`, { method: "DELETE" });
    onChange();
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <History size={13} /> История платежей{total > 0 ? ` · внесено ${formatTenge(total)}` : ""}
        </div>
        <button className="text-xs text-primary font-semibold" onClick={() => setAdding((v) => !v)}>
          <Plus size={12} className="inline" /> Добавить платёж
        </button>
      </div>
      {adding && (
        <form onSubmit={add} className="flex flex-wrap gap-2 mb-2">
          <input
            className="input text-xs w-28"
            placeholder="Сумма"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <input type="date" className="input text-xs w-auto" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} />
          <input
            className="input text-xs flex-1 min-w-[100px]"
            placeholder="Комментарий (необязательно)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <button className="btn btn-primary btn-sm" disabled={saving || !amount}>
            Ок
          </button>
        </form>
      )}
      {payments.length === 0 ? (
        <p className="text-xs text-muted">Платежи ещё не отмечены</p>
      ) : (
        <div className="space-y-1">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center gap-2 text-xs bg-[#f7f8fc] rounded-lg px-2.5 py-1.5">
              <span className="font-semibold">{formatTenge(p.amount)}</span>
              <span className="text-muted">{formatDate(p.paidDate)}</span>
              {p.comment && <span className="text-muted truncate flex-1">{p.comment}</span>}
              <button onClick={() => remove(p.id)} className="ml-auto p-1 rounded hover:bg-danger-bg text-danger shrink-0">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
