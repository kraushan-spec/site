export function formatTenge(amount: number, opts: { sign?: boolean } = {}) {
  const rounded = Math.round(amount);
  const abs = Math.abs(rounded).toLocaleString("ru-RU");
  const prefix = opts.sign ? (rounded >= 0 ? "+" : "−") : rounded < 0 ? "−" : "";
  return `${prefix}${abs} ₸`;
}

export function formatDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDateLong(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" });
}

export function formatMonthYear(date: Date) {
  const s = date.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatPercent(value: number, digits = 0) {
  return `${value.toFixed(digits)}%`;
}
