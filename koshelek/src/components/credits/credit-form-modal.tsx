"use client";

import { useState } from "react";
import { X } from "lucide-react";

export type CreditDto = {
  id: string;
  bank: string;
  name: string;
  principal: number;
  currentBalance: number;
  monthlyPayment: number;
  interestRate: number;
  apr: number | null;
  paymentDay: number;
  remainingPayments: number;
  startDate: string;
  endDate: string;
  paymentType: "ANNUITY" | "DIFFERENTIATED";
  earlyRepaymentAllowed: boolean;
  comment: string | null;
  isClosed: boolean;
};

export function CreditFormModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: CreditDto | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [bank, setBank] = useState(initial?.bank ?? "");
  const [name, setName] = useState(initial?.name ?? "Потребительский кредит");
  const [principal, setPrincipal] = useState(initial ? String(initial.principal) : "");
  const [currentBalance, setCurrentBalance] = useState(initial ? String(initial.currentBalance) : "");
  const [monthlyPayment, setMonthlyPayment] = useState(initial ? String(initial.monthlyPayment) : "");
  const [interestRate, setInterestRate] = useState(initial ? String(initial.interestRate) : "");
  const [apr, setApr] = useState(initial?.apr ? String(initial.apr) : "");
  const [paymentDay, setPaymentDay] = useState(initial?.paymentDay ?? 10);
  const [remainingPayments, setRemainingPayments] = useState(initial ? String(initial.remainingPayments) : "");
  const [startDate, setStartDate] = useState(initial ? initial.startDate.slice(0, 10) : new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(initial ? initial.endDate.slice(0, 10) : "");
  const [paymentType, setPaymentType] = useState<CreditDto["paymentType"]>(initial?.paymentType ?? "ANNUITY");
  const [earlyRepaymentAllowed, setEarlyRepaymentAllowed] = useState(initial?.earlyRepaymentAllowed ?? true);
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        bank,
        name,
        principal: Number(principal),
        currentBalance: Number(currentBalance),
        monthlyPayment: Number(monthlyPayment),
        interestRate: Number(interestRate),
        apr: apr ? Number(apr) : null,
        paymentDay: Number(paymentDay),
        remainingPayments: Number(remainingPayments),
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        paymentType,
        earlyRepaymentAllowed,
        comment: comment || null,
      };
      const res = await fetch(initial ? `/api/credits/${initial.id}` : "/api/credits", {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Не удалось сохранить");
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <form onSubmit={submit} className="relative bg-surface w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-5 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{initial ? "Редактировать кредит" : "Новый кредит"}</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f4f5fa]">
            <X size={18} />
          </button>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="field-label">Банк</label>
            <input className="input" required value={bank} onChange={(e) => setBank(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Название кредита</label>
            <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Первоначальная сумма, ₸</label>
            <input className="input" required inputMode="decimal" value={principal} onChange={(e) => setPrincipal(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Текущий остаток, ₸</label>
            <input className="input" required inputMode="decimal" value={currentBalance} onChange={(e) => setCurrentBalance(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Ежемесячный платёж, ₸</label>
            <input className="input" required inputMode="decimal" value={monthlyPayment} onChange={(e) => setMonthlyPayment(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Процентная ставка, %</label>
            <input className="input" required inputMode="decimal" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} />
          </div>
          <div>
            <label className="field-label">ГЭСВ, % (необязательно)</label>
            <input className="input" inputMode="decimal" value={apr} onChange={(e) => setApr(e.target.value)} />
          </div>
          <div>
            <label className="field-label">День платежа</label>
            <input type="number" min={1} max={31} className="input" value={paymentDay} onChange={(e) => setPaymentDay(Number(e.target.value))} />
          </div>
          <div>
            <label className="field-label">Осталось платежей</label>
            <input type="number" min={0} className="input" required value={remainingPayments} onChange={(e) => setRemainingPayments(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Тип платежа</label>
            <select className="input" value={paymentType} onChange={(e) => setPaymentType(e.target.value as CreditDto["paymentType"])}>
              <option value="ANNUITY">Аннуитетный</option>
              <option value="DIFFERENTIATED">Дифференцированный</option>
            </select>
          </div>
          <div>
            <label className="field-label">Дата начала</label>
            <input type="date" className="input" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Дата окончания</label>
            <input type="date" className="input" required value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm mt-3">
          <input type="checkbox" checked={earlyRepaymentAllowed} onChange={(e) => setEarlyRepaymentAllowed(e.target.checked)} />
          Досрочное погашение разрешено
        </label>
        <div className="mt-3">
          <label className="field-label">Комментарий</label>
          <textarea className="input" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
        </div>
        {error && <p className="text-sm text-danger mt-2">{error}</p>}
        <div className="flex gap-2 mt-5">
          <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Отмена</button>
          <button type="submit" disabled={saving} className="btn btn-primary flex-1">{saving ? "Сохраняем..." : "Сохранить"}</button>
        </div>
      </form>
    </div>
  );
}
