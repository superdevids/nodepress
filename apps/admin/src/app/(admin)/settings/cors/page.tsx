"use client";

import * as React from "react";
import { Save, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

export default function CORSSettingsPage() {
  const { success } = useToast();
  const [origins, setOrigins] = React.useState<string[]>([
    "https://example.com",
    "https://admin.example.com",
    "https://api.example.com",
  ]);
  const [newOrigin, setNewOrigin] = React.useState("");
  const [allowWildcard, setAllowWildcard] = React.useState(false);

  const addOrigin = () => {
    if (newOrigin && !origins.includes(newOrigin)) {
      setOrigins([...origins, newOrigin]);
      setNewOrigin("");
    }
  };

  const removeOrigin = (origin: string) => {
    setOrigins(origins.filter((o) => o !== origin));
  };

  const handleSave = () => {
    success("CORS settings saved", "Allowed origins have been updated.");
  };

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">CORS Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage allowed origins for API access.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Allowed Origins</CardTitle>
          <CardDescription>
            Add the origins (URLs) that are allowed to make cross-origin
            requests to your API. Supports wildcard patterns with *.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label>Allow all origins (*)</Label>
              <p className="text-xs text-muted-foreground">
                Use with caution. Not recommended for production.
              </p>
            </div>
            <Switch
              checked={allowWildcard}
              onCheckedChange={setAllowWildcard}
            />
          </div>

          {!allowWildcard && (
            <>
              <div className="space-y-2">
                {origins.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No custom origins configured.
                  </p>
                )}
                {origins.map((origin) => (
                  <div
                    key={origin}
                    className="flex items-center gap-2 rounded-md border p-3"
                  >
                    <code className="flex-1 text-sm">{origin}</code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
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
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addOrigin();
                    }
                  }}
                />
                <Button variant="outline" size="icon" onClick={addOrigin}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Use <code className="text-xs bg-muted px-1 rounded">*</code> as
                wildcard, e.g.,{" "}
                <code className="text-xs bg-muted px-1 rounded">
                  https://*.example.com
                </code>{" "}
                to allow all subdomains.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" /> Save Changes
        </Button>
      </div>
    </div>
  );
}
