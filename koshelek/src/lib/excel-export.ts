import ExcelJS from "exceljs";
import { STAGE_LABELS } from "@/lib/contracts";

const KZT_FMT = '#,##0 "₸"';
const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };

function styleHeader(ws: ExcelJS.Worksheet) {
  const row = ws.getRow(1);
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = HEADER_FILL;
  row.alignment = { vertical: "middle" };
  ws.views = [{ state: "frozen", ySplit: 1 }];
}

function autoWidth(ws: ExcelJS.Worksheet, columns: { width?: number }[]) {
  ws.columns = columns as ExcelJS.Column[];
}

export function addSummarySheet(
  wb: ExcelJS.Workbook,
  data: {
    period: string;
    income: number;
    expense: number;
    mandatory: number;
    credits: number;
    balance: number;
    savings: number;
    debtLoad: number;
    expectedIncome: number;
    expectedPayments: number;
    potentialSavings: number;
    contractsAmount: number;
    contractsExpected: number;
  },
) {
  const ws = wb.addWorksheet("Сводка");
  autoWidth(ws, [{ width: 42 }, { width: 24 }]);
  const rows: [string, number | string][] = [
    ["Период", data.period],
    ["Доходы", data.income],
    ["Расходы", data.expense],
    ["Обязательные платежи", data.mandatory],
    ["Кредиты (ежемесячно)", data.credits],
    ["Остаток (баланс)", data.balance],
    ["Накопления (цели)", data.savings],
    ["Долговая нагрузка, %", data.debtLoad],
    ["Ожидаемые поступления", data.expectedIncome],
    ["Ожидаемые платежи", data.expectedPayments],
    ["Потенциальная экономия в месяц", data.potentialSavings],
    ["Сумма действующих договоров", data.contractsAmount],
    ["Ожидаемые оплаты по договорам", data.contractsExpected],
  ];
  ws.addRow(["Показатель", "Значение"]);
  for (const [label, value] of rows) {
    const r = ws.addRow([label, value]);
    if (typeof value === "number" && label !== "Долговая нагрузка, %") r.getCell(2).numFmt = KZT_FMT;
  }
  styleHeader(ws);
}

export function addTransactionsSheet(
  wb: ExcelJS.Workbook,
  name: string,
  rows: {
    date: Date;
    category: string;
    description: string;
    amount: number;
    mandatory: boolean;
    recurring: boolean;
    status: string;
    account: string;
    comment: string;
  }[],
) {
  const ws = wb.addWorksheet(name);
  autoWidth(ws, [
    { width: 12 },
    { width: 20 },
    { width: 30 },
    { width: 16 },
    { width: 12 },
    { width: 12 },
    { width: 14 },
    { width: 16 },
    { width: 30 },
  ]);
  ws.addRow(["Дата", "Категория", "Описание", "Сумма", "Обязательный", "Регулярный", "Статус", "Счёт", "Комментарий"]);
  for (const r of rows) {
    const row = ws.addRow([
      r.date,
      r.category,
      r.description,
      r.amount,
      r.mandatory ? "Да" : "Нет",
      r.recurring ? "Да" : "Нет",
      r.status,
      r.account,
      r.comment,
    ]);
    row.getCell(1).numFmt = "dd.mm.yyyy";
    row.getCell(4).numFmt = KZT_FMT;
  }
  styleHeader(ws);
}

export function addCreditsSheet(
  wb: ExcelJS.Workbook,
  rows: {
    bank: string;
    name: string;
    principal: number;
    balance: number;
    monthlyPayment: number;
    rate: number;
    apr: number | null;
    paymentDay: number;
    remaining: number;
    endDate: Date;
    closed: boolean;
    comment: string;
  }[],
) {
  const ws = wb.addWorksheet("Кредиты");
  autoWidth(ws, [
    { width: 16 }, { width: 22 }, { width: 16 }, { width: 16 }, { width: 16 },
    { width: 10 }, { width: 10 }, { width: 12 }, { width: 12 }, { width: 14 }, { width: 10 }, { width: 30 },
  ]);
  ws.addRow(["Банк", "Название", "Первоначальная сумма", "Остаток", "Платёж/мес", "Ставка %", "ГЭСВ %", "День платежа", "Осталось платежей", "Дата окончания", "Закрыт", "Комментарий"]);
  for (const r of rows) {
    const row = ws.addRow([r.bank, r.name, r.principal, r.balance, r.monthlyPayment, r.rate, r.apr ?? "", r.paymentDay, r.remaining, r.endDate, r.closed ? "Да" : "Нет", r.comment]);
    row.getCell(3).numFmt = KZT_FMT;
    row.getCell(4).numFmt = KZT_FMT;
    row.getCell(5).numFmt = KZT_FMT;
    row.getCell(10).numFmt = "dd.mm.yyyy";
  }
  styleHeader(ws);
}

export function addCalendarSheet(wb: ExcelJS.Workbook, events: { date: Date; type: string; title: string; amount?: number }[]) {
  const ws = wb.addWorksheet("Календарь");
  autoWidth(ws, [{ width: 12 }, { width: 18 }, { width: 40 }, { width: 16 }]);
  ws.addRow(["Дата", "Тип", "Событие", "Сумма"]);
  for (const e of events) {
    const row = ws.addRow([e.date, e.type, e.title, e.amount ?? ""]);
    row.getCell(1).numFmt = "dd.mm.yyyy";
    if (e.amount) row.getCell(4).numFmt = KZT_FMT;
  }
  styleHeader(ws);
}

type ContractRow = {
  id: string;
  contractNumber: string | null;
  announcementNumber: string | null;
  title: string;
  customer: string | null;
  supplier: string | null;
  amount: number;
  startDate: Date | null;
  endDate: Date | null;
  stage: string;
  riskLevel: string;
  riskReason: string | null;
  comment: string | null;
  received: number;
  expected: number;
  elapsedPct: number | null;
  remainingDays: number | null;
};

export function addAllTendersSheet(wb: ExcelJS.Workbook, rows: ContractRow[]) {
  const ws = wb.addWorksheet("Все тендеры");
  autoWidth(ws, [
    { width: 14 }, { width: 30 }, { width: 22 }, { width: 16 }, { width: 12 }, { width: 12 }, { width: 16 }, { width: 12 },
  ]);
  ws.addRow(["Номер договора", "Название", "Заказчик", "Сумма", "Дата начала", "Дата окончания", "Статус", "Риск"]);
  for (const c of rows) {
    const row = ws.addRow([
      c.contractNumber ?? c.id.slice(0, 6),
      c.title,
      c.customer ?? "",
      c.amount,
      c.startDate ?? "",
      c.endDate ?? "",
      STAGE_LABELS[c.stage] ?? c.stage,
      c.riskLevel,
    ]);
    row.getCell(4).numFmt = KZT_FMT;
    if (c.startDate) row.getCell(5).numFmt = "dd.mm.yyyy";
    if (c.endDate) row.getCell(6).numFmt = "dd.mm.yyyy";
  }
  styleHeader(ws);
}

export function addActiveContractsSheet(wb: ExcelJS.Workbook, rows: ContractRow[]) {
  const ws = wb.addWorksheet("Действующие договоры");
  autoWidth(ws, [
    { width: 14 }, { width: 30 }, { width: 22 }, { width: 16 }, { width: 14 }, { width: 14 }, { width: 10 },
    { width: 12 }, { width: 12 }, { width: 16 }, { width: 16 }, { width: 12 }, { width: 12 }, { width: 10 }, { width: 30 },
  ]);
  ws.addRow([
    "Номер", "Название", "Заказчик", "Сумма", "Дата начала", "Дата окончания", "Осталось дней", "% срока",
    "Статус", "Получено", "Остаток оплаты", "Риск", "Причина риска", "Комментарий",
  ]);
  for (const c of rows) {
    const row = ws.addRow([
      c.contractNumber ?? c.id.slice(0, 6),
      c.title,
      c.customer ?? "",
      c.amount,
      c.startDate ?? "",
      c.endDate ?? "",
      c.remainingDays ?? "",
      c.elapsedPct ?? "",
      STAGE_LABELS[c.stage] ?? c.stage,
      c.received,
      Math.max(0, c.amount - c.received),
      c.riskLevel,
      c.riskReason ?? "",
      c.comment ?? "",
    ]);
    row.getCell(4).numFmt = KZT_FMT;
    row.getCell(10).numFmt = KZT_FMT;
    row.getCell(11).numFmt = KZT_FMT;
    if (c.startDate) row.getCell(5).numFmt = "dd.mm.yyyy";
    if (c.endDate) row.getCell(6).numFmt = "dd.mm.yyyy";
  }
  styleHeader(ws);
}

export function addContractChangesSheet(
  wb: ExcelJS.Workbook,
  rows: { contractNumber: string; date: Date; field: string; oldValue: string | null; newValue: string | null; reason: string | null; source: string }[],
) {
  const ws = wb.addWorksheet("Изменения договоров");
  autoWidth(ws, [{ width: 14 }, { width: 12 }, { width: 22 }, { width: 20 }, { width: 20 }, { width: 30 }, { width: 18 }]);
  ws.addRow(["Договор", "Дата", "Поле", "Было", "Стало", "Причина", "Источник"]);
  for (const r of rows) {
    const row = ws.addRow([r.contractNumber, r.date, r.field, r.oldValue ?? "", r.newValue ?? "", r.reason ?? "", r.source]);
    row.getCell(2).numFmt = "dd.mm.yyyy";
  }
  styleHeader(ws);
}

export function addPaymentsSheet(
  wb: ExcelJS.Workbook,
  rows: { contractNumber: string; amount: number; expectedDate: Date | null; receivedDate: Date | null; status: string }[],
) {
  const ws = wb.addWorksheet("Оплаты");
  autoWidth(ws, [{ width: 14 }, { width: 16 }, { width: 14 }, { width: 14 }, { width: 14 }]);
  ws.addRow(["Договор", "Сумма", "Ожидается", "Получено", "Статус"]);
  for (const r of rows) {
    const row = ws.addRow([r.contractNumber, r.amount, r.expectedDate ?? "", r.receivedDate ?? "", r.status]);
    row.getCell(2).numFmt = KZT_FMT;
    if (r.expectedDate) row.getCell(3).numFmt = "dd.mm.yyyy";
    if (r.receivedDate) row.getCell(4).numFmt = "dd.mm.yyyy";
  }
  styleHeader(ws);
}

export function addActsSheet(
  wb: ExcelJS.Workbook,
  rows: { contractNumber: string; number: string | null; amount: number | null; date: Date | null; status: string; penalty: number | null }[],
) {
  const ws = wb.addWorksheet("Акты");
  autoWidth(ws, [{ width: 14 }, { width: 12 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }]);
  ws.addRow(["Договор", "№ акта", "Сумма", "Дата", "Статус", "Неустойка"]);
  for (const r of rows) {
    const row = ws.addRow([r.contractNumber, r.number ?? "", r.amount ?? "", r.date ?? "", r.status, r.penalty ?? ""]);
    if (r.amount) row.getCell(3).numFmt = KZT_FMT;
    if (r.date) row.getCell(4).numFmt = "dd.mm.yyyy";
    if (r.penalty) row.getCell(6).numFmt = KZT_FMT;
  }
  styleHeader(ws);
}

export function addTasksSheet(wb: ExcelJS.Workbook, rows: { title: string; dueDate: Date | null; priority: string; done: boolean }[]) {
  const ws = wb.addWorksheet("Задачи");
  autoWidth(ws, [{ width: 40 }, { width: 14 }, { width: 12 }, { width: 10 }]);
  ws.addRow(["Задача", "Срок", "Приоритет", "Выполнено"]);
  for (const r of rows) {
    const row = ws.addRow([r.title, r.dueDate ?? "", r.priority, r.done ? "Да" : "Нет"]);
    if (r.dueDate) row.getCell(2).numFmt = "dd.mm.yyyy";
  }
  styleHeader(ws);
}

export function addCommentsSheet(
  wb: ExcelJS.Workbook,
  rows: { date: Date; object: string; refId: string; author: string; text: string; category: string; source: string }[],
) {
  const ws = wb.addWorksheet("Комментарии");
  autoWidth(ws, [{ width: 12 }, { width: 10 }, { width: 18 }, { width: 14 }, { width: 16 }, { width: 40 }, { width: 16 }, { width: 20 }]);
  ws.addRow(["Дата", "Время", "Объект", "Номер", "Автор", "Комментарий", "Категория", "Источник"]);
  for (const r of rows) {
    const row = ws.addRow([r.date, r.date, r.object, r.refId, r.author, r.text, r.category, r.source]);
    row.getCell(1).numFmt = "dd.mm.yyyy";
    row.getCell(2).numFmt = "hh:mm";
  }
  styleHeader(ws);
}

export function addGoalsSheet(
  wb: ExcelJS.Workbook,
  rows: { name: string; type: string; target: number; saved: number; targetDate: Date | null; comment: string | null }[],
) {
  const ws = wb.addWorksheet("Финансовые цели");
  autoWidth(ws, [{ width: 26 }, { width: 20 }, { width: 16 }, { width: 16 }, { width: 14 }, { width: 30 }]);
  ws.addRow(["Название", "Тип", "Цель", "Накоплено", "Срок", "Комментарий"]);
  for (const r of rows) {
    const row = ws.addRow([r.name, r.type, r.target, r.saved, r.targetDate ?? "", r.comment ?? ""]);
    row.getCell(3).numFmt = KZT_FMT;
    row.getCell(4).numFmt = KZT_FMT;
    if (r.targetDate) row.getCell(5).numFmt = "dd.mm.yyyy";
  }
  styleHeader(ws);
}
