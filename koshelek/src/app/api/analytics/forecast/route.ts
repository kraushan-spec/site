import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { apiError } from "@/lib/api-helpers";
import { subMonths } from "date-fns";
import { buildForecast, creditTotals } from "@/lib/finance";

export async function GET(req: Request) {
  try {
    const user = await requireSessionUser();
    const { searchParams } = new URL(req.url);
    const monthsAhead = Math.min(24, Math.max(1, Number(searchParams.get("months") ?? 6)));
    const extraSavings = Number(searchParams.get("extraSavings") ?? 0);
    const extraToCredit = Number(searchParams.get("extraToCredit") ?? 0);

    const today = new Date();
    const since = subMonths(today, 3);

    const [accounts, allDone, recentIncome, recentExpense, credits, futurePayments] = await Promise.all([
      prisma.account.findMany({ where: { householdId: user.householdId } }),
      prisma.transaction.findMany({ where: { householdId: user.householdId, status: "DONE" } }),
      prisma.transaction.findMany({ where: { householdId: user.householdId, type: "INCOME", status: "DONE", date: { gte: since } } }),
      prisma.transaction.findMany({ where: { householdId: user.householdId, type: "EXPENSE", status: "DONE", date: { gte: since } } }),
      prisma.credit.findMany({ where: { householdId: user.householdId, isClosed: false } }),
      prisma.contractPayment.findMany({
        where: { contract: { householdId: user.householdId }, status: { not: "RECEIVED" } },
        include: { contract: true },
      }),
    ]);

    const startBalance =
      accounts.reduce((s, a) => s + a.initialBalance, 0) +
      allDone.reduce((s, t) => s + (t.type === "INCOME" ? t.amount : -t.amount), 0);

    const avgMonthlyIncome = recentIncome.reduce((s, t) => s + t.amount, 0) / 3;
    const avgMonthlyExpense = recentExpense.reduce((s, t) => s + t.amount, 0) / 3 + extraToCredit;

    const contractExpectedPaymentsByMonth = new Map<string, number>();
    for (const p of futurePayments) {
      if (!p.expectedDate) continue;
      const key = `${p.expectedDate.getFullYear()}-${p.expectedDate.getMonth()}`;
      contractExpectedPaymentsByMonth.set(key, (contractExpectedPaymentsByMonth.get(key) ?? 0) + p.amount);
    }

    const totals = creditTotals(credits);

    const points = buildForecast({
      startBalance,
      monthsAhead,
      today,
      avgMonthlyIncome,
      avgMonthlyExpense: Math.max(0, avgMonthlyExpense - extraSavings),
      creditsMonthlyTotal: totals.totalMonthly,
      contractExpectedPaymentsByMonth,
    });

    return NextResponse.json({ points, avgMonthlyIncome, avgMonthlyExpense, creditsMonthlyTotal: totals.totalMonthly });
  } catch (err) {
    return apiError(err);
  }
}
