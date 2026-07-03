"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Image,
  Users,
  MessageSquare,
  Plug,
  Layout,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatItem {
  label: string;
  value: number;
  icon: React.ElementType;
  trend?: { direction: "up" | "down"; percentage: number };
  href?: string;
}

const stats: StatItem[] = [
  {
    label: "Published Posts",
    value: 128,
    icon: FileText,
    trend: { direction: "up", percentage: 12 },
    href: "/admin/content",
  },
  {
    label: "Pages",
    value: 24,
    icon: Layout,
    trend: { direction: "up", percentage: 4 },
    href: "/admin/content/page",
  },
  {
    label: "Media Items",
    value: 1024,
    icon: Image,
    trend: { direction: "up", percentage: 8 },
    href: "/admin/media",
  },
  {
    label: "Comments",
    value: 312,
    icon: MessageSquare,
    trend: { direction: "down", percentage: 5 },
    href: "/admin/content/comment",
  },
  {
    label: "Users",
    value: 24,
    icon: Users,
    trend: { direction: "up", percentage: 3 },
    href: "/admin/users",
  },
  {
    label: "Active Plugins",
    value: 12,
    icon: Plug,
    trend: { direction: "up", percentage: 0 },
    href: "/admin/plugins",
  },
];

export function AtAGlance() {
  const router = useRouter();

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {stats.map((stat) => (
        <Card
          key={stat.label}
          className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
          onClick={() => stat.href && router.push(stat.href)}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.label}
            </CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stat.value.toLocaleString()}
            </div>
            {stat.trend && (
              <p
                className={`text-xs mt-1 ${
                  stat.trend.direction === "up"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {stat.trend.direction === "up" ? "\u2191" : "\u2193"}{" "}
                {stat.trend.percentage}% from last month
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
