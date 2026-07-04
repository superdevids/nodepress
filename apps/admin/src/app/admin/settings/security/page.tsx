'use client';

import * as React from 'react';
import { Save, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { useApi } from '@/lib/use-api';

interface SecuritySettings {
  '2fa_required': boolean;
  password_min_length: number;
  session_duration: number;
  login_attempts: number;
  lockout_duration: number;
}

const DEFAULT_SETTINGS: SecuritySettings = {
  '2fa_required': false,
  password_min_length: 8,
  session_duration: 24,
  login_attempts: 5,
  lockout_duration: 15,
};

export default function SecuritySettingsPage() {
  const api = useApi();
  const { success, error: showError } = useToast();

  const [settings, setSettings] = React.useState<SecuritySettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [fetchError, setFetchError] = React.useState<string | null>(null);

  const fetchSettings = React.useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await api.get<SecuritySettings>('/settings/security');
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
      await api.patch('/settings/security', settings);
      success('Security settings saved', 'Security settings have been updated.');
    } catch (err) {
      showError('Failed to save', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const update = <K extends keyof SecuritySettings>(key: K, value: SecuritySettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  // ─── Loading state ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-2xl space-y-6 p-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-72" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-28" />
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
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 w-64" />
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
          <h1 className="text-2xl font-bold tracking-tight">Security Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage authentication, password policy, and security preferences.
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
        <h1 className="text-2xl font-bold tracking-tight">Security Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage authentication, password policy, and security preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Password Policy</CardTitle>
          <CardDescription>Configure password requirements and expiration.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password_min_length">Minimum password length</Label>
            <Input
              id="password_min_length"
              type="number"
              value={settings.password_min_length}
              onChange={(e) => update('password_min_length', parseInt(e.target.value) || 1)}
              className="w-32"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Authentication</CardTitle>
          <CardDescription>Configure authentication methods and access control.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="2fa_required">Two-Factor Authentication (2FA)</Label>
              <p className="text-muted-foreground text-xs">
                Require 2FA for all admin users using authenticator app.
              </p>
            </div>
            <Switch
              id="2fa_required"
              checked={settings['2fa_required']}
              onCheckedChange={(checked) => update('2fa_required', checked)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="session_duration">Session duration (hours)</Label>
            <Input
              id="session_duration"
              type="number"
              value={settings.session_duration}
              onChange={(e) => update('session_duration', parseInt(e.target.value) || 1)}
              className="w-32"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Login Security</CardTitle>
          <CardDescription>Configure rate limiting and lockout policies.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="login_attempts">Max failed login attempts</Label>
            <Input
              id="login_attempts"
              type="number"
              value={settings.login_attempts}
              onChange={(e) => update('login_attempts', parseInt(e.target.value) || 1)}
              className="w-32"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lockout_duration">Lockout duration (minutes)</Label>
            <Input
              id="lockout_duration"
              type="number"
              value={settings.lockout_duration}
              onChange={(e) => update('lockout_duration', parseInt(e.target.value) || 1)}
              className="w-32"
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
