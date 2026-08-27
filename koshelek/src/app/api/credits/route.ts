import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { apiError } from "@/lib/api-helpers";
import { creditSchema } from "@/lib/validation";

export async function GET() {
  try {
    const user = await requireSessionUser();
    const credits = await prisma.credit.findMany({
      where: { householdId: user.householdId },
      orderBy: [{ isClosed: "asc" }, { currentBalance: "desc" }],
    });
    return NextResponse.json({ credits });
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireSessionUser();
    const body = await req.json();
    const parsed = creditSchema.parse(body);
    const credit = await prisma.credit.create({
      data: { householdId: user.householdId, ...parsed },
    });
    return NextResponse.json({ credit }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
