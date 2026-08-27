"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatTenge } from "@/lib/format";

export function TrendLineChart({ data }: { data: { day: number; income: number; expense: number }[] }) {
  if (data.length < 2) {
    return <div className="h-[180px] flex items-center justify-center text-sm text-muted">Недостаточно данных за месяц</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9aa1b3" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#9aa1b3" }} axisLine={false} tickLine={false} width={54} />
        <Tooltip
          formatter={(value) => formatTenge(Number(value))}
          labelFormatter={(d) => `День ${d}`}
          contentStyle={{ borderRadius: 10, border: "1px solid #e8eaf1", fontSize: 12 }}
        />
        <Line type="monotone" dataKey="income" name="Доходы" stroke="#16a34a" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="expense" name="Расходы" stroke="#dc2626" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
