import Link from "next/link";
import type { ActionItem } from "@/lib/task-center";

const BUCKET_LABEL: Record<ActionItem["bucket"], string> = {
  TODAY: "Сегодня",
  TOMORROW: "Завтра",
  WEEK: "На этой неделе",
  LATER: "Позже",
};

const COLOR_CLASS: Record<ActionItem["color"], string> = {
  danger: "border-l-danger",
  warning: "border-l-warning",
  info: "border-l-info",
  neutral: "border-l-border",
};

export function ActionStrip({ items }: { items: ActionItem[] }) {
  if (items.length === 0) {
    return (
      <div className="card p-4 text-sm text-muted">
        Нет срочных задач — всё под контролем.
      </div>
    );
  }
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Что нужно сделать</h3>
        <Link href="/tasks" className="text-xs font-semibold text-primary">
          Все задачи
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`shrink-0 w-48 rounded-xl border border-border border-l-4 ${COLOR_CLASS[item.color]} p-3 hover:shadow-sm transition-shadow bg-surface`}
          >
            <div className="text-[10px] font-bold text-muted uppercase tracking-wide mb-1">
              {BUCKET_LABEL[item.bucket]}
            </div>
            <div className="text-sm font-semibold leading-snug line-clamp-2">{item.title}</div>
            {item.subtitle && <div className="text-xs text-muted mt-1 line-clamp-2">{item.subtitle}</div>}
          </Link>
        ))}
      </div>
    </div>
  );
}
