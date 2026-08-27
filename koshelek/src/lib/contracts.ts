import { differenceInCalendarDays } from "date-fns";

export type ContractLike = {
  startDate: Date | null;
  endDate: Date | null;
  stage: string;
  amount: number;
};

export function contractTermProgress(c: ContractLike, today: Date) {
  if (!c.startDate || !c.endDate) return null;
  const totalDays = Math.max(1, differenceInCalendarDays(c.endDate, c.startDate));
  const elapsedDays = Math.min(totalDays, Math.max(0, differenceInCalendarDays(today, c.startDate)));
  const remainingDays = Math.max(0, differenceInCalendarDays(c.endDate, today));
  const elapsedPct = Math.min(100, Math.round((elapsedDays / totalDays) * 100));
  const remainingPct = Math.max(0, 100 - elapsedPct);
  return { totalDays, elapsedDays, remainingDays, elapsedPct, remainingPct };
}

export const STAGE_LABELS: Record<string, string> = {
  WON: "Выигран тендер",
  SIGNED: "Договор заключён",
  ACTIVE: "Договор действует",
  PREPARATION: "Подготовка",
  DELIVERY: "Поставка/работы",
  ACT: "Акт",
  PAYMENT: "Оплата",
  EXECUTED: "Исполнен",
  CLOSED: "Закрыт",
  WARRANTY: "Гарантийный период",
};

export const STAGE_ORDER = [
  "WON",
  "SIGNED",
  "ACTIVE",
  "PREPARATION",
  "DELIVERY",
  "ACT",
  "PAYMENT",
  "EXECUTED",
  "WARRANTY",
  "CLOSED",
];

export function assessContractRisk(opts: {
  progress: { remainingDays: number; elapsedPct: number } | null;
  stage: string;
  executionPct: number; // 0-100, derived from stage order position as a proxy for "confirmed execution"
  hasUnresolvedChange: boolean;
}): { level: "LOW" | "MEDIUM" | "HIGH"; reason: string } {
  const { progress, stage, executionPct } = opts;

  if (stage === "CLOSED") return { level: "LOW", reason: "Договор закрыт." };

  if (progress && progress.remainingDays <= 7 && executionPct < 90 && stage !== "WARRANTY") {
    return {
      level: "HIGH",
      reason: `До окончания договора ${progress.remainingDays} дн., подтверждения полного исполнения нет.`,
    };
  }

  const elapsed = progress?.elapsedPct ?? 0;
  if (progress && elapsed - executionPct >= 25 && stage !== "WARRANTY") {
    return {
      level: "MEDIUM",
      reason: `Прошло ${elapsed}% срока договора, но исполнение подтверждено только на ${executionPct}%.`,
    };
  }

  if (opts.hasUnresolvedChange) {
    return { level: "MEDIUM", reason: "Есть недавнее изменение договора, требующее внимания." };
  }

  return { level: "LOW", reason: "Договор исполняется по графику." };
}

export function stageExecutionPercent(stage: string) {
  const idx = STAGE_ORDER.indexOf(stage);
  if (idx < 0) return 0;
  return Math.round((idx / (STAGE_ORDER.length - 1)) * 100);
}
