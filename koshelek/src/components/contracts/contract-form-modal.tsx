"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { STAGE_LABELS, STAGE_ORDER } from "@/lib/contracts";

export type ContractDto = {
  id: string;
  announcementNumber: string | null;
  contractNumber: string | null;
  title: string;
  customer: string | null;
  supplier: string | null;
  bin: string | null;
  amount: number;
  signDate: string | null;
  startDate: string | null;
  endDate: string | null;
  subject: string | null;
  procurementMethod: string | null;
  stage: string;
  warrantyStart: string | null;
  warrantyEnd: string | null;
  comment: string | null;
};

export function ContractFormModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: ContractDto | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [announcementNumber, setAnnouncementNumber] = useState(initial?.announcementNumber ?? "");
  const [contractNumber, setContractNumber] = useState(initial?.contractNumber ?? "");
  const [customer, setCustomer] = useState(initial?.customer ?? "");
  const [supplier, setSupplier] = useState(initial?.supplier ?? "");
  const [bin, setBin] = useState(initial?.bin ?? "");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [signDate, setSignDate] = useState(initial?.signDate?.slice(0, 10) ?? "");
  const [startDate, setStartDate] = useState(initial?.startDate?.slice(0, 10) ?? "");
  const [endDate, setEndDate] = useState(initial?.endDate?.slice(0, 10) ?? "");
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [procurementMethod, setProcurementMethod] = useState(initial?.procurementMethod ?? "");
  const [stage, setStage] = useState(initial?.stage ?? "WON");
  const [warrantyStart, setWarrantyStart] = useState(initial?.warrantyStart?.slice(0, 10) ?? "");
  const [warrantyEnd, setWarrantyEnd] = useState(initial?.warrantyEnd?.slice(0, 10) ?? "");
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [changeReason, setChangeReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title,
        announcementNumber: announcementNumber || null,
        contractNumber: contractNumber || null,
        customer: customer || null,
        supplier: supplier || null,
        bin: bin || null,
        amount: Number(amount),
        signDate: signDate ? new Date(signDate).toISOString() : null,
        startDate: startDate ? new Date(startDate).toISOString() : null,
        endDate: endDate ? new Date(endDate).toISOString() : null,
        subject: subject || null,
        procurementMethod: procurementMethod || null,
        stage,
        warrantyStart: warrantyStart ? new Date(warrantyStart).toISOString() : null,
        warrantyEnd: warrantyEnd ? new Date(warrantyEnd).toISOString() : null,
        comment: comment || null,
        ...(initial && changeReason ? { changeReason } : {}),
      };
      const res = await fetch(initial ? `/api/contracts/${initial.id}` : "/api/contracts", {
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
      <form onSubmit={submit} className="relative bg-surface w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl p-5 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{initial ? "Редактировать договор" : "Новый договор / тендер"}</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f4f5fa]">
            <X size={18} />
          </button>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="field-label">Название</label>
            <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Номер объявления</label>
            <input className="input" value={announcementNumber} onChange={(e) => setAnnouncementNumber(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Номер договора</label>
            <input className="input" value={contractNumber} onChange={(e) => setContractNumber(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Заказчик</label>
            <input className="input" value={customer} onChange={(e) => setCustomer(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Поставщик</label>
            <input className="input" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
          </div>
          <div>
            <label className="field-label">БИН</label>
            <input className="input" value={bin} onChange={(e) => setBin(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Сумма договора, ₸</label>
            <input className="input" required inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Дата заключения</label>
            <input type="date" className="input" value={signDate} onChange={(e) => setSignDate(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Статус</label>
            <select className="input" value={stage} onChange={(e) => setStage(e.target.value)}>
              {STAGE_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Дата начала</label>
            <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Дата окончания</label>
            <input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="field-label">Предмет договора</label>
            <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Способ закупки</label>
            <input className="input" value={procurementMethod} onChange={(e) => setProcurementMethod(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Гарантия: начало</label>
            <input type="date" className="input" value={warrantyStart} onChange={(e) => setWarrantyStart(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Гарантия: окончание</label>
            <input type="date" className="input" value={warrantyEnd} onChange={(e) => setWarrantyEnd(e.target.value)} />
          </div>
        </div>
        <div className="mt-3">
          <label className="field-label">Комментарий</label>
          <textarea className="input" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
        </div>
        {initial && (
          <div className="mt-3">
            <label className="field-label">Причина изменения (для истории, необязательно)</label>
            <input className="input" value={changeReason} onChange={(e) => setChangeReason(e.target.value)} placeholder="Например: заказчик перенёс поставку" />
          </div>
        )}
        {error && <p className="text-sm text-danger mt-2">{error}</p>}
        <div className="flex gap-2 mt-5">
          <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Отмена</button>
          <button type="submit" disabled={saving} className="btn btn-primary flex-1">{saving ? "Сохраняем..." : "Сохранить"}</button>
        </div>
      </form>
    </div>
  );
}
