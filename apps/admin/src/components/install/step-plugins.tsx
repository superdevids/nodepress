'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Puzzle,
  ChevronLeft,
  ChevronRight,
  Search,
  Globe,
  Image,
  Database,
  MessageSquare,
  Code2,
  Mail,
  Zap,
  ArrowLeftRight,
  Shield,
  Share2,
  BarChart3,
  HardDrive,
} from 'lucide-react';
import { Input } from '@/components/ui/input';

interface PluginInfo {
  slug: string;
  name: string;
  description: string;
  wpEquivalent: string;
  icon: React.ReactNode;
}

const ALL_PLUGINS: PluginInfo[] = [
  {
    slug: 'seo',
    name: 'SEO',
    description: 'Meta tags, XML sitemaps, schema.org markup, Open Graph, and SEO analysis.',
    wpEquivalent: 'Yoast SEO / Rank Math',
    icon: <Globe className="h-5 w-5" />,
  },
  {
    slug: 'analytics',
    name: 'Analytics',
    description:
      'Google Analytics 4 integration with dashboard widgets, event tracking, and GDPR consent.',
    wpEquivalent: 'Site Kit by Google / MonsterInsights',
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    slug: 'backup',
    name: 'Backup',
    description:
      'Scheduled backups with database dumps, file archives, and cloud storage destinations.',
    wpEquivalent: 'UpdraftPlus / BackWPup',
    icon: <HardDrive className="h-5 w-5" />,
  },
  {
    slug: 'cache-redis',
    name: 'Redis Cache',
    description: 'Advanced Redis-based caching for API responses, pages, and database queries.',
    wpEquivalent: 'Redis Object Cache / W3 Total Cache',
    icon: <Database className="h-5 w-5" />,
  },
  {
    slug: 'comments',
    name: 'Comments',
    description:
      'Full comment system with threading, moderation, Akismet anti-spam, and Gravatar support.',
    wpEquivalent: 'Native WordPress Comments / wpDiscuz',
    icon: <MessageSquare className="h-5 w-5" />,
  },
  {
    slug: 'file-editor',
    name: 'File Editor',
    description: 'In-browser code editor for theme and plugin files (Monaco-based).',
    wpEquivalent: 'Advanced File Manager / Theme File Editor',
    icon: <Code2 className="h-5 w-5" />,
  },
  {
    slug: 'forms',
    name: 'Forms',
    description: 'Drag-and-drop form builder with contact forms, surveys, and payment collection.',
    wpEquivalent: 'Contact Form 7 / Gravity Forms',
    icon: <Image className="h-5 w-5" />,
  },
  {
    slug: 'multilingual',
    name: 'Multilingual',
    description:
      'Multi-language support with language switcher, automatic translation, and localized URLs.',
    wpEquivalent: 'WPML / Polylang',
    icon: <Globe className="h-5 w-5" />,
  },
  {
    slug: 'newsletter',
    name: 'Newsletter',
    description:
      'Email list management, campaign creation, SMTP/SES/SendGrid sending, subscriber management.',
    wpEquivalent: 'MailPoet / Newsletter',
    icon: <Mail className="h-5 w-5" />,
  },
  {
    slug: 'performance',
    name: 'Performance',
    description:
      'Page caching, HTML/CSS/JS minification, deferred JS, lazy loading, CDN integration.',
    wpEquivalent: 'WP Rocket / W3 Total Cache',
    icon: <Zap className="h-5 w-5" />,
  },
  {
    slug: 'redirection',
    name: 'Redirection',
    description:
      '301/302/307/308 redirect management with regex support, 404 tracking, CSV import/export.',
    wpEquivalent: 'Redirection / Rank Math',
    icon: <ArrowLeftRight className="h-5 w-5" />,
  },
  {
    slug: 'security',
    name: 'Security',
    description:
      'Firewall rules, file integrity monitoring, login lockdown, two-factor enforcement.',
    wpEquivalent: 'Wordfence / Sucuri',
    icon: <Shield className="h-5 w-5" />,
  },
  {
    slug: 'social-sharing',
    name: 'Social Sharing',
    description:
      'Social share buttons, floating bar, inline placement, Open Graph tags, share count.',
    wpEquivalent: 'Social Warfare / Shared Counts',
    icon: <Share2 className="h-5 w-5" />,
  },
];

interface StepPluginsProps {
  selectedPlugins: string[];
  onFieldChange: (field: string, value: any) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function StepPlugins({ selectedPlugins, onFieldChange, onNext, onPrev }: StepPluginsProps) {
  const [search, setSearch] = React.useState('');

  const togglePlugin = (slug: string) => {
    const updated = selectedPlugins.includes(slug)
      ? selectedPlugins.filter((s) => s !== slug)
      : [...selectedPlugins, slug];
    onFieldChange('selectedPlugins', updated);
  };

  const filtered = ALL_PLUGINS.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Card className="border-border/60">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 rounded-lg p-2">
            <Puzzle className="text-primary h-5 w-5" />
          </div>
          <div>
            <CardTitle>Plugins</CardTitle>
            <CardDescription>
              Select the plugins you want to activate. You can always change this later.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search plugins..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Plugin Grid */}
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((plugin) => {
            const isSelected = selectedPlugins.includes(plugin.slug);
            return (
              <button
                key={plugin.slug}
                type="button"
                onClick={() => togglePlugin(plugin.slug)}
                className={`hover:border-primary/50 flex items-start gap-3 rounded-lg border p-3 text-left transition-all ${
                  isSelected
                    ? 'border-primary/70 bg-primary/5 ring-primary/30 ring-1'
                    : 'border-border/60'
                }`}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => togglePlugin(plugin.slug)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div
                      className={`rounded-md p-1.5 ${
                        isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {plugin.icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{plugin.name}</p>
                      <p className="text-muted-foreground text-xs">{plugin.wpEquivalent}</p>
                    </div>
                  </div>
                  <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
                    {plugin.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-muted-foreground py-8 text-center">
            <Puzzle className="mx-auto mb-2 h-8 w-8 opacity-50" />
            <p className="text-sm">No plugins match your search.</p>
          </div>
        )}

        <div className="text-muted-foreground text-xs">
          {selectedPlugins.length} of {ALL_PLUGINS.length} plugins selected
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" onClick={onPrev}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button onClick={onNext}>
            Next Step
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
