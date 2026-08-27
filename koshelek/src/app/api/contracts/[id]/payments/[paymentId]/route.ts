import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { apiError } from "@/lib/api-helpers";
import { z } from "zod";

const schema = z.object({
  amount: z.coerce.number().positive().optional(),
  expectedDate: z.coerce.date().optional().nullable(),
  receivedDate: z.coerce.date().optional().nullable(),
  status: z.enum(["EXPECTED", "RECEIVED", "OVERDUE"]).optional(),
  comment: z.string().optional().nullable(),
});

async function assertOwned(paymentId: string, householdId: string) {
  const payment = await prisma.contractPayment.findUnique({ where: { id: paymentId }, include: { contract: true } });
  if (!payment || payment.contract.householdId !== householdId) return null;
  return payment;
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/contracts/[id]/payments/[paymentId]">) {
  try {
    const user = await requireSessionUser();
    const { paymentId } = await ctx.params;
    const existing = await assertOwned(paymentId, user.householdId);
    if (!existing) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    const body = await req.json();
    const parsed = schema.parse(body);
    const payment = await prisma.contractPayment.update({ where: { id: paymentId }, data: parsed });
    return NextResponse.json({ payment });
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/contracts/[id]/payments/[paymentId]">) {
  try {
    const user = await requireSessionUser();
    const { paymentId } = await ctx.params;
    const existing = await assertOwned(paymentId, user.householdId);
    if (!existing) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    await prisma.contractPayment.delete({ where: { id: paymentId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
