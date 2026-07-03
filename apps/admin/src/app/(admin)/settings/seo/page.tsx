"use client";

import * as React from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

export default function SEOSettingsPage() {
  const { success } = useToast();
  const [autoSitemap, setAutoSitemap] = React.useState(true);
  const [ogEnabled, setOgEnabled] = React.useState(true);

  const handleSave = () => {
    success("SEO settings saved", "Default meta settings have been updated.");
  };

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">SEO Settings</h1>
        <p className="text-muted-foreground mt-1">
          Default meta tags, Open Graph, sitemap, and search engine preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Default Meta</CardTitle>
          <CardDescription>
            Default meta tags used when no specific values are set on a page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="metaTitle">Default Meta Title</Label>
            <Input
              id="metaTitle"
              placeholder="Site title"
              defaultValue="My NodePress Site"
            />
            <p className="text-xs text-muted-foreground">
              Used when no specific meta title is set. Recommended: 50-60 characters.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="metaDesc">Default Meta Description</Label>
            <Textarea
              id="metaDesc"
              placeholder="Describe your site..."
              className="min-h-[80px]"
              defaultValue="A powerful CMS built with TypeScript and Next.js"
            />
            <p className="text-xs text-muted-foreground">
              Used when no specific meta description is set. Recommended: 150-160 characters.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ogImage">Default OG Image URL</Label>
            <Input
              id="ogImage"
              placeholder="https://example.com/og-image.png"
              defaultValue=""
            />
            <p className="text-xs text-muted-foreground">
              Default Open Graph image for social sharing.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Open Graph</CardTitle>
          <CardDescription>
            Configure how your content appears when shared on social media.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label>Enable Open Graph tags</Label>
              <p className="text-xs text-muted-foreground">
                Auto-generate og:title, og:description, and og:image tags.
              </p>
            </div>
            <Switch checked={ogEnabled} onCheckedChange={setOgEnabled} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sitemap</CardTitle>
          <CardDescription>
            XML sitemap generation settings for search engine crawling.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label>Auto-generate sitemap.xml</Label>
              <p className="text-xs text-muted-foreground">
                Automatically generate and update sitemap.xml when content changes.
              </p>
            </div>
            <Switch checked={autoSitemap} onCheckedChange={setAutoSitemap} />
          </div>
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
