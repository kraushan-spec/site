import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { apiError } from "@/lib/api-helpers";
import { creditSchema } from "@/lib/validation";
import { z } from "zod";

async function loadOwned(id: string, householdId: string) {
  const credit = await prisma.credit.findUnique({ where: { id } });
  if (!credit || credit.householdId !== householdId) return null;
  return credit;
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/credits/[id]">) {
  try {
    const user = await requireSessionUser();
    const { id } = await ctx.params;
    const existing = await loadOwned(id, user.householdId);
    if (!existing) return NextResponse.json({ error: "Не найдено" }, { status: 404 });

    const body = await req.json();
    const parsed = creditSchema.partial().extend({ isClosed: z.boolean().optional() }).parse(body);

    const credit = await prisma.credit.update({ where: { id }, data: parsed });
    return NextResponse.json({ credit });
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/credits/[id]">) {
  try {
    const user = await requireSessionUser();
    const { id } = await ctx.params;
    const existing = await loadOwned(id, user.householdId);
    if (!existing) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    await prisma.credit.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
