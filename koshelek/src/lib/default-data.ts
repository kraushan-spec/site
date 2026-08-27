export const DEFAULT_EXPENSE_CATEGORIES: { name: string; icon: string }[] = [
  { name: "Продукты", icon: "🛒" },
  { name: "Дом", icon: "🏠" },
  { name: "Коммунальные услуги", icon: "💡" },
  { name: "Транспорт", icon: "🚌" },
  { name: "Автомобиль", icon: "🚗" },
  { name: "Кафе/рестораны", icon: "☕" },
  { name: "Одежда", icon: "👕" },
  { name: "Здоровье", icon: "💊" },
  { name: "Дети", icon: "🧒" },
  { name: "Образование", icon: "🎓" },
  { name: "Путешествия", icon: "✈️" },
  { name: "Развлечения", icon: "🎬" },
  { name: "Покупки", icon: "🛍️" },
  { name: "Связь", icon: "📱" },
  { name: "Интернет", icon: "🌐" },
  { name: "Подписки", icon: "🔁" },
  { name: "Налоги", icon: "🧾" },
  { name: "Кредиты", icon: "💳" },
  { name: "Бизнес", icon: "💼" },
  { name: "Другое", icon: "🔹" },
];

export const DEFAULT_INCOME_CATEGORIES: { name: string; icon: string }[] = [
  { name: "Зарплата", icon: "💰" },
  { name: "Премия", icon: "🎁" },
  { name: "Доход от ИП", icon: "🏪" },
  { name: "Доход от бизнеса", icon: "📈" },
  { name: "Доход супруга(и)", icon: "👥" },
  { name: "Доход от тендеров", icon: "🏆" },
  { name: "Другие поступления", icon: "🔹" },
];

export const MANDATORY_CATEGORY_NAMES = new Set([
  "Кредиты",
  "Коммунальные услуги",
  "Налоги",
  "Связь",
  "Образование",
]);
