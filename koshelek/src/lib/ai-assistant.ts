import { prisma } from "@/lib/prisma";
import { getDashboardData } from "@/lib/dashboard-data";
import { compareStrategies } from "@/lib/finance";
import { formatTenge } from "@/lib/format";
import { STAGE_LABELS } from "@/lib/contracts";

async function buildSnapshot(householdId: string) {
  const dashboard = await getDashboardData(householdId, new Date());
  const credits = await prisma.credit.findMany({ where: { householdId, isClosed: false } });
  const contracts = await prisma.contract.findMany({ where: { householdId, stage: { not: "CLOSED" } } });
  const recentChanges = await prisma.contractChange.findMany({
    where: { contract: { householdId }, changedAt: { gte: new Date(Date.now() - 7 * 86400000) } },
    include: { contract: true },
    orderBy: { changedAt: "desc" },
    take: 15,
  });
  const expectedPayments = await prisma.contractPayment.findMany({
    where: { contract: { householdId }, status: { not: "RECEIVED" } },
    include: { contract: true },
    orderBy: { expectedDate: "asc" },
    take: 15,
  });

  return { dashboard, credits, contracts, recentChanges, expectedPayments };
}

type Snapshot = Awaited<ReturnType<typeof buildSnapshot>>;

function ruleBasedAnswer(question: string, snap: Snapshot): string {
  const q = question.toLowerCase();

  if (/потрат|лимит/.test(q) && /сегодня|день/.test(q)) {
    return `Сегодня безопасно потратить примерно ${formatTenge(snap.dashboard.summary.safeDailyLimit)} — это лимит с учётом текущего баланса, ожидаемых поступлений и обязательных платежей до конца месяца. На неделю — примерно ${formatTenge(snap.dashboard.summary.safeWeeklyLimit)}.`;
  }

  if (/кредит/.test(q) && /(первым|сначала|лучше|выгодн)/.test(q)) {
    if (snap.credits.length === 0) return "У вас пока нет активных кредитов.";
    const result = compareStrategies(snap.credits, 50000);
    const first = result.avalanche.payoffOrder[0] ?? snap.credits[0].name;
    return `Выгоднее всего гасить в первую очередь кредит с максимальной ставкой: «${first}». Если направлять дополнительно 50 000 ₸/мес по этой стратегии, вы сэкономите около ${formatTenge(result.interestSavedVsBaseline)} на процентах и закроете кредиты примерно на ${result.monthsSavedVsBaseline} мес. раньше. Подробный расчёт — в разделе «Кредиты».`;
  }

  if (/не хватае|дефицит|нехватк/.test(q)) {
    return `${snap.dashboard.trafficLight.reason} Проверьте раздел «Главная» — там показан финансовый светофор с деталями.`;
  }

  if (/сократ|эконом/.test(q)) {
    if (snap.dashboard.savings.opportunities.length === 0) {
      return "Явных перерасходов по категориям сейчас не видно — расходы стабильны по сравнению со средним за 3 месяца.";
    }
    const list = snap.dashboard.savings.opportunities
      .map((o) => `${o.name}: ${formatTenge(o.current)} → рекомендуется ${formatTenge(o.recommended)} (экономия ${formatTenge(o.savings)})`)
      .join("; ");
    return `Потенциальная экономия в месяц: ${formatTenge(snap.dashboard.savings.totalPotential)}. Основные категории: ${list}.`;
  }

  if (/договор|тендер/.test(q) && /внимани|риск/.test(q)) {
    const attention = snap.contracts.filter((c) => c.riskLevel !== "LOW");
    if (attention.length === 0) return "Сейчас нет договоров, требующих особого внимания.";
    return attention
      .map((c) => `Договор №${c.contractNumber ?? c.id.slice(0, 6)} («${c.title}»): ${c.riskReason ?? "требует проверки"}`)
      .join("\n");
  }

  if (/оплат/.test(q) && /ожида/.test(q)) {
    if (snap.expectedPayments.length === 0) return "Ожидаемых оплат по договорам не найдено.";
    return snap.expectedPayments
      .map(
        (p) =>
          `Договор №${p.contract.contractNumber ?? p.contract.id.slice(0, 6)}: ${formatTenge(p.amount)}${p.expectedDate ? ` до ${p.expectedDate.toLocaleDateString("ru-RU")}` : ""}`,
      )
      .join("\n");
  }

  if (/измен/.test(q) && /договор/.test(q)) {
    if (snap.recentChanges.length === 0) return "За последнюю неделю изменений в договорах не зафиксировано.";
    return snap.recentChanges
      .map(
        (c) =>
          `Договор №${c.contract.contractNumber ?? c.contract.id.slice(0, 6)}: ${c.field} изменилось с «${c.oldValue}» на «${c.newValue}» (${c.changedAt.toLocaleDateString("ru-RU")})`,
      )
      .join("\n");
  }

  if (/баланс|сколько.*денег|сколько.*у меня/.test(q)) {
    return `Текущий баланс: ${formatTenge(snap.dashboard.summary.balanceNow)}. Ожидаемые поступления до конца месяца: ${formatTenge(snap.dashboard.summary.incomeExpectedRemaining)}. Обязательные платежи до конца месяца: ${formatTenge(snap.dashboard.summary.mandatoryExpectedRemaining)}.`;
  }

  return `Не совсем понял вопрос, но вот сводка: баланс ${formatTenge(snap.dashboard.summary.balanceNow)}, статус — ${
    snap.dashboard.trafficLight.status === "GREEN" ? "под контролем" : snap.dashboard.trafficLight.status === "YELLOW" ? "нужно быть внимательнее" : "риск нехватки денег"
  }. Попробуйте спросить: «Сколько я могу потратить сегодня?», «Какой кредит лучше погасить первым?», «Где сократить расходы?», «Какие договоры требуют внимания?».`;
}

export async function answerAssistantQuestion(householdId: string, question: string): Promise<{ answer: string; usedAi: boolean }> {
  const snap = await buildSnapshot(householdId);
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return { answer: ruleBasedAnswer(question, snap), usedAi: false };
  }

  try {
    const dataDigest = {
      баланс_сейчас: Math.round(snap.dashboard.summary.balanceNow),
      доходы_за_месяц: Math.round(snap.dashboard.summary.incomeActual),
      расходы_за_месяц: Math.round(snap.dashboard.summary.expenseActual),
      ожидаемые_поступления: Math.round(snap.dashboard.summary.incomeExpectedRemaining),
      ожидаемые_обязательные_платежи: Math.round(snap.dashboard.summary.mandatoryExpectedRemaining),
      безопасный_лимит_в_день: Math.round(snap.dashboard.summary.safeDailyLimit),
      светофор: snap.dashboard.trafficLight,
      кредиты: snap.credits.map((c) => ({ банк: c.bank, название: c.name, остаток: c.currentBalance, платёж: c.monthlyPayment, ставка: c.interestRate })),
      возможности_экономии: snap.dashboard.savings.opportunities,
      договоры_требующие_внимания: snap.contracts.filter((c) => c.riskLevel !== "LOW").map((c) => ({ номер: c.contractNumber, название: c.title, риск: c.riskLevel, причина: c.riskReason, статус: STAGE_LABELS[c.stage] })),
      ожидаемые_оплаты_по_договорам: snap.expectedPayments.map((p) => ({ договор: p.contract.contractNumber, сумма: p.amount, дата: p.expectedDate })),
      изменения_договоров_за_неделю: snap.recentChanges.map((c) => ({ договор: c.contract.contractNumber, поле: c.field, было: c.oldValue, стало: c.newValue, дата: c.changedAt })),
    };

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 700,
        system:
          "Ты финансовый AI-помощник в приложении «Кошелёк Онлайн». Отвечай кратко и по делу на русском языке, " +
          "СТРОГО на основании переданных данных приложения (JSON ниже). Никогда не придумывай цифры. Если данных " +
          "недостаточно для ответа — так и скажи. Форматируй суммы как в тенге (₸).",
        messages: [
          { role: "user", content: `Данные приложения:\n${JSON.stringify(dataDigest, null, 2)}\n\nВопрос пользователя: ${question}` },
        ],
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) throw new Error(`Anthropic API ${res.status}`);
    const data = await res.json();
    const text = data.content?.[0]?.text?.trim();
    if (!text) throw new Error("empty response");
    return { answer: text, usedAi: true };
  } catch (err) {
    console.error("AI assistant call failed, falling back to rules:", err);
    return { answer: ruleBasedAnswer(question, snap), usedAi: false };
  }
}
