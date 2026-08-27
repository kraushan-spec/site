"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, ChevronDown, Repeat, ShieldAlert } from "lucide-react";
import { TransactionFormModal, type CategoryDto, type TransactionDto } from "./transaction-form-modal";
import { CommentThread } from "@/components/comments/comment-thread";
import { ExportButton } from "@/components/export-button";
import { formatDate, formatTenge } from "@/lib/format";

type FullTransaction = TransactionDto & {
  category: { name: string; icon: string } | null;
  source: string;
};

const SOURCE_LABEL: Record<string, string> = {
  MANUAL: "Вручную введено",
  API: "Госзакупки / API",
  AI: "AI-анализ",
  USER_COMMENT: "Комментарий пользователя",
  CALCULATED: "Расчёт приложения",
};

export function TransactionsView({ type }: { type: "INCOME" | "EXPENSE" }) {
  const [transactions, setTransactions] = useState<FullTransaction[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TransactionDto | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filterMandatory, setFilterMandatory] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    const [txRes, catRes] = await Promise.all([
      fetch(`/api/transactions?type=${type}`),
      fetch(`/api/categories?type=${type}`),
    ]);
    const txData = await txRes.json();
    const catData = await catRes.json();
    setTransactions(txData.transactions ?? []);
    setCategories(catData.categories ?? []);
    setLoading(false);
  }, [type]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(id: string) {
    if (!confirm("Удалить запись?")) return;
    await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    load();
  }

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (filterCategory && t.categoryId !== filterCategory) return false;
      if (filterMandatory === "yes" && !t.isMandatory) return false;
      if (filterMandatory === "no" && t.isMandatory) return false;
      return true;
    });
  }, [transactions, filterCategory, filterMandatory]);

  const total = filtered.reduce((s, t) => s + t.amount, 0);

  const now = new Date();
  const mandatoryRemaining = transactions
    .filter(
      (t) =>
        t.isMandatory &&
        t.status !== "DONE" &&
        new Date(t.date).getMonth() === now.getMonth() &&
        new Date(t.date).getFullYear() === now.getFullYear(),
    )
    .reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm text-muted">Итого {type === "INCOME" ? "доходов" : "расходов"}</div>
          <div className="text-2xl font-bold">{formatTenge(total)}</div>
        </div>
        <div className="flex gap-2">
          <ExportButton scope={type === "INCOME" ? "income" : "expenses"} />
          <button className="btn btn-primary" onClick={() => { setEditing(null); setModalOpen(true); }}>
            <Plus size={16} /> Добавить
          </button>
        </div>
      </div>

      {type === "EXPENSE" && mandatoryRemaining > 0 && (
        <div className="card p-3 bg-danger-bg border-none flex items-center gap-2">
          <ShieldAlert size={18} className="text-danger shrink-0" />
          <span className="text-sm text-danger font-semibold">
            Обязательные расходы до конца месяца: {formatTenge(mandatoryRemaining)}
          </span>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <select className="input w-auto text-sm" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
          <option value="">Все категории</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>
        {type === "EXPENSE" && (
          <select className="input w-auto text-sm" value={filterMandatory} onChange={(e) => setFilterMandatory(e.target.value)}>
            <option value="">Все</option>
            <option value="yes">Только обязательные</option>
            <option value="no">Только необязательные</option>
          </select>
        )}
      </div>

      <div className="card divide-y divide-border">
        {loading && <div className="p-6 text-center text-sm text-muted">Загрузка...</div>}
        {!loading && filtered.length === 0 && (
          <div className="p-10 text-center text-sm text-muted">Пока нет записей. Добавьте первую операцию.</div>
        )}
        {filtered.map((t) => (
          <div key={t.id}>
            <div
              className="flex items-center gap-3 p-3.5 hover:bg-[#f9fafc] cursor-pointer"
              onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
            >
              <div className="w-9 h-9 rounded-full bg-[#f1f2f8] flex items-center justify-center text-base shrink-0">
                {t.category?.icon ?? "🔹"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold truncate flex items-center gap-1.5">
                  {t.description || t.category?.name || "Без категории"}
                  {t.isRecurring && <Repeat size={12} className="text-muted" />}
                  {t.isMandatory && <span className="badge badge-danger">обязательный</span>}
                  {t.status === "PLANNED" && <span className="badge badge-info">план</span>}
                </div>
                <div className="text-xs text-muted">
                  {formatDate(t.date)} · {t.category?.name ?? "Без категории"} · {SOURCE_LABEL[t.source]}
                </div>
              </div>
              <div className={`text-sm font-bold shrink-0 ${type === "INCOME" ? "text-success" : "text-danger"}`}>
                {type === "INCOME" ? "+" : "−"}
                {Math.round(t.amount).toLocaleString("ru-RU")} ₸
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditing(t);
                  setModalOpen(true);
                }}
                className="p-1.5 rounded-lg hover:bg-[#eceefb] text-muted shrink-0"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(t.id);
                }}
                className="p-1.5 rounded-lg hover:bg-danger-bg text-danger shrink-0"
              >
                <Trash2 size={14} />
              </button>
              <ChevronDown
                size={16}
                className={`text-muted shrink-0 transition-transform ${expandedId === t.id ? "rotate-180" : ""}`}
              />
            </div>
            {expandedId === t.id && (
              <div className="px-4 pb-4 bg-[#fafbfd]">
                {t.comment && <p className="text-xs text-muted mb-2 italic">Заметка: {t.comment}</p>}
                <CommentThread entityType={type} entityId={t.id} compact />
              </div>
            )}
          </div>
        ))}
      </div>

      {modalOpen && (
        <TransactionFormModal
          type={type}
          categories={categories}
          initial={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}
