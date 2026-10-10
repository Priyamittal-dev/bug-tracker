"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Shield, Building2, Users, Layers, CreditCard } from "lucide-react";

const NAV_ITEMS = [
  { href: "/settings/profile", label: "Profile", icon: User },
  { href: "/settings/security", label: "Security", icon: Shield },
  { href: "/settings/organizations", label: "Organizations", icon: Building2 },
  { href: "/settings/members", label: "Members & RBAC", icon: Users },
  { href: "/settings/teams", label: "Teams & Squads", icon: Layers },
  { href: "/settings/billing", label: "Billing & Payments", icon: CreditCard },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 pb-16">
      <div className="border-b border-border/60 pb-4">
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
          Workspace Settings
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Manage your account profile, organization configuration, functional
          squads, and RBAC permissions.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
        {/* Settings Sub-Navigation */}
        <aside className="w-full md:w-56 shrink-0">
          <nav className="flex md:flex-col gap-1.5 overflow-x-auto custom-scrollbar pb-2 md:pb-0">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    isActive
                      ? "bg-primary/10 text-primary font-bold shadow-2xs border border-primary/20"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Content Panel */}
        <main className="flex-1 w-full bg-card border border-border/60 rounded-xl p-4 sm:p-6 shadow-2xs">
          {children}
        </main>
      </div>
    </div>
  );
}
