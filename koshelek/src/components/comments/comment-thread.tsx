"use client";

import { useEffect, useState } from "react";
import { Send, MessageSquare } from "lucide-react";

type CommentDto = {
  id: string;
  text: string;
  createdAt: string;
  author: { name: string } | null;
};

export function CommentThread({
  entityType,
  entityId,
  compact = false,
}: {
  entityType: string;
  entityId: string;
  compact?: boolean;
}) {
  const [comments, setComments] = useState<CommentDto[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/comments?entityType=${entityType}&entityId=${entityId}`);
    const data = await res.json();
    setComments(data.comments ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, entityId, text }),
      });
      setText("");
      await load();
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      {!compact && (
        <div className="flex items-center gap-2 text-sm font-semibold mb-2">
          <MessageSquare size={15} /> Комментарии
        </div>
      )}
      <div className={`space-y-2 ${compact ? "max-h-40" : "max-h-64"} overflow-y-auto mb-2`}>
        {loading && <p className="text-xs text-muted">Загрузка...</p>}
        {!loading && comments.length === 0 && <p className="text-xs text-muted">Пока нет комментариев</p>}
        {comments.map((c) => (
          <div key={c.id} className="text-xs bg-[#f7f8fc] rounded-lg px-3 py-2">
            <div className="flex items-center justify-between mb-0.5">
              <span className="font-semibold">{c.author?.name ?? "Пользователь"}</span>
              <span className="text-muted">
                {new Date(c.createdAt).toLocaleDateString("ru-RU")}{" "}
                {new Date(c.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <div className="whitespace-pre-wrap">{c.text}</div>
          </div>
        ))}
      </div>
      <form onSubmit={submit} className="flex gap-2">
        <input
          className="input text-xs"
          placeholder="Добавить комментарий..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="btn btn-primary btn-sm shrink-0" disabled={sending}>
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
