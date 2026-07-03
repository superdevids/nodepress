"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

const generalSchema = z.object({
  siteTitle: z.string().min(1, "Site title is required"),
  tagline: z.string().optional(),
  adminEmail: z.string().email("Valid email is required"),
  siteUrl: z.string().url("Valid URL is required"),
  timezone: z.string(),
  dateFormat: z.string(),
  language: z.string(),
});

type GeneralForm = z.infer<typeof generalSchema>;

const timezones = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Jakarta",
  "Asia/Kolkata",
  "Australia/Sydney",
  "Pacific/Auckland",
];

const dateFormats = [
  { value: "F j, Y", label: "July 3, 2026" },
  { value: "Y-m-d", label: "2026-07-03" },
  { value: "m/d/Y", label: "07/03/2026" },
  { value: "d/m/Y", label: "03/07/2026" },
];

const languages = [
  { value: "en", label: "English" },
  { value: "id", label: "Bahasa Indonesia" },
  { value: "ms", label: "Bahasa Melayu" },
  { value: "zh", label: "中文" },
  { value: "ja", label: "日本語" },
  { value: "ko", label: "한국어" },
  { value: "de", label: "Deutsch" },
  { value: "fr", label: "Français" },
];

export default function GeneralSettingsPage() {
  const { success, error } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<GeneralForm>({
    resolver: zodResolver(generalSchema),
    defaultValues: {
      siteTitle: "My NodePress Site",
      tagline: "A powerful CMS built with TypeScript",
      adminEmail: "admin@example.com",
      siteUrl: "https://example.com",
      timezone: "UTC",
      dateFormat: "F j, Y",
      language: "en",
    },
  });

  const onSubmit = async (data: GeneralForm) => {
    setIsSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 500));
      success("Settings saved", "General settings have been updated.");
    } catch {
      error("Failed to save", "Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">General Settings</h1>
        <p className="text-muted-foreground mt-1">
          Basic site settings including title, language, and timezone.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Site Details</CardTitle>
            <CardDescription>
              Change your site title, tagline, and admin email.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="siteTitle">Site Title</Label>
              <Input
                id="siteTitle"
                {...register("siteTitle")}
                className={errors.siteTitle ? "border-destructive" : ""}
              />
              {errors.siteTitle && (
                <p className="text-xs text-destructive">
                  {errors.siteTitle.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                {...register("tagline")}
                placeholder="In a few words, explain what your site is about"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adminEmail">Admin Email</Label>
              <Input
                id="adminEmail"
                type="email"
                {...register("adminEmail")}
                className={errors.adminEmail ? "border-destructive" : ""}
              />
              {errors.adminEmail && (
                <p className="text-xs text-destructive">
                  {errors.adminEmail.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="siteUrl">Site URL</Label>
              <Input
                id="siteUrl"
                type="url"
                {...register("siteUrl")}
                className={errors.siteUrl ? "border-destructive" : ""}
              />
              {errors.siteUrl && (
                <p className="text-xs text-destructive">
                  {errors.siteUrl.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Regional Settings</CardTitle>
            <CardDescription>
              Configure timezone, date format, and language.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="timezone">Timezone</Label>
              <Controller
                name="timezone"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timezones.map((tz) => (
                        <SelectItem key={tz} value={tz}>
                          {tz}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dateFormat">Date Format</Label>
              <Controller
                name="dateFormat"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dateFormats.map((df) => (
                        <SelectItem key={df.value} value={df.value}>
                          {df.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="language">Language</Label>
              <Controller
                name="language"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-end">
          <Button type="submit" disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
