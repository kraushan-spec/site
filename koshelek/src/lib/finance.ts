import {
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  getDate,
  getDaysInMonth,
  isAfter,
  isBefore,
  isSameMonth,
  setDate,
  startOfDay,
  startOfMonth,
} from "date-fns";

export type TxLike = {
  id: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  date: Date;
  status: "PLANNED" | "DONE" | "OVERDUE";
  isMandatory: boolean;
  isRecurring: boolean;
  recurrenceDay: number | null;
  categoryId: string | null;
  description: string | null;
};

export type CreditLike = {
  id: string;
  bank: string;
  name: string;
  currentBalance: number;
  monthlyPayment: number;
  interestRate: number;
  paymentDay: number;
  remainingPayments: number;
  isClosed: boolean;
};

/** Clamp a day-of-month to a valid day for the given month/year. */
function clampDay(year: number, month: number, day: number) {
  const dim = getDaysInMonth(new Date(year, month, 1));
  return Math.min(Math.max(day, 1), dim);
}

/** Next occurrence date on/after `from` for a given day-of-month. */
export function nextOccurrence(from: Date, day: number): Date {
  const y = from.getFullYear();
  const m = from.getMonth();
  const candidate = setDate(new Date(y, m, 1), clampDay(y, m, day));
  if (isBefore(candidate, startOfDay(from))) {
    const ny = m === 11 ? y + 1 : y;
    const nm = (m + 1) % 12;
    return setDate(new Date(ny, nm, 1), clampDay(ny, nm, day));
  }
  return candidate;
}

/**
 * Projects virtual future occurrences for recurring transaction templates
 * within [from, to], skipping months where a real transaction of the same
 * series (type + category + description) already exists.
 */
export function projectRecurringOccurrences(
  transactions: TxLike[],
  from: Date,
  to: Date,
): TxLike[] {
  const recurring = transactions.filter((t) => t.isRecurring && t.recurrenceDay);
  // latest template per series
  const templates = new Map<string, TxLike>();
  for (const t of recurring) {
    const key = `${t.type}:${t.categoryId ?? ""}:${t.description ?? ""}`;
    const existing = templates.get(key);
    if (!existing || isAfter(t.date, existing.date)) templates.set(key, t);
  }

  const existingByMonth = new Set(
    transactions.map((t) => {
      const key = `${t.type}:${t.categoryId ?? ""}:${t.description ?? ""}`;
      return `${key}:${t.date.getFullYear()}-${t.date.getMonth()}`;
    }),
  );

  const projected: TxLike[] = [];
  for (const [key, template] of templates) {
    let cursor = startOfMonth(from);
    const end = endOfMonth(to);
    while (!isAfter(cursor, end)) {
      const y = cursor.getFullYear();
      const m = cursor.getMonth();
      const day = clampDay(y, m, template.recurrenceDay!);
      const occDate = new Date(y, m, day);
      const monthKey = `${key}:${y}-${m}`;
      if (
        !isBefore(occDate, from) &&
        !isAfter(occDate, to) &&
        !existingByMonth.has(monthKey)
      ) {
        projected.push({
          ...template,
          id: `virtual:${template.id}:${y}-${m}`,
          date: occDate,
          status: "PLANNED",
        });
      }
      cursor = addMonths(cursor, 1);
    }
  }
  return projected;
}

export type MonthSummary = {
  monthStart: Date;
  monthEnd: Date;
  incomeActual: number;
  expenseActual: number;
  mandatoryActual: number;
  incomeExpectedRemaining: number;
  expenseExpectedRemaining: number;
  mandatoryExpectedRemaining: number;
  balanceNow: number;
  freeToSpend: number;
  safeDailyLimit: number;
  safeWeeklyLimit: number;
  daysLeftInMonth: number;
};

export function computeMonthSummary(opts: {
  today: Date;
  monthAnchor: Date;
  accountsInitialBalance: number;
  allDoneTransactions: TxLike[]; // ALL-TIME done transactions (for running balance)
  monthTransactions: TxLike[]; // this month's transactions (any status)
  creditsMonthlyTotal: number;
  creditsUpcomingBeforeMonthEnd: number;
}): MonthSummary {
  const {
    today,
    monthAnchor,
    accountsInitialBalance,
    allDoneTransactions,
    monthTransactions,
    creditsUpcomingBeforeMonthEnd,
  } = opts;

  const monthStart = startOfMonth(monthAnchor);
  const monthEnd = endOfMonth(monthAnchor);

  const balanceNow =
    accountsInitialBalance +
    allDoneTransactions.reduce(
      (sum, t) => sum + (t.type === "INCOME" ? t.amount : -t.amount),
      0,
    );

  const isCurrentMonth = isSameMonth(monthAnchor, today);
  const cutoff = isCurrentMonth ? today : monthEnd;

  const doneInMonth = monthTransactions.filter((t) => t.status === "DONE");
  const incomeActual = doneInMonth
    .filter((t) => t.type === "INCOME")
    .reduce((s, t) => s + t.amount, 0);
  const expenseActual = doneInMonth
    .filter((t) => t.type === "EXPENSE")
    .reduce((s, t) => s + t.amount, 0);
  const mandatoryActual = doneInMonth
    .filter((t) => t.type === "EXPENSE" && t.isMandatory)
    .reduce((s, t) => s + t.amount, 0);

  const projected = isCurrentMonth
    ? projectRecurringOccurrences(monthTransactions, today, monthEnd)
    : [];

  const remaining = [
    ...monthTransactions.filter(
      (t) => t.status !== "DONE" && !isBefore(t.date, cutoff) && !isAfter(t.date, monthEnd),
    ),
    ...projected,
  ];

  const incomeExpectedRemaining = remaining
    .filter((t) => t.type === "INCOME")
    .reduce((s, t) => s + t.amount, 0);
  const expenseExpectedRemaining = remaining
    .filter((t) => t.type === "EXPENSE")
    .reduce((s, t) => s + t.amount, 0);
  const mandatoryExpectedRemaining =
    remaining
      .filter((t) => t.type === "EXPENSE" && t.isMandatory)
      .reduce((s, t) => s + t.amount, 0) + creditsUpcomingBeforeMonthEnd;

  const daysLeftInMonth = Math.max(1, differenceInCalendarDays(monthEnd, cutoff) + 1);

  const freeToSpend =
    balanceNow + incomeExpectedRemaining - mandatoryExpectedRemaining;

  const safeDailyLimit = Math.max(0, freeToSpend) / daysLeftInMonth;
  const safeWeeklyLimit = safeDailyLimit * 7;

  return {
    monthStart,
    monthEnd,
    incomeActual,
    expenseActual,
    mandatoryActual,
    incomeExpectedRemaining,
    expenseExpectedRemaining,
    mandatoryExpectedRemaining,
    balanceNow,
    freeToSpend,
    safeDailyLimit,
    safeWeeklyLimit,
    daysLeftInMonth,
  };
}

export type TrafficLightStatus = "GREEN" | "YELLOW" | "RED";

export type TrafficLight = {
  status: TrafficLightStatus;
  reason: string;
};

export function computeTrafficLight(opts: {
  today: Date;
  summary: MonthSummary;
  nextIncomeDate: Date | null;
  mandatoryBeforeNextIncome: number;
  avgDailyExpenseLast3Months: number;
}): TrafficLight {
  const { today, summary, nextIncomeDate, mandatoryBeforeNextIncome, avgDailyExpenseLast3Months } = opts;

  const daysUntilNextIncome = nextIncomeDate
    ? Math.max(0, differenceInCalendarDays(nextIncomeDate, today))
    : null;

  const projectedAtNextIncome = summary.balanceNow - mandatoryBeforeNextIncome;

  if (projectedAtNextIncome < 0) {
    const deficit = Math.abs(Math.round(projectedAtNextIncome));
    const daysPart =
      daysUntilNextIncome !== null ? `До следующего дохода ${daysUntilNextIncome} дн. ` : "";
    return {
      status: "RED",
      reason: `${daysPart}Предстоящие обязательные платежи — ${Math.round(
        mandatoryBeforeNextIncome,
      ).toLocaleString("ru-RU")} ₸. При текущем балансе прогнозируется дефицит ${deficit.toLocaleString(
        "ru-RU",
      )} ₸.`,
    };
  }

  const lowBuffer = summary.safeDailyLimit < avgDailyExpenseLast3Months * 0.6;
  if (lowBuffer) {
    return {
      status: "YELLOW",
      reason: `Безопасный лимит трат сейчас ${Math.round(
        summary.safeDailyLimit,
      ).toLocaleString("ru-RU")} ₸/день — ниже вашего обычного расхода ${Math.round(
        avgDailyExpenseLast3Months,
      ).toLocaleString("ru-RU")} ₸/день. Стоит сократить необязательные траты.`,
    };
  }

  return {
    status: "GREEN",
    reason: `Обязательные платежи покрыты текущим балансом и ожидаемыми поступлениями. Безопасно тратить до ${Math.round(
      summary.safeDailyLimit,
    ).toLocaleString("ru-RU")} ₸/день.`,
  };
}

// ---------- Credits ----------

export function creditTotals(credits: CreditLike[]) {
  const active = credits.filter((c) => !c.isClosed);
  const totalBalance = active.reduce((s, c) => s + c.currentBalance, 0);
  const totalMonthly = active.reduce((s, c) => s + c.monthlyPayment, 0);
  // Simple approximation: remaining interest ≈ (payment * remainingPayments) - currentBalance.
  const approxRemainingInterest = active.reduce((s, c) => {
    const totalToBePaid = c.monthlyPayment * c.remainingPayments;
    return s + Math.max(0, totalToBePaid - c.currentBalance);
  }, 0);
  return { totalBalance, totalMonthly, approxRemainingInterest, activeCount: active.length };
}

export function nearestCreditPayment(credits: CreditLike[], today: Date) {
  const active = credits.filter((c) => !c.isClosed);
  if (active.length === 0) return null;
  const withDates = active.map((c) => ({ credit: c, date: nextOccurrence(today, c.paymentDay) }));
  withDates.sort((a, b) => a.date.getTime() - b.date.getTime());
  return withDates[0];
}

export function creditsDueBefore(credits: CreditLike[], today: Date, before: Date) {
  const active = credits.filter((c) => !c.isClosed);
  return active
    .map((c) => ({ credit: c, date: nextOccurrence(today, c.paymentDay) }))
    .filter((x) => !isAfter(x.date, before))
    .reduce((s, x) => s + x.credit.monthlyPayment, 0);
}

// ---------- Repayment strategy simulation ----------

export type StrategyResult = {
  months: number;
  totalInterestPaid: number;
  payoffOrder: string[];
};

function simulate(credits: CreditLike[], extraMonthly: number, order: "avalanche" | "snowball" | "baseline"): StrategyResult {
  type Sim = { id: string; name: string; balance: number; rate: number; minPayment: number; closedMonth: number | null };
  let sims: Sim[] = credits
    .filter((c) => !c.isClosed && c.currentBalance > 0)
    .map((c) => ({
      id: c.id,
      name: `${c.bank} · ${c.name}`,
      balance: c.currentBalance,
      rate: c.interestRate,
      minPayment: c.monthlyPayment,
      closedMonth: null,
    }));

  if (sims.length === 0) return { months: 0, totalInterestPaid: 0, payoffOrder: [] };

  const orderFn = (a: Sim, b: Sim) => {
    if (order === "avalanche") return b.rate - a.rate;
    if (order === "snowball") return a.balance - b.balance;
    return 0;
  };

  let totalInterest = 0;
  let month = 0;
  const payoffOrder: string[] = [];
  const MAX_MONTHS = 600;

  while (sims.some((s) => s.balance > 0.5) && month < MAX_MONTHS) {
    month++;
    // accrue interest
    for (const s of sims) {
      if (s.balance <= 0) continue;
      const interest = (s.balance * (s.rate / 100)) / 12;
      totalInterest += interest;
      s.balance += interest;
    }
    // minimum payments
    for (const s of sims) {
      if (s.balance <= 0) continue;
      const pay = Math.min(s.minPayment, s.balance);
      s.balance -= pay;
    }
    // extra payment directed by strategy order
    let extra = extraMonthly;
    const active = sims.filter((s) => s.balance > 0).sort(orderFn);
    for (const s of active) {
      if (extra <= 0) break;
      const pay = Math.min(extra, s.balance);
      s.balance -= pay;
      extra -= pay;
    }
    for (const s of sims) {
      if (s.balance <= 0.5 && s.closedMonth === null) {
        s.closedMonth = month;
        payoffOrder.push(s.name);
      }
    }
  }

  return { months: month, totalInterestPaid: totalInterest, payoffOrder };
}

export type StrategyComparison = {
  baseline: StrategyResult;
  avalanche: StrategyResult;
  snowball: StrategyResult;
  recommended: "avalanche" | "snowball";
  interestSavedVsBaseline: number;
  monthsSavedVsBaseline: number;
};

export function compareStrategies(credits: CreditLike[], extraMonthly: number): StrategyComparison {
  const baseline = simulate(credits, 0, "baseline");
  const avalanche = simulate(credits, extraMonthly, "avalanche");
  const snowball = simulate(credits, extraMonthly, "snowball");

  const recommended: "avalanche" | "snowball" =
    avalanche.totalInterestPaid <= snowball.totalInterestPaid ? "avalanche" : "snowball";

  return {
    baseline,
    avalanche,
    snowball,
    recommended,
    interestSavedVsBaseline: Math.max(
      0,
      baseline.totalInterestPaid - (recommended === "avalanche" ? avalanche.totalInterestPaid : snowball.totalInterestPaid),
    ),
    monthsSavedVsBaseline: Math.max(
      0,
      baseline.months - (recommended === "avalanche" ? avalanche.months : snowball.months),
    ),
  };
}

// ---------- Forecast ----------

export type ForecastPoint = {
  month: Date;
  income: number;
  expense: number;
  creditPayments: number;
  netChange: number;
  projectedBalance: number;
};

export function buildForecast(opts: {
  startBalance: number;
  monthsAhead: number;
  today: Date;
  avgMonthlyIncome: number;
  avgMonthlyExpense: number;
  creditsMonthlyTotal: number;
  contractExpectedPaymentsByMonth: Map<string, number>; // key: "yyyy-m"
}): ForecastPoint[] {
  const { startBalance, monthsAhead, today, avgMonthlyIncome, avgMonthlyExpense, creditsMonthlyTotal, contractExpectedPaymentsByMonth } = opts;
  const points: ForecastPoint[] = [];
  let balance = startBalance;
  for (let i = 0; i < monthsAhead; i++) {
    const month = addMonths(startOfMonth(today), i);
    const key = `${month.getFullYear()}-${month.getMonth()}`;
    const contractIncome = contractExpectedPaymentsByMonth.get(key) ?? 0;
    const income = avgMonthlyIncome + contractIncome;
    const expense = avgMonthlyExpense + creditsMonthlyTotal;
    const netChange = income - expense;
    balance += netChange;
    points.push({ month, income, expense, creditPayments: creditsMonthlyTotal, netChange, projectedBalance: balance });
  }
  return points;
}

export function daysOfMonthLeft(today: Date) {
  return getDaysInMonth(today) - getDate(today) + 1;
}
