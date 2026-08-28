"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Bell, Menu, X, LogOut, ChevronDown } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav";

export function Topbar({
  userName,
  householdName,
  unreadCount,
}: {
  userName: string;
  householdName: string;
  unreadCount: number;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const current = NAV_ITEMS.find((i) => (i.href === "/" ? pathname === "/" : pathname.startsWith(i.href)));

  return (
    <>
      <header className="sticky top-0 z-30 h-16 border-b border-border bg-surface/90 backdrop-blur flex items-center gap-3 px-4 lg:px-6">
        <button
          className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-[#f4f5fa]"
          onClick={() => setMenuOpen(true)}
          aria-label="Меню"
        >
          <Menu size={20} />
        </button>
        <h1 className="font-semibold text-base lg:text-lg flex-1 truncate">
          {current?.label ?? "Кошелёк Онлайн"}
        </h1>

        <Link
          href="/tasks"
          className="relative p-2 rounded-lg hover:bg-[#f4f5fa]"
          aria-label="Уведомления"
        >
          <Bell size={19} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-[3px] rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>

        <div className="relative">
          <button
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-[#f4f5fa]"
            onClick={() => setUserMenuOpen((v) => !v)}
          >
            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:block text-left leading-tight">
              <div className="text-sm font-semibold truncate max-w-[120px]">{userName}</div>
              <div className="text-[11px] text-muted truncate max-w-[120px]">{householdName}</div>
            </div>
            <ChevronDown size={16} className="text-muted hidden sm:block" />
          </button>
          {userMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
              <div className="absolute right-0 mt-2 w-48 card p-1.5 z-50 shadow-lg">
                <Link
                  href="/settings"
                  className="block px-3 py-2 rounded-lg text-sm hover:bg-[#f4f5fa]"
                  onClick={() => setUserMenuOpen(false)}
                >
                  Настройки
                </Link>
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-danger hover:bg-danger-bg text-left"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                >
                  <LogOut size={15} /> Выйти
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-surface p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <span className="font-bold">Меню</span>
              <button onClick={() => setMenuOpen(false)} className="p-1.5 rounded-lg hover:bg-[#f4f5fa]">
                <X size={18} />
              </button>
            </div>
            <nav className="space-y-0.5">
              {NAV_ITEMS.map((item) => {
                const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                      active ? "bg-primary/10 text-primary" : "text-foreground/70"
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
