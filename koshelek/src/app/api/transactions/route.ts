import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { apiError } from "@/lib/api-helpers";
import { transactionSchema } from "@/lib/validation";

export async function GET(req: Request) {
  try {
    const user = await requireSessionUser();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const transactions = await prisma.transaction.findMany({
      where: {
        householdId: user.householdId,
        ...(type ? { type: type as "INCOME" | "EXPENSE" } : {}),
        ...(from || to
          ? {
              date: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      include: { category: true, account: true },
      orderBy: { date: "desc" },
    });
    return NextResponse.json({ transactions });
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireSessionUser();
    const body = await req.json();
    const parsed = transactionSchema.parse(body);

    let accountId = parsed.accountId;
    if (!accountId) {
      const defaultAccount = await prisma.account.findFirst({
        where: { householdId: user.householdId },
        orderBy: { isDefault: "desc" },
      });
      accountId = defaultAccount?.id ?? null;
    }

    const tx = await prisma.transaction.create({
      data: {
        householdId: user.householdId,
        type: parsed.type,
        categoryId: parsed.categoryId || null,
        subcategory: parsed.subcategory || null,
        description: parsed.description || null,
        amount: parsed.amount,
        date: parsed.date,
        isMandatory: parsed.isMandatory ?? false,
        isRecurring: parsed.isRecurring ?? false,
        recurrenceDay: parsed.isRecurring ? parsed.recurrenceDay ?? parsed.date.getDate() : null,
        paymentMethod: parsed.paymentMethod || null,
        accountId,
        status: parsed.status ?? "DONE",
        source: "MANUAL",
        comment: parsed.comment || null,
      },
    });
    return NextResponse.json({ transaction: tx }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
