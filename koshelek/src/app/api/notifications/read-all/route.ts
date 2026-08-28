import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { apiError } from "@/lib/api-helpers";

export async function POST() {
  try {
    const user = await requireSessionUser();
    await prisma.notification.updateMany({ where: { householdId: user.householdId, isRead: false }, data: { isRead: true } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
