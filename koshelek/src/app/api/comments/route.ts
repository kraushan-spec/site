import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { apiError } from "@/lib/api-helpers";
import { commentSchema } from "@/lib/validation";
import { recomputeContractRisk } from "@/lib/contract-mutations";

export async function GET(req: Request) {
  try {
    const user = await requireSessionUser();
    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    if (!entityType || !entityId) {
      return NextResponse.json({ error: "entityType и entityId обязательны" }, { status: 400 });
    }
    const comments = await prisma.comment.findMany({
      where: { householdId: user.householdId, entityType: entityType as never, entityId },
      include: { author: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ comments });
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireSessionUser();
    const body = await req.json();
    const parsed = commentSchema.parse(body);
    const comment = await prisma.comment.create({
      data: {
        householdId: user.householdId,
        entityType: parsed.entityType,
        entityId: parsed.entityId,
        authorId: user.id,
        text: parsed.text,
      },
      include: { author: { select: { name: true } } },
    });
    if (parsed.entityType === "CONTRACT") {
      await recomputeContractRisk(parsed.entityId).catch((e) => console.error("recomputeContractRisk", e));
    }
    return NextResponse.json({ comment }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
