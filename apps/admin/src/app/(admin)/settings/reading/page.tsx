"use client";

import * as React from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

export default function ReadingSettingsPage() {
  const { success } = useToast();
  const [postsPerPage, setPostsPerPage] = React.useState("10");
  const [searchVisible, setSearchVisible] = React.useState(true);
  const [defaultPostType, setDefaultPostType] = React.useState("post");

  const handleSave = () => {
    success("Settings saved", "Reading settings have been updated.");
  };

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reading Settings</h1>
        <p className="text-muted-foreground mt-1">
          Control how your content is displayed to visitors.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Content Display</CardTitle>
          <CardDescription>
            Configure how posts and pages are displayed on the frontend.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="postsPerPage">Posts per page</Label>
            <Input
              id="postsPerPage"
              type="number"
              value={postsPerPage}
              onChange={(e) => setPostsPerPage(e.target.value)}
              className="w-32"
            />
            <p className="text-xs text-muted-foreground">
              Maximum number of posts shown on archive pages.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="defaultPostType">Default post type</Label>
            <Select
              value={defaultPostType}
              onValueChange={setDefaultPostType}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="post">Post</SelectItem>
                <SelectItem value="page">Page</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              The default content type when creating new content from the admin bar.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label>Search engine visibility</Label>
              <p className="text-xs text-muted-foreground">
                Discourage search engines from indexing this site.
              </p>
            </div>
            <Switch
              checked={!searchVisible}
              onCheckedChange={(checked) => setSearchVisible(!checked)}
            />
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
