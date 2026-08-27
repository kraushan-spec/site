"use client";

import { useEffect, useState } from "react";
import { formatTenge } from "@/lib/format";

type Point = { month: string; income: number; expense: number; creditPayments: number; netChange: number; projectedBalance: number };

const MONTH_OPTIONS = [3, 6, 12];

export function ForecastScenario() {
  const [months, setMonths] = useState(6);
  const [extraSavings, setExtraSavings] = useState(0);
  const [extraToCredit, setExtraToCredit] = useState(0);
  const [points, setPoints] = useState<Point[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams({ months: String(months), extraSavings: String(extraSavings), extraToCredit: String(extraToCredit) });
    fetch(`/api/analytics/forecast?${qs.toString()}`)
      .then((r) => r.json())
      .then((d) => setPoints(d.points ?? []))
      .finally(() => setLoading(false));
  }, [months, extraSavings, extraToCredit]);

  const last = points[points.length - 1];
  const baseline = points.length > 0 ? points[0].projectedBalance - points[0].netChange : 0;

  return (
    <div className="card p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold text-sm">Прогноз и сценарии «Что будет, если...»</h3>
        <div className="flex gap-1">
          {MONTH_OPTIONS.map((m) => (
            <button
              key={m}
              onClick={() => setMonths(m)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${months === m ? "bg-primary text-white" : "bg-[#f1f2f8]"}`}
            >
              {m} мес.
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="field-label">Если экономить в месяц, ₸</label>
          <input type="range" min={0} max={300000} step={5000} value={extraSavings} onChange={(e) => setExtraSavings(Number(e.target.value))} className="w-full accent-success" />
          <div className="font-bold text-success">{formatTenge(extraSavings)}</div>
        </div>
        <div>
          <label className="field-label">Если направлять на кредит, ₸/мес</label>
          <input type="range" min={0} max={300000} step={5000} value={extraToCredit} onChange={(e) => setExtraToCredit(Number(e.target.value))} className="w-full accent-primary" />
          <div className="font-bold text-primary">{formatTenge(extraToCredit)}</div>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Считаем...</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted text-left">
                  <th className="py-1.5 pr-2">Месяц</th>
                  <th className="py-1.5 pr-2">Доходы</th>
                  <th className="py-1.5 pr-2">Расходы</th>
                  <th className="py-1.5 pr-2">Изменение</th>
                  <th className="py-1.5">Остаток</th>
                </tr>
              </thead>
              <tbody>
                {points.map((p) => (
                  <tr key={p.month} className="border-t border-border">
                    <td className="py-1.5 pr-2 font-medium">
                      {new Date(p.month).toLocaleDateString("ru-RU", { month: "short", year: "numeric" })}
                    </td>
                    <td className="py-1.5 pr-2 text-success">{formatTenge(p.income)}</td>
                    <td className="py-1.5 pr-2 text-danger">{formatTenge(p.expense)}</td>
                    <td className={`py-1.5 pr-2 ${p.netChange >= 0 ? "text-success" : "text-danger"}`}>{formatTenge(p.netChange, { sign: true })}</td>
                    <td className="py-1.5 font-semibold">{formatTenge(p.projectedBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {last && (
            <div className="rounded-xl bg-primary/5 p-3 text-sm">
              Через {months} мес. прогнозируемый остаток: <b>{formatTenge(last.projectedBalance)}</b>
              {(extraSavings > 0 || extraToCredit > 0) && baseline !== 0 && (
                <span className="text-muted"> (с учётом выбранного сценария)</span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
