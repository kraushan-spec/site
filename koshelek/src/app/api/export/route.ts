import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { apiError } from "@/lib/api-helpers";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";
import { computeMonthSummary, creditTotals, creditsDueBefore, type TxLike } from "@/lib/finance";
import { getCalendarEvents } from "@/lib/calendar";
import { getSavingsOpportunities } from "@/lib/analytics";
import { contractTermProgress } from "@/lib/contracts";
import {
  addSummarySheet,
  addTransactionsSheet,
  addCreditsSheet,
  addCalendarSheet,
  addAllTendersSheet,
  addActiveContractsSheet,
  addContractChangesSheet,
  addPaymentsSheet,
  addActsSheet,
  addTasksSheet,
  addCommentsSheet,
  addGoalsSheet,
} from "@/lib/excel-export";

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

const ENTITY_LABELS: Record<string, string> = {
  INCOME: "Доход", EXPENSE: "Расход", CREDIT: "Кредит", GOAL: "Цель", CONTRACT: "Договор",
  CONTRACT_CHANGE: "Изменение договора", ACT: "Акт", PAYMENT: "Оплата", TASK: "Задача",
  DOCUMENT: "Документ", AI_RECOMMENDATION: "Рекомендация AI",
};

async function txRows(householdId: string, type: "INCOME" | "EXPENSE") {
  const txs = await prisma.transaction.findMany({
    where: { householdId, type },
    include: { category: true, account: true },
    orderBy: { date: "desc" },
  });
  return txs.map((t) => ({
    date: t.date,
    category: t.category?.name ?? "Без категории",
    description: t.description ?? "",
    amount: t.amount,
    mandatory: t.isMandatory,
    recurring: t.isRecurring,
    status: t.status === "DONE" ? "Выполнено" : t.status === "PLANNED" ? "Запланировано" : "Просрочено",
    account: t.account?.name ?? "",
    comment: t.comment ?? "",
  }));
}

async function contractRowsWithComputed(householdId: string) {
  const contracts = await prisma.contract.findMany({ where: { householdId }, include: { payments: true } });
  const today = new Date();
  return contracts.map((c) => {
    const progress = contractTermProgress({ startDate: c.startDate, endDate: c.endDate, stage: c.stage, amount: c.amount }, today);
    const received = c.payments.filter((p) => p.status === "RECEIVED").reduce((s, p) => s + p.amount, 0);
    const expected = c.payments.filter((p) => p.status !== "RECEIVED").reduce((s, p) => s + p.amount, 0);
    return {
      id: c.id,
      contractNumber: c.contractNumber,
      announcementNumber: c.announcementNumber,
      title: c.title,
      customer: c.customer,
      supplier: c.supplier,
      amount: c.amount,
      startDate: c.startDate,
      endDate: c.endDate,
      stage: c.stage,
      riskLevel: c.riskLevel,
      riskReason: c.riskReason,
      comment: c.comment,
      received,
      expected,
      elapsedPct: progress?.elapsedPct ?? null,
      remainingDays: progress?.remainingDays ?? null,
    };
  });
}

function filenameFor(scope: string) {
  const stamp = new Date().toISOString().slice(0, 10);
  return `koshelek-${scope}-${stamp}.xlsx`;
}

async function respondWithWorkbook(wb: ExcelJS.Workbook, scope: string) {
  const buffer = await wb.xlsx.writeBuffer();
  return new Response(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filenameFor(scope)}"`,
    },
  });
}

export async function GET(req: Request) {
  try {
    const user = await requireSessionUser();
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope") ?? "all";
    const householdId = user.householdId;
    const wb = new ExcelJS.Workbook();
    wb.creator = "Кошелёк Онлайн";
    wb.created = new Date();

    if (scope === "income") {
      addTransactionsSheet(wb, "Доходы", await txRows(householdId, "INCOME"));
      return respondWithWorkbook(wb, "income");
    }

    if (scope === "expenses") {
      addTransactionsSheet(wb, "Расходы", await txRows(householdId, "EXPENSE"));
      return respondWithWorkbook(wb, "expenses");
    }

    if (scope === "credits") {
      const credits = await prisma.credit.findMany({ where: { householdId } });
      addCreditsSheet(
        wb,
        credits.map((c) => ({
          bank: c.bank, name: c.name, principal: c.principal, balance: c.currentBalance,
          monthlyPayment: c.monthlyPayment, rate: c.interestRate, apr: c.apr, paymentDay: c.paymentDay,
          remaining: c.remainingPayments, endDate: c.endDate, closed: c.isClosed, comment: c.comment ?? "",
        })),
      );
      return respondWithWorkbook(wb, "credits");
    }

    if (scope === "tenders") {
      const rows = await contractRowsWithComputed(householdId);
      addAllTendersSheet(wb, rows);
      addActiveContractsSheet(wb, rows.filter((r) => r.stage !== "CLOSED"));
      return respondWithWorkbook(wb, "tenders");
    }

    if (scope === "contract") {
      const id = searchParams.get("id");
      const contract = id
        ? await prisma.contract.findFirst({
            where: { id, householdId },
            include: { payments: true, acts: true, changes: true },
          })
        : null;
      if (!contract) return new Response("Договор не найден", { status: 404 });
      const progress = contractTermProgress({ startDate: contract.startDate, endDate: contract.endDate, stage: contract.stage, amount: contract.amount }, new Date());
      const received = contract.payments.filter((p) => p.status === "RECEIVED").reduce((s, p) => s + p.amount, 0);
      addActiveContractsSheet(wb, [
        {
          id: contract.id, contractNumber: contract.contractNumber, announcementNumber: contract.announcementNumber,
          title: contract.title, customer: contract.customer, supplier: contract.supplier, amount: contract.amount,
          startDate: contract.startDate, endDate: contract.endDate, stage: contract.stage, riskLevel: contract.riskLevel,
          riskReason: contract.riskReason, comment: contract.comment, received,
          expected: contract.payments.filter((p) => p.status !== "RECEIVED").reduce((s, p) => s + p.amount, 0),
          elapsedPct: progress?.elapsedPct ?? null, remainingDays: progress?.remainingDays ?? null,
        },
      ]);
      addPaymentsSheet(wb, contract.payments.map((p) => ({
        contractNumber: contract.contractNumber ?? contract.id.slice(0, 6), amount: p.amount,
        expectedDate: p.expectedDate, receivedDate: p.receivedDate, status: p.status,
      })));
      addActsSheet(wb, contract.acts.map((a) => ({
        contractNumber: contract.contractNumber ?? contract.id.slice(0, 6), number: a.number, amount: a.amount,
        date: a.date, status: a.status, penalty: a.penalty,
      })));
      addContractChangesSheet(wb, contract.changes.map((c) => ({
        contractNumber: contract.contractNumber ?? contract.id.slice(0, 6), date: c.changedAt, field: c.field,
        oldValue: c.oldValue, newValue: c.newValue, reason: c.reason, source: c.source,
      })));
      return respondWithWorkbook(wb, `contract-${contract.contractNumber ?? contract.id.slice(0, 6)}`);
    }

    if (scope === "analytics") {
      const monthParam = searchParams.get("month");
      const monthAnchor = monthParam ? new Date(`${monthParam.replace(/-(\d)$/, "-0$1")}-01T00:00:00`) : new Date();
      const { opportunities, totalPotential } = await getSavingsOpportunities(householdId, monthAnchor);
      const ws = wb.addWorksheet("Что можно сократить");
      ws.columns = [{ width: 24 }, { width: 16 }, { width: 16 }, { width: 16 }];
      ws.addRow(["Категория", "Сейчас", "Рекомендуется", "Экономия"]);
      for (const o of opportunities) {
        const row = ws.addRow([o.name, o.current, o.recommended, o.savings]);
        row.getCell(2).numFmt = '#,##0 "₸"';
        row.getCell(3).numFmt = '#,##0 "₸"';
        row.getCell(4).numFmt = '#,##0 "₸"';
      }
      ws.addRow([]);
      ws.addRow(["Потенциальная экономия в месяц", totalPotential]).getCell(2).numFmt = '#,##0 "₸"';
      return respondWithWorkbook(wb, "analytics");
    }

    // scope === "all": full export with every sheet
    const today = new Date();
    const monthAnchor = today;
    const monthStart = startOfMonth(monthAnchor);
    const monthEnd = endOfMonth(monthAnchor);

    const [accounts, allDone, monthTx, credits, goals, contractRows, changes, allPayments, allActs, tasks, comments, contractsForExpected] =
      await Promise.all([
        prisma.account.findMany({ where: { householdId } }),
        prisma.transaction.findMany({ where: { householdId, status: "DONE" } }),
        prisma.transaction.findMany({ where: { householdId, date: { gte: monthStart, lte: monthEnd } } }),
        prisma.credit.findMany({ where: { householdId } }),
        prisma.goal.findMany({ where: { householdId } }),
        contractRowsWithComputed(householdId),
        prisma.contractChange.findMany({ where: { contract: { householdId } }, include: { contract: true }, orderBy: { changedAt: "desc" } }),
        prisma.contractPayment.findMany({ where: { contract: { householdId } }, include: { contract: true } }),
        prisma.contractAct.findMany({ where: { contract: { householdId } }, include: { contract: true } }),
        prisma.task.findMany({ where: { householdId } }),
        prisma.comment.findMany({ where: { householdId }, include: { author: true } }),
        prisma.contract.findMany({ where: { householdId, stage: { not: "CLOSED" } } }),
      ]);

    const accountsInitialBalance = accounts.reduce((s, a) => s + a.initialBalance, 0);
    const activeCredits = credits.filter((c) => !c.isClosed);
    const totals = creditTotals(activeCredits);
    const summary = computeMonthSummary({
      today,
      monthAnchor,
      accountsInitialBalance,
      allDoneTransactions: allDone.map(toTxLike),
      monthTransactions: monthTx.map(toTxLike),
      creditsMonthlyTotal: totals.totalMonthly,
      creditsUpcomingBeforeMonthEnd: creditsDueBefore(activeCredits, today, monthEnd),
    });
    const { totalPotential } = await getSavingsOpportunities(householdId, monthAnchor);
    const activeContracts = contractRows.filter((c) => c.stage !== "CLOSED");
    const contractsExpectedTotal = contractsForExpected.reduce((s, c) => s + c.amount, 0);
    const savedGoalsTotal = goals.reduce((s, g) => s + g.savedAmount, 0);
    const debtLoad = summary.incomeActual > 0 ? Math.round((totals.totalMonthly / summary.incomeActual) * 100) : 0;

    addSummarySheet(wb, {
      period: monthAnchor.toLocaleDateString("ru-RU", { month: "long", year: "numeric" }),
      income: summary.incomeActual,
      expense: summary.expenseActual,
      mandatory: summary.mandatoryActual,
      credits: totals.totalMonthly,
      balance: summary.balanceNow,
      savings: savedGoalsTotal,
      debtLoad,
      expectedIncome: summary.incomeExpectedRemaining,
      expectedPayments: summary.mandatoryExpectedRemaining,
      potentialSavings: totalPotential,
      contractsAmount: contractsExpectedTotal,
      contractsExpected: activeContracts.reduce((s, c) => s + c.expected, 0),
    });

    addTransactionsSheet(wb, "Доходы", await txRows(householdId, "INCOME"));
    addTransactionsSheet(wb, "Расходы", await txRows(householdId, "EXPENSE"));
    addCreditsSheet(
      wb,
      credits.map((c) => ({
        bank: c.bank, name: c.name, principal: c.principal, balance: c.currentBalance, monthlyPayment: c.monthlyPayment,
        rate: c.interestRate, apr: c.apr, paymentDay: c.paymentDay, remaining: c.remainingPayments, endDate: c.endDate,
        closed: c.isClosed, comment: c.comment ?? "",
      })),
    );

    const calendarEvents = await getCalendarEvents(householdId, subMonths(today, 1), monthEnd);
    addCalendarSheet(wb, calendarEvents.map((e) => ({ date: e.date, type: e.type, title: e.title, amount: e.amount })));

    addAllTendersSheet(wb, contractRows);
    addActiveContractsSheet(wb, activeContracts);
    addContractChangesSheet(
      wb,
      changes.map((c) => ({
        contractNumber: c.contract.contractNumber ?? c.contract.id.slice(0, 6), date: c.changedAt, field: c.field,
        oldValue: c.oldValue, newValue: c.newValue, reason: c.reason, source: c.source,
      })),
    );
    addPaymentsSheet(
      wb,
      allPayments.map((p) => ({
        contractNumber: p.contract.contractNumber ?? p.contract.id.slice(0, 6), amount: p.amount,
        expectedDate: p.expectedDate, receivedDate: p.receivedDate, status: p.status,
      })),
    );
    addActsSheet(
      wb,
      allActs.map((a) => ({
        contractNumber: a.contract.contractNumber ?? a.contract.id.slice(0, 6), number: a.number, amount: a.amount,
        date: a.date, status: a.status, penalty: a.penalty,
      })),
    );
    addTasksSheet(wb, tasks.map((t) => ({ title: t.title, dueDate: t.dueDate, priority: t.priority, done: t.isDone })));
    addCommentsSheet(
      wb,
      comments.map((c) => ({
        date: c.createdAt, object: ENTITY_LABELS[c.entityType] ?? c.entityType, refId: c.entityId.slice(0, 8),
        author: c.author?.name ?? "Пользователь", text: c.text, category: c.entityType, source: "Комментарий пользователя",
      })),
    );
    addGoalsSheet(
      wb,
      goals.map((g) => ({ name: g.name, type: g.type, target: g.targetAmount, saved: g.savedAmount, targetDate: g.targetDate, comment: g.comment })),
    );

    return respondWithWorkbook(wb, "all");
  } catch (err) {
    return apiError(err);
  }
}
