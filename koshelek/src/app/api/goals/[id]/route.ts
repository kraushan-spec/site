import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { apiError } from "@/lib/api-helpers";
import { goalSchema } from "@/lib/validation";

async function loadOwned(id: string, householdId: string) {
  const goal = await prisma.goal.findUnique({ where: { id } });
  if (!goal || goal.householdId !== householdId) return null;
  return goal;
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/goals/[id]">) {
  try {
    const user = await requireSessionUser();
    const { id } = await ctx.params;
    const existing = await loadOwned(id, user.householdId);
    if (!existing) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    const body = await req.json();
    const parsed = goalSchema.partial().parse(body);
    const goal = await prisma.goal.update({ where: { id }, data: parsed });
    return NextResponse.json({ goal });
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/goals/[id]">) {
  try {
    const user = await requireSessionUser();
    const { id } = await ctx.params;
    const existing = await loadOwned(id, user.householdId);
    if (!existing) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    await prisma.goal.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
