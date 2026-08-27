"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

export type CategoryDto = { id: string; name: string; icon: string };
export type TransactionDto = {
  id: string;
  type: "INCOME" | "EXPENSE";
  categoryId: string | null;
  description: string | null;
  amount: number;
  date: string;
  isMandatory: boolean;
  isRecurring: boolean;
  recurrenceDay: number | null;
  paymentMethod: string | null;
  status: "PLANNED" | "DONE" | "OVERDUE";
  comment: string | null;
};

const PAYMENT_METHODS = ["Карта", "Наличные", "Перевод", "Другое"];

export function TransactionFormModal({
  type,
  categories,
  initial,
  onClose,
  onSaved,
}: {
  type: "INCOME" | "EXPENSE";
  categories: CategoryDto[];
  initial?: TransactionDto | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? categories[0]?.id ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [date, setDate] = useState(initial ? initial.date.slice(0, 10) : new Date().toISOString().slice(0, 10));
  const [isMandatory, setIsMandatory] = useState(initial?.isMandatory ?? false);
  const [isRecurring, setIsRecurring] = useState(initial?.isRecurring ?? false);
  const [recurrenceDay, setRecurrenceDay] = useState(initial?.recurrenceDay ?? new Date().getDate());
  const [paymentMethod, setPaymentMethod] = useState(initial?.paymentMethod ?? PAYMENT_METHODS[0]);
  const [status, setStatus] = useState<TransactionDto["status"]>(initial?.status ?? "DONE");
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!categoryId && categories[0]) setCategoryId(categories[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        type,
        amount: Number(amount),
        categoryId: categoryId || null,
        description: description || null,
        date: new Date(date).toISOString(),
        isMandatory,
        isRecurring,
        recurrenceDay: isRecurring ? recurrenceDay : null,
        paymentMethod,
        status,
        comment: comment || null,
      };
      const res = await fetch(initial ? `/api/transactions/${initial.id}` : "/api/transactions", {
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
      <form
        onSubmit={submit}
        className="relative bg-surface w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">
            {initial ? "Редактировать" : type === "INCOME" ? "Новый доход" : "Новый расход"}
          </h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f4f5fa]">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="field-label">Сумма, ₸</label>
            <input
              autoFocus
              className="input text-lg font-semibold"
              inputMode="decimal"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
            />
          </div>
          <div>
            <label className="field-label">Категория</label>
            <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Описание</label>
            <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Дата</label>
              <input type="date" className="input" required value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Способ оплаты</label>
              <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="field-label">Статус</label>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value as TransactionDto["status"])}>
              <option value="DONE">Выполнено</option>
              <option value="PLANNED">Запланировано</option>
            </select>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isMandatory} onChange={(e) => setIsMandatory(e.target.checked)} />
              Обязательный
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} />
              Регулярный
            </label>
          </div>
          {isRecurring && (
            <div>
              <label className="field-label">День месяца для повторения</label>
              <input
                type="number"
                min={1}
                max={31}
                className="input"
                value={recurrenceDay}
                onChange={(e) => setRecurrenceDay(Number(e.target.value))}
              />
            </div>
          )}
          <div>
            <label className="field-label">Комментарий</label>
            <textarea className="input" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>

        <div className="flex gap-2 mt-5">
          <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
            Отмена
          </button>
          <button type="submit" disabled={saving} className="btn btn-primary flex-1">
            {saving ? "Сохраняем..." : "Сохранить"}
          </button>
        </div>
      </form>
    </div>
  );
}
