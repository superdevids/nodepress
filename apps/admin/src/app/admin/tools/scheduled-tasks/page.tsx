'use client';

import * as React from 'react';
import { Play, Pause, Clock, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import { useApi } from '@/lib/use-api';
import { useToast } from '@/components/ui/toast';

interface ScheduledTask {
  id: string;
  name: string;
  hook: string;
  interval: string;
  status: 'running' | 'paused' | 'scheduled';
  lastRun?: string;
  nextRun?: string;
}

const statusColors: Record<string, 'success' | 'secondary' | 'warning'> = {
  running: 'success',
  scheduled: 'warning',
  paused: 'secondary',
};

export default function ScheduledTasksPage() {
  const { get, post } = useApi();
  const { success, error: showError } = useToast();
  const [taskList, setTaskList] = React.useState<ScheduledTask[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<string | null>(null);

  const fetchTasks = React.useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await get<ScheduledTask[]>('/scheduled-tasks');
      setTaskList(res.data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load scheduled tasks';
      setFetchError(message);
      showError('Error', message);
    } finally {
      setLoading(false);
    }
  }, [get, showError]);

  React.useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const toggleTask = async (id: string) => {
    const task = taskList.find((t) => t.id === id);
    if (!task) return;

    const newStatus = task.status === 'paused' ? 'running' : 'paused';
    try {
      if (newStatus === 'running') {
        await post(`/scheduled-tasks/${id}/resume`);
      } else {
        await post(`/scheduled-tasks/${id}/pause`);
      }
      setTaskList((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: newStatus as ScheduledTask['status'] } : t)),
      );
      success(
        newStatus === 'running' ? 'Task Resumed' : 'Task Paused',
        `"${task.name}" has been ${newStatus === 'running' ? 'resumed' : 'paused'}.`,
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to toggle task';
      showError('Error', message);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center space-y-6 p-6">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-6 p-6 text-center">
        <AlertCircle className="text-destructive mb-3 h-10 w-10" />
        <p className="text-destructive font-medium">{fetchError}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={fetchTasks}>
          <RefreshCw className="mr-1.5 h-4 w-4" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Scheduled Tasks</h1>
          <p className="text-muted-foreground mt-1">View and manage cron jobs.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchTasks} disabled={loading}>
          <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {taskList.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center">
          <Clock className="mx-auto mb-3 h-10 w-10 opacity-50" />
          <p>No scheduled tasks found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {taskList.map((task) => (
            <Card key={task.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-muted rounded-lg p-2">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{task.name}</CardTitle>
                      <p className="text-muted-foreground mt-0.5 font-mono text-xs">{task.hook}</p>
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
                      {task.status === 'paused' ? (
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
                      {task.lastRun ? formatDate(task.lastRun) : '\u2014'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Next Run:</span>
                    <span className="ml-2">
                      {task.nextRun ? formatDate(task.nextRun) : '\u2014'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
