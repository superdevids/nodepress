'use client';

import * as React from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Database,
  HardDrive,
  Server,
  Globe,
  Package,
  Palette,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { useApi } from '@/lib/use-api';

interface HealthCheck {
  label: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  icon?: React.ElementType;
}

interface ServerInfo {
  [key: string]: string;
}

interface PluginInfo {
  name: string;
  version: string;
  status: string;
}

interface Recommendation {
  issue: string;
  severity: 'passed' | 'failed' | 'warning';
  action: string;
}

interface HealthDetails {
  checks: HealthCheck[];
  serverInfo: ServerInfo;
  plugins: PluginInfo[];
  activeTheme?: { name: string; version: string };
  recommendations: Recommendation[];
}

const statusIcon: Record<string, React.ElementType> = {
  passed: CheckCircle2,
  failed: XCircle,
  warning: AlertTriangle,
};

const statusColor: Record<string, string> = {
  passed: 'text-emerald-600 dark:text-emerald-400',
  failed: 'text-red-600 dark:text-red-400',
  warning: 'text-amber-600 dark:text-amber-400',
};

const statusBadge: Record<string, 'success' | 'destructive' | 'warning'> = {
  passed: 'success',
  failed: 'destructive',
  warning: 'warning',
};

export default function HealthPage() {
  const { success, error: showError } = useToast();
  const { get } = useApi();
  const [healthData, setHealthData] = React.useState<HealthDetails | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<string | null>(null);
  const [running, setRunning] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('status');

  const fetchHealth = React.useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const [detailsRes, statusRes] = await Promise.allSettled([
        get<HealthDetails>('/health/details'),
        get<{ checks: HealthCheck[] }>('/dashboard/site-health'),
      ]);

      const checks: HealthCheck[] = [];
      let serverInfo: ServerInfo = {};
      let plugins: PluginInfo[] = [];
      let activeTheme: { name: string; version: string } | undefined;
      let recommendations: Recommendation[] = [];

      if (detailsRes.status === 'fulfilled') {
        const d = detailsRes.value.data;
        checks.push(...(d.checks || []));
        serverInfo = d.serverInfo || {};
        plugins = d.plugins || [];
        activeTheme = d.activeTheme;
        recommendations = d.recommendations || [];
      }

      if (statusRes.status === 'fulfilled' && statusRes.value.data?.checks) {
        const additional = statusRes.value.data.checks;
        for (const check of additional) {
          if (!checks.find((c) => c.label === check.label)) {
            checks.push(check);
          }
        }
      }

      setHealthData({ checks, serverInfo, plugins, activeTheme, recommendations });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load health data';
      setFetchError(message);
      showError('Error', message);
    } finally {
      setLoading(false);
    }
  }, [get, showError]);

  React.useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  const runChecks = async () => {
    setRunning(true);
    await fetchHealth();
    setRunning(false);
    if (!fetchError) {
      success('Health check complete', 'All systems operational.');
    }
  };

  if (loading && !healthData) {
    return (
      <div className="flex min-h-[400px] max-w-3xl items-center justify-center p-6">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (fetchError && !healthData) {
    return (
      <div className="flex min-h-[400px] max-w-3xl flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="text-destructive mb-3 h-10 w-10" />
        <p className="text-destructive font-medium">Failed to load health data</p>
        <p className="text-muted-foreground mt-1 text-sm">{fetchError}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={fetchHealth}>
          <RefreshCw className="mr-1.5 h-4 w-4" /> Retry
        </Button>
      </div>
    );
  }

  const checks = healthData?.checks || [];
  const serverInfo = healthData?.serverInfo || {};
  const activePlugins = healthData?.plugins || [];
  const activeTheme = healthData?.activeTheme;
  const recommendations = healthData?.recommendations || [];

  const passed = checks.filter((c) => c.status === 'passed').length;
  const failed = checks.filter((c) => c.status === 'failed').length;
  const warnings = checks.filter((c) => c.status === 'warning').length;
  const total = checks.length;

  return (
    <div className="max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Site Health</h1>
          <p className="text-muted-foreground mt-1">
            Diagnose and monitor your site health and performance.
          </p>
        </div>
        <Button onClick={runChecks} disabled={running || loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${running ? 'animate-spin' : ''}`} />
          {running ? 'Running...' : 'Run Check'}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="recommendations">Improvements</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Health Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {total === 0 ? (
                <p className="text-muted-foreground text-sm">No health checks available.</p>
              ) : (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">
                      {Math.round((passed / total) * 100)}%
                    </span>
                    <span className="text-muted-foreground">
                      ({passed}/{total} checks passed)
                    </span>
                  </div>
                  <div className="mt-3 flex gap-4">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span className="text-sm">{passed} passed</span>
                    </div>
                    {warnings > 0 && (
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        <span className="text-sm">{warnings} warnings</span>
                      </div>
                    )}
                    {failed > 0 && (
                      <div className="flex items-center gap-1.5">
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span className="text-sm">{failed} failed</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <div className="space-y-2">
            {checks.map((check) => {
              const Icon = statusIcon[check.status] || CheckCircle2;
              const CheckIcon = check.icon;
              return (
                <div
                  key={check.label}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 shrink-0 ${statusColor[check.status]}`} />
                    {CheckIcon && <CheckIcon className="text-muted-foreground h-4 w-4 shrink-0" />}
                    <div>
                      <p className="text-sm font-medium">{check.label}</p>
                      <p className="text-muted-foreground text-xs">{check.message}</p>
                    </div>
                  </div>
                  <Badge variant={statusBadge[check.status]}>{check.status}</Badge>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Server Information</CardTitle>
              <CardDescription>System configuration and environment details.</CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(serverInfo).length === 0 ? (
                <p className="text-muted-foreground text-sm">No server information available.</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(serverInfo).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex justify-between border-b py-1.5 text-sm last:border-0"
                    >
                      <span className="text-muted-foreground">{key}</span>
                      <code className="bg-muted rounded px-1.5 py-0.5 text-xs">{value}</code>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Active Plugins</CardTitle>
              <CardDescription>Currently installed and active plugins.</CardDescription>
            </CardHeader>
            <CardContent>
              {activePlugins.length === 0 ? (
                <p className="text-muted-foreground text-sm">No plugins found.</p>
              ) : (
                <div className="space-y-2">
                  {activePlugins.map((plugin) => (
                    <div
                      key={plugin.name}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-2">
                        <Package className="text-muted-foreground h-4 w-4" />
                        <span className="text-sm font-medium">{plugin.name}</span>
                        <span className="text-muted-foreground text-xs">v{plugin.version}</span>
                      </div>
                      <Badge variant={plugin.status === 'active' ? 'success' : 'secondary'}>
                        {plugin.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Active Theme</CardTitle>
              <CardDescription>Currently active theme information.</CardDescription>
            </CardHeader>
            <CardContent>
              {activeTheme ? (
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <Palette className="text-muted-foreground h-5 w-5" />
                  <div>
                    <p className="text-sm font-medium">{activeTheme.name}</p>
                    <p className="text-muted-foreground text-xs">Version {activeTheme.version}</p>
                  </div>
                  <Badge variant="success" className="ml-auto">
                    Active
                  </Badge>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No theme information available.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recommended Improvements</CardTitle>
              <CardDescription>
                Actions you can take to improve your site health and performance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recommendations.length === 0 ? (
                <div className="text-muted-foreground py-8 text-center">
                  <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
                  <p>No improvements needed. Everything looks great!</p>
                </div>
              ) : (
                recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg border p-4">
                    {rec.severity === 'failed' ? (
                      <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                    ) : rec.severity === 'warning' ? (
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                    ) : (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium">{rec.issue}</p>
                      <p className="text-muted-foreground mt-0.5 text-xs">{rec.action}</p>
                    </div>
                    <Badge
                      variant={
                        rec.severity === 'failed'
                          ? 'destructive'
                          : rec.severity === 'warning'
                            ? 'warning'
                            : 'success'
                      }
                    >
                      {rec.severity}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
