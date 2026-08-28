import type { LucideIcon } from "lucide-react";
import {
  Home,
  Wallet,
  ShoppingCart,
  CreditCard,
  CalendarDays,
  Briefcase,
  BarChart3,
  Target,
  Bot,
  FileText,
  CheckSquare,
  MessageSquare,
  Settings,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Главная", icon: Home },
  { href: "/income", label: "Доходы", icon: Wallet },
  { href: "/expenses", label: "Расходы", icon: ShoppingCart },
  { href: "/credits", label: "Кредиты", icon: CreditCard },
  { href: "/calendar", label: "Календарь", icon: CalendarDays },
  { href: "/tenders", label: "Тендеры", icon: Briefcase },
  { href: "/analytics", label: "Аналитика", icon: BarChart3 },
  { href: "/goals", label: "Цели", icon: Target },
  { href: "/assistant", label: "AI-помощник", icon: Bot },
  { href: "/documents", label: "Документы", icon: FileText },
  { href: "/tasks", label: "Задачи", icon: CheckSquare },
  { href: "/comments", label: "Комментарии", icon: MessageSquare },
  { href: "/settings", label: "Настройки", icon: Settings },
];

export const MOBILE_NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Главная", icon: Home },
  { href: "/expenses", label: "Расходы", icon: ShoppingCart },
  { href: "/credits", label: "Кредиты", icon: CreditCard },
  { href: "/tenders", label: "Тендеры", icon: Briefcase },
  { href: "/assistant", label: "AI", icon: Bot },
];
