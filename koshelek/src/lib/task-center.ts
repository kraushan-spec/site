import { prisma } from "@/lib/prisma";
import { differenceInCalendarDays, startOfDay } from "date-fns";
import { nextOccurrence } from "@/lib/finance";
import { STAGE_LABELS } from "@/lib/contracts";

export type ActionItem = {
  id: string;
  title: string;
  subtitle: string;
  dueDate: Date | null;
  bucket: "TODAY" | "TOMORROW" | "WEEK" | "LATER";
  color: "danger" | "warning" | "info" | "neutral";
  href: string;
};

function bucketFor(daysLeft: number | null): ActionItem["bucket"] {
  if (daysLeft === null) return "LATER";
  if (daysLeft <= 0) return "TODAY";
  if (daysLeft === 1) return "TOMORROW";
  if (daysLeft <= 7) return "WEEK";
  return "LATER";
}

export async function getActionItems(householdId: string): Promise<ActionItem[]> {
  const today = startOfDay(new Date());
  const items: ActionItem[] = [];

  const [credits, mandatoryExpenses, contracts, manualTasks, recentChanges] = await Promise.all([
    prisma.credit.findMany({ where: { householdId, isClosed: false } }),
    prisma.transaction.findMany({
      where: { householdId, type: "EXPENSE", isMandatory: true, status: { not: "DONE" } },
      orderBy: { date: "asc" },
      take: 20,
    }),
    prisma.contract.findMany({ where: { householdId, stage: { notIn: ["CLOSED"] } } }),
    prisma.task.findMany({ where: { householdId, isDone: false }, orderBy: { dueDate: "asc" } }),
    prisma.contractChange.findMany({
      where: { contract: { householdId }, changedAt: { gte: new Date(Date.now() - 7 * 86400000) } },
      include: { contract: true },
      orderBy: { changedAt: "desc" },
      take: 10,
    }),
  ]);

  for (const c of credits) {
    const due = nextOccurrence(today, c.paymentDay);
    const daysLeft = differenceInCalendarDays(due, today);
    if (daysLeft <= 30) {
      items.push({
        id: `credit:${c.id}`,
        title: `Кредит ${c.bank} — ${c.name}`,
        subtitle: `Оплатить до ${due.toLocaleDateString("ru-RU")} · ${Math.round(c.monthlyPayment).toLocaleString("ru-RU")} ₸`,
        dueDate: due,
        bucket: bucketFor(daysLeft),
        color: daysLeft <= 1 ? "danger" : daysLeft <= 7 ? "warning" : "info",
        href: "/credits",
      });
    }
  }

  for (const t of mandatoryExpenses) {
    const daysLeft = differenceInCalendarDays(t.date, today);
    if (daysLeft <= 30) {
      items.push({
        id: `expense:${t.id}`,
        title: t.description || "Обязательный платёж",
        subtitle: `${Math.round(t.amount).toLocaleString("ru-RU")} ₸ до ${t.date.toLocaleDateString("ru-RU")}`,
        dueDate: t.date,
        bucket: bucketFor(daysLeft),
        color: daysLeft <= 1 ? "danger" : daysLeft <= 7 ? "warning" : "info",
        href: "/expenses",
      });
    }
  }

  for (const c of contracts) {
    if (c.endDate) {
      const daysLeft = differenceInCalendarDays(c.endDate, today);
      if (daysLeft <= 30 && daysLeft >= 0) {
        items.push({
          id: `contract-end:${c.id}`,
          title: `Договор №${c.contractNumber ?? c.id.slice(0, 6)}`,
          subtitle: `Осталось ${daysLeft} дн. до окончания (${STAGE_LABELS[c.stage]})`,
          dueDate: c.endDate,
          bucket: bucketFor(daysLeft),
          color: daysLeft <= 7 ? "danger" : "warning",
          href: `/tenders/${c.id}`,
        });
      }
    }
    if (c.riskLevel === "HIGH") {
      items.push({
        id: `contract-risk:${c.id}`,
        title: `Высокий риск: договор №${c.contractNumber ?? c.id.slice(0, 6)}`,
        subtitle: c.riskReason || "Требует внимания",
        dueDate: null,
        bucket: "TODAY",
        color: "danger",
        href: `/tenders/${c.id}`,
      });
    }
  }

  for (const chg of recentChanges) {
    items.push({
      id: `change:${chg.id}`,
      title: `Изменение в договоре №${chg.contract.contractNumber ?? chg.contract.id.slice(0, 6)}`,
      subtitle: `${chg.field}: ${chg.oldValue ?? "—"} → ${chg.newValue ?? "—"}`,
      dueDate: chg.changedAt,
      bucket: "WEEK",
      color: "warning",
      href: `/tenders/${chg.contractId}`,
    });
  }

  for (const t of manualTasks) {
    const daysLeft = t.dueDate ? differenceInCalendarDays(t.dueDate, today) : null;
    items.push({
      id: `task:${t.id}`,
      title: t.title,
      subtitle: t.description || "",
      dueDate: t.dueDate,
      bucket: daysLeft !== null ? bucketFor(daysLeft) : t.priority === "TODAY" ? "TODAY" : t.priority === "WEEK" ? "WEEK" : "LATER",
      color: "neutral",
      href: "/tasks",
    });
  }

  const order: Record<ActionItem["bucket"], number> = { TODAY: 0, TOMORROW: 1, WEEK: 2, LATER: 3 };
  items.sort((a, b) => order[a.bucket] - order[b.bucket] || (a.dueDate?.getTime() ?? 0) - (b.dueDate?.getTime() ?? 0));
  return items;
}
