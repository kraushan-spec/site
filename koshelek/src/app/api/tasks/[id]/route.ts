import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { apiError } from "@/lib/api-helpers";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  priority: z.enum(["TODAY", "WEEK", "LATER"]).optional(),
  isDone: z.boolean().optional(),
});

async function loadOwned(id: string, householdId: string) {
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task || task.householdId !== householdId) return null;
  return task;
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/tasks/[id]">) {
  try {
    const user = await requireSessionUser();
    const { id } = await ctx.params;
    const existing = await loadOwned(id, user.householdId);
    if (!existing) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    const body = await req.json();
    const parsed = schema.parse(body);
    const task = await prisma.task.update({ where: { id }, data: parsed });
    return NextResponse.json({ task });
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/tasks/[id]">) {
  try {
    const user = await requireSessionUser();
    const { id } = await ctx.params;
    const existing = await loadOwned(id, user.householdId);
    if (!existing) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    await prisma.task.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
