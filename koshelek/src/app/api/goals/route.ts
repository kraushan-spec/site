import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { apiError } from "@/lib/api-helpers";
import { goalSchema } from "@/lib/validation";

export async function GET() {
  try {
    const user = await requireSessionUser();
    const goals = await prisma.goal.findMany({ where: { householdId: user.householdId }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ goals });
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireSessionUser();
    const body = await req.json();
    const parsed = goalSchema.parse(body);
    const goal = await prisma.goal.create({
      data: { householdId: user.householdId, ...parsed, savedAmount: parsed.savedAmount ?? 0 },
    });
    return NextResponse.json({ goal }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
