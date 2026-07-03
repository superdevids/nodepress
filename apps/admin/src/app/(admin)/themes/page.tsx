"use client";

import * as React from "react";
import { Palette, Check, ExternalLink, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

interface Theme {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  active: boolean;
  screenshot?: string;
}

const mockThemes: Theme[] = [
  {
    id: "1",
    name: "NodePress Default",
    description: "The default theme for NodePress. Clean, accessible, and responsive for all devices.",
    version: "1.0.0",
    author: "NodePress",
    active: true,
  },
  {
    id: "2",
    name: "Minimal Blog",
    description: "A minimal, content-first theme designed for bloggers and writers.",
    version: "0.8.0",
    author: "Community",
    active: false,
  },
  {
    id: "3",
    name: "Corporate Pro",
    description: "Professional theme for business websites with advanced layout options.",
    version: "2.1.0",
    author: "ThemeStudio",
    active: false,
  },
];

export default function ThemesPage() {
  const [themes, setThemes] = React.useState(mockThemes);
  const { success } = useToast();

  const activateTheme = (id: string) => {
    setThemes((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          success("Theme Activated", `${t.name} is now the active theme.`);
          return { ...t, active: true };
        }
        return { ...t, active: false };
      }),
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Themes</h1>
        <p className="text-muted-foreground mt-1">
          Manage your site appearance with themes.
        </p>
      </div>

      {/* Active theme */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
          Active Theme
        </h2>
        {themes
          .filter((t) => t.active)
          .map((theme) => (
            <Card key={theme.id} className="border-2 border-primary">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-3">
                      <Palette className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{theme.name}</CardTitle>
                      <CardDescription>v{theme.version} by {theme.author}</CardDescription>
                    </div>
                  </div>
                  <Badge variant="success" className="gap-1">
                    <Check className="h-3 w-3" /> Active
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{theme.description}</p>
              </CardContent>
              <CardFooter className="gap-2">
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-4 w-4 mr-1.5" /> Customize
                </Button>
              </CardFooter>
            </Card>
          ))}
      </div>

      {/* Installed themes */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
          Installed Themes
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {themes
            .filter((t) => !t.active)
            .map((theme) => (
              <Card key={theme.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-muted p-2">
                        <Palette className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{theme.name}</CardTitle>
                        <CardDescription>v{theme.version}</CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{theme.description}</p>
                  <p className="text-xs text-muted-foreground mt-2">By {theme.author}</p>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => activateTheme(theme.id)}
                  >
                    <Check className="h-4 w-4 mr-1.5" /> Activate
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
        </div>
      </div>
    </div>
  );
}
