import Link from "next/link";
import { ArrowDown, ArrowUp, Minus, ChevronLeft, ChevronRight, Lightbulb } from "lucide-react";
import { addMonths } from "date-fns";
import { getSessionUser } from "@/lib/session";
import { getCategoryBreakdown, getMonthOverMonthComparison, getSavingsOpportunities } from "@/lib/analytics";
import { CategoryDonut } from "@/components/charts/category-donut";
import { ForecastScenario } from "@/components/analytics/forecast-scenario";
import { ExportButton } from "@/components/export-button";
import { formatMonthYear, formatTenge } from "@/lib/format";

export default async function AnalyticsPage({ searchParams }: PageProps<"/analytics">) {
  const user = await getSessionUser();
  if (!user) return null;
  const sp = await searchParams;
  const monthParam = typeof sp.month === "string" ? sp.month : undefined;
  const monthAnchor = monthParam ? new Date(`${monthParam}-01T00:00:00`) : new Date();

  const [breakdown, comparison, savings] = await Promise.all([
    getCategoryBreakdown(user.householdId, monthAnchor, "EXPENSE"),
    getMonthOverMonthComparison(user.householdId, monthAnchor),
    getSavingsOpportunities(user.householdId, monthAnchor),
  ]);

  const total = breakdown.reduce((s, b) => s + b.amount, 0);
  const prevMonthKey = `${addMonths(monthAnchor, -1).getFullYear()}-${addMonths(monthAnchor, -1).getMonth() + 1}`;
  const nextMonthKey = `${addMonths(monthAnchor, 1).getFullYear()}-${addMonths(monthAnchor, 1).getMonth() + 1}`;
  const topCategories = [...breakdown].slice(0, 3);

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href={`/analytics?month=${prevMonthKey}`} className="btn btn-outline btn-sm">
            <ChevronLeft size={16} />
          </Link>
          <h2 className="font-semibold w-44 text-center">{formatMonthYear(monthAnchor)}</h2>
          <Link href={`/analytics?month=${nextMonthKey}`} className="btn btn-outline btn-sm">
            <ChevronRight size={16} />
          </Link>
        </div>
        <ExportButton scope="analytics" params={{ month: `${monthAnchor.getFullYear()}-${monthAnchor.getMonth() + 1}` }} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="font-semibold text-sm mb-3">Расходы по категориям</h3>
          <CategoryDonut items={breakdown} total={total} />
          {topCategories.length > 0 && (
            <p className="text-xs text-muted mt-3">
              Самые дорогие категории: {topCategories.map((c) => c.name).join(", ")}
            </p>
          )}
        </div>

        <div className="card p-4">
          <h3 className="font-semibold text-sm mb-3">Сравнение с прошлым месяцем</h3>
          <div className="space-y-2 max-h-[280px] overflow-y-auto">
            {comparison.map((c) => (
              <div key={c.category} className="flex items-center gap-2 text-sm">
                <span className="w-6">{c.icon}</span>
                <span className="flex-1 truncate">{c.category}</span>
                <span className="text-muted text-xs">{formatTenge(c.previous)} →</span>
                <span className="font-semibold">{formatTenge(c.current)}</span>
                {c.changePercent === null ? (
                  <Minus size={14} className="text-muted" />
                ) : c.changePercent > 0 ? (
                  <span className="flex items-center gap-0.5 text-danger text-xs font-semibold">
                    <ArrowUp size={12} />
                    {c.changePercent}%
                  </span>
                ) : c.changePercent < 0 ? (
                  <span className="flex items-center gap-0.5 text-success text-xs font-semibold">
                    <ArrowDown size={12} />
                    {Math.abs(c.changePercent)}%
                  </span>
                ) : (
                  <Minus size={14} className="text-muted" />
                )}
              </div>
            ))}
            {comparison.length === 0 && <p className="text-sm text-muted">Нет данных за месяц</p>}
          </div>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb size={18} className="text-warning" />
          <h3 className="font-semibold text-sm">Что можно сократить</h3>
        </div>
        {savings.opportunities.length === 0 ? (
          <p className="text-sm text-muted">Явных перерасходов по категориям не найдено — бюджет стабилен.</p>
        ) : (
          <>
            <div className="space-y-2">
              {savings.opportunities.map((o) => (
                <div key={o.categoryId} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span>{o.icon}</span>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">{o.name}</div>
                      <div className="text-xs text-muted">
                        {formatTenge(o.current)} → рекомендуется {formatTenge(o.recommended)}
                      </div>
                    </div>
                  </div>
                  <div className="text-success font-bold text-sm shrink-0">−{formatTenge(o.savings)}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-xl bg-success-bg p-3 text-success font-semibold text-sm">
              Потенциальная экономия в месяц: {formatTenge(savings.totalPotential)}
            </div>
          </>
        )}
      </div>

      <ForecastScenario />
    </div>
  );
}
