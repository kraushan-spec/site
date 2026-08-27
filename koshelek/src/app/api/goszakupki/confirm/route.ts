import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { apiError } from "@/lib/api-helpers";
import { contractSchema } from "@/lib/validation";
import { recomputeContractRisk } from "@/lib/contract-mutations";

export async function POST(req: Request) {
  try {
    const user = await requireSessionUser();
    const body = await req.json();
    const parsed = contractSchema.parse(body);
    const contract = await prisma.contract.create({
      data: { householdId: user.householdId, ...parsed, source: "API" },
    });
    await recomputeContractRisk(contract.id);
    const fresh = await prisma.contract.findUnique({ where: { id: contract.id } });
    return NextResponse.json({ contract: fresh }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
