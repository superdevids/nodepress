'use client';

import * as React from 'react';
import {
  RefreshCw,
  Package,
  Database,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { formatDate } from '@/lib/utils';
import { useApi } from '@/lib/use-api';

interface UpdateItem {
  name: string;
  currentVersion: string;
  newVersion: string;
  type: 'core' | 'plugin' | 'theme';
  severity: 'critical' | 'recommended' | 'optional';
  description?: string;
}

interface UpdatesResponse {
  core: UpdateItem[];
  plugins: UpdateItem[];
  themes: UpdateItem[];
  lastChecked?: string;
}

const severityColors: Record<string, 'destructive' | 'warning' | 'secondary'> = {
  critical: 'destructive',
  recommended: 'warning',
  optional: 'secondary',
};

const severityIcons: Record<string, React.ElementType> = {
  critical: AlertTriangle,
  recommended: AlertTriangle,
  optional: CheckCircle2,
};

export default function UpdatesPage() {
  const { success, error: showError } = useToast();
  const { get, post } = useApi();
  const [updates, setUpdates] = React.useState<UpdateItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<string | null>(null);
  const [checking, setChecking] = React.useState(false);
  const [updating, setUpdating] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [lastChecked, setLastChecked] = React.useState<Date | null>(null);

  const fetchUpdates = React.useCallback(async (): Promise<number> => {
    setLoading(true);
    setFetchError(null);
    let count = 0;
    try {
      const res = await get<UpdatesResponse>('/updates');
      const data = res.data;
      const all: UpdateItem[] = [
        ...(data.core || []),
        ...(data.plugins || []),
        ...(data.themes || []),
      ];
      count = all.length;
      setUpdates(all);
      setLastChecked(data.lastChecked ? new Date(data.lastChecked) : new Date());
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to check updates';
      setFetchError(message);
      showError('Error', message);
    } finally {
      setLoading(false);
    }
    return count;
  }, [get, showError]);

  React.useEffect(() => {
    fetchUpdates();
  }, [fetchUpdates]);

  const checkUpdates = async () => {
    setChecking(true);
    // Capture the count from fetchUpdates to avoid reading stale state
    const count = await fetchUpdates();
    setChecking(false);
    success('Update check complete', `${count} updates available.`);
  };

  const updateAll = async () => {
    setUpdating(true);
    setProgress(0);
    try {
      // Simulate progress steps
      setProgress(10);
      await post('/updates/update-all');
      setProgress(100);
      success('Updates installed', 'All packages updated to latest versions.');
      await fetchUpdates();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to install updates';
      showError('Error', message);
    } finally {
      setUpdating(false);
      setProgress(0);
    }
  };

  const updateItem = async (name: string) => {
    try {
      success('Update started', `${name} is being updated...`);
      await post('/updates/update-item', { name });
      success('Update complete', `${name} has been updated.`);
      await fetchUpdates();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : `Failed to update ${name}`;
      showError('Error', message);
    }
  };

  if (loading && updates.length === 0) {
    return (
      <div className="flex min-h-[400px] max-w-2xl items-center justify-center p-6">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (fetchError && updates.length === 0) {
    return (
      <div className="flex min-h-[400px] max-w-2xl flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="text-destructive mb-3 h-10 w-10" />
        <p className="text-destructive font-medium">Failed to check updates</p>
        <p className="text-muted-foreground mt-1 text-sm">{fetchError}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={fetchUpdates}>
          <RefreshCw className="mr-1.5 h-4 w-4" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Updates</h1>
          <p className="text-muted-foreground mt-1">
            Keep your site up to date with the latest releases.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={checkUpdates} disabled={checking || updating}>
            <RefreshCw className={`mr-2 h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
            {checking ? 'Checking...' : 'Check Again'}
          </Button>
          <Button onClick={updateAll} disabled={updating || updates.length === 0}>
            <Upload className="mr-2 h-4 w-4" />
            {updating ? 'Updating...' : 'Update All'}
          </Button>
        </div>
      </div>

      {lastChecked && (
        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <Clock className="h-3 w-3" />
          <span>Last checked: {formatDate(lastChecked)}</span>
        </div>
      )}

      {updating && (
        <div className="space-y-1">
          <div className="text-muted-foreground flex justify-between text-xs">
            <span>Updating packages...</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="bg-muted h-2 w-full rounded-full">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {updates.length === 0 ? (
        <div className="py-12 text-center">
          <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-emerald-500" />
          <p className="text-muted-foreground">Everything is up to date!</p>
        </div>
      ) : (
        <>
          {updates.filter((u) => u.type === 'core').length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium">Core</h3>
              {updates
                .filter((u) => u.type === 'core')
                .map((update) => (
                  <UpdateCard
                    key={`${update.name}-${update.type}`}
                    update={update}
                    onUpdate={updateItem}
                    disabled={updating}
                  />
                ))}
            </div>
          )}
          {updates.filter((u) => u.type === 'plugin').length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium">Plugins</h3>
              {updates
                .filter((u) => u.type === 'plugin')
                .map((update) => (
                  <UpdateCard
                    key={`${update.name}-${update.type}`}
                    update={update}
                    onUpdate={updateItem}
                    disabled={updating}
                  />
                ))}
            </div>
          )}
          {updates.filter((u) => u.type === 'theme').length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium">Themes</h3>
              {updates
                .filter((u) => u.type === 'theme')
                .map((update) => (
                  <UpdateCard
                    key={`${update.name}-${update.type}`}
                    update={update}
                    onUpdate={updateItem}
                    disabled={updating}
                  />
                ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function UpdateCard({
  update,
  onUpdate,
  disabled,
}: {
  update: UpdateItem;
  onUpdate: (name: string) => void;
  disabled: boolean;
}) {
  const SeverityIcon = severityIcons[update.severity] ?? AlertTriangle;
  return (
    <Card className="mb-3">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-muted rounded-lg p-2">
              {update.type === 'core' ? (
                <Database className="h-5 w-5" />
              ) : (
                <Package className="h-5 w-5" />
              )}
            </div>
            <div>
              <CardTitle className="text-base">{update.name}</CardTitle>
              <CardDescription>
                {update.currentVersion} &rarr; {update.newVersion}
              </CardDescription>
              {update.description && (
                <p className="text-muted-foreground mt-1 text-xs">{update.description}</p>
              )}
            </div>
          </div>
          <Badge variant={severityColors[update.severity]}>
            <SeverityIcon className="mr-1 inline h-3 w-3" />
            {update.severity}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex justify-end gap-2">
        <Button variant="outline" size="sm">
          View Details
        </Button>
        <Button size="sm" onClick={() => onUpdate(update.name)} disabled={disabled}>
          <Upload className="mr-1.5 h-4 w-4" /> Update
        </Button>
      </CardContent>
    </Card>
  );
}
