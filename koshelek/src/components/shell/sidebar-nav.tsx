"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { NAV_ITEMS } from "@/lib/nav";
import { Wallet, Bot, Send } from "lucide-react";
import { ExportButton } from "@/components/export-button";

export function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [question, setQuestion] = useState("");

  return (
    <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 border-r border-border bg-surface min-h-screen sticky top-0">
      <div className="flex items-center gap-2 px-5 h-16 border-b border-border">
        <div className="icon-badge bg-primary text-white shrink-0">
          <Wallet size={20} />
        </div>
        <span className="font-bold text-[15px] leading-tight">Кошелёк Онлайн</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-foreground/70 hover:bg-[#f4f5fa] hover:text-foreground"
              }`}
            >
              <Icon size={18} className={active ? "text-primary" : "text-foreground/50"} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 space-y-2 border-t border-border">
        <ExportButton scope="all" label="Выгрузить в Excel" className="btn btn-secondary btn-sm w-full" />
        <form
          className="flex items-center gap-1.5 bg-[#f4f5fa] rounded-xl px-2.5 py-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!question.trim()) return;
            router.push(`/assistant?q=${encodeURIComponent(question)}`);
          }}
        >
          <Bot size={15} className="text-primary shrink-0" />
          <input
            className="flex-1 bg-transparent text-xs outline-none min-w-0"
            placeholder="AI-помощник: задайте вопрос..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <button type="submit" className="text-primary shrink-0">
            <Send size={14} />
          </button>
        </form>
      </div>
    </aside>
  );
}
