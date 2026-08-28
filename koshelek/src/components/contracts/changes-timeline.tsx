import { History } from "lucide-react";
import { formatDate } from "@/lib/format";

export type ChangeDto = {
  id: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  reason: string | null;
  source: string;
  changedAt: string;
};

const SOURCE_LABEL: Record<string, string> = {
  MANUAL: "Вручную введено",
  API: "Госзакупки / API",
  AI: "AI-анализ",
  USER_COMMENT: "Комментарий пользователя",
  CALCULATED: "Расчёт приложения",
};

export function ChangesTimeline({ changes }: { changes: ChangeDto[] }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-3">
        <History size={16} className="text-primary" />
        <h3 className="font-semibold text-sm">История изменений договора</h3>
      </div>
      {changes.length === 0 && <p className="text-sm text-muted">Изменений пока не зафиксировано</p>}
      <div className="space-y-3">
        {changes.map((c) => (
          <div key={c.id} className="border-l-2 border-warning pl-3 py-0.5">
            <div className="flex items-center gap-2 text-xs text-muted">
              <span>🔔 {formatDate(c.changedAt)}</span>
              <span className="badge badge-neutral">{SOURCE_LABEL[c.source]}</span>
            </div>
            <div className="text-sm font-semibold mt-0.5">{c.field}</div>
            <div className="text-sm mt-0.5">
              <span className="text-muted line-through">{c.oldValue || "—"}</span>
              <span className="mx-1.5">→</span>
              <span className="font-semibold">{c.newValue || "—"}</span>
            </div>
            {c.reason && <div className="text-xs text-muted mt-0.5">Причина: {c.reason}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
