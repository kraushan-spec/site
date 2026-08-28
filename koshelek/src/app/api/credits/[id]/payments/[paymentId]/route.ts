import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { apiError } from "@/lib/api-helpers";

async function assertOwned(paymentId: string, householdId: string) {
  const payment = await prisma.creditPayment.findUnique({ where: { id: paymentId }, include: { credit: true } });
  if (!payment || payment.credit.householdId !== householdId) return null;
  return payment;
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/credits/[id]/payments/[paymentId]">) {
  try {
    const user = await requireSessionUser();
    const { paymentId } = await ctx.params;
    const existing = await assertOwned(paymentId, user.householdId);
    if (!existing) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    await prisma.creditPayment.delete({ where: { id: paymentId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
