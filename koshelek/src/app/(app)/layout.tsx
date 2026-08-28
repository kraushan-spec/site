import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { SidebarNav } from "@/components/shell/sidebar-nav";
import { Topbar } from "@/components/shell/topbar";
import { MobileNav } from "@/components/shell/mobile-nav";
import { ensureNotifications } from "@/lib/notifications-engine";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  await ensureNotifications(user.householdId).catch((e) => console.error("notif engine", e));

  const [household, unreadCount] = await Promise.all([
    prisma.household.findUnique({ where: { id: user.householdId } }),
    prisma.notification.count({ where: { householdId: user.householdId, isRead: false } }),
  ]);

  return (
    <div className="flex min-h-screen">
      <SidebarNav />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar
          userName={user.name || user.email || "Пользователь"}
          householdName={household?.name ?? ""}
          unreadCount={unreadCount}
        />
        <main className="flex-1 p-4 lg:p-6 pb-24 lg:pb-6">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}
