'use client';

import * as React from 'react';
import { Save, Plus, Trash2, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { useApi } from '@/lib/use-api';

interface CORSSettings {
  allowed_origins: string[];
  allowed_methods: string[];
  allowed_headers: string[];
}

const DEFAULT_SETTINGS: CORSSettings = {
  allowed_origins: [],
  allowed_methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowed_headers: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

const COMMON_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];

export default function CORSSettingsPage() {
  const api = useApi();
  const { success, error: showError } = useToast();

  const [settings, setSettings] = React.useState<CORSSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [fetchError, setFetchError] = React.useState<string | null>(null);
  const [newOrigin, setNewOrigin] = React.useState('');
  const [newHeader, setNewHeader] = React.useState('');

  const fetchSettings = React.useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await api.get<CORSSettings>('/settings/cors');
      const data = res.data;
      setSettings({
        allowed_origins: Array.isArray(data.allowed_origins) ? data.allowed_origins : [],
        allowed_methods: Array.isArray(data.allowed_methods)
          ? data.allowed_methods
          : [...DEFAULT_SETTINGS.allowed_methods],
        allowed_headers: Array.isArray(data.allowed_headers)
          ? data.allowed_headers
          : [...DEFAULT_SETTINGS.allowed_headers],
      });
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
      await api.patch('/settings/cors', settings);
      success('CORS settings saved', 'Allowed origins have been updated.');
    } catch (err) {
      showError('Failed to save', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const hasWildcard = settings.allowed_origins.includes('*');

  const addOrigin = () => {
    const trimmed = newOrigin.trim();
    if (trimmed && !settings.allowed_origins.includes(trimmed)) {
      setSettings((prev) => ({ ...prev, allowed_origins: [...prev.allowed_origins, trimmed] }));
      setNewOrigin('');
    }
  };

  const removeOrigin = (origin: string) => {
    setSettings((prev) => ({
      ...prev,
      allowed_origins: prev.allowed_origins.filter((o) => o !== origin),
    }));
  };

  const toggleMethod = (method: string) => {
    setSettings((prev) => ({
      ...prev,
      allowed_methods: prev.allowed_methods.includes(method)
        ? prev.allowed_methods.filter((m) => m !== method)
        : [...prev.allowed_methods, method],
    }));
  };

  const addHeader = () => {
    const trimmed = newHeader.trim();
    if (trimmed && !settings.allowed_headers.includes(trimmed)) {
      setSettings((prev) => ({ ...prev, allowed_headers: [...prev.allowed_headers, trimmed] }));
      setNewHeader('');
    }
  };

  const removeHeader = (header: string) => {
    setSettings((prev) => ({
      ...prev,
      allowed_headers: prev.allowed_headers.filter((h) => h !== header),
    }));
  };

  // ─── Loading state ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-2xl space-y-6 p-6">
        <div>
          <Skeleton className="h-8 w-40" />
          <Skeleton className="mt-2 h-4 w-56" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 w-72" />
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
          <h1 className="text-2xl font-bold tracking-tight">CORS Settings</h1>
          <p className="text-muted-foreground mt-1">Manage allowed origins for API access.</p>
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
        <h1 className="text-2xl font-bold tracking-tight">CORS Settings</h1>
        <p className="text-muted-foreground mt-1">Manage allowed origins for API access.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Allowed Origins</CardTitle>
          <CardDescription>
            Add the origins (URLs) that are allowed to make cross-origin requests to your API.
            Supports wildcard patterns with *.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label>Allow all origins (*)</Label>
              <p className="text-muted-foreground text-xs">
                Use with caution. Not recommended for production.
              </p>
            </div>
            <Switch
              checked={hasWildcard}
              onCheckedChange={(checked) => {
                if (checked) {
                  setSettings((prev) => ({ ...prev, allowed_origins: ['*'] }));
                } else {
                  setSettings((prev) => ({ ...prev, allowed_origins: [] }));
                }
              }}
            />
          </div>

          {!hasWildcard && (
            <>
              <div className="space-y-2">
                {settings.allowed_origins.length === 0 && (
                  <p className="text-muted-foreground py-4 text-center text-sm">
                    No custom origins configured.
                  </p>
                )}
                {settings.allowed_origins.map((origin) => (
                  <div key={origin} className="flex items-center gap-2 rounded-md border p-3">
                    <code className="flex-1 text-sm">{origin}</code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive h-7 w-7"
                      onClick={() => removeOrigin(origin)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <Input
                  placeholder="https://example.com"
                  value={newOrigin}
                  onChange={(e) => setNewOrigin(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addOrigin();
                    }
                  }}
                />
                <Button variant="outline" size="icon" onClick={addOrigin}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <p className="text-muted-foreground text-xs">
                Use <code className="bg-muted rounded px-1 text-xs">*</code> as wildcard, e.g.,{' '}
                <code className="bg-muted rounded px-1 text-xs">https://*.example.com</code> to
                allow all subdomains.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Allowed Methods</CardTitle>
          <CardDescription>
            Select which HTTP methods are allowed for cross-origin requests.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {COMMON_METHODS.map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => toggleMethod(method)}
                className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                  settings.allowed_methods.includes(method)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-input hover:bg-accent'
                }`}
              >
                {method}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Allowed Headers</CardTitle>
          <CardDescription>
            Custom headers that are allowed in cross-origin requests.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {settings.allowed_headers.map((header) => (
              <div key={header} className="flex items-center gap-2 rounded-md border p-3">
                <code className="flex-1 text-sm">{header}</code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive h-7 w-7"
                  onClick={() => removeHeader(header)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Input
              placeholder="X-Custom-Header"
              value={newHeader}
              onChange={(e) => setNewHeader(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addHeader();
                }
              }}
            />
            <Button variant="outline" size="icon" onClick={addHeader}>
              <Plus className="h-4 w-4" />
            </Button>
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
