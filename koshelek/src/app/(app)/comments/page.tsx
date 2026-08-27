import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";

const ENTITY_LABELS: Record<string, string> = {
  INCOME: "Доход",
  EXPENSE: "Расход",
  CREDIT: "Кредит",
  GOAL: "Цель",
  CONTRACT: "Договор",
  CONTRACT_CHANGE: "Изменение договора",
  ACT: "Акт",
  PAYMENT: "Оплата",
  TASK: "Задача",
  DOCUMENT: "Документ",
  AI_RECOMMENDATION: "Рекомендация AI",
};

const ENTITY_HREF: Partial<Record<string, (id: string) => string>> = {
  CONTRACT: (id) => `/tenders/${id}`,
  INCOME: () => "/income",
  EXPENSE: () => "/expenses",
  CREDIT: () => "/credits",
  GOAL: () => "/goals",
};

export default async function CommentsPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const comments = await prisma.comment.findMany({
    where: { householdId: user.householdId },
    include: { author: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h2 className="font-semibold">Комментарии</h2>
      <p className="text-sm text-muted">
        Единая история комментариев по всем доходам, расходам, кредитам, целям и договорам. Ничего не удаляется без
        подтверждения.
      </p>
      <div className="card divide-y divide-border">
        {comments.length === 0 && <div className="p-10 text-center text-sm text-muted">Комментариев пока нет</div>}
        {comments.map((c) => {
          const hrefFn = ENTITY_HREF[c.entityType];
          const label = ENTITY_LABELS[c.entityType] ?? c.entityType;
          const content = (
            <>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="badge badge-info">{label}</span>
                <span className="text-xs text-muted">
                  {formatDate(c.createdAt)} · {c.author?.name ?? "Пользователь"}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{c.text}</p>
            </>
          );
          return (
            <div key={c.id} className="p-3.5">
              {hrefFn ? (
                <Link href={hrefFn(c.entityId)} className="block hover:bg-[#f9fafc] -m-3.5 p-3.5 rounded-lg">
                  {content}
                </Link>
              ) : (
                content
              )}
            </div>
          );
        })}
      </div>
      {comments.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-muted justify-center">
          <MessageSquare size={16} /> Добавляйте комментарии из карточек операций и договоров
        </div>
      )}
    </div>
  );
}
