import { prisma } from "@/lib/prisma";
import { differenceInCalendarDays, startOfDay } from "date-fns";
import { nextOccurrence } from "@/lib/finance";

const REMINDER_WINDOWS = [60, 30, 14, 7, 3, 1, 0];

async function upsertNotification(opts: {
  householdId: string;
  type: string;
  title: string;
  body: string;
  dueAt: Date;
  relatedEntityType?: string;
  relatedEntityId?: string;
}) {
  const dayKey = startOfDay(opts.dueAt).toISOString().slice(0, 10);
  const existing = await prisma.notification.findFirst({
    where: {
      householdId: opts.householdId,
      type: opts.type,
      relatedEntityId: opts.relatedEntityId,
      dueAt: { gte: new Date(dayKey), lt: new Date(new Date(dayKey).getTime() + 86400000) },
    },
  });
  if (existing) return;
  await prisma.notification.create({
    data: {
      householdId: opts.householdId,
      type: opts.type,
      title: opts.title,
      body: opts.body,
      dueAt: opts.dueAt,
      relatedEntityType: opts.relatedEntityType as never,
      relatedEntityId: opts.relatedEntityId,
    },
  });
}

/**
 * Idempotently creates reminder notifications for upcoming credit payments,
 * mandatory expenses and contract deadlines. Safe to call often — dedupes by
 * (type, relatedEntityId, due day).
 */
export async function ensureNotifications(householdId: string) {
  const today = startOfDay(new Date());
  const horizon = 60;

  const [credits, mandatoryExpenses, contracts] = await Promise.all([
    prisma.credit.findMany({ where: { householdId, isClosed: false } }),
    prisma.transaction.findMany({
      where: {
        householdId,
        type: "EXPENSE",
        isMandatory: true,
        status: { not: "DONE" },
        date: { gte: today },
      },
    }),
    prisma.contract.findMany({
      where: { householdId, stage: { notIn: ["CLOSED"] } },
    }),
  ]);

  for (const c of credits) {
    const due = nextOccurrence(today, c.paymentDay);
    const daysLeft = differenceInCalendarDays(due, today);
    if (REMINDER_WINDOWS.includes(daysLeft)) {
      await upsertNotification({
        householdId,
        type: "credit_due",
        title: `Платёж по кредиту «${c.name}»`,
        body: `${c.bank}: ${Math.round(c.monthlyPayment).toLocaleString("ru-RU")} ₸ до ${due.toLocaleDateString("ru-RU")}`,
        dueAt: due,
        relatedEntityType: "CREDIT",
        relatedEntityId: c.id,
      });
    }
  }

  for (const t of mandatoryExpenses) {
    const daysLeft = differenceInCalendarDays(t.date, today);
    if (daysLeft >= 0 && REMINDER_WINDOWS.includes(daysLeft)) {
      await upsertNotification({
        householdId,
        type: "mandatory_due",
        title: `Обязательный платёж: ${t.description ?? "без описания"}`,
        body: `${Math.round(t.amount).toLocaleString("ru-RU")} ₸ до ${t.date.toLocaleDateString("ru-RU")}`,
        dueAt: t.date,
        relatedEntityType: "EXPENSE",
        relatedEntityId: t.id,
      });
    }
  }

  for (const c of contracts) {
    if (c.endDate) {
      const daysLeft = differenceInCalendarDays(c.endDate, today);
      if (daysLeft >= 0 && daysLeft <= horizon && REMINDER_WINDOWS.includes(daysLeft)) {
        await upsertNotification({
          householdId,
          type: "contract_deadline",
          title: `Договор №${c.contractNumber ?? c.id.slice(0, 6)} — срок подходит к концу`,
          body: `«${c.title}»: осталось ${daysLeft} дн. до ${c.endDate.toLocaleDateString("ru-RU")}`,
          dueAt: c.endDate,
          relatedEntityType: "CONTRACT",
          relatedEntityId: c.id,
        });
      }
    }
    if (c.warrantyEnd) {
      const daysLeft = differenceInCalendarDays(c.warrantyEnd, today);
      if (daysLeft >= 0 && daysLeft <= horizon && REMINDER_WINDOWS.includes(daysLeft)) {
        await upsertNotification({
          householdId,
          type: "warranty_ending",
          title: `Гарантия по договору №${c.contractNumber ?? c.id.slice(0, 6)} заканчивается`,
          body: `«${c.title}»: гарантия до ${c.warrantyEnd.toLocaleDateString("ru-RU")}`,
          dueAt: c.warrantyEnd,
          relatedEntityType: "CONTRACT",
          relatedEntityId: c.id,
        });
      }
    }
  }
}
