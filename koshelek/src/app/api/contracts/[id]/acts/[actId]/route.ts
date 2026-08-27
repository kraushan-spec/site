import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { apiError } from "@/lib/api-helpers";
import { z } from "zod";

const schema = z.object({
  number: z.string().optional().nullable(),
  amount: z.coerce.number().optional().nullable(),
  date: z.coerce.date().optional().nullable(),
  status: z.enum(["CREATED", "SENT", "APPROVED", "PAID", "OVERDUE"]).optional(),
  penalty: z.coerce.number().optional().nullable(),
  comment: z.string().optional().nullable(),
});

async function assertOwned(actId: string, householdId: string) {
  const act = await prisma.contractAct.findUnique({ where: { id: actId }, include: { contract: true } });
  if (!act || act.contract.householdId !== householdId) return null;
  return act;
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/contracts/[id]/acts/[actId]">) {
  try {
    const user = await requireSessionUser();
    const { actId } = await ctx.params;
    const existing = await assertOwned(actId, user.householdId);
    if (!existing) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    const body = await req.json();
    const parsed = schema.parse(body);
    const act = await prisma.contractAct.update({ where: { id: actId }, data: parsed });
    return NextResponse.json({ act });
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/contracts/[id]/acts/[actId]">) {
  try {
    const user = await requireSessionUser();
    const { actId } = await ctx.params;
    const existing = await assertOwned(actId, user.householdId);
    if (!existing) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    await prisma.contractAct.delete({ where: { id: actId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
