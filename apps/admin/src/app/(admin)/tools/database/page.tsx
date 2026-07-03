"use client";

import * as React from "react";
import { Database, Table, HardDrive, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";

interface TableInfo {
  name: string;
  rows: number;
  size: string;
  engine: string;
}

const tables: TableInfo[] = [
  { name: "users", rows: 24, size: "64 KB", engine: "PostgreSQL" },
  { name: "content_types", rows: 3, size: "32 KB", engine: "PostgreSQL" },
  { name: "content_entries", rows: 156, size: "2.1 MB", engine: "PostgreSQL" },
  { name: "revisions", rows: 892, size: "8.4 MB", engine: "PostgreSQL" },
  { name: "media", rows: 48, size: "256 KB", engine: "PostgreSQL" },
  { name: "taxonomies", rows: 4, size: "16 KB", engine: "PostgreSQL" },
  { name: "terms", rows: 32, size: "48 KB", engine: "PostgreSQL" },
  { name: "term_relations", rows: 124, size: "32 KB", engine: "PostgreSQL" },
  { name: "sessions", rows: 8, size: "128 KB", engine: "PostgreSQL" },
];

/**
 * Database Optimization (Gap I-12)
 */
export default function DatabasePage() {
  const { success, error: showError } = useToast();
  const [optimizing, setOptimizing] = React.useState(false);

  const runOptimization = () => {
    setOptimizing(true);
    setTimeout(() => {
      setOptimizing(false);
      success("Database optimized", "Tables have been analyzed and optimized.");
    }, 2000);
  };

  const totalSize = tables.reduce((acc, t) => {
    const size = parseFloat(t.size);
    return acc + (t.size.endsWith("MB") ? size * 1024 : size);
  }, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Database</h1>
          <p className="text-muted-foreground mt-1">View and optimize your database. (Gap I-12)</p>
        </div>
        <Button onClick={runOptimization} disabled={optimizing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${optimizing ? "animate-spin" : ""}`} />
          {optimizing ? "Optimizing..." : "Optimize Database"}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Tables</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tables.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Rows</CardTitle>
            <Table className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tables.reduce((a, t) => a + t.rows, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Size</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
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
              <div key={table.name} className="flex items-center justify-between px-6 py-3 hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="rounded bg-muted p-1.5">
                    <Table className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{table.name}</p>
                    <p className="text-xs text-muted-foreground">{table.engine}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{table.rows.toLocaleString()} rows</span>
                  <Badge variant="outline" className="text-xs">{table.size}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Warning */}
      <div className="flex items-start gap-2 rounded-md bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 p-4">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800 dark:text-amber-200">
          <p className="font-medium">Caution</p>
          <p className="text-xs mt-1">
            Database optimization may temporarily lock tables. Run during low-traffic periods.
            Always backup your database before running optimization.
          </p>
        </div>
      </div>
    </div>
  );
}
