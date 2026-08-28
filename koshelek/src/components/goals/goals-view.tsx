"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Target, X } from "lucide-react";
import { differenceInCalendarMonths } from "date-fns";
import { formatDate, formatTenge } from "@/lib/format";
import { CommentThread } from "@/components/comments/comment-thread";

type GoalDto = {
  id: string;
  name: string;
  type: string;
  targetAmount: number;
  savedAmount: number;
  targetDate: string | null;
  comment: string | null;
};

const TYPE_LABELS: Record<string, string> = {
  credit_payoff: "Погашение кредита",
  reserve: "Финансовая подушка",
  travel: "Путешествие",
  purchase: "Крупная покупка",
  other: "Другая цель",
};

function GoalFormModal({ initial, onClose, onSaved }: { initial?: GoalDto | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState(initial?.type ?? "reserve");
  const [targetAmount, setTargetAmount] = useState(initial ? String(initial.targetAmount) : "");
  const [savedAmount, setSavedAmount] = useState(initial ? String(initial.savedAmount) : "0");
  const [targetDate, setTargetDate] = useState(initial?.targetDate?.slice(0, 10) ?? "");
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name,
      type,
      targetAmount: Number(targetAmount),
      savedAmount: Number(savedAmount || 0),
      targetDate: targetDate ? new Date(targetDate).toISOString() : null,
      comment: comment || null,
    };
    await fetch(initial ? `/api/goals/${initial.id}` : "/api/goals", {
      method: initial ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <form onSubmit={submit} className="relative bg-surface w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{initial ? "Редактировать цель" : "Новая финансовая цель"}</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f4f5fa]">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="field-label">Название</label>
            <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Тип цели</label>
            <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Целевая сумма, ₸</label>
              <input className="input" required inputMode="decimal" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Уже накоплено, ₸</label>
              <input className="input" inputMode="decimal" value={savedAmount} onChange={(e) => setSavedAmount(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="field-label">Срок достижения</label>
            <input type="date" className="input" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Комментарий</label>
            <textarea className="input" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Отмена</button>
          <button type="submit" disabled={saving} className="btn btn-primary flex-1">{saving ? "Сохраняем..." : "Сохранить"}</button>
        </div>
      </form>
    </div>
  );
}

export function GoalsView() {
  const [goals, setGoals] = useState<GoalDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<GoalDto | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/goals");
    const data = await res.json();
    setGoals(data.goals ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(id: string) {
    if (!confirm("Удалить цель?")) return;
    await fetch(`/api/goals/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Финансовые цели</h2>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setModalOpen(true); }}>
          <Plus size={16} /> Новая цель
        </button>
      </div>

      {loading && <div className="card p-6 text-center text-sm text-muted">Загрузка...</div>}
      {!loading && goals.length === 0 && <div className="card p-10 text-center text-sm text-muted">Целей пока нет</div>}

      <div className="grid md:grid-cols-2 gap-3">
        {goals.map((g) => {
          const pct = Math.min(100, Math.round((g.savedAmount / g.targetAmount) * 100));
          const monthsLeft = g.targetDate ? Math.max(1, differenceInCalendarMonths(new Date(g.targetDate), new Date())) : null;
          const monthlyNeeded = monthsLeft ? Math.max(0, (g.targetAmount - g.savedAmount) / monthsLeft) : null;
          return (
            <div key={g.id} className="card p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Target size={16} className="text-primary shrink-0" />
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{g.name}</div>
                    <div className="text-xs text-muted">{TYPE_LABELS[g.type] ?? g.type}</div>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => { setEditing(g); setModalOpen(true); }} className="p-1.5 rounded-lg hover:bg-[#eceefb] text-muted">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => remove(g.id)} className="p-1.5 rounded-lg hover:bg-danger-bg text-danger">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="h-2 rounded-full bg-[#f1f2f8] overflow-hidden mb-1.5">
                <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <div className="flex justify-between text-xs text-muted mb-2">
                <span>{formatTenge(g.savedAmount)} из {formatTenge(g.targetAmount)}</span>
                <span>{pct}%</span>
              </div>
              {g.targetDate && (
                <div className="text-xs text-muted mb-2">
                  Срок: {formatDate(g.targetDate)}
                  {monthlyNeeded !== null && (
                    <span> · нужно копить {formatTenge(monthlyNeeded)}/мес</span>
                  )}
                </div>
              )}
              <button
                className="text-xs text-primary font-semibold"
                onClick={() => setExpandedId(expandedId === g.id ? null : g.id)}
              >
                {expandedId === g.id ? "Скрыть комментарии" : "Комментарии"}
              </button>
              {expandedId === g.id && (
                <div className="mt-2">
                  <CommentThread entityType="GOAL" entityId={g.id} compact />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {modalOpen && (
        <GoalFormModal initial={editing} onClose={() => setModalOpen(false)} onSaved={() => { setModalOpen(false); load(); }} />
      )}
    </div>
  );
}
