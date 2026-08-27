import { prisma } from "@/lib/prisma";
import { isWithinInterval } from "date-fns";
import { nextOccurrence, projectRecurringOccurrences, type TxLike } from "@/lib/finance";

export type CalendarEventType = "income" | "mandatory" | "credit" | "expense" | "contract" | "task";

export type CalendarEvent = {
  id: string;
  date: Date;
  type: CalendarEventType;
  title: string;
  amount?: number;
  href: string;
};

const COLOR_HEX: Record<CalendarEventType, string> = {
  income: "#16a34a",
  mandatory: "#dc2626",
  credit: "#f59e0b",
  expense: "#2563eb",
  contract: "#a855f7",
  task: "#eab308",
};

export function calendarEventColor(type: CalendarEventType) {
  return COLOR_HEX[type];
}

function toTxLike(t: {
  id: string; type: string; amount: number; date: Date; status: string; isMandatory: boolean;
  isRecurring: boolean; recurrenceDay: number | null; categoryId: string | null; description: string | null;
}): TxLike {
  return {
    id: t.id, type: t.type as "INCOME" | "EXPENSE", amount: t.amount, date: t.date,
    status: t.status as "PLANNED" | "DONE" | "OVERDUE", isMandatory: t.isMandatory,
    isRecurring: t.isRecurring, recurrenceDay: t.recurrenceDay, categoryId: t.categoryId,
    description: t.description,
  };
}

export async function getCalendarEvents(householdId: string, rangeStart: Date, rangeEnd: Date): Promise<CalendarEvent[]> {
  const [txInRange, allRecurringTx, credits, contracts, tasks] = await Promise.all([
    prisma.transaction.findMany({ where: { householdId, date: { gte: rangeStart, lte: rangeEnd } } }),
    prisma.transaction.findMany({ where: { householdId, isRecurring: true } }),
    prisma.credit.findMany({ where: { householdId, isClosed: false } }),
    prisma.contract.findMany({ where: { householdId } }),
    prisma.task.findMany({ where: { householdId, isDone: false, dueDate: { gte: rangeStart, lte: rangeEnd } } }),
  ]);

  const events: CalendarEvent[] = [];

  for (const t of txInRange) {
    events.push({
      id: t.id,
      date: t.date,
      type: t.type === "INCOME" ? "income" : t.isMandatory ? "mandatory" : "expense",
      title: t.description || (t.type === "INCOME" ? "Поступление" : "Расход"),
      amount: t.amount,
      href: t.type === "INCOME" ? "/income" : "/expenses",
    });
  }

  const projected = projectRecurringOccurrences(allRecurringTx.map(toTxLike), rangeStart, rangeEnd);
  for (const t of projected) {
    events.push({
      id: t.id,
      date: t.date,
      type: t.type === "INCOME" ? "income" : t.isMandatory ? "mandatory" : "expense",
      title: `${t.description || (t.type === "INCOME" ? "Поступление" : "Расход")} (ожидается)`,
      amount: t.amount,
      href: t.type === "INCOME" ? "/income" : "/expenses",
    });
  }

  for (const c of credits) {
    // show every occurrence within range: walk month by month
    let cursor = nextOccurrence(rangeStart, c.paymentDay);
    let guard = 0;
    while (cursor <= rangeEnd && guard < 36) {
      if (cursor >= rangeStart) {
        events.push({
          id: `${c.id}:${cursor.toISOString()}`,
          date: cursor,
          type: "credit",
          title: `Кредит: ${c.bank} · ${c.name}`,
          amount: c.monthlyPayment,
          href: "/credits",
        });
      }
      const next = new Date(cursor);
      next.setMonth(next.getMonth() + 1);
      cursor = nextOccurrence(next, c.paymentDay);
      guard++;
    }
  }

  for (const c of contracts) {
    if (c.endDate && isWithinInterval(c.endDate, { start: rangeStart, end: rangeEnd })) {
      events.push({
        id: `${c.id}:end`,
        date: c.endDate,
        type: "contract",
        title: `Окончание договора №${c.contractNumber ?? c.id.slice(0, 6)}`,
        href: `/tenders/${c.id}`,
      });
    }
    if (c.warrantyEnd && isWithinInterval(c.warrantyEnd, { start: rangeStart, end: rangeEnd })) {
      events.push({
        id: `${c.id}:warranty`,
        date: c.warrantyEnd,
        type: "contract",
        title: `Окончание гарантии №${c.contractNumber ?? c.id.slice(0, 6)}`,
        href: `/tenders/${c.id}`,
      });
    }
  }

  const payments = await prisma.contractPayment.findMany({
    where: { contract: { householdId }, status: { not: "RECEIVED" }, expectedDate: { gte: rangeStart, lte: rangeEnd } },
    include: { contract: true },
  });
  for (const p of payments) {
    if (!p.expectedDate) continue;
    events.push({
      id: `payment:${p.id}`,
      date: p.expectedDate,
      type: "contract",
      title: `Ожидаемая оплата по договору №${p.contract.contractNumber ?? p.contract.id.slice(0, 6)}`,
      amount: p.amount,
      href: `/tenders/${p.contractId}`,
    });
  }

  for (const t of tasks) {
    if (!t.dueDate) continue;
    events.push({ id: `task:${t.id}`, date: t.dueDate, type: "task", title: t.title, href: "/tasks" });
  }

  events.sort((a, b) => a.date.getTime() - b.date.getTime());
  return events;
}
