"use client";

import * as React from "react";
import { Plus, Pencil, Trash2, Megaphone, Upload, Settings, UserPlus, Plug, LogIn, LogOut } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Activity {
  action: string;
  target: string;
  user: string;
  time: Date;
  type: "create" | "update" | "delete" | "publish" | "upload" | "settings" | "user" | "plugin" | "login" | "logout";
}

const activities: Activity[] = [
  { action: "Created", target: "New Page: About Us", user: "Aditya", time: new Date(Date.now() - 2 * 60 * 1000), type: "create" },
  { action: "Published", target: "Getting Started with NodePress", user: "Aditya", time: new Date(Date.now() - 15 * 60 * 1000), type: "publish" },
  { action: "Uploaded", target: "hero-image.jpg", user: "Sarah", time: new Date(Date.now() - 30 * 60 * 1000), type: "upload" },
  { action: "Updated", target: "General Settings", user: "Aditya", time: new Date(Date.now() - 60 * 60 * 1000), type: "settings" },
  { action: "Created", target: "User: john@example.com", user: "Admin", time: new Date(Date.now() - 2 * 60 * 60 * 1000), type: "user" },
  { action: "Deleted", target: "old-draft-post", user: "Mike", time: new Date(Date.now() - 3 * 60 * 60 * 1000), type: "delete" },
  { action: "Activated", target: "SEO Toolkit plugin", user: "Aditya", time: new Date(Date.now() - 5 * 60 * 60 * 1000), type: "plugin" },
  { action: "Updated", target: "Performance Optimization Tips", user: "Sarah", time: new Date(Date.now() - 8 * 60 * 60 * 1000), type: "update" },
  { action: "Published", target: "REST API Best Practices", user: "Lisa", time: new Date(Date.now() - 24 * 60 * 60 * 1000), type: "publish" },
  { action: "Logged in", target: "From admin panel", user: "Aditya", time: new Date(Date.now() - 24 * 60 * 60 * 1000), type: "login" },
];

const typeIcons: Record<string, React.ElementType> = {
  create: Plus,
  update: Pencil,
  delete: Trash2,
  publish: Megaphone,
  upload: Upload,
  settings: Settings,
  user: UserPlus,
  plugin: Plug,
  login: LogIn,
  logout: LogOut,
};

const typeColors: Record<string, string> = {
  create: "text-emerald-600 dark:text-emerald-400",
  update: "text-blue-600 dark:text-blue-400",
  delete: "text-red-600 dark:text-red-400",
  publish: "text-violet-600 dark:text-violet-400",
  upload: "text-amber-600 dark:text-amber-400",
  settings: "text-sky-600 dark:text-sky-400",
  user: "text-green-600 dark:text-green-400",
  plugin: "text-purple-600 dark:text-purple-400",
  login: "text-gray-600 dark:text-gray-400",
  logout: "text-gray-600 dark:text-gray-400",
};

const bgColors: Record<string, string> = {
  create: "bg-emerald-100 dark:bg-emerald-900/30",
  update: "bg-blue-100 dark:bg-blue-900/30",
  delete: "bg-red-100 dark:bg-red-900/30",
  publish: "bg-violet-100 dark:bg-violet-900/30",
  upload: "bg-amber-100 dark:bg-amber-900/30",
  settings: "bg-sky-100 dark:bg-sky-900/30",
  user: "bg-green-100 dark:bg-green-900/30",
  plugin: "bg-purple-100 dark:bg-purple-900/30",
  login: "bg-gray-100 dark:bg-gray-800",
  logout: "bg-gray-100 dark:bg-gray-800",
};

function getRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "baru saja";
  if (minutes < 60) return `${minutes} menit yang lalu`;
  if (hours < 24) return `${hours} jam yang lalu`;
  return `${days} hari yang lalu`;
}

export function ActivityWidget() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {activities.map((act, i) => {
            const Icon = typeIcons[act.type] || Pencil;
            return (
              <div
                key={i}
                className="flex items-start gap-3 px-6 py-3 hover:bg-muted/50 transition-colors"
              >
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full shrink-0 ${bgColors[act.type]}`}
                >
                  <Icon className={`h-3.5 w-3.5 ${typeColors[act.type]}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{act.user}</span>{" "}
                    <span className="text-muted-foreground">
                      {act.action.toLowerCase()}
                    </span>{" "}
                    <span className="font-medium">{act.target}</span>
                  </p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                  {getRelativeTime(act.time)}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
