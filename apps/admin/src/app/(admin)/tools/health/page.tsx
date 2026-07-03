"use client";

import * as React from "react";
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
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

interface HealthCheck {
  label: string;
  status: "passed" | "failed" | "warning";
  message: string;
  icon?: React.ElementType;
}

const initialChecks: HealthCheck[] = [
  { label: "Database Connection", status: "passed", message: "Connected to PostgreSQL 16.2", icon: Database },
  { label: "Redis Connection", status: "passed", message: "Connected to Redis 7.2", icon: Database },
  { label: "S3 Storage", status: "passed", message: "S3-compatible storage reachable", icon: HardDrive },
  { label: "Disk Space", status: "passed", message: "45.2 GB available of 100 GB", icon: HardDrive },
  { label: "Node.js Version", status: "passed", message: "v20.12.0 (LTS)", icon: Server },
  { label: "File Permissions", status: "passed", message: "Upload directory writable", icon: Globe },
  { label: "SSL Certificate", status: "warning", message: "Expires in 30 days", icon: Globe },
  { label: "Cron Jobs", status: "passed", message: "All scheduled tasks running", icon: Server },
  { label: "Plugin Compatibility", status: "failed", message: "2 plugins have pending updates", icon: Package },
];

const statusIcon = {
  passed: CheckCircle2,
  failed: XCircle,
  warning: AlertTriangle,
};

const statusColor = {
  passed: "text-emerald-600 dark:text-emerald-400",
  failed: "text-red-600 dark:text-red-400",
  warning: "text-amber-600 dark:text-amber-400",
};

const statusBadge = {
  passed: "success" as const,
  failed: "destructive" as const,
  warning: "warning" as const,
};

const serverInfo = {
  "PHP Version": "N/A (Node.js)",
  "Node.js Version": "20.12.0",
  "Server Software": "Next.js 14.2",
  "Database": "PostgreSQL 16.2",
  "Database Host": "localhost:5432",
  "Redis": "7.2",
  "Redis Host": "localhost:6379",
  "Upload Max Size": "50 MB",
  "Memory Limit": "512 MB",
  "Max Execution Time": "30s",
};

const activePlugins = [
  { name: "SEO Toolkit", version: "1.2.0", status: "active" },
  { name: "Webhook Dispatcher", version: "1.1.0", status: "active" },
  { name: "S3 Storage", version: "0.5.0", status: "active" },
  { name: "Email Service", version: "0.3.0", status: "inactive" },
];

export default function HealthPage() {
  const { success } = useToast();
  const [checks, setChecks] = React.useState(initialChecks);
  const [running, setRunning] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("status");

  const runChecks = () => {
    setRunning(true);
    setTimeout(() => {
      setRunning(false);
      success("Health check complete", "All systems operational.");
    }, 2000);
  };

  const passed = checks.filter((c) => c.status === "passed").length;
  const failed = checks.filter((c) => c.status === "failed").length;
  const warnings = checks.filter((c) => c.status === "warning").length;
  const total = checks.length;

  const recommendations = [
    {
      issue: "SSL certificate expiring soon",
      severity: "warning" as const,
      action: "Renew SSL certificate within the next 30 days.",
    },
    {
      issue: "Plugin updates available",
      severity: "failed" as const,
      action: "Update 2 plugins to their latest versions.",
    },
    {
      issue: "Database connection timeout",
      severity: "passed" as const,
      action: "Consider adding a database read replica for better performance.",
    },
  ];

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Site Health</h1>
          <p className="text-muted-foreground mt-1">
            Diagnose and monitor your site health and performance.
          </p>
        </div>
        <Button onClick={runChecks} disabled={running}>
          <RefreshCw
            className={`h-4 w-4 mr-2 ${running ? "animate-spin" : ""}`}
          />
          {running ? "Running..." : "Run Check"}
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
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">
                  {Math.round((passed / total) * 100)}%
                </span>
                <span className="text-muted-foreground">
                  ({passed}/{total} checks passed)
                </span>
              </div>
              <div className="flex gap-4 mt-3">
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
            </CardContent>
          </Card>

          <div className="space-y-2">
            {checks.map((check) => {
              const Icon = statusIcon[check.status];
              const CheckIcon = check.icon;
              return (
                <div
                  key={check.label}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`h-5 w-5 shrink-0 ${statusColor[check.status]}`}
                    />
                    {CheckIcon && (
                      <CheckIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{check.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {check.message}
                      </p>
                    </div>
                  </div>
                  <Badge variant={statusBadge[check.status]}>
                    {check.status}
                  </Badge>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Server Information</CardTitle>
              <CardDescription>
                System configuration and environment details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(serverInfo).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex justify-between py-1.5 border-b last:border-0 text-sm"
                  >
                    <span className="text-muted-foreground">{key}</span>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {value}
                    </code>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Active Plugins</CardTitle>
              <CardDescription>
                Currently installed and active plugins.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {activePlugins.map((plugin) => (
                  <div
                    key={plugin.name}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {plugin.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        v{plugin.version}
                      </span>
                    </div>
                    <Badge
                      variant={
                        plugin.status === "active" ? "success" : "secondary"
                      }
                    >
                      {plugin.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Active Theme</CardTitle>
              <CardDescription>
                Currently active theme information.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <Palette className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Default Theme</p>
                  <p className="text-xs text-muted-foreground">Version 0.2.0</p>
                </div>
                <Badge variant="success" className="ml-auto">
                  Active
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Recommended Improvements
              </CardTitle>
              <CardDescription>
                Actions you can take to improve your site health and
                performance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recommendations.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                  <p>No improvements needed. Everything looks great!</p>
                </div>
              )}
              {recommendations.map((rec, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-lg border p-4"
                >
                  {rec.severity === "failed" ? (
                    <XCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                  ) : rec.severity === "warning" ? (
                    <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium">{rec.issue}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {rec.action}
                    </p>
                  </div>
                  <Badge
                    variant={
                      rec.severity === "failed"
                        ? "destructive"
                        : rec.severity === "warning"
                          ? "warning"
                          : "success"
                    }
                  >
                    {rec.severity}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
