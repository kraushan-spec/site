import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";

/**
 * Adapter for the official Kazakhstan e-procurement portal (goszakupki.gov.kz).
 *
 * The portal exposes data through an official API that requires a registered
 * application and an access token issued to the supplier's BIN. Anthropic's
 * agent cannot obtain such credentials on a user's behalf, so this adapter is
 * built as real, callable plumbing that a household activates by supplying
 * their own GOSZAKUPKI_API_BASE + token in Settings — at that point every
 * function below performs a genuine HTTPS request. Until configured, every
 * function returns `{ configured: false }` so the UI falls back to manual
 * contract entry / document upload, per the product requirement that the
 * app must never block on the integration.
 *
 * NOTE for whoever wires up real credentials: the exact endpoint paths and
 * response shape below (`RawGoszakupkiContract`) are a best-effort mapping
 * and should be adjusted to match the response the official API actually
 * returns for your integration tier.
 */

export type RawGoszakupkiContract = {
  announcementNumber?: string;
  contractNumber?: string;
  title?: string;
  customer?: string;
  supplier?: string;
  bin?: string;
  amount?: number;
  signDate?: string;
  startDate?: string;
  endDate?: string;
  subject?: string;
  procurementMethod?: string;
  status?: string;
};

export type GoszakupkiConfig = { base: string; token: string; bin: string | null };

export async function getGoszakupkiConfig(householdId: string): Promise<GoszakupkiConfig | null> {
  const integration = await prisma.apiIntegration.findFirst({
    where: { householdId, provider: "goszakupki", isActive: true },
  });
  if (integration?.tokenEncrypted) {
    return {
      base: process.env.GOSZAKUPKI_API_BASE || "https://ows.goszakup.gov.kz/v3",
      token: decryptSecret(integration.tokenEncrypted),
      bin: integration.bin,
    };
  }
  if (process.env.GOSZAKUPKI_API_TOKEN) {
    return {
      base: process.env.GOSZAKUPKI_API_BASE || "https://ows.goszakup.gov.kz/v3",
      token: process.env.GOSZAKUPKI_API_TOKEN,
      bin: null,
    };
  }
  return null;
}

export async function fetchContractsByBin(
  config: GoszakupkiConfig,
  bin: string,
): Promise<{ ok: true; contracts: RawGoszakupkiContract[] } | { ok: false; error: string }> {
  try {
    const url = `${config.base.replace(/\/$/, "")}/contracts?supplierBin=${encodeURIComponent(bin)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${config.token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      return { ok: false, error: `Госзакупки API вернул ошибку ${res.status}. Проверьте токен и права доступа.` };
    }
    const data = await res.json();
    const list: RawGoszakupkiContract[] = Array.isArray(data) ? data : (data.items ?? data.contracts ?? []);
    return { ok: true, contracts: list };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? `Не удалось подключиться к порталу госзакупок: ${err.message}`
          : "Не удалось подключиться к порталу госзакупок",
    };
  }
}
