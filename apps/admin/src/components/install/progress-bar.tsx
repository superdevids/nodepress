'use client';

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface Step {
  id: number;
  label: string;
  description: string;
}

const STEPS: Step[] = [
  { id: 0, label: 'Database', description: 'Connection setup' },
  { id: 1, label: 'Admin', description: 'Create admin user' },
  { id: 2, label: 'Site', description: 'Site configuration' },
  { id: 3, label: 'Plugins', description: 'Select plugins' },
  { id: 4, label: 'Theme', description: 'Choose theme' },
];

interface ProgressBarProps {
  currentStep: number;
  completedSteps: number[];
}

export function ProgressBar({ currentStep, completedSteps }: ProgressBarProps) {
  return (
    <div className="mb-10">
      {/* Mobile: compact step indicator */}
      <div className="mb-6 text-center sm:hidden">
        <p className="text-sm font-medium">
          Step {currentStep + 1} of {STEPS.length}
        </p>
        <p className="text-muted-foreground text-xs">{STEPS[currentStep]?.label}</p>
      </div>

      {/* Desktop: full step indicator */}
      <div className="hidden sm:block">
        <div className="relative">
          {/* Progress line */}
          <div className="bg-muted absolute left-0 right-0 top-4 h-0.5">
            <div
              className="bg-primary h-full transition-all duration-500 ease-in-out"
              style={{
                width: `${(currentStep / (STEPS.length - 1)) * 100}%`,
              }}
            />
          </div>

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
                      'relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all duration-300',
                      isCompleted && 'border-primary bg-primary text-primary-foreground',
                      isCurrent &&
                        'border-primary bg-background text-primary ring-primary/30 ring-2',
                      isFuture &&
                        'border-muted-foreground/30 bg-background text-muted-foreground/50',
                    )}
                  >
                    {isCompleted ? <Check className="h-4 w-4" /> : <span>{step.id + 1}</span>}
                  </div>
                  <p
                    className={cn(
                      'mt-2 text-xs font-medium',
                      isCompleted && 'text-primary',
                      isCurrent && 'text-foreground',
                      isFuture && 'text-muted-foreground/50',
                    )}
                  >
                    {step.label}
                  </p>
                  <p
                    className={cn(
                      'text-muted-foreground mt-0.5 text-[10px]',
                      isFuture && 'text-muted-foreground/30',
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
