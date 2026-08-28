import { prisma } from "@/lib/prisma";
import { addMonths, endOfMonth, startOfMonth } from "date-fns";

export type CategoryBreakdownItem = {
  categoryId: string | null;
  name: string;
  icon: string;
  amount: number;
  percent: number;
};

export async function getCategoryBreakdown(
  householdId: string,
  monthAnchor: Date,
  type: "INCOME" | "EXPENSE" = "EXPENSE",
): Promise<CategoryBreakdownItem[]> {
  const start = startOfMonth(monthAnchor);
  const end = endOfMonth(monthAnchor);
  const txs = await prisma.transaction.findMany({
    where: { householdId, type, status: "DONE", date: { gte: start, lte: end } },
    include: { category: true },
  });
  const total = txs.reduce((s, t) => s + t.amount, 0);
  const map = new Map<string, CategoryBreakdownItem>();
  for (const t of txs) {
    const key = t.categoryId ?? "none";
    const existing = map.get(key);
    if (existing) {
      existing.amount += t.amount;
    } else {
      map.set(key, {
        categoryId: t.categoryId,
        name: t.category?.name ?? "Без категории",
        icon: t.category?.icon ?? "🔹",
        amount: t.amount,
        percent: 0,
      });
    }
  }
  const items = [...map.values()].sort((a, b) => b.amount - a.amount);
  for (const item of items) item.percent = total > 0 ? Math.round((item.amount / total) * 100) : 0;
  return items;
}

export type SavingsOpportunity = {
  categoryId: string;
  name: string;
  icon: string;
  current: number;
  recommended: number;
  savings: number;
};

/**
 * Compares this month's expenses per category against the trailing 3-month
 * average. Categories running well above their average are flagged as
 * savings opportunities, recommending a return to the average level.
 */
export async function getSavingsOpportunities(
  householdId: string,
  monthAnchor: Date,
): Promise<{ opportunities: SavingsOpportunity[]; totalPotential: number }> {
  const currentStart = startOfMonth(monthAnchor);
  const currentEnd = endOfMonth(monthAnchor);
  const histStart = startOfMonth(addMonths(monthAnchor, -3));

  const [current, history] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        householdId,
        type: "EXPENSE",
        status: "DONE",
        isMandatory: false,
        date: { gte: currentStart, lte: currentEnd },
      },
      include: { category: true },
    }),
    prisma.transaction.findMany({
      where: {
        householdId,
        type: "EXPENSE",
        status: "DONE",
        isMandatory: false,
        date: { gte: histStart, lt: currentStart },
      },
      include: { category: true },
    }),
  ]);

  const currentByCat = new Map<string, { name: string; icon: string; amount: number }>();
  for (const t of current) {
    const key = t.categoryId ?? "none";
    const existing = currentByCat.get(key);
    if (existing) existing.amount += t.amount;
    else currentByCat.set(key, { name: t.category?.name ?? "Без категории", icon: t.category?.icon ?? "🔹", amount: t.amount });
  }

  const histByCat = new Map<string, number>();
  for (const t of history) {
    const key = t.categoryId ?? "none";
    histByCat.set(key, (histByCat.get(key) ?? 0) + t.amount);
  }

  const opportunities: SavingsOpportunity[] = [];
  for (const [key, cur] of currentByCat) {
    const avg = (histByCat.get(key) ?? 0) / 3;
    if (avg > 0 && cur.amount > avg * 1.2) {
      const recommended = Math.round(avg * 1.05);
      const savings = Math.round(cur.amount - recommended);
      if (savings > 1000) {
        opportunities.push({ categoryId: key, name: cur.name, icon: cur.icon, current: cur.amount, recommended, savings });
      }
    }
  }
  opportunities.sort((a, b) => b.savings - a.savings);
  const totalPotential = opportunities.reduce((s, o) => s + o.savings, 0);
  return { opportunities, totalPotential };
}

export type MonthComparison = {
  category: string;
  icon: string;
  current: number;
  previous: number;
  changePercent: number | null;
};

export async function getMonthOverMonthComparison(
  householdId: string,
  monthAnchor: Date,
): Promise<MonthComparison[]> {
  const [current, previous] = await Promise.all([
    getCategoryBreakdown(householdId, monthAnchor, "EXPENSE"),
    getCategoryBreakdown(householdId, addMonths(monthAnchor, -1), "EXPENSE"),
  ]);
  const prevMap = new Map(previous.map((p) => [p.categoryId ?? p.name, p.amount]));
  return current.map((c) => {
    const prevAmount = prevMap.get(c.categoryId ?? c.name) ?? 0;
    return {
      category: c.name,
      icon: c.icon,
      current: c.amount,
      previous: prevAmount,
      changePercent: prevAmount > 0 ? Math.round(((c.amount - prevAmount) / prevAmount) * 100) : null,
    };
  });
}
