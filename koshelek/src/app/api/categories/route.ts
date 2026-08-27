import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { apiError } from "@/lib/api-helpers";
import { z } from "zod";

export async function GET(req: Request) {
  try {
    const user = await requireSessionUser();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const categories = await prisma.category.findMany({
      where: {
        type: type ? (type as "INCOME" | "EXPENSE") : undefined,
        OR: [{ householdId: user.householdId }, { householdId: null }],
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ categories });
  } catch (err) {
    return apiError(err);
  }
}

const schema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  name: z.string().min(1),
  icon: z.string().optional().default("🔹"),
});

export async function POST(req: Request) {
  try {
    const user = await requireSessionUser();
    const body = await req.json();
    const parsed = schema.parse(body);
    const category = await prisma.category.create({
      data: { householdId: user.householdId, type: parsed.type, name: parsed.name, icon: parsed.icon },
    });
    return NextResponse.json({ category }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
