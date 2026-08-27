import Link from "next/link";
import { FileText } from "lucide-react";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";

const DOC_TYPE_LABELS: Record<string, string> = {
  contract: "Договор",
  addendum: "Доп. соглашение",
  spec: "Техническая спецификация",
  invoice: "Счёт",
  act: "Акт",
  waybill: "Накладная",
  payment_doc: "Документ оплаты",
  correspondence: "Переписка",
  other: "Другое",
};

export default async function DocumentsPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const documents = await prisma.contractDocument.findMany({
    where: { contract: { householdId: user.householdId } },
    include: { contract: { select: { id: true, title: true, contractNumber: true } } },
    orderBy: { uploadedAt: "desc" },
  });

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <h2 className="font-semibold">Документы</h2>
      <div className="card divide-y divide-border">
        {documents.length === 0 && (
          <div className="p-10 text-center text-sm text-muted">
            Документы появятся здесь после загрузки в карточку договора
          </div>
        )}
        {documents.map((d) => (
          <div key={d.id} className="flex items-center gap-3 p-3.5">
            <FileText size={18} className="text-muted shrink-0" />
            <div className="min-w-0 flex-1">
              <a href={`/api/contracts/${d.contractId}/documents/${d.id}`} className="text-sm font-semibold truncate hover:underline block">
                {d.filename}
              </a>
              <Link href={`/tenders/${d.contract.id}`} className="text-xs text-muted hover:underline">
                Договор №{d.contract.contractNumber ?? d.contract.id.slice(0, 6)} · {d.contract.title}
              </Link>
            </div>
            <span className="badge badge-neutral shrink-0">{DOC_TYPE_LABELS[d.docType] ?? d.docType}</span>
            <span className="text-xs text-muted shrink-0">{formatDate(d.uploadedAt)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
