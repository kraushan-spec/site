"use client";

import { useRef, useState } from "react";
import { Upload, FileText, Trash2, Sparkles, AlertTriangle } from "lucide-react";
import { formatDate } from "@/lib/format";

export type DocumentDto = {
  id: string;
  filename: string;
  docType: string;
  mimeType: string | null;
  size: number | null;
  uploadedAt: string;
  extractedText: string | null;
};

export type ExtractionDto = {
  id: string;
  documentId: string | null;
  field: string;
  value: string;
  requiresAttention: boolean;
};

const DOC_TYPES = [
  { value: "contract", label: "Договор" },
  { value: "addendum", label: "Доп. соглашение" },
  { value: "spec", label: "Техническая спецификация" },
  { value: "invoice", label: "Счёт" },
  { value: "act", label: "Акт" },
  { value: "waybill", label: "Накладная" },
  { value: "payment_doc", label: "Документ оплаты" },
  { value: "correspondence", label: "Переписка" },
  { value: "other", label: "Другое" },
];

export function DocumentsSection({
  contractId,
  documents,
  extractions,
  onChange,
}: {
  contractId: string;
  documents: DocumentDto[];
  extractions: ExtractionDto[];
  onChange: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState("contract");
  const [uploading, setUploading] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastAnalyzedDoc, setLastAnalyzedDoc] = useState<string | null>(null);

  async function upload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("docType", docType);
      const res = await fetch(`/api/contracts/${contractId}/documents`, { method: "POST", body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Не удалось загрузить файл");
      }
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setUploading(false);
    }
  }

  async function analyze(docId: string) {
    setAnalyzingId(docId);
    setError(null);
    try {
      const res = await fetch(`/api/contracts/${contractId}/documents/${docId}/analyze`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось проанализировать документ");
      setLastAnalyzedDoc(docId);
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка анализа");
    } finally {
      setAnalyzingId(null);
    }
  }

  async function remove(docId: string) {
    if (!confirm("Удалить документ?")) return;
    await fetch(`/api/contracts/${contractId}/documents/${docId}`, { method: "DELETE" });
    onChange();
  }

  const attentionCount = extractions.filter((e) => e.requiresAttention).length;

  return (
    <div className="card p-4">
      <h3 className="font-semibold text-sm mb-3">Документы и AI-анализ</h3>
      <div className="flex flex-wrap gap-2 mb-3">
        <select className="input w-auto text-sm" value={docType} onChange={(e) => setDocType(e.target.value)}>
          {DOC_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept=".pdf,.docx,.txt,.doc,.jpg,.jpeg,.png"
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        />
        <button className="btn btn-secondary btn-sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
          <Upload size={14} /> {uploading ? "Загрузка..." : "Загрузить документ"}
        </button>
      </div>
      {error && <p className="text-sm text-danger mb-2">{error}</p>}

      <div className="space-y-1.5 mb-3">
        {documents.length === 0 && <p className="text-sm text-muted">Документы не загружены</p>}
        {documents.map((d) => (
          <div key={d.id} className="flex items-center gap-2 text-sm py-1.5 border-b border-border last:border-0">
            <FileText size={16} className="text-muted shrink-0" />
            <a href={`/api/contracts/${contractId}/documents/${d.id}`} className="flex-1 min-w-0 truncate hover:underline">
              {d.filename}
            </a>
            <span className="badge badge-neutral shrink-0">{DOC_TYPES.find((t) => t.value === d.docType)?.label ?? d.docType}</span>
            <span className="text-xs text-muted shrink-0">{formatDate(d.uploadedAt)}</span>
            <button
              className="btn btn-outline btn-sm shrink-0"
              disabled={analyzingId === d.id || !d.extractedText}
              title={!d.extractedText ? "Текст не удалось извлечь из этого формата" : "Прочитать AI"}
              onClick={() => analyze(d.id)}
            >
              <Sparkles size={13} /> {analyzingId === d.id ? "Читаем..." : "AI-анализ"}
            </button>
            <button onClick={() => remove(d.id)} className="p-1.5 rounded-lg hover:bg-danger-bg text-danger shrink-0">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {extractions.length > 0 && (
        <div className="rounded-xl bg-[#f7f8fc] p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">Из договора извлечено {extractions.length} условий</span>
            {attentionCount > 0 && (
              <span className="badge badge-danger">
                <AlertTriangle size={11} /> {attentionCount} требуют внимания
              </span>
            )}
          </div>
          <div className="space-y-1.5">
            {extractions.map((e) => (
              <div key={e.id} className={`text-xs p-2 rounded-lg ${e.requiresAttention ? "bg-danger-bg" : "bg-surface"}`}>
                <div className="font-semibold flex items-center gap-1">
                  {e.requiresAttention && <AlertTriangle size={11} className="text-danger" />}
                  {e.field}
                </div>
                <div className="text-muted mt-0.5">{e.value}</div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted mt-2">Источник: AI-анализ документа{lastAnalyzedDoc ? "" : ""}.</p>
        </div>
      )}
    </div>
  );
}
