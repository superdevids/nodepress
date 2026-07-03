"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const toolsNav = [
  { label: "Site Health", href: "/admin/tools/health" },
  { label: "Updates", href: "/admin/tools/updates" },
  { label: "Scheduled Tasks", href: "/admin/tools/scheduled-tasks" },
  { label: "Import / Export", href: "/admin/tools/import" },
  { label: "Database", href: "/admin/tools/database" },
];

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-full">
      {/* Tools nav sidebar */}
      <aside className="w-56 border-r bg-background shrink-0 hidden md:block">
        <nav className="p-4 space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-3">
            Tools
          </p>
          {toolsNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center rounded-md px-3 py-2 text-sm transition-colors",
                pathname === item.href
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}
