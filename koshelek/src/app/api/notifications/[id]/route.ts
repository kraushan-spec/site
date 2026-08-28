import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { apiError } from "@/lib/api-helpers";

export async function PATCH(req: Request, ctx: RouteContext<"/api/notifications/[id]">) {
  try {
    const user = await requireSessionUser();
    const { id } = await ctx.params;
    const existing = await prisma.notification.findUnique({ where: { id } });
    if (!existing || existing.householdId !== user.householdId) {
      return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    }
    const body = await req.json().catch(() => ({}));
    const notification = await prisma.notification.update({
      where: { id },
      data: { isRead: body.isRead ?? true },
    });
    return NextResponse.json({ notification });
  } catch (err) {
    return apiError(err);
  }
}
