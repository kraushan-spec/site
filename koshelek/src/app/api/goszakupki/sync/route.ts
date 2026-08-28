import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { apiError } from "@/lib/api-helpers";
import { fetchContractsByBin, getGoszakupkiConfig } from "@/lib/goszakupki";

export async function POST() {
  try {
    const user = await requireSessionUser();
    const config = await getGoszakupkiConfig(user.householdId);

    const integration = await prisma.apiIntegration.findFirst({
      where: { householdId: user.householdId, provider: "goszakupki" },
    });

    if (!config || !config.bin) {
      return NextResponse.json(
        {
          configured: false,
          error:
            "Интеграция с порталом госзакупок не настроена. Укажите БИН и токен в Настройках, либо добавьте договор вручную.",
        },
        { status: 200 },
      );
    }

    const result = await fetchContractsByBin(config, config.bin);

    if (integration) {
      await prisma.apiIntegration.update({
        where: { id: integration.id },
        data: { lastSyncAt: new Date(), lastSyncStatus: result.ok ? "success" : `error: ${result.error}` },
      });
    }

    if (!result.ok) {
      return NextResponse.json({ configured: true, error: result.error }, { status: 200 });
    }

    const existingContracts = await prisma.contract.findMany({
      where: { householdId: user.householdId },
      select: { announcementNumber: true, contractNumber: true },
    });
    const existingKeys = new Set(existingContracts.map((c) => `${c.announcementNumber ?? ""}:${c.contractNumber ?? ""}`));

    const candidates = result.contracts
      .filter((c) => !existingKeys.has(`${c.announcementNumber ?? ""}:${c.contractNumber ?? ""}`))
      .map((c) => ({
        announcementNumber: c.announcementNumber ?? null,
        contractNumber: c.contractNumber ?? null,
        title: c.title ?? "Договор (Госзакупки)",
        customer: c.customer ?? null,
        supplier: c.supplier ?? null,
        bin: c.bin ?? config.bin,
        amount: c.amount ?? 0,
        signDate: c.signDate ?? null,
        startDate: c.startDate ?? null,
        endDate: c.endDate ?? null,
        subject: c.subject ?? null,
        procurementMethod: c.procurementMethod ?? null,
      }));

    return NextResponse.json({ configured: true, candidates, totalFound: result.contracts.length });
  } catch (err) {
    return apiError(err);
  }
}
