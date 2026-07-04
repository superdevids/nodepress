'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface Step {
  id: number;
  label: string;
  description: string;
}

const STEPS: Step[] = [
  { id: 0, label: 'Welcome', description: 'Get started' },
  { id: 1, label: 'Database', description: 'Connection setup' },
  { id: 2, label: 'Admin', description: 'Create admin user' },
  { id: 3, label: 'Settings', description: 'Site configuration' },
  { id: 4, label: 'Plugins', description: 'Select plugins' },
  { id: 5, label: 'Theme', description: 'Choose theme' },
];

interface ProgressBarProps {
  currentStep: number;
  completedSteps: number[];
}

export function ProgressBar({ currentStep, completedSteps }: ProgressBarProps) {
  const progress =
    STEPS.length > 1
      ? Math.max(
          (completedSteps.length / (STEPS.length - 1)) * 100,
          (currentStep / (STEPS.length - 1)) * 100,
        )
      : 0;

  return (
    <div className="mb-10">
      {/* Mobile: compact step indicator */}
      <div className="mb-6 text-center sm:hidden">
        <p className="text-sm font-medium">
          Step {currentStep + 1} of {STEPS.length}
        </p>
        <p className="text-muted-foreground mt-0.5 text-xs">{STEPS[currentStep]?.label}</p>
        {/* Mobile progress bar */}
        <div className="bg-muted mt-3 h-1.5 overflow-hidden rounded-full">
          <div
            className="bg-primary h-full rounded-full transition-all duration-500 ease-in-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Desktop: full step indicator */}
      <div className="hidden sm:block">
        <div className="relative">
          {/* Background track */}
          <div className="bg-muted/60 absolute left-0 right-0 top-4 h-0.5 rounded-full" />
          {/* Animated progress line */}
          <div
            className="bg-primary absolute left-0 top-4 h-0.5 rounded-full transition-all duration-700 ease-in-out"
            style={{ width: `${progress}%` }}
          />

          {/* Step circles */}
          <div className="relative flex justify-between">
            {STEPS.map((step) => {
              const isCompleted = completedSteps.includes(step.id);
              const isCurrent = currentStep === step.id;
              const isFuture = step.id > currentStep;

              return (
                <div key={step.id} className="flex flex-col items-center">
                  <div
                    className={cn(
                      'relative z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all duration-300',
                      isCompleted && 'border-primary bg-primary text-primary-foreground shadow-sm',
                      isCurrent &&
                        'border-primary bg-background text-primary ring-primary/20 shadow-sm ring-4',
                      isFuture &&
                        'border-muted-foreground/25 bg-background text-muted-foreground/40',
                    )}
                  >
                    {isCompleted ? (
                      <Check className="animate-in zoom-in-50 h-4 w-4 duration-300" />
                    ) : (
                      <span className={cn(isCurrent && 'animate-pulse')}>{step.id + 1}</span>
                    )}
                  </div>
                  <p
                    className={cn(
                      'mt-2 text-xs font-medium transition-colors duration-300',
                      isCompleted && 'text-primary',
                      isCurrent && 'text-foreground font-semibold',
                      isFuture && 'text-muted-foreground/40',
                    )}
                  >
                    {step.label}
                  </p>
                  <p
                    className={cn(
                      'mt-0.5 text-[10px] transition-colors duration-300',
                      isCompleted || isCurrent
                        ? 'text-muted-foreground/70'
                        : 'text-muted-foreground/25',
                    )}
                  >
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
