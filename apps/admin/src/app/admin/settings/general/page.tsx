'use client';

import * as React from 'react';
import { Save, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

interface GeneralSettings {
  site_title: string;
  tagline: string;
  site_url: string;
  admin_email: string;
  membership: boolean;
  default_role: string;
  timezone: string;
  date_format: string;
  time_format: string;
  week_starts_on: string;
}

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Jakarta',
  'Asia/Kolkata',
  'Australia/Sydney',
  'Pacific/Auckland',
];

const DATE_FORMATS = [
  { value: 'F j, Y', label: 'July 3, 2026' },
  { value: 'Y-m-d', label: '2026-07-03' },
  { value: 'm/d/Y', label: '07/03/2026' },
  { value: 'd/m/Y', label: '03/07/2026' },
];

const TIME_FORMATS = [
  { value: 'g:i a', label: '3:45 pm' },
  { value: 'g:i A', label: '3:45 PM' },
  { value: 'H:i', label: '15:45' },
];

const ROLES = [
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'EDITOR', label: 'Editor' },
  { value: 'AUTHOR', label: 'Author' },
  { value: 'CONTRIBUTOR', label: 'Contributor' },
  { value: 'SUBSCRIBER', label: 'Subscriber' },
];

const DEFAULT_SETTINGS: GeneralSettings = {
  site_title: '',
  tagline: '',
  site_url: '',
  admin_email: '',
  membership: false,
  default_role: 'CONTRIBUTOR',
  timezone: 'UTC',
  date_format: 'F j, Y',
  time_format: 'g:i a',
  week_starts_on: 'monday',
};

export default function GeneralSettingsPage() {
  const api = useApi();
  const { success, error: showError } = useToast();

  const [settings, setSettings] = React.useState<GeneralSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [fetchError, setFetchError] = React.useState<string | null>(null);

  const fetchSettings = React.useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await api.get<GeneralSettings>('/settings/general');
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
      await api.patch('/settings/general', settings);
      success('Settings saved', 'General settings have been updated.');
    } catch (err) {
      showError('Failed to save', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const update = <K extends keyof GeneralSettings>(key: K, value: GeneralSettings[K]) => {
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
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
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
          <h1 className="text-2xl font-bold tracking-tight">General Settings</h1>
          <p className="text-muted-foreground mt-1">
            Basic site settings including title, language, and timezone.
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
        <h1 className="text-2xl font-bold tracking-tight">General Settings</h1>
        <p className="text-muted-foreground mt-1">
          Basic site settings including title, language, and timezone.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Site Details</CardTitle>
          <CardDescription>Change your site title, tagline, and admin email.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="site_title">Site Title</Label>
            <Input
              id="site_title"
              value={settings.site_title}
              onChange={(e) => update('site_title', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              value={settings.tagline}
              onChange={(e) => update('tagline', e.target.value)}
              placeholder="In a few words, explain what your site is about"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="admin_email">Admin Email</Label>
            <Input
              id="admin_email"
              type="email"
              value={settings.admin_email}
              onChange={(e) => update('admin_email', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="site_url">Site URL</Label>
            <Input
              id="site_url"
              type="url"
              value={settings.site_url}
              onChange={(e) => update('site_url', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Membership</CardTitle>
          <CardDescription>Configure user registration and default role.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="membership">Anyone can register</Label>
              <p className="text-muted-foreground text-xs">Allow anyone to create an account.</p>
            </div>
            <input
              id="membership"
              type="checkbox"
              className="h-5 w-5 rounded"
              checked={settings.membership}
              onChange={(e) => update('membership', e.target.checked)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="default_role">Default User Role</Label>
            <Select value={settings.default_role} onValueChange={(v) => update('default_role', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Regional Settings</CardTitle>
          <CardDescription>Configure timezone, date format, and language.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="timezone">Timezone</Label>
            <Select value={settings.timezone} onValueChange={(v) => update('timezone', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="date_format">Date Format</Label>
            <Select value={settings.date_format} onValueChange={(v) => update('date_format', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_FORMATS.map((df) => (
                  <SelectItem key={df.value} value={df.value}>
                    {df.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="time_format">Time Format</Label>
            <Select value={settings.time_format} onValueChange={(v) => update('time_format', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_FORMATS.map((tf) => (
                  <SelectItem key={tf.value} value={tf.value}>
                    {tf.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="week_starts_on">Week Starts On</Label>
            <Select
              value={settings.week_starts_on}
              onValueChange={(v) => update('week_starts_on', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monday">Monday</SelectItem>
                <SelectItem value="tuesday">Tuesday</SelectItem>
                <SelectItem value="wednesday">Wednesday</SelectItem>
                <SelectItem value="thursday">Thursday</SelectItem>
                <SelectItem value="friday">Friday</SelectItem>
                <SelectItem value="saturday">Saturday</SelectItem>
                <SelectItem value="sunday">Sunday</SelectItem>
              </SelectContent>
            </Select>
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
