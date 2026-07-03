"use client";

import * as React from "react";
import { Play, Pause, Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

interface ScheduledTask {
  id: string;
  name: string;
  hook: string;
  interval: string;
  status: "running" | "paused" | "scheduled";
  lastRun?: Date;
  nextRun?: Date;
}

const tasks: ScheduledTask[] = [
  { id: "1", name: "Check for Updates", hook: "cron.check_updates", interval: "Daily", status: "running", lastRun: new Date("2026-07-02T06:00:00"), nextRun: new Date("2026-07-03T06:00:00") },
  { id: "2", name: "Cleanup Expired Sessions", hook: "cron.cleanup_sessions", interval: "Hourly", status: "running", lastRun: new Date("2026-07-02T12:00:00"), nextRun: new Date("2026-07-02T13:00:00") },
  { id: "3", name: "Generate Sitemap", hook: "cron.generate_sitemap", interval: "Weekly", status: "scheduled", lastRun: new Date("2026-06-28T06:00:00"), nextRun: new Date("2026-07-05T06:00:00") },
  { id: "4", name: "Send Email Queue", hook: "cron.send_emails", interval: "Every 5 min", status: "paused", lastRun: new Date("2026-07-01T10:00:00"), nextRun: undefined },
  { id: "5", name: "Backup Database", hook: "cron.backup_db", interval: "Daily", status: "running", lastRun: new Date("2026-07-02T04:00:00"), nextRun: new Date("2026-07-03T04:00:00") },
];

const statusColors: Record<string, "success" | "secondary" | "warning"> = {
  running: "success",
  scheduled: "warning",
  paused: "secondary",
};

/**
 * Scheduled Tasks / Cron Viewer (Gap I-14)
 */
export default function ScheduledTasksPage() {
  const [taskList, setTaskList] = React.useState(tasks);

  const toggleTask = (id: string) => {
    setTaskList((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const newStatus = t.status === "paused" ? "running" : "paused";
          return { ...t, status: newStatus as ScheduledTask["status"] };
        }
        return t;
      }),
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Scheduled Tasks</h1>
        <p className="text-muted-foreground mt-1">View and manage cron jobs. (Gap I-14)</p>
      </div>

      <div className="space-y-3">
        {taskList.map((task) => (
          <Card key={task.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-muted p-2">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{task.name}</CardTitle>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{task.hook}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={statusColors[task.status]}>{task.status}</Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => toggleTask(task.id)}
                  >
                    {task.status === "paused" ? (
                      <Play className="h-4 w-4" />
                    ) : (
                      <Pause className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Interval:</span>
                  <span className="ml-2 font-medium">{task.interval}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Last Run:</span>
                  <span className="ml-2">
                    {task.lastRun ? formatDate(task.lastRun) : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Next Run:</span>
                  <span className="ml-2">
                    {task.nextRun ? formatDate(task.nextRun) : "—"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
