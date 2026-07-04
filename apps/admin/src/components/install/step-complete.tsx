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
} from 'lucide-react';

interface StepCompleteProps {
  siteName: string;
}

export function StepComplete({ siteName }: StepCompleteProps) {
  // Confetti particles
  const confettiRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const container = confettiRef.current;
    if (!container) return;

    const colors = [
      'hsl(221.2, 83.2%, 53.3%)',
      'hsl(142.1, 76.2%, 36.3%)',
      'hsl(38, 92%, 50%)',
      'hsl(0, 84.2%, 60.2%)',
      'hsl(271, 81%, 56%)',
      'hsl(190, 90%, 50%)',
    ];

    const particles: HTMLDivElement[] = [];

    for (let i = 0; i < 60; i++) {
      const particle = document.createElement('div');
      particle.className = 'absolute rounded-sm';
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = Math.random() * 8 + 4;
      const startX = Math.random() * 100;
      const delay = Math.random() * 0.5;
      const duration = Math.random() * 2 + 2;
      const rotation = Math.random() * 360;

      particle.style.cssText = `
        width: ${size}px;
        height: ${size * 0.6}px;
        background: ${color};
        left: ${startX}%;
        top: -10px;
        opacity: 1;
        transform: rotate(${rotation}deg);
        animation: confetti-fall ${duration}s ease-in ${delay}s forwards;
      `;

      container.appendChild(particle);
      particles.push(particle);
    }

    return () => {
      particles.forEach((p) => p.remove());
    };
  }, []);

  return (
    <>
      {/* Confetti container */}
      <div
        ref={confettiRef}
        className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-lg">
        <Card className="border-border/60 text-center">
          <CardHeader className="pb-2">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-emerald-100 p-3 dark:bg-emerald-900/50">
                <CheckCircle2 className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <CardTitle className="text-2xl">Installation Complete!</CardTitle>
            <CardDescription className="text-base">
              Congratulations! <strong>{siteName || 'NodePress'}</strong> has been successfully
              installed and is ready to use.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            {/* Action Buttons */}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button size="lg" asChild>
                <a href="/admin/login">
                  Go to Admin Login
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a href="/" target="_blank" rel="noopener noreferrer">
                  View Site
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>

            {/* Quick Tips */}
            <div className="bg-muted/30 rounded-lg border p-4">
              <div className="mb-3 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <p className="text-sm font-medium">Quick Tips</p>
              </div>
              <ul className="space-y-2 text-left text-xs">
                <li className="text-muted-foreground flex items-start gap-2">
                  <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    Visit the <strong>Settings → General</strong> page to fine-tune your site
                    configuration.
                  </span>
                </li>
                <li className="text-muted-foreground flex items-start gap-2">
                  <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    Review <strong>Settings → Security</strong> for firewall rules and login
                    protection.
                  </span>
                </li>
                <li className="text-muted-foreground flex items-start gap-2">
                  <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    Check <strong>Plugins</strong> to activate or configure additional
                    functionality.
                  </span>
                </li>
                <li className="text-muted-foreground flex items-start gap-2">
                  <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    Browse <strong>Settings → Permalinks</strong> to customize your URL structure.
                  </span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confetti animation keyframes injected via style tag */}
      <style jsx global>{`
        @keyframes confetti-fall {
          0% {
            opacity: 1;
            transform: translateY(0) rotate(0deg) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(100vh) rotate(720deg) scale(0.5);
          }
        }
      `}</style>
    </>
  );
}
