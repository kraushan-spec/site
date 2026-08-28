import { Wallet, TrendingUp, TrendingDown, CreditCard, ShieldCheck } from "lucide-react";
import { getSessionUser } from "@/lib/session";
import { getDashboardData } from "@/lib/dashboard-data";
import { StatCard } from "@/components/ui/stat-card";
import { TrafficLightCard } from "@/components/dashboard/traffic-light-card";
import { CreditsCard } from "@/components/dashboard/credits-card";
import { ContractsCard } from "@/components/dashboard/contracts-card";
import { MiniCalendar } from "@/components/dashboard/mini-calendar";
import { ActionStrip } from "@/components/dashboard/action-strip";
import { SavingsCard } from "@/components/dashboard/savings-card";
import { CategoryDonut } from "@/components/charts/category-donut";
import { ExportButton } from "@/components/export-button";
import { formatTenge } from "@/lib/format";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const data = await getDashboardData(user.householdId, new Date());
  const { summary } = data;

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Добро пожаловать{user.name ? `, ${user.name}` : ""}!</h2>
          <p className="text-sm text-muted">Финансовое состояние на сегодня</p>
        </div>
        <ExportButton scope="all" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="Баланс сейчас" value={formatTenge(summary.balanceNow)} icon={Wallet} tone="primary" />
        <StatCard
          label="Доходы"
          value={formatTenge(summary.incomeActual)}
          sub="за месяц"
          icon={TrendingUp}
          tone="success"
        />
        <StatCard
          label="Расходы"
          value={formatTenge(summary.expenseActual)}
          sub="за месяц"
          icon={TrendingDown}
          tone="danger"
        />
        <StatCard
          label="Кредиты и обязательства"
          value={formatTenge(data.creditTotals.totalMonthly)}
          sub="ежемесячно"
          icon={CreditCard}
          tone="warning"
        />
        <StatCard
          label="Свободно можно тратить"
          value={`${Math.round(summary.safeDailyLimit).toLocaleString("ru-RU")} ₸`}
          sub="в день, безопасный лимит"
          icon={ShieldCheck}
          tone="info"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <TrafficLightCard
          trafficLight={data.trafficLight}
          safeDailyLimit={summary.safeDailyLimit}
          dailySeries={data.dailySeries}
        />
        <CreditsCard credits={data.credits} totals={data.creditTotals} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Расходы за месяц</h3>
            <span className="text-lg font-bold">{formatTenge(summary.expenseActual)}</span>
          </div>
          <CategoryDonut items={data.categoryBreakdown} total={summary.expenseActual} />
          <div className="mt-3">
            <SavingsCard opportunities={data.savings.opportunities} totalPotential={data.savings.totalPotential} />
          </div>
        </div>

        <MiniCalendar householdId={user.householdId} monthAnchor={new Date()} />

        <ContractsCard summary={data.contracts} />
      </div>

      <ActionStrip items={data.actionItems} />

      <div className="grid lg:grid-cols-4 gap-3 text-sm">
        <div className="card p-3">
          <div className="text-xs text-muted">Ожидаемые поступления</div>
          <div className="font-bold text-success">{formatTenge(summary.incomeExpectedRemaining)}</div>
        </div>
        <div className="card p-3">
          <div className="text-xs text-muted">Ожидаемые платежи</div>
          <div className="font-bold text-danger">{formatTenge(summary.mandatoryExpectedRemaining)}</div>
        </div>
        <div className="card p-3">
          <div className="text-xs text-muted">Обязательные платежи (расходы)</div>
          <div className="font-bold">{formatTenge(summary.mandatoryActual)}</div>
        </div>
        <div className="card p-3">
          <div className="text-xs text-muted">Безопасный лимит в неделю</div>
          <div className="font-bold">{formatTenge(summary.safeWeeklyLimit)}</div>
        </div>
      </div>
    </div>
  );
}
