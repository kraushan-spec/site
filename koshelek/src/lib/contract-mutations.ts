import { prisma } from "@/lib/prisma";
import { assessContractRisk, contractTermProgress, stageExecutionPercent } from "@/lib/contracts";
import { sendPushToUsers } from "@/lib/push";
import type { DataSource } from "@prisma/client";

const TRACKED_FIELDS: { key: "title" | "amount" | "startDate" | "endDate" | "stage" | "customer" | "subject"; label: string }[] = [
  { key: "amount", label: "Сумма" },
  { key: "endDate", label: "Срок (дата окончания)" },
  { key: "startDate", label: "Дата начала" },
  { key: "stage", label: "Статус" },
  { key: "title", label: "Название" },
  { key: "customer", label: "Заказчик" },
  { key: "subject", label: "Предмет" },
];

function fmt(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (value instanceof Date) return value.toLocaleDateString("ru-RU");
  return String(value);
}

/**
 * Compares old vs new contract field values and logs an immutable
 * ContractChange row + notification for every tracked field that actually
 * changed. Never deletes or overwrites prior history.
 */
export async function logContractChanges(
  contractId: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  opts: { source?: DataSource; reason?: string } = {},
) {
  const changes: { field: string; oldValue: string; newValue: string }[] = [];
  for (const { key, label } of TRACKED_FIELDS) {
    const oldV = before[key];
    const newV = after[key];
    const oldTime = oldV instanceof Date ? oldV.getTime() : oldV;
    const newTime = newV instanceof Date ? newV.getTime() : newV;
    if (newV !== undefined && oldTime !== newTime) {
      changes.push({ field: label, oldValue: fmt(oldV), newValue: fmt(newV) });
    }
  }

  if (changes.length === 0) return [];

  const created = await Promise.all(
    changes.map((c) =>
      prisma.contractChange.create({
        data: {
          contractId,
          field: c.field,
          oldValue: c.oldValue,
          newValue: c.newValue,
          reason: opts.reason ?? null,
          impactOnDate: c.field.includes("Срок") || c.field.includes("начала") ? `${c.oldValue} → ${c.newValue}` : null,
          impactOnAmount: c.field === "Сумма" ? `${c.oldValue} → ${c.newValue}` : null,
          source: opts.source ?? "MANUAL",
        },
      }),
    ),
  );

  const contract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (contract) {
    const title = `Изменение в договоре №${contract.contractNumber ?? contract.id.slice(0, 6)}`;
    const body = changes.map((c) => `${c.field}: ${c.oldValue} → ${c.newValue}`).join("; ");
    await prisma.notification.create({
      data: {
        householdId: contract.householdId,
        type: "contract_change",
        title,
        body,
        relatedEntityType: "CONTRACT",
        relatedEntityId: contract.id,
      },
    });
    const members = await prisma.user.findMany({ where: { householdId: contract.householdId }, select: { id: true } });
    await sendPushToUsers(
      members.map((m) => m.id),
      { title, body, url: `/tenders/${contract.id}` },
    ).catch((e) => console.error("sendPushToUsers", e));
  }

  return created;
}

/** Recomputes and persists a contract's risk level based on term progress, stage and recent changes. */
export async function recomputeContractRisk(contractId: string) {
  const contract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!contract) return;

  const recentChange = await prisma.contractChange.findFirst({
    where: { contractId, changedAt: { gte: new Date(Date.now() - 7 * 86400000) } },
  });

  const progress = contractTermProgress(
    { startDate: contract.startDate, endDate: contract.endDate, stage: contract.stage, amount: contract.amount },
    new Date(),
  );
  const executionPct = stageExecutionPercent(contract.stage);
  const risk = assessContractRisk({
    progress,
    stage: contract.stage,
    executionPct,
    hasUnresolvedChange: !!recentChange,
  });

  // AI also factors in recent user comments (e.g. "поставка задерживается"),
  // but always names the source so it's never mistaken for official data.
  const RISK_KEYWORDS = /задерж|проблем|не успе|срыв|отказ|штраф|не оплат|просроч/i;
  const recentComment = await prisma.comment.findFirst({
    where: {
      householdId: contract.householdId,
      entityType: "CONTRACT",
      entityId: contractId,
      createdAt: { gte: new Date(Date.now() - 14 * 86400000) },
    },
    orderBy: { createdAt: "desc" },
  });

  let level = risk.level;
  let reason = risk.reason;
  if (recentComment && RISK_KEYWORDS.test(recentComment.text) && level === "LOW" && contract.stage !== "CLOSED") {
    level = "MEDIUM";
    reason = `Комментарий пользователя указывает на возможную проблему: «${recentComment.text.slice(0, 140)}». Источник: комментарий пользователя.`;
  }

  await prisma.contract.update({
    where: { id: contractId },
    data: { riskLevel: level, riskReason: reason },
  });
}
