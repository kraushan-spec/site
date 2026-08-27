"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Check, Trash2, Bell, BellOff, X } from "lucide-react";
import { formatDate } from "@/lib/format";

type ActionItem = {
  id: string;
  title: string;
  subtitle: string;
  dueDate: string | null;
  bucket: "TODAY" | "TOMORROW" | "WEEK" | "LATER";
  color: "danger" | "warning" | "info" | "neutral";
  href: string;
};

type NotificationDto = {
  id: string;
  type: string;
  title: string;
  body: string;
  dueAt: string | null;
  isRead: boolean;
  createdAt: string;
};

const BUCKETS: { key: ActionItem["bucket"]; label: string; emoji: string }[] = [
  { key: "TODAY", label: "Сегодня", emoji: "🔴" },
  { key: "TOMORROW", label: "Завтра", emoji: "🟠" },
  { key: "WEEK", label: "На этой неделе", emoji: "🟡" },
  { key: "LATER", label: "Позже", emoji: "⚪" },
];

const COLOR_BORDER: Record<ActionItem["color"], string> = {
  danger: "border-l-danger",
  warning: "border-l-warning",
  info: "border-l-info",
  neutral: "border-l-border",
};

function AddTaskForm({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<"TODAY" | "WEEK" | "LATER">("WEEK");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, dueDate: dueDate ? new Date(dueDate).toISOString() : null, priority }),
    });
    setSaving(false);
    setTitle("");
    setDueDate("");
    setOpen(false);
    onAdded();
  }

  if (!open) {
    return (
      <button className="btn btn-primary" onClick={() => setOpen(true)}>
        <Plus size={16} /> Новая задача
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card p-3 flex flex-wrap items-center gap-2 w-full">
      <input autoFocus className="input flex-1 min-w-[160px]" placeholder="Что нужно сделать?" required value={title} onChange={(e) => setTitle(e.target.value)} />
      <input type="date" className="input w-auto" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      <select className="input w-auto" value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)}>
        <option value="TODAY">Сегодня</option>
        <option value="WEEK">На неделе</option>
        <option value="LATER">Позже</option>
      </select>
      <button className="btn btn-primary btn-sm" disabled={saving}>Добавить</button>
      <button type="button" className="btn btn-outline btn-sm" onClick={() => setOpen(false)}>
        <X size={14} />
      </button>
    </form>
  );
}

export function TasksView() {
  const [items, setItems] = useState<ActionItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [itemsRes, notifRes] = await Promise.all([fetch("/api/tasks/computed"), fetch("/api/notifications")]);
    const itemsData = await itemsRes.json();
    const notifData = await notifRes.json();
    setItems(itemsData.items ?? []);
    setNotifications(notifData.notifications ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function completeTask(id: string) {
    const taskId = id.replace("task:", "");
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDone: true }),
    });
    load();
  }

  async function deleteTask(id: string) {
    const taskId = id.replace("task:", "");
    await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    load();
  }

  async function markAllRead() {
    await fetch("/api/notifications/read-all", { method: "POST" });
    load();
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-semibold">Что нужно сделать</h2>
        <AddTaskForm onAdded={load} />
      </div>

      {loading && <div className="card p-6 text-center text-sm text-muted">Загрузка...</div>}

      {!loading &&
        BUCKETS.map((b) => {
          const bucketItems = items.filter((i) => i.bucket === b.key);
          if (bucketItems.length === 0) return null;
          return (
            <div key={b.key}>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <span>{b.emoji}</span> {b.label}
              </h3>
              <div className="space-y-2">
                {bucketItems.map((item) => {
                  const isManualTask = item.id.startsWith("task:");
                  return (
                    <div
                      key={item.id}
                      className={`card p-3 border-l-4 ${COLOR_BORDER[item.color]} flex items-center gap-3`}
                    >
                      {isManualTask && (
                        <button onClick={() => completeTask(item.id)} className="p-1.5 rounded-lg border border-border hover:bg-success-bg hover:text-success shrink-0" title="Отметить выполненным">
                          <Check size={14} />
                        </button>
                      )}
                      <Link href={item.href} className="min-w-0 flex-1">
                        <div className="text-sm font-semibold truncate">{item.title}</div>
                        {item.subtitle && <div className="text-xs text-muted truncate">{item.subtitle}</div>}
                      </Link>
                      {item.dueDate && <span className="text-xs text-muted shrink-0">{formatDate(item.dueDate)}</span>}
                      {isManualTask && (
                        <button onClick={() => deleteTask(item.id)} className="p-1.5 rounded-lg hover:bg-danger-bg text-danger shrink-0">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

      {!loading && items.length === 0 && (
        <div className="card p-10 text-center text-sm text-muted">Задач нет — всё под контролем 🎉</div>
      )}

      <div className="pt-2">
        <button className="flex items-center gap-2 text-sm font-semibold mb-2" onClick={() => setShowNotifications((v) => !v)}>
          {showNotifications ? <Bell size={16} /> : <BellOff size={16} />}
          Уведомления {unreadCount > 0 && <span className="badge badge-danger">{unreadCount}</span>}
        </button>
        {showNotifications && (
          <div className="card divide-y divide-border">
            {notifications.length === 0 && <p className="p-4 text-sm text-muted">Уведомлений нет</p>}
            {notifications.length > 0 && (
              <div className="p-2 flex justify-end">
                <button className="text-xs text-primary font-semibold" onClick={markAllRead}>
                  Отметить всё прочитанным
                </button>
              </div>
            )}
            {notifications.map((n) => (
              <div key={n.id} className={`p-3 text-sm ${!n.isRead ? "bg-primary/5" : ""}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{n.title}</span>
                  <span className="text-xs text-muted shrink-0">{formatDate(n.createdAt)}</span>
                </div>
                <p className="text-xs text-muted mt-0.5">{n.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
