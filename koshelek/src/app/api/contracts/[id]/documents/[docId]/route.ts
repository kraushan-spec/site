import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { apiError } from "@/lib/api-helpers";
import { readFile, unlink } from "node:fs/promises";
import path from "node:path";

const UPLOAD_ROOT = path.join(process.cwd(), "storage", "uploads");

async function assertOwned(docId: string, householdId: string) {
  const doc = await prisma.contractDocument.findUnique({ where: { id: docId }, include: { contract: true } });
  if (!doc || doc.contract.householdId !== householdId) return null;
  return doc;
}

export async function GET(_req: Request, ctx: RouteContext<"/api/contracts/[id]/documents/[docId]">) {
  try {
    const user = await requireSessionUser();
    const { docId } = await ctx.params;
    const doc = await assertOwned(docId, user.householdId);
    if (!doc) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    const buffer = await readFile(path.join(UPLOAD_ROOT, doc.storedPath));
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": doc.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(doc.filename)}"`,
      },
    });
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/contracts/[id]/documents/[docId]">) {
  try {
    const user = await requireSessionUser();
    const { docId } = await ctx.params;
    const doc = await assertOwned(docId, user.householdId);
    if (!doc) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    await unlink(path.join(UPLOAD_ROOT, doc.storedPath)).catch(() => {});
    await prisma.contractDocument.delete({ where: { id: docId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
