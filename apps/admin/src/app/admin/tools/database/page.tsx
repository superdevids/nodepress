'use client';

import * as React from 'react';
import {
  Database,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  HardDrive,
  Table2,
  FileText,
  Archive,
  Download,
  Terminal,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi } from '@/lib/use-api';
import { useToast } from '@/components/ui/toast';
import { formatBytes } from '@/lib/utils';

interface DbTableInfo {
  name: string;
  rows: number;
  size: string;
  engine: string;
  comment: string;
}

interface DbStatus {
  size: string;
  tables: number;
  version: string;
  collation: string;
}

export default function DatabasePage() {
  const { get, post } = useApi();
  const { success, error: showError } = useToast();
  const [tables, setTables] = React.useState<DbTableInfo[]>([]);
  const [status, setStatus] = React.useState<DbStatus | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<string | null>(null);
  const [optimizing, setOptimizing] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const [tablesRes, statusRes] = await Promise.all([
        get<DbTableInfo[]>('/api/database/tables'),
        get<DbStatus>('/api/database/status'),
      ]);
      setTables(tablesRes.data || []);
      setStatus(statusRes.data || null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load database info';
      setFetchError(message);
    } finally {
      setLoading(false);
    }
  }, [get]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOptimize = async () => {
    setOptimizing(true);
    try {
      await post('/api/database/optimize', {});
      success('Database optimized', 'All tables optimized successfully.');
      fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to optimize database';
      showError('Optimization failed', message);
    } finally {
      setOptimizing(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await get<{ url: string }>('/api/database/export');
      if (res.data?.url) {
        window.open(res.data.url, '_blank');
        success('Export ready', 'Database export downloaded.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export database';
      showError('Export failed', message);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Database className="h-6 w-6 text-[#2271b1]" />
            Database
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage your database tables, optimize performance, and export data.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-1.5 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={handleOptimize} disabled={optimizing}>
            {optimizing ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-4 w-4" />
            )}
            {optimizing ? 'Optimizing...' : 'Optimize'}
          </Button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-20" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="mt-1 h-3 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error */}
      {!loading && fetchError && (
        <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
          <AlertCircle className="text-destructive mb-3 h-10 w-10" />
          <p className="text-destructive font-medium">Failed to load database info</p>
          <p className="text-muted-foreground mt-1 text-sm">{fetchError}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={fetchData}>
            <RefreshCw className="mr-1.5 h-4 w-4" /> Retry
          </Button>
        </div>
      )}

      {/* Status Cards */}
      {!loading && !fetchError && status && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Database Size
              </CardTitle>
              <HardDrive className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{status.size}</div>
              <p className="text-muted-foreground mt-1 text-xs">{status.tables} tables</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">Version</CardTitle>
              <Terminal className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{status.version}</div>
              <p className="text-muted-foreground mt-1 text-xs">{status.collation}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">Tables</CardTitle>
              <Table2 className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{status.tables}</div>
              <p className="text-muted-foreground mt-1 text-xs">Total tables</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">Status</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">Healthy</div>
              <p className="text-muted-foreground mt-1 text-xs">All systems normal</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tables List */}
      {!loading && !fetchError && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Table2 className="text-muted-foreground h-5 w-5" />
              Database Tables
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Table Name</TableHead>
                  <TableHead className="text-right">Rows</TableHead>
                  <TableHead className="text-right">Size</TableHead>
                  <TableHead>Engine</TableHead>
                  <TableHead>Comment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tables.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                      No tables found
                    </TableCell>
                  </TableRow>
                ) : (
                  tables.map((table) => (
                    <TableRow key={table.name} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <span className="flex items-center gap-2">
                          <Database className="h-4 w-4 text-[#2271b1]" />
                          {table.name}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {table.rows.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">{table.size}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {table.engine}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate text-xs">
                        {table.comment || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
