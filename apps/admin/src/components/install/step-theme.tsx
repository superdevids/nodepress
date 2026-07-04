'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Loader2, Palette, ChevronLeft, Sparkles, Upload, CheckCircle2, LayoutDashboard, Monitor, Smartphone } from 'lucide-react';

interface ThemeInfo {
  slug: string;
  name: string;
  description: string;
  features: string[];
  color: string;
}

const THEMES: ThemeInfo[] = [
  {
    slug: 'web-starter',
    name: 'Web Starter',
    description:
      'A modern, responsive starter theme built with Tailwind CSS. Perfect for blogs, portfolios, and business sites.',
    features: ['Responsive design', 'Tailwind CSS v4', 'Dark mode support', 'SEO optimized', 'Accessible'],
    color: 'from-blue-500/20 to-indigo-500/10',
  },
  {
    slug: 'blog',
    name: 'Minimal Blog',
    description:
      'A clean, minimal blog theme focused on readability and typography. Ideal for personal blogs and publications.',
    features: ['Clean typography', 'Reading mode', 'Tag system', 'Author profiles', 'Newsletter opt-in'],
    color: 'from-amber-500/20 to-orange-500/10',
  },
  {
    slug: 'business',
    name: 'Business Pro',
    description:
      'A professional business theme with landing page blocks, testimonials, and team showcase sections.',
    features: ['Landing page blocks', 'Testimonials', 'Team showcase', 'Contact forms', 'Analytics'],
    color: 'from-emerald-500/20 to-teal-500/10',
  },
  {
    slug: 'portfolio',
    name: 'Portfolio',
    description:
      'A visually rich portfolio theme for creative professionals. Showcase your work with style.',
    features: ['Project gallery', 'Lightbox viewer', 'Skill bars', 'Client logos', 'Resume section'],
    color: 'from-purple-500/20 to-pink-500/10',
  },
];

interface StepThemeProps {
  selectedTheme: string;
  installType: 'fresh' | 'import';
  loading: boolean;
  onFieldChange: (field: string, value: any) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function StepTheme({
  selectedTheme,
  installType,
  loading,
  onFieldChange,
  onNext,
  onPrev,
}: StepThemeProps) {
  return (
    <div className="space-y-6">
      {/* Theme Selection */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 p-2.5 shadow-sm ring-1 ring-primary/10">
              <Palette className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Choose a Theme</CardTitle>
              <CardDescription className="text-sm">
                Pick a starting theme for your site. You can change themes anytime from the admin
                panel.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {THEMES.map((theme) => {
              const isSelected = selectedTheme === theme.slug;
              return (
                <button
                  key={theme.slug}
                  type="button"
                  onClick={() => onFieldChange('selectedTheme', theme.slug)}
                  className={`group flex flex-col overflow-hidden rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-primary bg-card shadow-md ring-1 ring-primary/20'
                      : 'border-border/50 bg-card hover:border-border/80 hover:shadow-sm'
                  }`}
                >
                  {/* Theme preview area */}
                  <div
                    className={`relative flex h-36 items-center justify-center bg-gradient-to-br ${theme.color} transition-colors`}
                  >
                    {/* Preview mockup */}
                    <div className="flex flex-col items-center gap-2 opacity-60">
                      <LayoutDashboard className="h-8 w-8 text-foreground/40" />
                      <div className="flex gap-3">
                        <Monitor className="h-5 w-5 text-foreground/30" />
                        <Smartphone className="h-5 w-5 text-foreground/30" />
                      </div>
                    </div>

                    {/* Selected overlay */}
                    {isSelected && (
                      <div className="absolute inset-0 flex items-center justify-center bg-primary/10 backdrop-blur-[1px]">
                        <div className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground shadow-lg">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Selected
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Theme info */}
                  <div className="space-y-2.5 p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">{theme.name}</h3>
                      {isSelected && (
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs leading-relaxed line-clamp-2">
                      {theme.description}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {theme.features.slice(0, 3).map((feature) => (
                        <span
                          key={feature}
                          className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-medium"
                        >
                          {feature}
                        </span>
                      ))}
                      {theme.features.length > 3 && (
                        <span className="text-muted-foreground rounded-full px-1 py-0.5 text-[10px]">
                          +{theme.features.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Install Type */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Installation Type</CardTitle>
          <CardDescription className="text-sm">
            Choose how you want to set up your content initially.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={installType}
            onValueChange={(v) => onFieldChange('installType', v as 'fresh' | 'import')}
            className="grid gap-3 sm:grid-cols-2"
          >
            <label
              className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-all ${
                installType === 'fresh'
                  ? 'border-primary/60 bg-primary/5 shadow-sm ring-1 ring-primary/20'
                  : 'border-border/50 hover:border-border/80'
              }`}
            >
              <RadioGroupItem value="fresh" id="install-fresh" className="mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Start Fresh</span>
                </div>
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                  Begin with sample content including a &ldquo;Hello World&rdquo; post and a sample
                  page. Best for new projects.
                </p>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-all ${
                installType === 'import'
                  ? 'border-primary/60 bg-primary/5 shadow-sm ring-1 ring-primary/20'
                  : 'border-border/50 hover:border-border/80'
              }`}
            >
              <RadioGroupItem value="import" id="install-import" className="mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Import WordPress</span>
                </div>
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                  Import content from an existing WordPress site using a WXR file. Use the Import
                  tool after installation.
                </p>
              </div>
            </label>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onPrev} disabled={loading} size="sm">
          <ChevronLeft className="mr-1.5 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext} disabled={loading} size="lg" className="gap-2">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Installing...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Install NodePress
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
