import Link from "next/link";
import { endOfMonth, getDaysInMonth, startOfMonth } from "date-fns";
import { getCalendarEvents, calendarEventColor } from "@/lib/calendar";
import { formatMonthYear } from "@/lib/format";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export async function MiniCalendar({ householdId, monthAnchor }: { householdId: string; monthAnchor: Date }) {
  const start = startOfMonth(monthAnchor);
  const end = endOfMonth(monthAnchor);
  const events = await getCalendarEvents(householdId, start, end);

  const byDay = new Map<number, Set<string>>();
  for (const e of events) {
    const day = e.date.getDate();
    if (!byDay.has(day)) byDay.set(day, new Set());
    byDay.get(day)!.add(calendarEventColor(e.type));
  }

  const daysInMonth = getDaysInMonth(monthAnchor);
  const firstWeekday = (start.getDay() + 6) % 7; // Monday-first
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === monthAnchor.getFullYear() && today.getMonth() === monthAnchor.getMonth();

  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const upcoming = events.filter((e) => e.date >= today).slice(0, 4);

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Календарь</h3>
        <span className="text-xs text-muted">{formatMonthYear(monthAnchor)}</span>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center mb-1">
        {WEEKDAYS.map((d) => (
          <span key={d} className="text-[10px] font-semibold text-muted">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {cells.map((day, i) => {
          const isToday = isCurrentMonth && day === today.getDate();
          const colors = day ? byDay.get(day) : undefined;
          return (
            <div key={i} className="flex flex-col items-center gap-0.5 py-0.5">
              {day && (
                <span
                  className={`w-6 h-6 flex items-center justify-center rounded-full text-xs ${
                    isToday ? "bg-primary text-white font-bold" : "text-foreground/80"
                  }`}
                >
                  {day}
                </span>
              )}
              <span className="flex gap-0.5 h-1">
                {colors &&
                  [...colors].slice(0, 3).map((c) => (
                    <span key={c} className="w-1 h-1 rounded-full" style={{ background: c }} />
                  ))}
              </span>
            </div>
          );
        })}
      </div>
      {upcoming.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border space-y-1.5">
          {upcoming.map((e) => (
            <div key={e.id} className="flex items-center gap-2 text-xs">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: calendarEventColor(e.type) }} />
              <span className="text-muted shrink-0">{e.date.getDate().toString().padStart(2, "0")} числа</span>
              <span className="truncate flex-1">{e.title}</span>
            </div>
          ))}
        </div>
      )}
      <Link href="/calendar" className="mt-3 block text-center btn btn-secondary btn-sm">
        Перейти в календарь
      </Link>
    </div>
  );
}
