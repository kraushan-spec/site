import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { apiError } from "@/lib/api-helpers";
import { getCalendarEvents } from "@/lib/calendar";
import { endOfMonth, startOfMonth } from "date-fns";

export async function GET(req: Request) {
  try {
    const user = await requireSessionUser();
    const { searchParams } = new URL(req.url);
    const monthParam = searchParams.get("month"); // YYYY-MM
    const anchor = monthParam ? new Date(`${monthParam}-01T00:00:00`) : new Date();
    const rangeStart = startOfMonth(anchor);
    const rangeEnd = endOfMonth(anchor);

    const [events, accounts, doneBeforeRange] = await Promise.all([
      getCalendarEvents(user.householdId, rangeStart, rangeEnd),
      prisma.account.findMany({ where: { householdId: user.householdId } }),
      prisma.transaction.findMany({
        where: { householdId: user.householdId, status: "DONE", date: { lt: rangeStart } },
      }),
    ]);

    const startBalance =
      accounts.reduce((s, a) => s + a.initialBalance, 0) +
      doneBeforeRange.reduce((s, t) => s + (t.type === "INCOME" ? t.amount : -t.amount), 0);

    let running = startBalance;
    const eventsWithBalance = events.map((e) => {
      if (e.type === "income" || e.type === "contract") running += e.amount ?? 0;
      else if (e.type === "expense" || e.type === "mandatory" || e.type === "credit") running -= e.amount ?? 0;
      return { ...e, balanceAfter: running };
    });

    return NextResponse.json({ events: eventsWithBalance, startBalance, endBalance: running });
  } catch (err) {
    return apiError(err);
  }
}
