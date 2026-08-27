import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { apiError } from "@/lib/api-helpers";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { extractTextFromDocument } from "@/lib/contract-ai";

const UPLOAD_ROOT = path.join(process.cwd(), "storage", "uploads");
const MAX_SIZE = 20 * 1024 * 1024;

async function assertOwned(contractId: string, householdId: string) {
  const contract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!contract || contract.householdId !== householdId) return null;
  return contract;
}

export async function POST(req: Request, ctx: RouteContext<"/api/contracts/[id]/documents">) {
  try {
    const user = await requireSessionUser();
    const { id } = await ctx.params;
    const contract = await assertOwned(id, user.householdId);
    if (!contract) return NextResponse.json({ error: "Не найдено" }, { status: 404 });

    const form = await req.formData();
    const file = form.get("file");
    const docType = String(form.get("docType") || "contract");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Файл не передан" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Файл слишком большой (максимум 20 МБ)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const dir = path.join(UPLOAD_ROOT, id);
    await mkdir(dir, { recursive: true });
    const storedName = `${randomUUID()}-${file.name.replace(/[^a-zA-Zа-яА-Я0-9._-]/g, "_")}`;
    const storedPath = path.join(dir, storedName);
    await writeFile(storedPath, buffer);

    const extractedText = await extractTextFromDocument(buffer, file.type, file.name);

    const doc = await prisma.contractDocument.create({
      data: {
        contractId: id,
        filename: file.name,
        docType,
        storedPath: path.join(id, storedName),
        mimeType: file.type || null,
        size: file.size,
        extractedText: extractedText || null,
      },
    });

    return NextResponse.json({ document: doc }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}

export async function GET(_req: Request, ctx: RouteContext<"/api/contracts/[id]/documents">) {
  try {
    const user = await requireSessionUser();
    const { id } = await ctx.params;
    const contract = await assertOwned(id, user.householdId);
    if (!contract) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    const documents = await prisma.contractDocument.findMany({ where: { contractId: id }, orderBy: { uploadedAt: "desc" } });
    return NextResponse.json({ documents });
  } catch (err) {
    return apiError(err);
  }
}
