import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { apiError } from "@/lib/api-helpers";
import { transactionSchema } from "@/lib/validation";

async function loadOwned(id: string, householdId: string) {
  const tx = await prisma.transaction.findUnique({ where: { id } });
  if (!tx || tx.householdId !== householdId) return null;
  return tx;
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/transactions/[id]">) {
  try {
    const user = await requireSessionUser();
    const { id } = await ctx.params;
    const existing = await loadOwned(id, user.householdId);
    if (!existing) return NextResponse.json({ error: "Не найдено" }, { status: 404 });

    const body = await req.json();
    const parsed = transactionSchema.partial().parse(body);

    const tx = await prisma.transaction.update({
      where: { id },
      data: {
        ...(parsed.type ? { type: parsed.type } : {}),
        ...(parsed.categoryId !== undefined ? { categoryId: parsed.categoryId || null } : {}),
        ...(parsed.subcategory !== undefined ? { subcategory: parsed.subcategory || null } : {}),
        ...(parsed.description !== undefined ? { description: parsed.description || null } : {}),
        ...(parsed.amount !== undefined ? { amount: parsed.amount } : {}),
        ...(parsed.date !== undefined ? { date: parsed.date } : {}),
        ...(parsed.isMandatory !== undefined ? { isMandatory: parsed.isMandatory } : {}),
        ...(parsed.isRecurring !== undefined ? { isRecurring: parsed.isRecurring } : {}),
        ...(parsed.recurrenceDay !== undefined ? { recurrenceDay: parsed.recurrenceDay } : {}),
        ...(parsed.paymentMethod !== undefined ? { paymentMethod: parsed.paymentMethod || null } : {}),
        ...(parsed.accountId !== undefined ? { accountId: parsed.accountId || null } : {}),
        ...(parsed.status !== undefined ? { status: parsed.status } : {}),
        ...(parsed.comment !== undefined ? { comment: parsed.comment || null } : {}),
      },
    });
    return NextResponse.json({ transaction: tx });
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/transactions/[id]">) {
  try {
    const user = await requireSessionUser();
    const { id } = await ctx.params;
    const existing = await loadOwned(id, user.householdId);
    if (!existing) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    await prisma.transaction.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
