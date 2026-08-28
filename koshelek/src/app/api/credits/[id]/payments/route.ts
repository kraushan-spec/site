import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { apiError } from "@/lib/api-helpers";
import { z } from "zod";

const schema = z.object({
  amount: z.coerce.number().positive(),
  paidDate: z.coerce.date(),
  comment: z.string().optional().nullable(),
});

async function assertOwned(creditId: string, householdId: string) {
  const credit = await prisma.credit.findUnique({ where: { id: creditId } });
  if (!credit || credit.householdId !== householdId) return null;
  return credit;
}

export async function GET(_req: Request, ctx: RouteContext<"/api/credits/[id]/payments">) {
  try {
    const user = await requireSessionUser();
    const { id } = await ctx.params;
    const credit = await assertOwned(id, user.householdId);
    if (!credit) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    const payments = await prisma.creditPayment.findMany({ where: { creditId: id }, orderBy: { paidDate: "desc" } });
    return NextResponse.json({ payments });
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: Request, ctx: RouteContext<"/api/credits/[id]/payments">) {
  try {
    const user = await requireSessionUser();
    const { id } = await ctx.params;
    const credit = await assertOwned(id, user.householdId);
    if (!credit) return NextResponse.json({ error: "Не найдено" }, { status: 404 });

    const body = await req.json();
    const parsed = schema.parse(body);
    const payment = await prisma.creditPayment.create({
      data: { creditId: id, ...parsed, source: "MANUAL" },
    });
    return NextResponse.json({ payment }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
