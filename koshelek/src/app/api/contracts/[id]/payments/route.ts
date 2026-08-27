import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { apiError } from "@/lib/api-helpers";
import { z } from "zod";

const schema = z.object({
  amount: z.coerce.number().positive(),
  expectedDate: z.coerce.date().optional().nullable(),
  receivedDate: z.coerce.date().optional().nullable(),
  status: z.enum(["EXPECTED", "RECEIVED", "OVERDUE"]).optional().default("EXPECTED"),
  comment: z.string().optional().nullable(),
});

async function assertOwned(contractId: string, householdId: string) {
  const contract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!contract || contract.householdId !== householdId) return null;
  return contract;
}

export async function POST(req: Request, ctx: RouteContext<"/api/contracts/[id]/payments">) {
  try {
    const user = await requireSessionUser();
    const { id } = await ctx.params;
    const contract = await assertOwned(id, user.householdId);
    if (!contract) return NextResponse.json({ error: "Не найдено" }, { status: 404 });

    const body = await req.json();
    const parsed = schema.parse(body);
    const payment = await prisma.contractPayment.create({
      data: { contractId: id, ...parsed, source: "MANUAL" },
    });
    return NextResponse.json({ payment }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
