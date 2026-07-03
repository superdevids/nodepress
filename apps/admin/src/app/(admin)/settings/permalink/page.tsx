"use client";

import * as React from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

const permalinkOptions = [
  { value: "default", label: "Plain", example: "/?p=123", preview: "https://example.com/?p=123" },
  { value: "day-name", label: "Day and name", example: "/2026/07/03/sample-post/", preview: "https://example.com/2026/07/03/sample-post/" },
  { value: "month-name", label: "Month and name", example: "/2026/07/sample-post/", preview: "https://example.com/2026/07/sample-post/" },
  { value: "post-name", label: "Post name", example: "/sample-post/", preview: "https://example.com/sample-post/" },
  { value: "numeric", label: "Numeric", example: "/archives/123", preview: "https://example.com/archives/123" },
  { value: "custom", label: "Custom structure", example: "", preview: "" },
];

export default function PermalinkSettingsPage() {
  const { success } = useToast();
  const [structure, setStructure] = React.useState("post-name");
  const [custom, setCustom] = React.useState("/%category%/%postname%/");

  const selectedOption = permalinkOptions.find((o) => o.value === structure);
  const previewUrl =
    structure === "custom"
      ? `https://example.com${custom.replace(/%[^%]+%/g, "sample-post")}`
      : selectedOption?.preview || "";

  const handleSave = () => {
    success("Permalink structure saved", "URL structure has been updated.");
  };

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Permalink Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Customize your URL structure for SEO and readability.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Common Settings</CardTitle>
          <CardDescription>
            Choose a permalink structure for your content. Changing this will
            affect all existing URLs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup value={structure} onValueChange={setStructure}>
            {permalinkOptions.map((opt) => (
              <div
                key={opt.value}
                className="flex items-start gap-3 rounded-lg border p-4"
              >
                <RadioGroupItem
                  value={opt.value}
                  id={opt.value}
                  className="mt-1"
                />
                <div className="flex-1">
                  <Label
                    htmlFor={opt.value}
                    className="font-medium cursor-pointer"
                  >
                    {opt.label}
                  </Label>
                  {opt.example && (
                    <p className="text-sm text-muted-foreground mt-0.5 font-mono">
                      {opt.example}
                    </p>
                  )}
                  {opt.value === "custom" && structure === "custom" && (
                    <div className="mt-3">
                      <Input
                        value={custom}
                        onChange={(e) => setCustom(e.target.value)}
                        className="font-mono text-sm"
                        placeholder="/%category%/%postname%/"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Available tags:{" "}
                        <code className="text-xs bg-muted px-1 rounded">
                          %year%
                        </code>{" "}
                        <code className="text-xs bg-muted px-1 rounded">
                          %monthnum%
                        </code>{" "}
                        <code className="text-xs bg-muted px-1 rounded">
                          %day%
                        </code>{" "}
                        <code className="text-xs bg-muted px-1 rounded">
                          %postname%
                        </code>{" "}
                        <code className="text-xs bg-muted px-1 rounded">
                          %category%
                        </code>{" "}
                        <code className="text-xs bg-muted px-1 rounded">
                          %post_id%
                        </code>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </RadioGroup>

          {previewUrl && (
            <div className="rounded-lg border bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground mb-1">
                Preview URL:
              </p>
              <p className="text-sm font-mono text-primary break-all">
                {previewUrl}
              </p>
            </div>
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
