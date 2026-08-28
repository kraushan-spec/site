import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { apiError } from "@/lib/api-helpers";
import { contractSchema } from "@/lib/validation";
import { recomputeContractRisk } from "@/lib/contract-mutations";

export async function GET(req: Request) {
  try {
    const user = await requireSessionUser();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // active | closed | attention | ending7 | ending30 | all

    const contracts = await prisma.contract.findMany({
      where: { householdId: user.householdId },
      include: {
        payments: true,
        acts: true,
        _count: { select: { documents: true, changes: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    const today = new Date();
    const filtered = contracts.filter((c) => {
      if (!status || status === "all") return true;
      if (status === "active") return c.stage !== "CLOSED";
      if (status === "closed") return c.stage === "CLOSED";
      if (status === "attention") return c.riskLevel === "HIGH" || c.riskLevel === "MEDIUM";
      if (status === "ending7" || status === "ending30") {
        if (!c.endDate) return false;
        const days = Math.ceil((c.endDate.getTime() - today.getTime()) / 86400000);
        return days >= 0 && days <= (status === "ending7" ? 7 : 30);
      }
      return true;
    });

    return NextResponse.json({ contracts: filtered });
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireSessionUser();
    const body = await req.json();
    const parsed = contractSchema.parse(body);
    const contract = await prisma.contract.create({
      data: { householdId: user.householdId, ...parsed, source: "MANUAL" },
    });
    await recomputeContractRisk(contract.id);
    const fresh = await prisma.contract.findUnique({ where: { id: contract.id } });
    return NextResponse.json({ contract: fresh }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
