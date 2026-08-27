import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { apiError } from "@/lib/api-helpers";

export async function GET() {
  try {
    const user = await requireSessionUser();
    const documents = await prisma.contractDocument.findMany({
      where: { contract: { householdId: user.householdId } },
      include: { contract: { select: { id: true, title: true, contractNumber: true } } },
      orderBy: { uploadedAt: "desc" },
    });
    return NextResponse.json({ documents });
  } catch (err) {
    return apiError(err);
  }
}
