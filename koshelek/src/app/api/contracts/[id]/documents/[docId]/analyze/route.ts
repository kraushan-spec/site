import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { apiError } from "@/lib/api-helpers";
import { analyzeContractText } from "@/lib/contract-ai";

async function assertOwned(docId: string, householdId: string) {
  const doc = await prisma.contractDocument.findUnique({ where: { id: docId }, include: { contract: true } });
  if (!doc || doc.contract.householdId !== householdId) return null;
  return doc;
}

export async function POST(_req: Request, ctx: RouteContext<"/api/contracts/[id]/documents/[docId]/analyze">) {
  try {
    const user = await requireSessionUser();
    const { docId, id } = await ctx.params;
    const doc = await assertOwned(docId, user.householdId);
    if (!doc) return NextResponse.json({ error: "Не найдено" }, { status: 404 });

    if (!doc.extractedText) {
      return NextResponse.json(
        { error: "Не удалось извлечь текст из этого файла. Загрузите PDF, DOCX или TXT, либо внесите данные вручную." },
        { status: 422 },
      );
    }

    const { fields, usedAi } = await analyzeContractText(doc.extractedText);

    await prisma.contractExtraction.deleteMany({ where: { documentId: docId } });
    const created = await prisma.$transaction(
      fields.map((f) =>
        prisma.contractExtraction.create({
          data: {
            contractId: id,
            documentId: docId,
            field: f.field,
            value: f.value,
            requiresAttention: f.requiresAttention,
          },
        }),
      ),
    );

    return NextResponse.json({ extractions: created, usedAi, count: created.length });
  } catch (err) {
    return apiError(err);
  }
}
