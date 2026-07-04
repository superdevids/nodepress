'use client';

import * as React from 'react';
import { Save, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { useApi } from '@/lib/use-api';

interface PermalinkSettings {
  permalink_structure: string;
  category_base: string;
  tag_base: string;
}

const PERMALINK_OPTIONS = [
  { value: '/?p=123', label: 'Plain', example: '/?p=123', preview: 'https://example.com/?p=123' },
  {
    value: '/%year%/%monthnum%/%day%/%postname%/',
    label: 'Day and name',
    example: '/2026/07/03/sample-post/',
    preview: 'https://example.com/2026/07/03/sample-post/',
  },
  {
    value: '/%year%/%monthnum%/%postname%/',
    label: 'Month and name',
    example: '/2026/07/sample-post/',
    preview: 'https://example.com/2026/07/sample-post/',
  },
  {
    value: '/%postname%/',
    label: 'Post name',
    example: '/sample-post/',
    preview: 'https://example.com/sample-post/',
  },
  {
    value: '/archives/%post_id%',
    label: 'Numeric',
    example: '/archives/123',
    preview: 'https://example.com/archives/123',
  },
  { value: 'custom', label: 'Custom structure', example: '', preview: '' },
];

const PRESET_STRUCTURES = PERMALINK_OPTIONS.map((o) => o.value).filter((v) => v !== 'custom');

const DEFAULT_SETTINGS: PermalinkSettings = {
  permalink_structure: '/%postname%/',
  category_base: 'category',
  tag_base: 'tag',
};

export default function PermalinkSettingsPage() {
  const api = useApi();
  const { success, error: showError } = useToast();

  const [settings, setSettings] = React.useState<PermalinkSettings>(DEFAULT_SETTINGS);
  const [customStructure, setCustomStructure] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [fetchError, setFetchError] = React.useState<string | null>(null);

  const fetchSettings = React.useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await api.get<PermalinkSettings>('/api/settings/permalink');
      const data = res.data;
      setSettings({ ...DEFAULT_SETTINGS, ...data });
      // Detect if current structure is custom
      if (data.permalink_structure && !PRESET_STRUCTURES.includes(data.permalink_structure)) {
        setCustomStructure(data.permalink_structure);
      }
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

  const isPreset = PRESET_STRUCTURES.includes(settings.permalink_structure);
  const isCustom = !settings.permalink_structure || !isPreset;

  const handleStructureChange = (value: string) => {
    if (value === 'custom') {
      setSettings((prev) => ({ ...prev, permalink_structure: customStructure || '/%postname%/' }));
    } else {
      setSettings((prev) => ({ ...prev, permalink_structure: value }));
    }
  };

  const handleCustomChange = (value: string) => {
    setCustomStructure(value);
    setSettings((prev) => ({ ...prev, permalink_structure: value }));
  };

  const selectedOption = PERMALINK_OPTIONS.find((o) => o.value === settings.permalink_structure);
  const previewUrl = isCustom
    ? `https://example.com${(customStructure || settings.permalink_structure).replace(/%[^%]+%/g, 'sample-post')}`
    : selectedOption?.preview || '';

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch('/api/settings/permalink', settings);
      success('Permalink structure saved', 'URL structure has been updated.');
    } catch (err) {
      showError('Failed to save', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ─── Loading state ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-2xl space-y-6 p-6">
        <div>
          <Skeleton className="h-8 w-56" />
          <Skeleton className="mt-2 h-4 w-72" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
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
          <h1 className="text-2xl font-bold tracking-tight">Permalink Settings</h1>
          <p className="text-muted-foreground mt-1">
            Customize your URL structure for SEO and readability.
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
        <h1 className="text-2xl font-bold tracking-tight">Permalink Settings</h1>
        <p className="text-muted-foreground mt-1">
          Customize your URL structure for SEO and readability.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Common Settings</CardTitle>
          <CardDescription>
            Choose a permalink structure for your content. Changing this will affect all existing
            URLs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={isPreset ? settings.permalink_structure : 'custom'}
            onValueChange={handleStructureChange}
          >
            {PERMALINK_OPTIONS.map((opt) => (
              <div key={opt.value} className="flex items-start gap-3 rounded-lg border p-4">
                <RadioGroupItem value={opt.value} id={opt.value} className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor={opt.value} className="cursor-pointer font-medium">
                    {opt.label}
                  </Label>
                  {opt.example && (
                    <p className="text-muted-foreground mt-0.5 font-mono text-sm">{opt.example}</p>
                  )}
                  {opt.value === 'custom' &&
                    (isCustom || settings.permalink_structure === 'custom') && (
                      <div className="mt-3">
                        <Input
                          value={customStructure}
                          onChange={(e) => handleCustomChange(e.target.value)}
                          className="font-mono text-sm"
                          placeholder="/%category%/%postname%/"
                        />
                        <p className="text-muted-foreground mt-1 text-xs">
                          Available tags:{' '}
                          <code className="bg-muted rounded px-1 text-xs">%year%</code>{' '}
                          <code className="bg-muted rounded px-1 text-xs">%monthnum%</code>{' '}
                          <code className="bg-muted rounded px-1 text-xs">%day%</code>{' '}
                          <code className="bg-muted rounded px-1 text-xs">%postname%</code>{' '}
                          <code className="bg-muted rounded px-1 text-xs">%category%</code>{' '}
                          <code className="bg-muted rounded px-1 text-xs">%post_id%</code>
                        </p>
                      </div>
                    )}
                </div>
              </div>
            ))}
          </RadioGroup>

          {previewUrl && (
            <div className="bg-muted/50 rounded-lg border p-3">
              <p className="text-muted-foreground mb-1 text-xs">Preview URL:</p>
              <p className="text-primary break-all font-mono text-sm">{previewUrl}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Taxonomy Bases</CardTitle>
          <CardDescription>Customize the URL base for categories and tags.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="category_base">Category base</Label>
            <Input
              id="category_base"
              value={settings.category_base}
              onChange={(e) => setSettings((prev) => ({ ...prev, category_base: e.target.value }))}
              placeholder="category"
            />
            <p className="text-muted-foreground text-xs">
              e.g., /{settings.category_base || 'category'}/uncategorized/
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tag_base">Tag base</Label>
            <Input
              id="tag_base"
              value={settings.tag_base}
              onChange={(e) => setSettings((prev) => ({ ...prev, tag_base: e.target.value }))}
              placeholder="tag"
            />
            <p className="text-muted-foreground text-xs">
              e.g., /{settings.tag_base || 'tag'}/sample-tag/
            </p>
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
