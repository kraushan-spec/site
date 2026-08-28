"use client";

import { useState } from "react";
import { FileSpreadsheet, Loader2 } from "lucide-react";

export function ExportButton({
  scope,
  label = "Выгрузить в Excel",
  params,
  className = "btn btn-secondary btn-sm",
}: {
  scope: "all" | "income" | "expenses" | "credits" | "tenders" | "analytics" | "contract";
  label?: string;
  params?: Record<string, string>;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ scope, ...(params ?? {}) });
      const res = await fetch(`/api/export?${qs.toString()}`);
      if (!res.ok) throw new Error("Не удалось сформировать файл");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="?([^"]+)"?/);
      a.download = match?.[1] || `koshelek-export-${scope}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Ошибка экспорта");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={handleClick} disabled={loading} className={className}>
      {loading ? <Loader2 size={15} className="animate-spin" /> : <FileSpreadsheet size={15} />}
      {label}
    </button>
  );
}
