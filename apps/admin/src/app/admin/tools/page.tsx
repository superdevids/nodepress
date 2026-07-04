'use client';

import * as React from 'react';
import Link from 'next/link';
import { Activity, Database, Upload, RefreshCw, Clock, HeartPulse, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const toolLinks = [
  {
    title: 'Import / Export',
    description: 'Import and export content, settings, and data in JSON or CSV format.',
    href: '/admin/tools/import',
    icon: Upload,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-950',
  },
  {
    title: 'Site Health',
    description: 'Diagnose and monitor your site health, performance, and server info.',
    href: '/admin/tools/health',
    icon: HeartPulse,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-100 dark:bg-emerald-950',
  },
  {
    title: 'Updates',
    description: 'Keep NodePress core, plugins, and themes up to date.',
    href: '/admin/tools/updates',
    icon: RefreshCw,
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-100 dark:bg-violet-950',
  },
  {
    title: 'Scheduled Tasks',
    description: 'View and manage cron jobs for automated maintenance tasks.',
    href: '/admin/tools/scheduled-tasks',
    icon: Clock,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-100 dark:bg-amber-950',
  },
  {
    title: 'Database',
    description: 'View database tables, stats, and run optimization tasks.',
    href: '/admin/tools/database',
    icon: Database,
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-100 dark:bg-rose-950',
  },
];

export default function ToolsIndexPage() {
  return (
    <div className="max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tools</h1>
        <p className="text-muted-foreground mt-1">
          Utilities for managing, maintaining, and optimizing your site.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {toolLinks.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link key={tool.href} href={tool.href} className="group">
              <Card className="hover:border-primary/50 h-full transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-4">
                    <div className={`rounded-lg p-2.5 ${tool.bg}`}>
                      <Icon className={`h-5 w-5 ${tool.color}`} />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2 text-base">
                        {tool.title}
                        <ArrowRight className="text-muted-foreground -ml-1 h-3.5 w-3.5 opacity-0 transition-all group-hover:ml-0 group-hover:opacity-100" />
                      </CardTitle>
                      <CardDescription className="mt-1 text-xs">{tool.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
