'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, ChevronLeft, ChevronRight, Puzzle, Check } from 'lucide-react';

interface PluginInfo {
  slug: string;
  name: string;
  description: string;
  icon: string;
  popular: boolean;
  required?: boolean;
}

const ALL_PLUGINS: PluginInfo[] = [
  { slug: 'seo', name: 'SEO', description: 'Meta tags, sitemap, schema.org, readability analysis', icon: '🔍', popular: true },
  { slug: 'cache-redis', name: 'Redis Cache', description: 'Page cache, object cache, tag-based invalidation', icon: '⚡', popular: true },
  { slug: 'comments', name: 'Comments', description: 'Threaded comments, Gravatar, Akismet anti-spam', icon: '💬', popular: true },
  { slug: 'forms', name: 'Forms', description: 'Drag-drop form builder, Stripe, reCAPTCHA', icon: '📋', popular: false },
  { slug: 'analytics', name: 'Analytics', description: 'Google Analytics 4, real-time dashboard', icon: '📊', popular: true },
  { slug: 'security', name: 'Security', description: 'WAF, malware scan, 2FA, audit logging', icon: '🔒', popular: true },
  { slug: 'social-sharing', name: 'Social Sharing', description: 'Share buttons, share counts, click-to-tweet', icon: '📱', popular: false },
  { slug: 'backup', name: 'Backup', description: 'Scheduled backups, S3/GDrive, one-click restore', icon: '💾', popular: false },
  { slug: 'newsletter', name: 'Newsletter', description: 'Email campaigns, subscriber management', icon: '📧', popular: false },
  { slug: 'redirection', name: 'Redirection', description: '301/302 redirects, 404 tracking, regex', icon: '🔄', popular: false },
  { slug: 'performance', name: 'Performance', description: 'Minification, lazy loading, critical CSS', icon: '🚀', popular: true },
  { slug: 'multilingual', name: 'Multilingual', description: '11 languages, auto-translate, SEO per locale', icon: '🌐', popular: false },
  { slug: 'file-editor', name: 'File Editor', description: 'Code editor, git diff, file tree browser', icon: '📝', popular: false },
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
    const plugin = ALL_PLUGINS.find((p) => p.slug === slug);
    if (plugin?.required) return; // can't toggle required plugins
    const updated = selectedPlugins.includes(slug)
      ? selectedPlugins.filter((s) => s !== slug)
      : [...selectedPlugins, slug];
    onFieldChange('selectedPlugins', updated);
  };

  const selectAll = () => {
    onFieldChange('selectedPlugins', ALL_PLUGINS.map((p) => p.slug));
  };

  const deselectAll = () => {
    const required = ALL_PLUGINS.filter((p) => p.required).map((p) => p.slug);
    onFieldChange('selectedPlugins', required);
  };

  const filtered = ALL_PLUGINS.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 p-2.5 shadow-sm ring-1 ring-primary/10">
            <Puzzle className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">Plugin Selection</CardTitle>
            <CardDescription className="text-sm">
              Choose the plugins you want to activate. All plugins can be managed later from the
              admin panel.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Search + Bulk Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-xs">
            <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Search plugins..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs h-8">
              Select All
            </Button>
            <Button variant="ghost" size="sm" onClick={deselectAll} className="text-xs h-8">
              Clear
            </Button>
          </div>
        </div>

        {/* Plugin Grid */}
        <div className="grid gap-2.5 sm:grid-cols-2">
          {filtered.map((plugin) => {
            const isSelected = selectedPlugins.includes(plugin.slug);
            const isRequired = plugin.required;

            return (
              <button
                key={plugin.slug}
                type="button"
                onClick={() => togglePlugin(plugin.slug)}
                disabled={isRequired}
                className={`group relative flex items-start gap-3 rounded-lg border p-3.5 text-left transition-all ${
                  isSelected
                    ? 'border-primary/60 bg-primary/5 shadow-sm'
                    : 'border-border/50 hover:border-border/80 hover:bg-muted/20'
                } ${isRequired ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
              >
                {/* Checkbox */}
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-muted-foreground/30 mt-0.5 transition-colors group-hover:border-primary/50">
                  {isSelected && (
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-primary text-primary-foreground">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base leading-none shrink-0" role="img" aria-label={plugin.name}>
                      {plugin.icon}
                    </span>
                    <span className="text-sm font-medium truncate">{plugin.name}</span>
                    {plugin.popular && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal shrink-0">
                        Popular
                      </Badge>
                    )}
                    {isRequired && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal shrink-0">
                        Required
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs leading-relaxed line-clamp-2">
                    {plugin.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-muted-foreground py-10 text-center">
            <Puzzle className="mx-auto mb-2 h-8 w-8 opacity-30" />
            <p className="text-sm">No plugins match your search.</p>
            <Button variant="link" size="sm" onClick={() => setSearch('')} className="mt-1">
              Clear search
            </Button>
          </div>
        )}

        {/* Selection count */}
        <div className="flex items-center justify-between border-t border-border/50 pt-3">
          <p className="text-muted-foreground text-xs">
            <span className="font-medium text-foreground">{selectedPlugins.length}</span> of{' '}
            {ALL_PLUGINS.length} plugins selected
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-1">
          <Button variant="outline" onClick={onPrev} size="sm">
            <ChevronLeft className="mr-1.5 h-4 w-4" />
            Back
          </Button>
          <Button onClick={onNext} size="sm">
            Next Step
            <ChevronRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
