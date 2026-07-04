'use client';

import * as React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Globe, ChevronLeft, ChevronRight, Link, Tag, Clock, Languages } from 'lucide-react';

interface StepSettingsProps {
  siteName: string;
  siteDescription: string;
  siteUrl: string;
  language: string;
  timezone: string;
  permalink: string;
  onFieldChange: (field: string, value: any) => void;
  onNext: () => void;
  onPrev: () => void;
}

const LANGUAGES = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'it', label: 'Italiano' },
  { value: 'pt-BR', label: 'Português (Brasil)' },
  { value: 'nl', label: 'Nederlands' },
  { value: 'ru', label: 'Русский' },
  { value: 'ja', label: '日本語' },
  { value: 'zh-CN', label: '简体中文' },
  { value: 'ko', label: '한국어' },
];

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'America/Sao_Paulo',
  'America/Buenos_Aires',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Amsterdam',
  'Europe/Stockholm',
  'Europe/Moscow',
  'Africa/Cairo',
  'Africa/Lagos',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Bangkok',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Sydney',
  'Pacific/Auckland',
];

const PERMALINK_OPTIONS = [
  {
    value: '/%year%/%monthnum%/%day%/%postname%/',
    label: 'Day and name',
    example: '/2026/07/04/sample-post/',
  },
  {
    value: '/%year%/%monthnum%/%postname%/',
    label: 'Month and name',
    example: '/2026/07/sample-post/',
  },
  {
    value: '/archives/%post_id%',
    label: 'Numeric',
    example: '/archives/123/',
  },
  {
    value: '/%postname%/',
    label: 'Post name',
    example: '/sample-post/',
  },
];

export function StepSettings({
  siteName,
  siteDescription,
  siteUrl,
  language,
  timezone,
  permalink,
  onFieldChange,
  onNext,
  onPrev,
}: StepSettingsProps) {
  const handleLanguageChange = (value: string) => onFieldChange('language', value);
  const handleTimezoneChange = (value: string) => onFieldChange('timezone', value);
  const handlePermalinkChange = (value: string) => onFieldChange('permalink', value);

  const isValid = siteName.trim().length > 0 && siteUrl.trim().length > 0;

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-4">
          <div className="from-primary/20 to-primary/5 ring-primary/10 rounded-xl bg-gradient-to-br p-2.5 shadow-sm ring-1">
            <Globe className="text-primary h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-xl">Site Settings</CardTitle>
            <CardDescription className="text-sm">
              Configure your site name, language, URL structure, and other global settings.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Site Name */}
          <div className="space-y-1.5">
            <Label htmlFor="siteName" className="flex items-center gap-1.5 text-sm font-medium">
              <Tag className="text-muted-foreground h-3.5 w-3.5" />
              Site Name
            </Label>
            <Input
              id="siteName"
              placeholder="My NodePress Site"
              value={siteName}
              onChange={(e) => onFieldChange('siteName', e.target.value)}
              className="transition-shadow focus-visible:shadow-sm"
            />
          </div>

          {/* Tagline */}
          <div className="space-y-1.5">
            <Label
              htmlFor="siteDescription"
              className="flex items-center gap-1.5 text-sm font-medium"
            >
              <Tag className="text-muted-foreground h-3.5 w-3.5" />
              Tagline
            </Label>
            <Input
              id="siteDescription"
              placeholder="Just another NodePress site"
              value={siteDescription}
              onChange={(e) => onFieldChange('siteDescription', e.target.value)}
              className="transition-shadow focus-visible:shadow-sm"
            />
          </div>

          {/* Site URL */}
          <div className="space-y-1.5">
            <Label htmlFor="siteUrl" className="flex items-center gap-1.5 text-sm font-medium">
              <Link className="text-muted-foreground h-3.5 w-3.5" />
              Site URL
            </Label>
            <Input
              id="siteUrl"
              type="url"
              placeholder="http://localhost:3000"
              value={siteUrl}
              onChange={(e) => onFieldChange('siteUrl', e.target.value)}
              className="transition-shadow focus-visible:shadow-sm"
            />
          </div>

          {/* Language */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <Languages className="text-muted-foreground h-3.5 w-3.5" />
              Language
            </Label>
            <Select value={language} onValueChange={handleLanguageChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Timezone */}
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <Clock className="text-muted-foreground h-3.5 w-3.5" />
              Timezone
            </Label>
            <Select value={timezone} onValueChange={handleTimezoneChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Permalink Structure */}
        <div className="space-y-3">
          <Label className="flex items-center gap-1.5 text-sm font-medium">
            <Link className="text-muted-foreground h-3.5 w-3.5" />
            Permalink Structure
          </Label>
          <p className="text-muted-foreground text-xs">
            Choose the URL structure for your posts and pages.
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {PERMALINK_OPTIONS.map((option) => {
              const isSelected = permalink === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handlePermalinkChange(option.value)}
                  className={`relative flex items-start gap-3 rounded-lg border p-3.5 text-left transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5 ring-primary/20 shadow-sm ring-1'
                      : 'border-border/50 hover:border-border/80 hover:bg-muted/20'
                  }`}
                >
                  {/* Radio indicator */}
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                      isSelected ? 'border-primary' : 'border-muted-foreground/30'
                    }`}
                  >
                    {isSelected && <span className="bg-primary h-2 w-2 rounded-full" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-medium ${
                        isSelected ? 'text-primary' : 'text-foreground'
                      }`}
                    >
                      {option.label}
                    </p>
                    <p className="text-muted-foreground mt-0.5 truncate font-mono text-xs">
                      {option.example}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="border-border/50 flex items-center justify-between border-t pt-4">
          <Button variant="outline" onClick={onPrev} size="sm">
            <ChevronLeft className="mr-1.5 h-4 w-4" />
            Back
          </Button>
          <Button onClick={onNext} disabled={!isValid} size="sm">
            Next Step
            <ChevronRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
