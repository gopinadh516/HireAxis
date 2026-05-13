"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  BriefcaseIcon,
  LayoutDashboardIcon,
  UsersIcon,
  BellIcon,
  LogOutIcon,
  CheckCircleIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { usePendingCount } from "@/hooks/use-talents";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  dynamicBadge?: boolean;
}

const managerNav: NavItem[] = [
  { label: "Dashboard",     href: "/manager",               icon: LayoutDashboardIcon },
  { label: "Jobs",          href: "/manager/jobs",          icon: BriefcaseIcon },
  { label: "Talents",       href: "/manager/talents",       icon: UsersIcon },
  { label: "Approvals",     href: "/manager/approvals",     icon: CheckCircleIcon, dynamicBadge: true },
  { label: "Notifications", href: "/manager/notifications", icon: BellIcon, badge: 3 },
];

const recruiterNav: NavItem[] = [
  { label: "Dashboard", href: "/recruiter",         icon: LayoutDashboardIcon },
  { label: "My Jobs",   href: "/recruiter/jobs",    icon: BriefcaseIcon },
  { label: "Talents",   href: "/recruiter/talents", icon: UsersIcon },
];

interface SidebarProps {
  role: "manager" | "recruiter";
  userName: string;
}

export function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname();
  const nav = role === "manager" ? managerNav : recruiterNav;
  const pendingCount = usePendingCount();

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-border bg-sidebar">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-border px-5">
        <div className="flex size-7 items-center justify-center rounded-lg bg-primary">
          <BriefcaseIcon className="size-3.5 text-primary-foreground" />
        </div>
        <span className="text-sm font-semibold tracking-tight text-foreground">HireAxis</span>
      </div>

      {/* Role pill */}
      <div className="px-4 pt-4">
        <div className="rounded-md bg-accent px-3 py-2">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {role}
          </p>
          <p className="mt-0.5 text-sm font-medium text-foreground">{userName}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-3 pt-4">
        {nav.map(({ label, href, icon: Icon, badge, dynamicBadge }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          const displayBadge = dynamicBadge ? pendingCount : badge;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {displayBadge != null && displayBadge > 0 && (
                <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-[11px]">
                  {displayBadge}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-3">
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <LogOutIcon className="size-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
