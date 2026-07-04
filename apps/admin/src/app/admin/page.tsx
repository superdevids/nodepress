'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  File,
  Users,
  MessageSquare,
  Layout,
  Plug,
  ChevronDown,
  GripVertical,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  BookOpen,
  Lightbulb,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  Loader2,
  FileEdit,
  Image,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useApi } from '@/lib/use-api';
import { useLocalStorage } from '@/lib/hooks';
import { useToast } from '@/components/ui/toast';
import { registerScreenOption } from '@/components/admin/screen-options';
import { STORAGE_KEYS } from '@/lib/constants';

// ─── Types ──────────────────────────────────────────────────

interface DashboardStats {
  posts: number;
  pages: number;
  media: number;
  comments: number;
  users: number;
  published: number;
  drafts: number;
  activePlugins: number;
}

interface ActivityItem {
  id: string;
  actor: { id: string; name: string; email: string };
  action: string;
  targetType: string;
  targetId: string;
  createdAt: string;
}

interface TrendSnapshot {
  posts: number;
  pages: number;
  comments: number;
  users: number;
  media: number;
  activePlugins: number;
}

interface WidgetDefinition {
  id: string;
  title: string;
  defaultVisible: boolean;
}

type TrendDirection = 'up' | 'down' | 'flat' | 'none';

interface TrendInfo {
  direction: TrendDirection;
  diff: number;
}

// ─── Constants ──────────────────────────────────────────────

const WIDGETS: WidgetDefinition[] = [
  { id: 'at_a_glance', title: 'At a Glance', defaultVisible: true },
  { id: 'activity', title: 'Activity', defaultVisible: true },
  { id: 'quick_draft', title: 'Quick Draft', defaultVisible: true },
  { id: 'nodepress_tips', title: 'NodePress Tips', defaultVisible: true },
];

const DEFAULT_WIDGET_ORDER = WIDGETS.map((w) => w.id);

const TREND_STORAGE_KEY = 'nodepress_dashboard_trend_snapshot';

const GLANCE_ITEMS: {
  key: keyof TrendSnapshot;
  label: string;
  icon: React.ElementType;
  href: string;
  color: string;
}[] = [
  {
    key: 'posts',
    label: 'Posts',
    icon: FileText,
    href: '/admin/content',
    color: 'text-blue-600 dark:text-blue-400',
  },
  {
    key: 'pages',
    label: 'Pages',
    icon: File,
    href: '/admin/content/page',
    color: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    key: 'comments',
    label: 'Comments',
    icon: MessageSquare,
    href: '/admin/content/comment',
    color: 'text-purple-600 dark:text-purple-400',
  },
  {
    key: 'users',
    label: 'Users',
    icon: Users,
    href: '/admin/users',
    color: 'text-violet-600 dark:text-violet-400',
  },
  {
    key: 'media',
    label: 'Media',
    icon: Image,
    href: '/admin/media',
    color: 'text-amber-600 dark:text-amber-400',
  },
  {
    key: 'activePlugins',
    label: 'Plugins',
    icon: Plug,
    href: '/admin/plugins',
    color: 'text-rose-600 dark:text-rose-400',
  },
];

const NODEPRESS_TIPS = [
  {
    icon: Sparkles,
    title: 'Welcome to NodePress!',
    desc: 'Get started by creating your first post or customizing your site settings.',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    href: '/admin/settings/general',
    linkText: 'Go to Settings',
  },
  {
    icon: BookOpen,
    title: 'Read the Documentation',
    desc: 'Learn about all the features NodePress has to offer, from content management to SEO.',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    href: '#',
    linkText: 'View Docs',
  },
  {
    icon: Layout,
    title: 'Customize Your Theme',
    desc: 'Change your site appearance, configure layouts, and make it your own.',
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    href: '/admin/themes',
    linkText: 'Manage Themes',
  },
  {
    icon: Lightbulb,
    title: 'Extend with Plugins',
    desc: 'Add new features and functionality by installing plugins from the marketplace.',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    href: '/admin/plugins',
    linkText: 'Browse Plugins',
  },
];

// ─── Helpers ────────────────────────────────────────────────

function getRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function calculateTrend(current: number, previous: number | undefined): TrendInfo {
  if (previous === undefined || previous === null) {
    return { direction: 'none', diff: 0 };
  }
  if (current > previous) {
    return { direction: 'up', diff: current - previous };
  }
  if (current < previous) {
    return { direction: 'down', diff: previous - current };
  }
  return { direction: 'flat', diff: 0 };
}

function TrendBadge({ trend }: { trend: TrendInfo }) {
  if (trend.direction === 'none') {
    return <span className="text-muted-foreground/40 ml-auto text-xs">—</span>;
  }
  const Icon =
    trend.direction === 'up' ? TrendingUp : trend.direction === 'down' ? TrendingDown : Minus;
  const color =
    trend.direction === 'up'
      ? 'text-green-600 dark:text-green-400'
      : trend.direction === 'down'
        ? 'text-red-600 dark:text-red-400'
        : 'text-muted-foreground';
  return (
    <span className={cn('ml-auto inline-flex items-center gap-0.5 text-xs font-medium', color)}>
      <Icon className="h-3 w-3" />
      {trend.diff > 0 && trend.direction !== 'flat' ? trend.diff : ''}
    </span>
  );
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(name: string): string {
  const colors = [
    'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
    'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
    'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
    'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300',
    'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300',
    'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300',
    'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return (
    colors[Math.abs(hash) % colors.length] ??
    'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
  );
}

// ─── Sub-Components ─────────────────────────────────────────

function DashboardWidgetSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-1">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-6 w-6 shrink-0 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-3/4" />
          </div>
          <Skeleton className="h-3 w-12 shrink-0" />
        </div>
      ))}
    </div>
  );
}

function ErrorRetry({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <AlertCircle className="text-destructive mb-2 h-7 w-7" />
      <p className="text-destructive text-sm font-medium">{message}</p>
      <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
        <RefreshCw className="mr-1.5 h-3 w-3" /> Retry
      </Button>
    </div>
  );
}

// ─── At a Glance Widget (WordPress-style compact list) ──────

function AtAGlanceWidget() {
  const router = useRouter();
  const { get } = useApi();
  const [stats, setStats] = React.useState<DashboardStats | null>(null);
  const [trends, setTrends] = React.useState<Record<string, TrendInfo>>({});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await get<DashboardStats>('/api/dashboard/at-a-glance');
      const data = res.data;
      setStats(data);

      // Load previous snapshot for trend comparison
      let prev: Partial<TrendSnapshot> = {};
      try {
        const raw = localStorage.getItem(TREND_STORAGE_KEY);
        if (raw) prev = JSON.parse(raw);
      } catch {
        /* ignore */
      }

      const computed: Record<string, TrendInfo> = {};
      const keys: (keyof TrendSnapshot)[] = [
        'posts',
        'pages',
        'comments',
        'users',
        'media',
        'activePlugins',
      ];
      for (const k of keys) {
        computed[k] = calculateTrend((data as unknown as TrendSnapshot)[k] ?? 0, prev[k]);
      }
      setTrends(computed);

      // Store current snapshot for next comparison
      try {
        localStorage.setItem(
          TREND_STORAGE_KEY,
          JSON.stringify({
            posts: data.posts,
            pages: data.pages,
            comments: data.comments,
            users: data.users,
            media: data.media,
            activePlugins: data.activePlugins,
          }),
        );
      } catch {
        /* ignore */
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load stats';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [get]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <>
      {loading ? (
        <DashboardWidgetSkeleton rows={6} />
      ) : error ? (
        <ErrorRetry message={error} onRetry={fetchData} />
      ) : (
        <div className="divide-y">
          {GLANCE_ITEMS.map((item) => {
            const Icon = item.icon;
            const value = (stats as unknown as Record<string, number>)?.[item.key] ?? 0;
            const trend = trends[item.key] ?? { direction: 'none', diff: 0 };

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => router.push(item.href)}
                className="hover:bg-muted/50 flex w-full items-center gap-3 px-5 py-2.5 text-left transition-colors"
              >
                <div
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                    item.color.replace('text-', 'bg-').replace('dark:text-', 'dark:bg-') +
                      '/10 dark:opacity-80',
                  )}
                >
                  <Icon className={cn('h-3.5 w-3.5', item.color)} />
                </div>
                <span className="text-sm">
                  <span className="font-medium">{value.toLocaleString()}</span>{' '}
                  <span className="text-muted-foreground">{item.label}</span>
                </span>
                <TrendBadge trend={trend} />
                <ChevronRightIcon className="text-muted-foreground/30 h-3 w-3 shrink-0" />
              </button>
            );
          })}
          <div className="px-5 py-2">
            <button
              type="button"
              onClick={() => router.push('/admin/content')}
              className="text-primary hover:text-primary/80 inline-flex items-center gap-1 text-xs font-medium transition-colors"
            >
              View All Content
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

// ─── Activity Widget ────────────────────────────────────────

function ActivityWidget() {
  const { get } = useApi();
  const [activities, setActivities] = React.useState<ActivityItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchActivity = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await get<ActivityItem[]>('/api/dashboard/activity');
      setActivities(Array.isArray(res.data) ? res.data : []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load activity';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [get]);

  React.useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  return (
    <>
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
        </div>
      ) : error ? (
        <ErrorRetry message={error} onRetry={fetchActivity} />
      ) : activities.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center py-8 text-center">
          <Eye className="mb-2 h-8 w-8 opacity-40" />
          <p className="text-sm">No recent activity</p>
          <p className="mt-0.5 text-xs opacity-60">Actions like creating posts will appear here.</p>
        </div>
      ) : (
        <div className="divide-y">
          {activities.slice(0, 10).map((item) => (
            <div
              key={item.id}
              className="hover:bg-muted/50 flex items-start gap-3 px-5 py-2.5 transition-colors"
            >
              <div
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                  getAvatarColor(item.actor.name),
                )}
              >
                {getInitials(item.actor.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-snug">
                  <span className="font-medium">{item.actor.name}</span>{' '}
                  <span className="text-muted-foreground">{item.action.toLowerCase()}</span>
                </p>
                <p className="text-muted-foreground/70 mt-0.5 text-xs">{item.targetType}</p>
              </div>
              <span className="text-muted-foreground/60 shrink-0 whitespace-nowrap text-[11px]">
                {getRelativeTime(item.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ─── Quick Draft Widget ─────────────────────────────────────

function QuickDraftWidget() {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const { post } = useApi();
  const [title, setTitle] = React.useState('');
  const [content, setContent] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    try {
      const res = await post<{ id: string }>('/api/content/post', {
        title: title.trim(),
        content: content.trim() || '',
        status: 'draft',
        type: 'post',
      });
      const newId = res.data?.id || Math.random().toString(36).slice(2);
      success('Draft saved!', `"${title.trim()}" has been saved as a draft.`);
      setTitle('');
      setContent('');
      router.push(`/admin/content/post/${newId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save draft';
      showError('Failed to save draft', msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-3 px-5 py-3">
      <Input
        placeholder="Draft title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="h-9 text-sm font-medium"
        disabled={saving}
      />
      <Textarea
        placeholder="Write a brief description or paste content..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="min-h-[90px] resize-none text-sm"
        disabled={saving}
      />
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground/60 text-[11px]">
          {title.trim() ? `${title.trim().length} chars` : 'Enter a title to save'}
        </span>
        <Button type="submit" size="sm" disabled={saving || !title.trim()}>
          {saving ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Saving...
            </>
          ) : (
            <>
              <FileEdit className="mr-1.5 h-3.5 w-3.5" /> Save Draft
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

// ─── NodePress Tips Widget ──────────────────────────────────

function NodePressTipsWidget() {
  const router = useRouter();

  return (
    <div className="divide-y">
      {NODEPRESS_TIPS.map((tip, i) => {
        const Icon = tip.icon;
        return (
          <div
            key={i}
            className="hover:bg-muted/50 flex items-start gap-3 px-5 py-3 transition-colors"
          >
            <div
              className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', tip.bg)}
            >
              <Icon className={cn('h-4 w-4', tip.color)} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{tip.title}</p>
              <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">{tip.desc}</p>
            </div>
            <button
              type="button"
              onClick={() => router.push(tip.href)}
              className="text-muted-foreground hover:text-foreground mt-1 shrink-0 transition-colors"
              title={tip.linkText}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Collapsible Dashboard Widget Wrapper ───────────────────

function DashboardWidget({
  widget,
  index,
  isCollapsed,
  onToggleCollapse,
  isDragging,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onRefresh,
  isLoading,
  children,
}: {
  widget: WidgetDefinition;
  index: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onDragEnd: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={cn(
        'group/widget bg-card text-card-foreground rounded-lg border shadow-sm transition-all',
        isDragging && 'ring-primary/30 opacity-50 ring-2',
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center gap-1 border-b px-1 pr-3',
          isCollapsed ? 'border-b-transparent' : 'border-b',
        )}
      >
        {/* Drag handle */}
        <button
          type="button"
          className="text-muted-foreground/30 hover:text-muted-foreground/60 flex h-9 w-6 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
          title="Drag to reorder"
          aria-label={`Drag ${widget.title} widget to reorder`}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>

        {/* Title */}
        <CardTitle className="flex-1 py-2 text-sm font-semibold">{widget.title}</CardTitle>

        {/* Refresh button (only for data widgets) */}
        {onRefresh && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRefresh();
            }}
            disabled={isLoading}
            className="text-muted-foreground/40 hover:text-muted-foreground/70 mr-0.5 flex h-7 w-7 items-center justify-center rounded transition-colors disabled:opacity-30"
            title="Refresh"
            aria-label={`Refresh ${widget.title} widget`}
          >
            <RefreshCw className={cn('h-3 w-3', isLoading && 'animate-spin')} />
          </button>
        )}

        {/* Collapse toggle */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="text-muted-foreground/40 hover:text-muted-foreground/70 flex h-7 w-7 items-center justify-center rounded transition-colors"
          title={isCollapsed ? 'Expand' : 'Collapse'}
          aria-label={
            isCollapsed ? `Expand ${widget.title} widget` : `Collapse ${widget.title} widget`
          }
          aria-expanded={!isCollapsed}
        >
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 transition-transform duration-200',
              isCollapsed ? '-rotate-90' : 'rotate-0',
            )}
          />
        </button>
      </div>

      {/* Body */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-200 ease-in-out',
          isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[2000px] opacity-100',
        )}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Main Dashboard Page ────────────────────────────────────

export default function AdminDashboardPage() {
  const router = useRouter();

  // ── Widget visibility (synced with Screen Options) ──────
  const [pluginOptions, setPluginOptions] = useLocalStorage<
    Record<string, string | number | boolean>
  >(STORAGE_KEYS.SCREEN_PLUGIN_OPTIONS, {});

  // ── Widget ordering ─────────────────────────────────────
  const [widgetOrder, setWidgetOrder] = useLocalStorage<string[]>(
    'nodepress_dashboard_widget_order',
    DEFAULT_WIDGET_ORDER,
  );

  // ── Collapse state (per widget, React state) ────────────
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});

  // ── Drag state ──────────────────────────────────────────
  const dragItem = React.useRef<string | null>(null);
  const dragOverItem = React.useRef<string | null>(null);

  // ── Register screen options on mount ────────────────────
  React.useEffect(() => {
    for (const w of WIDGETS) {
      registerScreenOption({
        id: `widget_${w.id}`,
        label: w.title,
        type: 'toggle',
        defaultValue: w.defaultVisible,
      });
    }
  }, []);

  // ── Toggle collapse for a widget ────────────────────────
  const toggleCollapse = React.useCallback((id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  // ── Build the ordered list of visible widgets ───────────
  const visibleWidgets = React.useMemo(() => {
    return widgetOrder.filter((id) => {
      const optKey = `widget_${id}`;
      const stored = pluginOptions[optKey];
      // If the option hasn't been set yet, use the default
      if (stored === undefined || stored === null) {
        return WIDGETS.find((w) => w.id === id)?.defaultVisible ?? true;
      }
      return stored === true || stored === 'true';
    });
  }, [widgetOrder, pluginOptions]);

  // ── Ensure widget order includes all widgets ────────────
  React.useEffect(() => {
    setWidgetOrder((prev) => {
      const existing = new Set(prev);
      const missing = WIDGETS.filter((w) => !existing.has(w.id)).map((w) => w.id);
      if (missing.length === 0) return prev;
      return [...prev, ...missing];
    });
  }, [setWidgetOrder]);

  // ── Drag handlers ───────────────────────────────────────
  const handleDragStart = React.useCallback((e: React.DragEvent, widgetId: string) => {
    dragItem.current = widgetId;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', widgetId);
  }, []);

  const handleDragOver = React.useCallback((e: React.DragEvent, widgetId: string) => {
    e.preventDefault();
    dragOverItem.current = widgetId;
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = React.useCallback(
    (widgetId: string) => {
      const dragged = dragItem.current;
      const target = dragOverItem.current;
      if (!dragged || !target || dragged === target) return;

      setWidgetOrder((prev) => {
        const newOrder = [...prev];
        const fromIdx = newOrder.indexOf(dragged);
        const toIdx = newOrder.indexOf(target);
        if (fromIdx === -1 || toIdx === -1) return prev;
        newOrder.splice(fromIdx, 1);
        newOrder.splice(toIdx, 0, dragged);
        return newOrder;
      });

      dragItem.current = null;
      dragOverItem.current = null;
    },
    [setWidgetOrder],
  );

  const handleDragEnd = React.useCallback(() => {
    dragItem.current = null;
    dragOverItem.current = null;
  }, []);

  // ── Decide which column each widget goes into ──────────
  // WordPress-style: even widgets in left column, odd in right
  const leftCol = visibleWidgets.filter((_, i) => i % 2 === 0);
  const rightCol = visibleWidgets.filter((_, i) => i % 2 === 1);

  // ── Render a widget by ID ───────────────────────────────
  const renderWidget = (widgetId: string, index: number) => {
    const def = WIDGETS.find((w) => w.id === widgetId);
    if (!def) return null;

    const isCollapsed = !!collapsed[widgetId];

    // We need a stable key for each widget rendering
    // We'll use a local state for refresh loading states
    // Quick approach: each widget tracks its own loading
    // Since child widgets manage their own loading internally,
    // we pass a generic wrapper without a global isLoading.

    const commonProps = {
      key: widgetId,
      widget: def,
      index,
      isCollapsed,
      onToggleCollapse: () => toggleCollapse(widgetId),
      isDragging: dragItem.current === widgetId,
      onDragStart: (e: React.DragEvent) => handleDragStart(e, widgetId),
      onDragOver: (e: React.DragEvent) => handleDragOver(e, widgetId),
      onDrop: () => handleDrop(widgetId),
      onDragEnd: handleDragEnd,
    };

    // Determine refresh handler and content per widget
    // (We need to use a key to force re-mount of widgets when they switch)
    const widgetKey = widgetId;

    switch (widgetId) {
      case 'at_a_glance':
        return (
          <DashboardWidget {...commonProps} key={widgetKey}>
            <AtAGlanceWidget />
          </DashboardWidget>
        );
      case 'activity':
        return (
          <DashboardWidget {...commonProps} key={widgetKey}>
            <ActivityWidget />
          </DashboardWidget>
        );
      case 'quick_draft':
        return (
          <DashboardWidget {...commonProps} key={widgetKey}>
            <QuickDraftWidget />
          </DashboardWidget>
        );
      case 'nodepress_tips':
        return (
          <DashboardWidget {...commonProps} key={widgetKey}>
            <NodePressTipsWidget />
          </DashboardWidget>
        );
      default:
        return null;
    }
  };

  // ── Empty state when all widgets are hidden ────────────
  if (visibleWidgets.length === 0) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome to NodePress.</p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <Eye className="text-muted-foreground/30 mb-3 h-12 w-12" />
            <p className="text-lg font-medium">All widgets are hidden</p>
            <p className="text-muted-foreground mt-1 max-w-sm text-sm">
              Open <strong>Screen Options</strong> in the admin toolbar to show dashboard widgets.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-6"
              onClick={() => {
                // Reset all to visible
                setPluginOptions((prev) => {
                  const next = { ...prev };
                  for (const w of WIDGETS) {
                    next[`widget_${w.id}`] = true;
                  }
                  return next;
                });
              }}
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              Reset All Widgets
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Welcome to NodePress. Here&apos;s what&apos;s happening with your site today.
          </p>
        </div>
        <span className="text-muted-foreground/50 hidden text-[11px] sm:block">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </span>
      </div>

      {/* Widget Columns */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Left Column */}
        <div className="flex flex-col gap-5">
          {leftCol.map((widgetId, i) => {
            const globalIndex = widgetOrder.indexOf(widgetId);
            return renderWidget(widgetId, globalIndex);
          })}
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-5">
          {rightCol.map((widgetId, i) => {
            const globalIndex = widgetOrder.indexOf(widgetId);
            return renderWidget(widgetId, globalIndex);
          })}
        </div>
      </div>

      {/* Footer hint for dragging */}
      {visibleWidgets.length > 1 && (
        <p className="text-muted-foreground/40 text-center text-[11px]">
          Drag widget headers by the <GripVertical className="inline h-2.5 w-2.5 align-middle" />{' '}
          handle to reorder. Toggle visibility in Screen Options.
        </p>
      )}
    </div>
  );
}
