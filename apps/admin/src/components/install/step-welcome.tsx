'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowRight,
  Database,
  Globe,
  Palette,
  Puzzle,
  Shield,
  Sparkles,
  UserRound,
} from 'lucide-react';

interface StepWelcomeProps {
  language: string;
  onFieldChange: (field: string, value: any) => void;
  onNext: () => void;
}

const LANGUAGES = [
  { value: 'en-US', label: 'English (US)', native: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)', native: 'English (UK)' },
  { value: 'es', label: 'Español', native: 'Español' },
  { value: 'fr', label: 'Français', native: 'Français' },
  { value: 'de', label: 'Deutsch', native: 'Deutsch' },
  { value: 'it', label: 'Italiano', native: 'Italiano' },
  { value: 'pt-BR', label: 'Português (Brasil)', native: 'Português (Brasil)' },
  { value: 'nl', label: 'Nederlands', native: 'Nederlands' },
  { value: 'ru', label: 'Русский', native: 'Русский' },
  { value: 'ja', label: '日本語', native: '日本語' },
  { value: 'zh-CN', label: '简体中文', native: '简体中文' },
  { value: 'ko', label: '한국어', native: '한국어' },
];

const FEATURES = [
  { icon: Database, title: 'Database', description: 'PostgreSQL with Prisma ORM' },
  { icon: UserRound, title: 'User Management', description: 'Role-based access control' },
  { icon: Palette, title: 'Themes', description: 'Tailwind CSS powered themes' },
  { icon: Puzzle, title: 'Plugins', description: 'Extensible plugin system' },
  { icon: Globe, title: 'Headless CMS', description: 'API-first architecture' },
  { icon: Shield, title: 'Security', description: 'Built-in security features' },
];

export function StepWelcome({ language, onFieldChange, onNext }: StepWelcomeProps) {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center">
        <div className="mb-6 inline-flex items-center justify-center">
          <div className="from-primary/20 via-primary/10 to-primary/5 ring-primary/10 rounded-2xl bg-gradient-to-br p-4 shadow-sm ring-1">
            <Sparkles className="text-primary h-10 w-10" />
          </div>
        </div>
        <h1 className="text-4xl font-bold tracking-tight">Welcome to NodePress</h1>
        <p className="text-muted-foreground mx-auto mt-3 max-w-xl text-base leading-relaxed">
          A modern, headless content management system built with Node.js and Next.js. Let&apos;s
          get your site up and running in just a few steps.
        </p>
      </div>

      {/* Feature Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="border-border/50 bg-card hover:border-border/80 flex items-start gap-3 rounded-lg border p-3.5 transition-colors"
          >
            <div className="bg-primary/10 shrink-0 rounded-lg p-2">
              <feature.icon className="text-primary h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">{feature.title}</p>
              <p className="text-muted-foreground mt-0.5 text-xs">{feature.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Language Selection Card */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Choose Your Language</CardTitle>
          <CardDescription>
            Select the language for the installation process and default site language.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="welcome-language">Installation Language</Label>
            <Select value={language} onValueChange={(value) => onFieldChange('language', value)}>
              <SelectTrigger id="welcome-language" className="w-full sm:w-72">
                <SelectValue placeholder="Select a language" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    <span className="flex items-center gap-2">
                      <Globe className="text-muted-foreground h-3.5 w-3.5" />
                      {lang.native}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Action Button */}
      <div className="flex justify-end">
        <Button size="lg" onClick={onNext} className="gap-2 px-8">
          Start Installation
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
