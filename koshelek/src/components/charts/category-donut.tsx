"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatTenge } from "@/lib/format";
import type { CategoryBreakdownItem } from "@/lib/analytics";

const COLORS = ["#4f46e5", "#16a34a", "#f59e0b", "#dc2626", "#2563eb", "#a855f7", "#0d9488", "#ec4899"];

export function CategoryDonut({ items, total }: { items: CategoryBreakdownItem[]; total: number }) {
  if (items.length === 0) {
    return <div className="h-[170px] flex items-center justify-center text-sm text-muted">Нет расходов за месяц</div>;
  }
  const top = items.slice(0, 8);
  return (
    <div className="flex items-center gap-4">
      <div className="relative w-[150px] h-[150px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={top} dataKey="amount" nameKey="name" innerRadius={48} outerRadius={70} paddingAngle={2}>
              {top.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />
              ))}
            </Pie>
            <Tooltip formatter={(v) => formatTenge(Number(v))} contentStyle={{ borderRadius: 10, fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[15px] font-bold">{Math.round(total / 1000)}K</span>
          <span className="text-[10px] text-muted">Всего</span>
        </div>
      </div>
      <ul className="flex-1 min-w-0 space-y-1.5">
        {top.map((item, i) => (
          <li key={item.categoryId ?? item.name} className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="truncate flex-1">{item.name}</span>
            <span className="font-semibold whitespace-nowrap">{Math.round(item.amount).toLocaleString("ru-RU")} ₸</span>
            <span className="text-muted w-8 text-right shrink-0">{item.percent}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
