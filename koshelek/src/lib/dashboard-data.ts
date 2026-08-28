import { prisma } from "@/lib/prisma";
import { addDays, differenceInCalendarDays, endOfMonth, startOfMonth, subMonths } from "date-fns";
import {
  computeMonthSummary,
  computeTrafficLight,
  creditsDueBefore,
  creditTotals,
  nearestCreditPayment,
  projectRecurringOccurrences,
  type TxLike,
} from "@/lib/finance";
import { getCategoryBreakdown, getSavingsOpportunities } from "@/lib/analytics";
import { getActionItems } from "@/lib/task-center";

function toTxLike(t: {
  id: string;
  type: string;
  amount: number;
  date: Date;
  status: string;
  isMandatory: boolean;
  isRecurring: boolean;
  recurrenceDay: number | null;
  categoryId: string | null;
  description: string | null;
}): TxLike {
  return {
    id: t.id,
    type: t.type as "INCOME" | "EXPENSE",
    amount: t.amount,
    date: t.date,
    status: t.status as "PLANNED" | "DONE" | "OVERDUE",
    isMandatory: t.isMandatory,
    isRecurring: t.isRecurring,
    recurrenceDay: t.recurrenceDay,
    categoryId: t.categoryId,
    description: t.description,
  };
}

export async function getDashboardData(householdId: string, monthAnchor: Date = new Date()) {
  const today = new Date();
  const monthStart = startOfMonth(monthAnchor);
  const monthEnd = endOfMonth(monthAnchor);

  const [accounts, allDone, monthTx, credits, contracts, comparisonExpenses] = await Promise.all([
    prisma.account.findMany({ where: { householdId } }),
    prisma.transaction.findMany({ where: { householdId, status: "DONE" } }),
    prisma.transaction.findMany({
      where: { householdId, date: { gte: monthStart, lte: monthEnd } },
      include: { category: true },
    }),
    prisma.credit.findMany({ where: { householdId, isClosed: false } }),
    prisma.contract.findMany({ where: { householdId }, orderBy: { updatedAt: "desc" } }),
    prisma.transaction.findMany({
      where: {
        householdId,
        type: "EXPENSE",
        status: "DONE",
        date: { gte: subMonths(today, 3) },
      },
    }),
  ]);

  const accountsInitialBalance = accounts.reduce((s, a) => s + a.initialBalance, 0);
  const allDoneTx = allDone.map(toTxLike);
  const monthTxLike = monthTx.map(toTxLike);

  const totals = creditTotals(credits);
  const creditsUpcomingBeforeMonthEnd = creditsDueBefore(credits, today, monthEnd);

  const summary = computeMonthSummary({
    today,
    monthAnchor,
    accountsInitialBalance,
    allDoneTransactions: allDoneTx,
    monthTransactions: monthTxLike,
    creditsMonthlyTotal: totals.totalMonthly,
    creditsUpcomingBeforeMonthEnd,
  });

  // Next income (real planned or projected recurring) within 90 days.
  const futureWindowEnd = addDays(today, 90);
  const futureIncomeTx = await prisma.transaction.findMany({
    where: { householdId, type: "INCOME", status: { not: "DONE" }, date: { gte: today, lte: futureWindowEnd } },
  });
  const allIncomeForProjection = await prisma.transaction.findMany({
    where: { householdId, type: "INCOME" },
  });
  const projectedIncome = projectRecurringOccurrences(
    allIncomeForProjection.map(toTxLike),
    today,
    futureWindowEnd,
  );
  const upcomingIncomeDates = [...futureIncomeTx.map((t) => t.date), ...projectedIncome.map((t) => t.date)].sort(
    (a, b) => a.getTime() - b.getTime(),
  );
  const nextIncomeDate = upcomingIncomeDates[0] ?? null;

  const mandatoryHorizon = nextIncomeDate ?? monthEnd;
  const [mandatoryTxWindow, allMandatoryForProjection] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        householdId,
        type: "EXPENSE",
        isMandatory: true,
        status: { not: "DONE" },
        date: { gte: today, lte: mandatoryHorizon },
      },
    }),
    prisma.transaction.findMany({ where: { householdId, type: "EXPENSE", isMandatory: true } }),
  ]);
  const projectedMandatory = projectRecurringOccurrences(
    allMandatoryForProjection.map(toTxLike),
    today,
    mandatoryHorizon,
  );
  const mandatoryBeforeNextIncome =
    mandatoryTxWindow.reduce((s, t) => s + t.amount, 0) +
    projectedMandatory.reduce((s, t) => s + t.amount, 0) +
    creditsDueBefore(credits, today, mandatoryHorizon);

  const avgDailyExpenseLast3Months = comparisonExpenses.reduce((s, t) => s + t.amount, 0) / 90;

  const trafficLight = computeTrafficLight({
    today,
    summary,
    nextIncomeDate,
    mandatoryBeforeNextIncome,
    avgDailyExpenseLast3Months,
  });

  const nearestPayment = nearestCreditPayment(credits, today);
  const categoryBreakdown = await getCategoryBreakdown(householdId, monthAnchor, "EXPENSE");
  const { opportunities, totalPotential } = await getSavingsOpportunities(householdId, monthAnchor);

  const activeContracts = contracts.filter((c) => c.stage !== "CLOSED");
  const contractAmountTotal = activeContracts.reduce((s, c) => s + c.amount, 0);
  const contractPayments = await prisma.contractPayment.findMany({
    where: { contract: { householdId } },
  });
  const contractReceived = contractPayments
    .filter((p) => p.status === "RECEIVED")
    .reduce((s, p) => s + p.amount, 0);
  const contractExpected = contractPayments
    .filter((p) => p.status !== "RECEIVED")
    .reduce((s, p) => s + p.amount, 0);
  const contractsNeedingAttention = activeContracts.filter(
    (c) => c.riskLevel === "HIGH" || c.riskLevel === "MEDIUM",
  );
  const contractsEndingSoon = activeContracts.filter(
    (c) => c.endDate && differenceInCalendarDays(c.endDate, today) <= 30 && differenceInCalendarDays(c.endDate, today) >= 0,
  );

  const actionItems = (await getActionItems(householdId)).slice(0, 8);

  // Cumulative income/expense line for the current month (actual, day by day up to today).
  const daysElapsed = Math.min(differenceInCalendarDays(today, monthStart) + 1, differenceInCalendarDays(monthEnd, monthStart) + 1);
  const dailySeries: { day: number; income: number; expense: number }[] = [];
  {
    let cumIncome = 0;
    let cumExpense = 0;
    for (let d = 1; d <= Math.max(daysElapsed, 1); d++) {
      const dayDate = new Date(monthStart.getFullYear(), monthStart.getMonth(), d);
      const dayTx = monthTx.filter((t) => t.status === "DONE" && t.date.getDate() === d && t.date.getMonth() === dayDate.getMonth());
      cumIncome += dayTx.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
      cumExpense += dayTx.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);
      dailySeries.push({ day: d, income: Math.round(cumIncome), expense: Math.round(cumExpense) });
    }
  }

  return {
    monthAnchor,
    summary,
    trafficLight,
    creditTotals: totals,
    nearestPayment,
    categoryBreakdown,
    savings: { opportunities: opportunities.slice(0, 5), totalPotential },
    contracts: {
      activeCount: activeContracts.length,
      amountTotal: contractAmountTotal,
      received: contractReceived,
      expected: contractExpected,
      needingAttention: contractsNeedingAttention.length,
      endingSoon: contractsEndingSoon.length,
      highlighted: activeContracts.slice(0, 2),
    },
    actionItems,
    dailySeries,
    credits: credits.slice(0, 5),
    nextIncomeDate,
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
