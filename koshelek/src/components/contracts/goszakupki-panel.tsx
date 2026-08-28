"use client";

import { useState } from "react";
import { RefreshCw, Trophy, Settings } from "lucide-react";
import Link from "next/link";
import { formatTenge } from "@/lib/format";

type Candidate = {
  title: string;
  contractNumber: string | null;
  announcementNumber: string | null;
  customer: string | null;
  amount: number;
};

export function GoszakupkiPanel({ onImported }: { onImported: () => void }) {
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);

  async function sync() {
    setLoading(true);
    setMessage(null);
    setCandidates(null);
    try {
      const res = await fetch("/api/goszakupki/sync", { method: "POST" });
      const data = await res.json();
      setConfigured(data.configured ?? false);
      if (data.error) {
        setMessage(data.error);
      } else {
        setCandidates(data.candidates ?? []);
        if ((data.candidates ?? []).length === 0) setMessage("Новых выигранных тендеров не найдено.");
      }
    } catch {
      setMessage("Не удалось выполнить синхронизацию.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmCandidate(c: Candidate) {
    await fetch("/api/goszakupki/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...c, stage: "WON" }),
    });
    setCandidates((prev) => (prev ? prev.filter((x) => x !== c) : prev));
    onImported();
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 font-semibold text-sm">
          <Trophy size={16} className="text-primary" /> Госзакупки
        </div>
        <div className="flex gap-2">
          <Link href="/settings" className="btn btn-outline btn-sm">
            <Settings size={14} /> Настроить
          </Link>
          <button className="btn btn-secondary btn-sm" onClick={sync} disabled={loading}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Синхронизировать
          </button>
        </div>
      </div>
      {message && <p className="text-sm text-muted">{message}</p>}
      {configured === false && !message && (
        <p className="text-sm text-muted">
          Интеграция не настроена — укажите БИН и токен официального API госзакупок в Настройках, либо добавляйте
          договоры вручную.
        </p>
      )}
      {candidates && candidates.length > 0 && (
        <div className="space-y-2 mt-2">
          {candidates.map((c, i) => (
            <div key={i} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold flex items-center gap-1.5">
                  🏆 Новый выигранный тендер
                </div>
                <div className="text-xs text-muted truncate">{c.title} · {c.customer}</div>
                <div className="text-xs font-semibold">{formatTenge(c.amount)}</div>
              </div>
              <button className="btn btn-primary btn-sm shrink-0" onClick={() => confirmCandidate(c)}>
                Добавить в контроль
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
