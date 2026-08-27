import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from "../src/lib/default-data";

const prisma = new PrismaClient();

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}
function onDay(day: number, monthOffset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + monthOffset, 1);
  d.setDate(day);
  return d;
}

async function main() {
  const email = "demo@koshelek.online";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Демо-аккаунт уже существует:", email);
    return;
  }

  const passwordHash = await bcrypt.hash("demo12345", 10);

  const household = await prisma.household.create({
    data: {
      name: "Семья Ивановых",
      users: { create: { name: "Айгуль Иванова", email, passwordHash, role: "OWNER" } },
      accounts: { create: [{ name: "Основной счёт", type: "card", isDefault: true, initialBalance: 350000 }] },
      categories: {
        create: [
          ...DEFAULT_INCOME_CATEGORIES.map((c) => ({ ...c, type: "INCOME" as const, isSystem: true })),
          ...DEFAULT_EXPENSE_CATEGORIES.map((c) => ({ ...c, type: "EXPENSE" as const, isSystem: true })),
        ],
      },
    },
    include: { categories: true },
  });

  const cat = (name: string) => household.categories.find((c) => c.name === name)!.id;

  await prisma.transaction.createMany({
    data: [
      { householdId: household.id, type: "INCOME", categoryId: cat("Зарплата"), description: "Зарплата", amount: 700000, date: onDay(10), isRecurring: true, recurrenceDay: 10, status: "DONE" },
      { householdId: household.id, type: "INCOME", categoryId: cat("Доход супруга(и)"), description: "Зарплата супруга", amount: 550000, date: onDay(5), isRecurring: true, recurrenceDay: 5, status: "DONE" },
      { householdId: household.id, type: "INCOME", categoryId: cat("Доход от тендеров"), description: "Оплата по договору №12345", amount: 250000, date: daysAgo(4), status: "DONE" },

      { householdId: household.id, type: "EXPENSE", categoryId: cat("Продукты"), description: "Продукты за месяц", amount: 95000, date: daysAgo(2), isMandatory: false, status: "DONE" },
      { householdId: household.id, type: "EXPENSE", categoryId: cat("Коммунальные услуги"), description: "Коммунальные платежи", amount: 45000, date: onDay(5), isMandatory: true, isRecurring: true, recurrenceDay: 5, status: "DONE" },
      { householdId: household.id, type: "EXPENSE", categoryId: cat("Связь"), description: "Мобильная связь и интернет", amount: 12000, date: onDay(3), isMandatory: true, isRecurring: true, recurrenceDay: 3, status: "DONE" },
      { householdId: household.id, type: "EXPENSE", categoryId: cat("Кафе/рестораны"), description: "Кафе и рестораны", amount: 70000, date: daysAgo(6), status: "DONE" },
      { householdId: household.id, type: "EXPENSE", categoryId: cat("Покупки"), description: "Покупки", amount: 55000, date: daysAgo(9), status: "DONE" },
      { householdId: household.id, type: "EXPENSE", categoryId: cat("Транспорт"), description: "Транспорт", amount: 18000, date: daysAgo(3), status: "DONE" },
      { householdId: household.id, type: "EXPENSE", categoryId: cat("Дети"), description: "Детский сад", amount: 40000, date: onDay(1), isMandatory: true, isRecurring: true, recurrenceDay: 1, status: "DONE" },
      { householdId: household.id, type: "EXPENSE", categoryId: cat("Налоги"), description: "Обязательные пенсионные взносы ИП", amount: 25000, date: daysFromNow(6), isMandatory: true, status: "PLANNED" },
    ],
  });

  await prisma.credit.createMany({
    data: [
      {
        householdId: household.id, bank: "Halyk Bank", name: "Потребительский кредит", principal: 3500000,
        currentBalance: 2450000, monthlyPayment: 145000, interestRate: 19.5, apr: 22.1, paymentDay: 15,
        remainingPayments: 20, startDate: daysAgo(400), endDate: daysFromNow(600), paymentType: "ANNUITY",
      },
      {
        householdId: household.id, bank: "Kaspi Bank", name: "Рассрочка на технику", principal: 600000,
        currentBalance: 180000, monthlyPayment: 60000, interestRate: 14, apr: 15.5, paymentDay: 25,
        remainingPayments: 3, startDate: daysAgo(200), endDate: daysFromNow(90), paymentType: "ANNUITY",
      },
    ],
  });

  await prisma.goal.createMany({
    data: [
      { householdId: household.id, name: "Финансовая подушка", type: "reserve", targetAmount: 1500000, savedAmount: 420000, targetDate: daysFromNow(240) },
      { householdId: household.id, name: "Погасить рассрочку Kaspi", type: "credit_payoff", targetAmount: 180000, savedAmount: 60000, targetDate: daysFromNow(90) },
      { householdId: household.id, name: "Семейное путешествие", type: "travel", targetAmount: 800000, savedAmount: 150000, targetDate: daysFromNow(180) },
    ],
  });

  const contract1 = await prisma.contract.create({
    data: {
      householdId: household.id,
      announcementNumber: "ГЗ-2026-0087421",
      contractNumber: "12345",
      title: "Поставка компьютерного оборудования",
      customer: "ГУ «Отдел образования города»",
      supplier: "ТОО «СтройТехСервис»",
      bin: "970540123456",
      amount: 12500000,
      signDate: daysAgo(45),
      startDate: daysAgo(43),
      endDate: daysFromNow(35),
      subject: "Поставка компьютерного оборудования и оргтехники",
      procurementMethod: "Запрос ценовых предложений",
      stage: "ACTIVE",
      source: "MANUAL",
      riskLevel: "LOW",
    },
  });

  await prisma.contractPayment.createMany({
    data: [
      { contractId: contract1.id, amount: 8000000, receivedDate: daysAgo(20), status: "RECEIVED" },
      { contractId: contract1.id, amount: 4500000, expectedDate: daysFromNow(20), status: "EXPECTED" },
    ],
  });
  await prisma.contractAct.create({
    data: { contractId: contract1.id, number: "АВР-001", amount: 8000000, date: daysAgo(22), status: "APPROVED" },
  });
  await prisma.contractChange.create({
    data: {
      contractId: contract1.id, field: "Срок (дата окончания)",
      oldValue: daysAgo(5).toLocaleDateString("ru-RU"), newValue: daysFromNow(35).toLocaleDateString("ru-RU"),
      reason: "Заказчик перенёс приёмку оборудования", source: "MANUAL",
    },
  });

  const contract2 = await prisma.contract.create({
    data: {
      householdId: household.id,
      announcementNumber: "ГЗ-2026-0091203",
      contractNumber: "12346",
      title: "Выполнение ремонтных работ",
      customer: "КГУ «Городская поликлиника №4»",
      supplier: "ТОО «СтройТехСервис»",
      bin: "970540123456",
      amount: 8750000,
      signDate: daysAgo(80),
      startDate: daysAgo(75),
      endDate: daysFromNow(12),
      subject: "Капитальный ремонт кровли здания",
      procurementMethod: "Электронный конкурс",
      stage: "DELIVERY",
      source: "MANUAL",
      riskLevel: "MEDIUM",
      riskReason: "Прошло 85% срока договора, но исполнение подтверждено только на 60%.",
    },
  });
  await prisma.contractPayment.create({
    data: { contractId: contract2.id, amount: 8750000, expectedDate: daysFromNow(25), status: "EXPECTED" },
  });

  await prisma.comment.create({
    data: {
      householdId: household.id, entityType: "CONTRACT", entityId: contract2.id,
      text: "Поставка кровельных материалов задерживается на 5 дней, подрядчик уведомлён.",
    },
  });

  await prisma.task.createMany({
    data: [
      { householdId: household.id, title: "Подписать акт по договору №12345", priority: "WEEK", dueDate: daysFromNow(4) },
      { householdId: household.id, title: "Проверить оплату по договору №12346", priority: "TODAY", dueDate: daysFromNow(0) },
    ],
  });

  console.log("Демо-данные созданы.");
  console.log("Логин:", email);
  console.log("Пароль: demo12345");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
