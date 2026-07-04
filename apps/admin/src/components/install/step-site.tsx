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
import { Globe, ChevronLeft, ChevronRight } from 'lucide-react';

interface StepSiteProps {
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
    example: 'https://example.com/2026/07/04/sample-post/',
  },
  {
    value: '/%year%/%monthnum%/%postname%/',
    label: 'Month and name',
    example: 'https://example.com/2026/07/sample-post/',
  },
  {
    value: '/%postname%/',
    label: 'Post name',
    example: 'https://example.com/sample-post/',
  },
  {
    value: 'custom',
    label: 'Custom',
    example: 'Define your own structure',
  },
];

export function StepSite({
  siteName,
  siteDescription,
  siteUrl,
  language,
  timezone,
  permalink,
  onFieldChange,
  onNext,
  onPrev,
}: StepSiteProps) {
  const handleLanguageChange = (value: string) => onFieldChange('language', value);
  const handleTimezoneChange = (value: string) => onFieldChange('timezone', value);
  const handlePermalinkChange = (value: string) => onFieldChange('permalink', value);

  const isValid = siteName.trim() && siteUrl.trim();

  return (
    <Card className="border-border/60">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 rounded-lg p-2">
            <Globe className="text-primary h-5 w-5" />
          </div>
          <div>
            <CardTitle>Site Configuration</CardTitle>
            <CardDescription>Configure your site name, language, and URL settings.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Site Name */}
          <div className="space-y-1.5">
            <Label htmlFor="siteName">Site Name</Label>
            <Input
              id="siteName"
              placeholder="My NodePress Site"
              value={siteName}
              onChange={(e) => onFieldChange('siteName', e.target.value)}
            />
          </div>

          {/* Site Description */}
          <div className="space-y-1.5">
            <Label htmlFor="siteDescription">Tagline</Label>
            <Input
              id="siteDescription"
              placeholder="Just another NodePress site"
              value={siteDescription}
              onChange={(e) => onFieldChange('siteDescription', e.target.value)}
            />
          </div>

          {/* Site URL */}
          <div className="space-y-1.5">
            <Label htmlFor="siteUrl">Site URL</Label>
            <Input
              id="siteUrl"
              type="url"
              placeholder="http://localhost:3000"
              value={siteUrl}
              onChange={(e) => onFieldChange('siteUrl', e.target.value)}
            />
          </div>

          {/* Language */}
          <div className="space-y-1.5">
            <Label>Language</Label>
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
            <Label>Timezone</Label>
            <Select value={timezone} onValueChange={handleTimezoneChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Permalink Structure */}
        <div className="space-y-3">
          <Label>Permalink Structure</Label>
          <div className="grid gap-3">
            {PERMALINK_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  if (option.value !== 'custom') {
                    onFieldChange('permalink', option.value);
                  }
                }}
                className={`hover:border-primary/50 flex items-start gap-3 rounded-lg border p-3 text-left transition-all ${
                  permalink === option.value
                    ? 'border-primary bg-primary/5 ring-primary ring-1'
                    : 'border-border/60'
                }`}
              >
                <div
                  className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 ${
                    permalink === option.value
                      ? 'border-primary bg-primary'
                      : 'border-muted-foreground/40'
                  }`}
                >
                  {permalink === option.value && (
                    <div className="m-0.5 h-2.5 w-2.5 rounded-full bg-white" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{option.label}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">{option.example}</p>
                </div>
              </button>
            ))}
          </div>
          {permalink === 'custom' && (
            <Input
              placeholder="/%postname%/"
              value={permalink === 'custom' ? '' : permalink}
              onChange={(e) => onFieldChange('permalink', e.target.value)}
              className="mt-2"
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" onClick={onPrev}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button onClick={onNext} disabled={!isValid}>
            Next Step
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
