'use client';

import * as React from 'react';
import Link from 'next/link';
import { Globe, BookOpen, Link2, Search, Shield, Lock, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const settingsGroups = [
  {
    title: 'General',
    description: 'Site title, tagline, language, timezone, and admin email.',
    href: '/admin/settings/general',
    icon: Globe,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-950',
  },
  {
    title: 'Reading',
    description: 'Posts per page, default content type, and search visibility.',
    href: '/admin/settings/reading',
    icon: BookOpen,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-100 dark:bg-emerald-950',
  },
  {
    title: 'Permalinks',
    description: 'URL structure configuration for posts, pages, and taxonomies.',
    href: '/admin/settings/permalink',
    icon: Link2,
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-100 dark:bg-violet-950',
  },
  {
    title: 'SEO',
    description: 'Meta tags, sitemaps, and search engine optimization settings.',
    href: '/admin/settings/seo',
    icon: Search,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-100 dark:bg-amber-950',
  },
  {
    title: 'CORS',
    description: 'Cross-Origin Resource Sharing configuration for API access.',
    href: '/admin/settings/cors',
    icon: Lock,
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-100 dark:bg-rose-950',
  },
  {
    title: 'Security',
    description: 'Authentication, rate limiting, and security headers.',
    href: '/admin/settings/security',
    icon: Shield,
    color: 'text-slate-600 dark:text-slate-400',
    bg: 'bg-slate-100 dark:bg-slate-950',
  },
];

export default function SettingsIndexPage() {
  return (
    <div className="max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure your NodePress site settings. Select a category to get started.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {settingsGroups.map((group) => {
          const Icon = group.icon;
          return (
            <Link key={group.href} href={group.href} className="group">
              <Card className="hover:border-primary/50 h-full transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-4">
                    <div className={`rounded-lg p-2.5 ${group.bg}`}>
                      <Icon className={`h-5 w-5 ${group.color}`} />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2 text-base">
                        {group.title}
                        <ArrowRight className="text-muted-foreground -ml-1 h-3.5 w-3.5 opacity-0 transition-all group-hover:ml-0 group-hover:opacity-100" />
                      </CardTitle>
                      <CardDescription className="mt-1 text-xs">
                        {group.description}
                      </CardDescription>
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
