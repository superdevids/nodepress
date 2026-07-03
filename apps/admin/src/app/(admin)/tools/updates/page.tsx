"use client";

import * as React from "react";
import {
  RefreshCw,
  Package,
  Database,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils";

interface UpdateItem {
  name: string;
  currentVersion: string;
  newVersion: string;
  type: "core" | "plugin" | "theme";
  severity: "critical" | "recommended" | "optional";
  description?: string;
}

const updates: UpdateItem[] = [
  {
    name: "NodePress Core",
    currentVersion: "0.1.0",
    newVersion: "0.1.1",
    type: "core",
    severity: "recommended",
    description: "Bug fixes and performance improvements.",
  },
  {
    name: "SEO Toolkit",
    currentVersion: "1.2.0",
    newVersion: "1.3.0",
    type: "plugin",
    severity: "critical",
    description: "Security patch and new meta tag features.",
  },
  {
    name: "Webhook Dispatcher",
    currentVersion: "1.1.0",
    newVersion: "1.1.1",
    type: "plugin",
    severity: "optional",
    description: "Minor bug fix for retry logic.",
  },
  {
    name: "Default Theme",
    currentVersion: "0.2.0",
    newVersion: "0.3.0",
    type: "theme",
    severity: "recommended",
    description: "New block styles and accessibility improvements.",
  },
];

const severityColors: Record<string, "destructive" | "warning" | "secondary"> =
  {
    critical: "destructive",
    recommended: "warning",
    optional: "secondary",
  };

const severityIcons: Record<string, React.ElementType> = {
  critical: AlertTriangle,
  recommended: AlertTriangle,
  optional: CheckCircle2,
};

export default function UpdatesPage() {
  const { success } = useToast();
  const [checking, setChecking] = React.useState(false);
  const [updating, setUpdating] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [lastChecked, setLastChecked] = React.useState<Date | null>(
    new Date(),
  );

  const checkUpdates = () => {
    setChecking(true);
    setTimeout(() => {
      setChecking(false);
      setLastChecked(new Date());
      success("Update check complete", "4 updates available.");
    }, 2000);
  };

  const updateAll = () => {
    setUpdating(true);
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((p) => {
        const next = p + Math.random() * 10 + 2;
        if (next >= 100) {
          clearInterval(interval);
          setProgress(100);
          setTimeout(() => {
            setUpdating(false);
            setProgress(0);
            success(
              "Updates installed",
              "All packages updated to latest versions.",
            );
          }, 500);
          return 100;
        }
        return next;
      });
    }, 300);
  };

  const updateItem = (name: string) => {
    success("Update started", `${name} is being updated...`);
    setTimeout(() => {
      success("Update complete", `${name} has been updated.`);
    }, 2000);
  };

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Updates</h1>
          <p className="text-muted-foreground mt-1">
            Keep your site up to date with the latest releases.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={checkUpdates}
            disabled={checking || updating}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${checking ? "animate-spin" : ""}`}
            />
            {checking ? "Checking..." : "Check Again"}
          </Button>
          <Button onClick={updateAll} disabled={updating || updates.length === 0}>
            <Upload className="h-4 w-4 mr-2" />
            {updating ? "Updating..." : "Update All"}
          </Button>
        </div>
      </div>

      {lastChecked && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Last checked: {formatDate(lastChecked)}</span>
        </div>
      )}

      {updating && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Updating packages...</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {updates.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-500" />
          <p className="text-muted-foreground">
            Everything is up to date!
          </p>
        </div>
      ) : (
        <>
          {/* Core updates */}
          {updates.filter((u) => u.type === "core").length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">Core</h3>
              {updates
                .filter((u) => u.type === "core")
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

          {/* Plugin updates */}
          {updates.filter((u) => u.type === "plugin").length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">Plugins</h3>
              {updates
                .filter((u) => u.type === "plugin")
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

          {/* Theme updates */}
          {updates.filter((u) => u.type === "theme").length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">Themes</h3>
              {updates
                .filter((u) => u.type === "theme")
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
  const SeverityIcon = severityIcons[update.severity];
  return (
    <Card className="mb-3">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-muted p-2">
              {update.type === "core" ? (
                <Database className="h-5 w-5" />
              ) : (
                <Package className="h-5 w-5" />
              )}
            </div>
            <div>
              <CardTitle className="text-base">{update.name}</CardTitle>
              <CardDescription>
                {update.currentVersion} \u2192 {update.newVersion}
              </CardDescription>
              {update.description && (
                <p className="text-xs text-muted-foreground mt-1">
                  {update.description}
                </p>
              )}
            </div>
          </div>
          <Badge variant={severityColors[update.severity]}>
            <SeverityIcon className="h-3 w-3 mr-1 inline" />
            {update.severity}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex justify-end gap-2">
        <Button variant="outline" size="sm">
          View Details
        </Button>
        <Button
          size="sm"
          onClick={() => onUpdate(update.name)}
          disabled={disabled}
        >
          <Upload className="h-4 w-4 mr-1.5" /> Update
        </Button>
      </CardContent>
    </Card>
  );
}
