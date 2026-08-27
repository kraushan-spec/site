import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { apiError } from "@/lib/api-helpers";
import { contractSchema } from "@/lib/validation";
import { logContractChanges, recomputeContractRisk } from "@/lib/contract-mutations";

async function loadOwned(id: string, householdId: string) {
  const contract = await prisma.contract.findUnique({ where: { id } });
  if (!contract || contract.householdId !== householdId) return null;
  return contract;
}

export async function GET(_req: Request, ctx: RouteContext<"/api/contracts/[id]">) {
  try {
    const user = await requireSessionUser();
    const { id } = await ctx.params;
    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        payments: { orderBy: { createdAt: "desc" } },
        acts: { orderBy: { createdAt: "desc" } },
        documents: { orderBy: { uploadedAt: "desc" } },
        changes: { orderBy: { changedAt: "desc" } },
        extractions: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!contract || contract.householdId !== user.householdId) {
      return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    }
    return NextResponse.json({ contract });
  } catch (err) {
    return apiError(err);
  }
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/contracts/[id]">) {
  try {
    const user = await requireSessionUser();
    const { id } = await ctx.params;
    const existing = await loadOwned(id, user.householdId);
    if (!existing) return NextResponse.json({ error: "Не найдено" }, { status: 404 });

    const body = await req.json();
    const { changeReason, ...rest } = body;
    const parsed = contractSchema.partial().parse(rest);

    const contract = await prisma.contract.update({ where: { id }, data: parsed });

    await logContractChanges(id, existing as unknown as Record<string, unknown>, parsed as Record<string, unknown>, {
      source: "MANUAL",
      reason: changeReason,
    });
    await recomputeContractRisk(id);

    const fresh = await prisma.contract.findUnique({ where: { id } });
    return NextResponse.json({ contract: fresh });
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/contracts/[id]">) {
  try {
    const user = await requireSessionUser();
    const { id } = await ctx.params;
    const existing = await loadOwned(id, user.householdId);
    if (!existing) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    await prisma.contract.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
