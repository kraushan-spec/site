"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MOBILE_NAV_ITEMS } from "@/lib/nav";

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-surface border-t border-border pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5">
        {MOBILE_NAV_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium ${
                active ? "text-primary" : "text-foreground/50"
              }`}
            >
              <Icon size={20} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
