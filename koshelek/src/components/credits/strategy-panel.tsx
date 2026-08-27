"use client";

import { useMemo, useState } from "react";
import { compareStrategies, type CreditLike } from "@/lib/finance";
import { formatTenge } from "@/lib/format";
import { TrendingDown, Trophy } from "lucide-react";

export function StrategyPanel({ credits }: { credits: CreditLike[] }) {
  const [extra, setExtra] = useState(50000);
  const active = credits.filter((c) => !c.isClosed);

  const result = useMemo(() => compareStrategies(active, extra), [active, extra]);

  if (active.length === 0) {
    return <div className="card p-6 text-sm text-muted text-center">Добавьте кредиты, чтобы увидеть стратегию погашения</div>;
  }

  const recommended = result.recommended === "avalanche" ? result.avalanche : result.snowball;

  return (
    <div className="card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <TrendingDown size={18} className="text-primary" />
        <h3 className="font-semibold text-sm">Стратегия погашения кредитов</h3>
      </div>

      <div>
        <label className="field-label">Дополнительная сумма на погашение, ₸/мес</label>
        <input
          type="range"
          min={0}
          max={300000}
          step={5000}
          value={extra}
          onChange={(e) => setExtra(Number(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="text-lg font-bold text-primary">{formatTenge(extra)} / мес</div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-border p-3">
          <div className="text-xs text-muted mb-1">Без дополнительных платежей (базовый вариант)</div>
          <div className="font-semibold">{result.baseline.months} мес.</div>
          <div className="text-xs text-muted">Проценты: {formatTenge(result.baseline.totalInterestPaid)}</div>
        </div>
        <div className="rounded-xl border-2 border-primary bg-primary/5 p-3 relative">
          <div className="absolute -top-2 right-3 badge badge-info">
            <Trophy size={11} /> рекомендуем
          </div>
          <div className="text-xs text-muted mb-1">
            {result.recommended === "avalanche" ? "По максимальной ставке (аваланш)" : "От меньшего долга (снежный ком)"}
          </div>
          <div className="font-semibold">{recommended.months} мес.</div>
          <div className="text-xs text-muted">Проценты: {formatTenge(recommended.totalInterestPaid)}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="rounded-xl bg-success-bg p-3">
          <div className="text-xs text-success font-semibold">Экономия на процентах</div>
          <div className="text-lg font-bold text-success">{formatTenge(result.interestSavedVsBaseline)}</div>
        </div>
        <div className="rounded-xl bg-info-bg p-3">
          <div className="text-xs text-info font-semibold">Раньше закроете кредиты</div>
          <div className="text-lg font-bold text-info">{result.monthsSavedVsBaseline} мес.</div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 text-xs">
        <div>
          <div className="font-semibold mb-1">Порядок погашения (аваланш — по ставке)</div>
          <ol className="list-decimal list-inside text-muted space-y-0.5">
            {result.avalanche.payoffOrder.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ol>
        </div>
        <div>
          <div className="font-semibold mb-1">Порядок погашения (снежный ком — по сумме)</div>
          <ol className="list-decimal list-inside text-muted space-y-0.5">
            {result.snowball.payoffOrder.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ol>
        </div>
      </div>
      <p className="text-xs text-muted">
        Метод «аваланш» математически минимизирует переплату по процентам — направляйте дополнительные средства на
        кредит с самой высокой ставкой. Метод «снежный ком» помогает быстрее закрыть отдельные кредиты для мотивации.
      </p>
    </div>
  );
}
