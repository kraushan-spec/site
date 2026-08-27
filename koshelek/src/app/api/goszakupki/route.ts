import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { apiError } from "@/lib/api-helpers";
import { encryptSecret, maskSecret } from "@/lib/crypto";
import { z } from "zod";

export async function GET() {
  try {
    const user = await requireSessionUser();
    const integration = await prisma.apiIntegration.findFirst({
      where: { householdId: user.householdId, provider: "goszakupki" },
    });
    const envConfigured = Boolean(process.env.GOSZAKUPKI_API_TOKEN);
    return NextResponse.json({
      configured: Boolean(integration?.isActive && integration.tokenEncrypted) || envConfigured,
      bin: integration?.bin ?? null,
      lastSyncAt: integration?.lastSyncAt ?? null,
      lastSyncStatus: integration?.lastSyncStatus ?? null,
      viaEnv: envConfigured,
    });
  } catch (err) {
    return apiError(err);
  }
}

const schema = z.object({ bin: z.string().min(1), token: z.string().min(1) });

export async function POST(req: Request) {
  try {
    const user = await requireSessionUser();
    const body = await req.json();
    const parsed = schema.parse(body);

    const existing = await prisma.apiIntegration.findFirst({
      where: { householdId: user.householdId, provider: "goszakupki" },
    });
    const data = {
      bin: parsed.bin,
      tokenEncrypted: encryptSecret(parsed.token),
      isActive: true,
    };
    const integration = existing
      ? await prisma.apiIntegration.update({ where: { id: existing.id }, data })
      : await prisma.apiIntegration.create({ data: { householdId: user.householdId, provider: "goszakupki", ...data } });

    return NextResponse.json({ ok: true, bin: integration.bin, tokenPreview: maskSecret(parsed.token) });
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE() {
  try {
    const user = await requireSessionUser();
    await prisma.apiIntegration.updateMany({
      where: { householdId: user.householdId, provider: "goszakupki" },
      data: { isActive: false },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
