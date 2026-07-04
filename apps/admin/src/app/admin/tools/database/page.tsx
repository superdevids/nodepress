'use client';

import * as React from 'react';
import {
  Database,
  Table,
  HardDrive,
  RefreshCw,
  AlertTriangle,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { useApi } from '@/lib/use-api';

interface TableInfo {
  name: string;
  rows: number;
  size: string;
  engine: string;
}

interface DatabaseInfo {
  tables: TableInfo[];
  totalSize?: string;
}

/**
 * Database Optimization (Gap I-12)
 */
export default function DatabasePage() {
  const { get, post } = useApi();
  const { success, error: showError } = useToast();
  const [tables, setTables] = React.useState<TableInfo[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<string | null>(null);
  const [optimizing, setOptimizing] = React.useState(false);

  const fetchTables = React.useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await get<DatabaseInfo>('/tools/database');
      setTables(res.data.tables || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load database info';
      setFetchError(message);
      showError('Error', message);
    } finally {
      setLoading(false);
    }
  }, [get, showError]);

  React.useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  const runOptimization = async () => {
    setOptimizing(true);
    try {
      await post('/tools/database/optimize');
      success('Database optimized', 'Tables have been analyzed and optimized.');
      await fetchTables();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to optimize database';
      showError('Error', message);
    } finally {
      setOptimizing(false);
    }
  };

  const totalSize = tables.reduce((acc, t) => {
    const size = parseFloat(t.size);
    return acc + (t.size.endsWith('MB') ? size * 1024 : size);
  }, 0);

  if (loading && tables.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-6">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (fetchError && tables.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="text-destructive mb-3 h-10 w-10" />
        <p className="text-destructive font-medium">{fetchError}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={fetchTables}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Database</h1>
          <p className="text-muted-foreground mt-1">View and optimize your database. (Gap I-12)</p>
        </div>
        <Button onClick={runOptimization} disabled={optimizing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${optimizing ? 'animate-spin' : ''}`} />
          {optimizing ? 'Optimizing...' : 'Optimize Database'}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Total Tables
            </CardTitle>
            <Database className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tables.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Total Rows</CardTitle>
            <Table className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tables.reduce((a, t) => a + t.rows, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Total Size</CardTitle>
            <HardDrive className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalSize > 1024
                ? `${(totalSize / 1024).toFixed(1)} MB`
                : `${totalSize.toFixed(0)} KB`}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tables */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tables</CardTitle>
          <CardDescription>Database tables overview.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {tables.map((table) => (
              <div
                key={table.name}
                className="hover:bg-muted/50 flex items-center justify-between px-6 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-muted rounded p-1.5">
                    <Table className="text-muted-foreground h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{table.name}</p>
                    <p className="text-muted-foreground text-xs">{table.engine}</p>
                  </div>
                </div>
                <div className="text-muted-foreground flex items-center gap-4 text-sm">
                  <span>{table.rows.toLocaleString()} rows</span>
                  <Badge variant="outline" className="text-xs">
                    {table.size}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Warning */}
      <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="text-sm text-amber-800 dark:text-amber-200">
          <p className="font-medium">Caution</p>
          <p className="mt-1 text-xs">
            Database optimization may temporarily lock tables. Run during low-traffic periods.
            Always backup your database before running optimization.
          </p>
        </div>
      </div>
    </div>
  );
}
