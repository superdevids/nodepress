'use client';

import * as React from 'react';
import { Save, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { useApi, ApiError } from '@/lib/api-helper';

interface SEOSettings {
  meta_title: string;
  meta_description: string;
  og_image: string;
  canonical_url: string;
  robots: string;
  sitemap_enabled: boolean;
}

const DEFAULT_SETTINGS: SEOSettings = {
  meta_title: '',
  meta_description: '',
  og_image: '',
  canonical_url: '',
  robots: 'index, follow',
  sitemap_enabled: true,
};

export default function SEOSettingsPage() {
  const api = useApi();
  const { success, error: showError } = useToast();

  const [settings, setSettings] = React.useState<SEOSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [fetchError, setFetchError] = React.useState<string | null>(null);

  const fetchSettings = React.useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await api.get<SEOSettings>('/settings/seo');
      setSettings({ ...DEFAULT_SETTINGS, ...data });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to load settings';
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
      await api.put('/settings/seo', settings);
      success('SEO settings saved', 'Default meta settings have been updated.');
    } catch (err) {
      showError('Failed to save', err instanceof ApiError ? err.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const update = <K extends keyof SEOSettings>(key: K, value: SEOSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  // ─── Loading state ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-2xl space-y-6 p-6">
        <div>
          <Skeleton className="h-8 w-40" />
          <Skeleton className="mt-2 h-4 w-80" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-16 w-full" />
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
          <h1 className="text-2xl font-bold tracking-tight">SEO Settings</h1>
          <p className="text-muted-foreground mt-1">
            Default meta tags, Open Graph, sitemap, and search engine preferences.
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
        <h1 className="text-2xl font-bold tracking-tight">SEO Settings</h1>
        <p className="text-muted-foreground mt-1">
          Default meta tags, Open Graph, sitemap, and search engine preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Default Meta</CardTitle>
          <CardDescription>
            Default meta tags used when no specific values are set on a page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="meta_title">Default Meta Title</Label>
            <Input
              id="meta_title"
              value={settings.meta_title}
              onChange={(e) => update('meta_title', e.target.value)}
              placeholder="Site title"
            />
            <p className="text-muted-foreground text-xs">
              Used when no specific meta title is set. Recommended: 50-60 characters.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="meta_description">Default Meta Description</Label>
            <Textarea
              id="meta_description"
              value={settings.meta_description}
              onChange={(e) => update('meta_description', e.target.value)}
              placeholder="Describe your site..."
              className="min-h-[80px]"
            />
            <p className="text-muted-foreground text-xs">
              Used when no specific meta description is set. Recommended: 150-160 characters.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="og_image">Default OG Image URL</Label>
            <Input
              id="og_image"
              value={settings.og_image}
              onChange={(e) => update('og_image', e.target.value)}
              placeholder="https://example.com/og-image.png"
            />
            <p className="text-muted-foreground text-xs">
              Default Open Graph image for social sharing.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="canonical_url">Canonical URL</Label>
            <Input
              id="canonical_url"
              value={settings.canonical_url}
              onChange={(e) => update('canonical_url', e.target.value)}
              placeholder="https://example.com"
            />
            <p className="text-muted-foreground text-xs">Default canonical URL for all pages.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Search Engines</CardTitle>
          <CardDescription>Control how search engines index and crawl your site.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="robots">Robots Meta Tag</Label>
            <Input
              id="robots"
              value={settings.robots}
              onChange={(e) => update('robots', e.target.value)}
              placeholder="index, follow"
            />
            <p className="text-muted-foreground text-xs">
              Default robots meta directive. e.g., "index, follow" or "noindex, nofollow".
            </p>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="sitemap_enabled">Auto-generate sitemap.xml</Label>
              <p className="text-muted-foreground text-xs">
                Automatically generate and update sitemap.xml when content changes.
              </p>
            </div>
            <Switch
              id="sitemap_enabled"
              checked={settings.sitemap_enabled}
              onCheckedChange={(checked) => update('sitemap_enabled', checked)}
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
