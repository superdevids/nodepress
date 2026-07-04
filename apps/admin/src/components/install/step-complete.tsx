'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Lightbulb,
  BookOpen,
  Shield,
  Zap,
  Settings,
  Paintbrush,
  Puzzle,
} from 'lucide-react';

interface StepCompleteProps {
  siteName: string;
}

export function StepComplete({ siteName }: StepCompleteProps) {
  // CSS-only confetti particles
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const style = document.createElement('style');
    style.textContent = `
      @keyframes confetti-fall {
        0% { opacity: 1; transform: translateY(0) rotate(0deg) scale(1); }
        100% { opacity: 0; transform: translateY(100vh) rotate(720deg) scale(0.3); }
      }
      @keyframes confetti-sway {
        0%, 100% { margin-left: 0; }
        50% { margin-left: 30px; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const confettiPieces = React.useMemo(() => {
    if (!mounted) return [];
    const colors = [
      '#3b82f6', '#22c55e', '#eab308', '#ef4444',
      '#a855f7', '#06b6d4', '#f97316', '#ec4899',
    ];
    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      color: colors[i % colors.length],
      left: Math.random() * 100,
      delay: Math.random() * 1.5,
      duration: 2 + Math.random() * 3,
      size: 4 + Math.random() * 8,
      sway: Math.random() * 40 - 20,
    }));
  }, [mounted]);

  const tips = [
    {
      icon: BookOpen,
      title: 'Configure your site',
      description: 'Visit Settings to fine-tune your site title, tagline, and permalink structure.',
    },
    {
      icon: Puzzle,
      title: 'Manage plugins',
      description: 'Explore the Plugins page to activate, configure, or install more plugins.',
    },
    {
      icon: Paintbrush,
      title: 'Customize appearance',
      description: 'Browse Themes to change your site look or customize colors and layouts.',
    },
    {
      icon: Shield,
      title: 'Review security',
      description: 'Check Security settings for firewall rules, login protection, and backups.',
    },
    {
      icon: Zap,
      title: 'Optimize performance',
      description: 'Enable caching, CDN, and image optimization in Performance settings.',
    },
    {
      icon: Settings,
      title: 'Create content',
      description: 'Start writing! Go to Content to create your first post or page.',
    },
  ];

  return (
    <div className="relative">
      {/* CSS Confetti */}
      {mounted && (
        <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
          {confettiPieces.map((piece) => (
            <div
              key={piece.id}
              className="absolute rounded-sm"
              style={{
                width: piece.size,
                height: piece.size * 0.6,
                background: piece.color,
                left: `${piece.left}%`,
                top: -10,
                opacity: 0.9,
                animation: `confetti-fall ${piece.duration}s ease-in ${piece.delay}s forwards, confetti-sway ${piece.duration * 0.7}s ease-in-out ${piece.delay}s infinite`,
              }}
            />
          ))}
        </div>
      )}

      <div className="mx-auto max-w-lg">
        <Card className="border-border/50 shadow-sm text-center">
          <CardHeader className="pb-2 pt-8">
            <div className="mb-6 flex justify-center">
              <div className="animate-in zoom-in-75 duration-500 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50 p-3.5 shadow-sm ring-1 ring-emerald-200 dark:from-emerald-900/60 dark:to-emerald-950/50 dark:ring-emerald-800">
                <CheckCircle2 className="h-14 w-14 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold">Installation Complete!</CardTitle>
            <CardDescription className="mt-2 text-base leading-relaxed">
              Congratulations!{' '}
              <strong className="text-foreground">{siteName || 'NodePress'}</strong> has been
              successfully installed and is ready to use.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            {/* Action Buttons */}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button size="lg" asChild className="gap-2">
                <a href="/admin/login">
                  Go to Admin Login
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
              <Button variant="outline" size="lg" asChild className="gap-2">
                <a href="/" target="_blank" rel="noopener noreferrer">
                  View Site
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>

            {/* Quick Tips */}
            <div className="rounded-xl border border-border/50 bg-muted/20 p-5">
              <div className="mb-4 flex items-center gap-2">
                <div className="rounded-full bg-amber-100 p-1.5 dark:bg-amber-900/50">
                  <Lightbulb className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                </div>
                <p className="text-sm font-semibold">Getting Started Tips</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {tips.map((tip) => (
                  <div key={tip.title} className="flex items-start gap-2.5 text-left">
                    <tip.icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium">{tip.title}</p>
                      <p className="text-muted-foreground mt-0.5 text-[11px] leading-relaxed">
                        {tip.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Account Info Reminder */}
            <div className="rounded-lg border border-blue-200 bg-blue-50/80 p-3 dark:border-blue-800 dark:bg-blue-950/50">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <strong>Tip:</strong> Your admin login credentials were set during installation.
                Check your email or use the username and password you created.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
