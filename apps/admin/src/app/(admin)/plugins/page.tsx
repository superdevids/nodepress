"use client";

import * as React from "react";
import { Plus, Puzzle, Power, PowerOff, Settings, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

interface Plugin {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  active: boolean;
}

const mockPlugins: Plugin[] = [
  { id: "1", name: "SEO Toolkit", description: "Advanced SEO meta tags, sitemap generation, and schema markup.", version: "1.2.0", author: "NodePress", active: true },
  { id: "2", name: "Redis Cache", description: "High-performance Redis-based caching layer for API and page responses.", version: "0.9.0", author: "NodePress", active: true },
  { id: "3", name: "Comments", description: "Full comment system with moderation, anti-spam, and nested replies.", version: "1.0.0", author: "NodePress", active: false },
  { id: "4", name: "Form Builder", description: "Drag-and-drop form builder with submissions management.", version: "0.5.0", author: "Community", active: false },
  { id: "5", name: "Webhook Dispatcher", description: "Send webhooks on content events with retry logic.", version: "1.1.0", author: "NodePress", active: true },
];

export default function PluginsPage() {
  const [plugins, setPlugins] = React.useState(mockPlugins);
  const [search, setSearch] = React.useState("");
  const { success } = useToast();

  const togglePlugin = (id: string) => {
    setPlugins((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const newActive = !p.active;
          success(newActive ? "Plugin Activated" : "Plugin Deactivated", p.name);
          return { ...p, active: newActive };
        }
        return p;
      }),
    );
  };

  const filtered = plugins.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Plugins</h1>
          <p className="text-muted-foreground mt-1">
            Extend NodePress with plugins.
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add New Plugin
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Input
          placeholder="Search plugins..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Plugin grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((plugin) => (
          <Card key={plugin.id} className={plugin.active ? "" : "opacity-60"}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Puzzle className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{plugin.name}</CardTitle>
                    <CardDescription>v{plugin.version}</CardDescription>
                  </div>
                </div>
                <Badge variant={plugin.active ? "success" : "secondary"}>
                  {plugin.active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{plugin.description}</p>
              <p className="text-xs text-muted-foreground mt-2">By {plugin.author}</p>
            </CardContent>
            <CardFooter className="flex justify-between">
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => togglePlugin(plugin.id)}
                >
                  {plugin.active ? (
                    <><PowerOff className="h-4 w-4 mr-1.5" /> Deactivate</>
                  ) : (
                    <><Power className="h-4 w-4 mr-1.5" /> Activate</>
                  )}
                </Button>
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4 mr-1.5" /> Settings
                </Button>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Browse registry link */}
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">
          Looking for more?{" "}
          <a href="#" className="text-primary hover:underline inline-flex items-center gap-1">
            Browse the plugin registry <ExternalLink className="h-3 w-3" />
          </a>
        </p>
      </div>
    </div>
  );
}
