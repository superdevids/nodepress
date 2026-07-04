'use client';

import * as React from 'react';
import { Save, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { useApi } from '@/lib/use-api';

interface ReadingSettings {
  posts_per_page: number;
  page_for_posts: string;
  page_on_front: string;
  show_on_front: 'posts' | 'page';
  search_engine_visibility: boolean;
}

const DEFAULT_SETTINGS: ReadingSettings = {
  posts_per_page: 10,
  page_for_posts: '',
  page_on_front: '',
  show_on_front: 'posts',
  search_engine_visibility: false,
};

export default function ReadingSettingsPage() {
  const api = useApi();
  const { success, error: showError } = useToast();

  const [settings, setSettings] = React.useState<ReadingSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [fetchError, setFetchError] = React.useState<string | null>(null);

  const fetchSettings = React.useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await api.get<ReadingSettings>('/api/settings/reading');
      setSettings({ ...DEFAULT_SETTINGS, ...res.data });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load settings';
      setFetchError(msg);
      showError('Error', msg);
    } finally {
      setLoading(false);
    }
  }, [api, showError]);

  React.useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch('/api/settings/reading', settings);
      success('Settings saved', 'Reading settings have been updated.');
    } catch (err) {
      showError('Failed to save', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const update = <K extends keyof ReadingSettings>(key: K, value: ReadingSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  // ─── Loading state ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-2xl space-y-6 p-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Error state ────────────────────────────────────────────────────

  if (fetchError) {
    return (
      <div className="max-w-2xl space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reading Settings</h1>
          <p className="text-muted-foreground mt-1">
            Control how your content is displayed to visitors.
          </p>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="text-destructive mx-auto mb-4 h-12 w-12" />
            <h3 className="mb-2 text-lg font-semibold">Failed to load settings</h3>
            <p className="text-muted-foreground mb-4">{fetchError}</p>
            <Button onClick={fetchSettings}>
              <RefreshCw className="mr-2 h-4 w-4" /> Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Main form ──────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reading Settings</h1>
        <p className="text-muted-foreground mt-1">
          Control how your content is displayed to visitors.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Content Display</CardTitle>
          <CardDescription>
            Configure how posts and pages are displayed on the frontend.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="posts_per_page">Posts per page</Label>
            <Input
              id="posts_per_page"
              type="number"
              value={settings.posts_per_page}
              onChange={(e) => update('posts_per_page', parseInt(e.target.value) || 1)}
              className="w-32"
            />
            <p className="text-muted-foreground text-xs">
              Maximum number of posts shown on archive pages.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="show_on_front">Front page displays</Label>
            <Select
              value={settings.show_on_front}
              onValueChange={(v: 'posts' | 'page') => update('show_on_front', v)}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="posts">Your latest posts</SelectItem>
                <SelectItem value="page">A static page</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {settings.show_on_front === 'page' && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="page_on_front">Homepage</Label>
                <Input
                  id="page_on_front"
                  value={settings.page_on_front}
                  onChange={(e) => update('page_on_front', e.target.value)}
                  placeholder="Page ID or slug"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="page_for_posts">Posts page</Label>
                <Input
                  id="page_for_posts"
                  value={settings.page_for_posts}
                  onChange={(e) => update('page_for_posts', e.target.value)}
                  placeholder="Page ID or slug"
                />
              </div>
            </>
          )}

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="search_engine_visibility">Search engine visibility</Label>
              <p className="text-muted-foreground text-xs">
                Discourage search engines from indexing this site.
              </p>
            </div>
            <Switch
              id="search_engine_visibility"
              checked={settings.search_engine_visibility}
              onCheckedChange={(checked) => update('search_engine_visibility', checked)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
