'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Palette, ChevronLeft, Sparkles, Upload } from 'lucide-react';

interface StepThemeProps {
  selectedTheme: string;
  installType: 'fresh' | 'import';
  onFieldChange: (field: string, value: any) => void;
  onNext: () => void;
  onPrev: () => void;
}

const THEMES = [
  {
    slug: 'web-starter',
    name: 'Web Starter',
    description:
      'A modern, responsive starter theme built with Tailwind CSS. Perfect for blogs, portfolios, and business sites.',
    features: ['Responsive design', 'Tailwind CSS v4', 'Dark mode support', 'SEO optimized'],
  },
];

export function StepTheme({
  selectedTheme,
  installType,
  onFieldChange,
  onNext,
  onPrev,
}: StepThemeProps) {
  return (
    <Card className="border-border/60">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 rounded-lg p-2">
            <Palette className="text-primary h-5 w-5" />
          </div>
          <div>
            <CardTitle>Theme Selection</CardTitle>
            <CardDescription>Choose your starting theme and how you want to begin.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Theme Selection */}
        <div className="grid gap-4">
          {THEMES.map((theme) => {
            const isSelected = selectedTheme === theme.slug;
            return (
              <button
                key={theme.slug}
                type="button"
                onClick={() => onFieldChange('selectedTheme', theme.slug)}
                className={`hover:border-primary/50 flex flex-col overflow-hidden rounded-lg border transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5 ring-primary ring-1'
                    : 'border-border/60'
                }`}
              >
                {/* Thumbnail placeholder */}
                <div className="from-primary/20 to-primary/5 flex h-32 items-center justify-center bg-gradient-to-br">
                  <div className="flex flex-col items-center gap-1">
                    <Palette className="text-primary/40 h-8 w-8" />
                    <span className="text-muted-foreground/40 text-xs">Preview</span>
                  </div>
                </div>

                <div className="space-y-2 p-4">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-4 w-4 rounded-full border-2 ${
                        isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/40'
                      }`}
                    >
                      {isSelected && <div className="m-0.5 h-2.5 w-2.5 rounded-full bg-white" />}
                    </div>
                    <p className="text-sm font-medium">{theme.name}</p>
                    {isSelected && (
                      <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-medium">
                        Selected
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {theme.description}
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {theme.features.map((feature) => (
                      <span
                        key={feature}
                        className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px]"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <Separator />

        {/* Install Type */}
        <div className="space-y-3">
          <Label className="text-base">Starting Point</Label>
          <p className="text-muted-foreground text-xs">
            Choose how you want to set up your content initially.
          </p>
          <RadioGroup
            value={installType}
            onValueChange={(v) => onFieldChange('installType', v)}
            className="grid gap-3 sm:grid-cols-2"
          >
            <div
              className={`flex items-start gap-3 rounded-lg border p-4 ${
                installType === 'fresh'
                  ? 'border-primary/70 bg-primary/5 ring-primary/30 ring-1'
                  : 'border-border/60'
              }`}
            >
              <RadioGroupItem value="fresh" id="fresh" className="mt-0.5" />
              <Label htmlFor="fresh" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-sm font-medium">Start Fresh</span>
                </div>
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                  Begin with sample content including a "Hello World" post and sample page. Best for
                  new projects.
                </p>
              </Label>
            </div>

            <div
              className={`flex items-start gap-3 rounded-lg border p-4 ${
                installType === 'import'
                  ? 'border-primary/70 bg-primary/5 ring-primary/30 ring-1'
                  : 'border-border/60'
              }`}
            >
              <RadioGroupItem value="import" id="import" className="mt-0.5" />
              <Label htmlFor="import" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  <span className="text-sm font-medium">Import WordPress</span>
                </div>
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                  Import content from an existing WordPress site using a WXR file. Use the Tools
                  page after installation.
                </p>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" onClick={onPrev}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button onClick={onNext}>
            Install NodePress
            <Sparkles className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
