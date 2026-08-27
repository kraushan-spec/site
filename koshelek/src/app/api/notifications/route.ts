import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { apiError } from "@/lib/api-helpers";

export async function GET() {
  try {
    const user = await requireSessionUser();
    const notifications = await prisma.notification.findMany({
      where: { householdId: user.householdId },
      orderBy: [{ isRead: "asc" }, { createdAt: "desc" }],
      take: 100,
    });
    return NextResponse.json({ notifications });
  } catch (err) {
    return apiError(err);
  }
}
