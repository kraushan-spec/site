"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, getDaysInMonth, startOfMonth } from "date-fns";
import { formatMonthYear, formatTenge } from "@/lib/format";
import { ExportButton } from "@/components/export-button";

type EventDto = {
  id: string;
  date: string;
  type: "income" | "mandatory" | "credit" | "expense" | "contract" | "task";
  title: string;
  amount?: number;
  href: string;
  balanceAfter: number;
};

const TYPE_COLOR: Record<EventDto["type"], string> = {
  income: "#16a34a",
  mandatory: "#dc2626",
  credit: "#f59e0b",
  expense: "#2563eb",
  contract: "#a855f7",
  task: "#eab308",
};

const LEGEND: { type: EventDto["type"]; label: string }[] = [
  { type: "income", label: "Доходы" },
  { type: "mandatory", label: "Обязательные платежи" },
  { type: "credit", label: "Кредиты" },
  { type: "expense", label: "Расходы" },
  { type: "contract", label: "Тендеры/договоры" },
  { type: "task", label: "Задачи" },
];

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export function CalendarView() {
  const [monthAnchor, setMonthAnchor] = useState(() => startOfMonth(new Date()));
  const [events, setEvents] = useState<EventDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [balances, setBalances] = useState({ start: 0, end: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    const key = `${monthAnchor.getFullYear()}-${String(monthAnchor.getMonth() + 1).padStart(2, "0")}`;
    const res = await fetch(`/api/calendar?month=${key}`);
    const data = await res.json();
    setEvents(data.events ?? []);
    setBalances({ start: data.startBalance ?? 0, end: data.endBalance ?? 0 });
    setLoading(false);
  }, [monthAnchor]);

  useEffect(() => {
    load();
    setSelectedDay(null);
  }, [load]);

  const daysInMonth = getDaysInMonth(monthAnchor);
  const firstWeekday = (startOfMonth(monthAnchor).getDay() + 6) % 7;
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === monthAnchor.getFullYear() && today.getMonth() === monthAnchor.getMonth();

  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const eventsByDay = new Map<number, EventDto[]>();
  for (const e of events) {
    const day = new Date(e.date).getDate();
    if (!eventsByDay.has(day)) eventsByDay.set(day, []);
    eventsByDay.get(day)!.push(e);
  }

  const dayEvents = selectedDay ? eventsByDay.get(selectedDay) ?? [] : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button className="btn btn-outline btn-sm" onClick={() => setMonthAnchor((m) => addMonths(m, -1))}>
            <ChevronLeft size={16} />
          </button>
          <h2 className="font-semibold w-44 text-center">{formatMonthYear(monthAnchor)}</h2>
          <button className="btn btn-outline btn-sm" onClick={() => setMonthAnchor((m) => addMonths(m, 1))}>
            <ChevronRight size={16} />
          </button>
        </div>
        <ExportButton scope="all" params={{ month: `${monthAnchor.getFullYear()}-${monthAnchor.getMonth() + 1}` }} />
      </div>

      <div className="flex gap-4 flex-wrap text-xs">
        {LEGEND.map((l) => (
          <span key={l.type} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: TYPE_COLOR[l.type] }} />
            {l.label}
          </span>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-4">
        <div className="card p-4">
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {WEEKDAYS.map((d) => (
              <span key={d} className="text-xs font-semibold text-muted py-1">
                {d}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              const isToday = isCurrentMonth && day === today.getDate();
              const dayEv = day ? eventsByDay.get(day) ?? [] : [];
              return (
                <button
                  key={i}
                  disabled={!day}
                  onClick={() => day && setSelectedDay(day)}
                  className={`aspect-square rounded-lg border text-left p-1.5 flex flex-col gap-1 ${
                    day ? "hover:bg-[#f9fafc]" : "border-transparent"
                  } ${selectedDay === day ? "border-primary bg-primary/5" : "border-border"}`}
                >
                  {day && (
                    <>
                      <span className={`text-xs ${isToday ? "font-bold text-primary" : "text-foreground/70"}`}>{day}</span>
                      <div className="flex flex-wrap gap-0.5">
                        {dayEv.slice(0, 4).map((e) => (
                          <span key={e.id} className="w-1.5 h-1.5 rounded-full" style={{ background: TYPE_COLOR[e.type] }} />
                        ))}
                      </div>
                    </>
                  )}
                </button>
              );
            })}
          </div>
          {loading && <p className="text-xs text-muted mt-2">Загрузка...</p>}
          <div className="flex justify-between text-xs text-muted mt-3 pt-3 border-t border-border">
            <span>Баланс на начало месяца: <b className="text-foreground">{formatTenge(balances.start)}</b></span>
            <span>Прогноз на конец месяца: <b className="text-foreground">{formatTenge(balances.end)}</b></span>
          </div>
        </div>

        <div className="card p-4">
          <h3 className="font-semibold text-sm mb-3">
            {selectedDay ? `${selectedDay} ${formatMonthYear(monthAnchor).toLowerCase()}` : "Выберите день"}
          </h3>
          {selectedDay && dayEvents.length === 0 && <p className="text-sm text-muted">Нет операций в этот день</p>}
          <div className="space-y-2">
            {dayEvents.map((e) => (
              <Link key={e.id} href={e.href} className="block rounded-lg border border-border p-2.5 hover:bg-[#f9fafc]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: TYPE_COLOR[e.type] }} />
                  <span className="text-sm truncate flex-1">{e.title}</span>
                </div>
                {e.amount !== undefined && (
                  <div className="text-xs text-muted mt-1 pl-4">
                    {formatTenge(e.amount)} · остаток после операции: {formatTenge(e.balanceAfter)}
                  </div>
                )}
              </Link>
            ))}
          </div>
          {!selectedDay && (
            <p className="text-sm text-muted">
              Кликните по дню в календаре, чтобы увидеть операции и прогноз остатка после каждой из них.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
