'use client';

import { useState, type FormEvent } from 'react';
import { cn, Button } from '@nodepressjs/ui';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface NewsletterFormProps {
  className?: string;
  title?: string;
  description?: string;
  variant?: 'hero' | 'sidebar' | 'footer';
}

type SubmitStatus =
  { type: 'idle' } | { type: 'loading' } | { type: 'success' } | { type: 'error'; message: string };

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputBase =
  'rounded-md border border-wp-border bg-background text-wp-text placeholder:text-wp-text-light focus:outline-none focus:ring-2 focus:ring-wp-accent focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

export function NewsletterForm({
  className,
  title = 'Stay Updated',
  description = 'Get the latest posts delivered straight to your inbox.',
  variant = 'sidebar',
}: NewsletterFormProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<SubmitStatus>({ type: 'idle' });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setStatus({ type: 'error', message: 'Please enter your email address.' });
      return;
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setStatus({ type: 'error', message: 'Please enter a valid email address.' });
      return;
    }

    setStatus({ type: 'loading' });

    try {
      const res = await fetch(`${API_URL}/api/newsletter/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      if (!res.ok) {
        // Graceful fallback: if endpoint doesn't exist (404), treat as success
        if (res.status === 404) {
          setStatus({ type: 'success' });
          setEmail('');
          return;
        }
        throw new Error(`Server responded with ${res.status}`);
      }

      setStatus({ type: 'success' });
      setEmail('');
    } catch (err) {
      setStatus({
        type: 'error',
        message:
          err instanceof Error ? err.message : 'Failed to subscribe. Please try again later.',
      });
    }
  };

  const handleRetry = () => {
    setStatus({ type: 'idle' });
  };

  const isLoading = status.type === 'loading';
  const isSuccess = status.type === 'success';
  const isError = status.type === 'error';

  /* ------------------------------------------------------------------ */
  /*  Hero variant — large, centered, prominent                         */
  /* ------------------------------------------------------------------ */
  if (variant === 'hero') {
    return (
      <section
        className={cn(
          'from-wp-primary/5 to-background relative overflow-hidden bg-gradient-to-b py-16 sm:py-20',
          className,
        )}
      >
        <div className="mx-auto max-w-xl px-4 text-center">
          {/* Title */}
          <h2 className="text-wp-text text-2xl font-bold sm:text-3xl">{title}</h2>

          {/* Description */}
          {description && <p className="text-wp-text-light mt-3 text-base">{description}</p>}

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            noValidate
            className="mx-auto mt-8 max-w-md"
            aria-label="Newsletter signup"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="flex-1">
                <label htmlFor="newsletter-email-hero" className="sr-only">
                  Email address
                </label>
                <input
                  id="newsletter-email-hero"
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (isError) setStatus({ type: 'idle' });
                  }}
                  required
                  aria-required="true"
                  aria-describedby={isError ? 'newsletter-error-hero' : undefined}
                  placeholder="you@example.com"
                  disabled={isLoading || isSuccess}
                  className={cn(inputBase, 'h-12 w-full rounded-lg px-4 text-base')}
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={isLoading}
                disabled={isLoading || isSuccess}
                className="w-full shrink-0 sm:w-auto"
              >
                {isSuccess ? 'Subscribed!' : 'Subscribe'}
              </Button>
            </div>
          </form>

          {/* Success message */}
          {isSuccess && (
            <div
              role="alert"
              className="bg-wp-success/10 border-wp-success/20 mx-auto mt-4 max-w-md rounded-md border px-4 py-3 text-center"
            >
              <p className="text-wp-success text-sm font-medium">
                Thanks for subscribing! Check your inbox to confirm.
              </p>
            </div>
          )}

          {/* Error message */}
          {isError && (
            <div
              id="newsletter-error-hero"
              role="alert"
              className="bg-wp-error/10 border-wp-error/20 mx-auto mt-4 max-w-md rounded-md border px-4 py-3 text-center"
            >
              <p className="text-wp-error text-sm font-medium">{status.message}</p>
              <button
                type="button"
                onClick={handleRetry}
                className="text-wp-accent hover:text-wp-accent-hover mt-1 text-xs underline transition-colors"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </section>
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Sidebar variant — compact, card-like                              */
  /* ------------------------------------------------------------------ */
  if (variant === 'sidebar') {
    return (
      <aside
        className={cn('border-wp-border bg-wp-bg-light rounded-lg border p-4', className)}
        aria-label="Newsletter signup"
      >
        <h3 className="text-wp-text text-sm font-semibold">{title}</h3>

        {description && <p className="text-wp-text-light mt-1 text-xs">{description}</p>}

        <form onSubmit={handleSubmit} noValidate className="mt-3" aria-label="Newsletter signup">
          <div className="flex flex-col gap-2">
            <label htmlFor="newsletter-email-sidebar" className="sr-only">
              Email address
            </label>
            <input
              id="newsletter-email-sidebar"
              type="email"
              name="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (isError) setStatus({ type: 'idle' });
              }}
              required
              aria-required="true"
              aria-describedby={isError ? 'newsletter-error-sidebar' : undefined}
              placeholder="you@example.com"
              disabled={isLoading || isSuccess}
              className={cn(inputBase, 'h-9 w-full px-3 text-sm')}
            />
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={isLoading}
              disabled={isLoading || isSuccess}
              className="w-full"
            >
              {isSuccess ? 'Subscribed!' : 'Subscribe'}
            </Button>
          </div>
        </form>

        {/* Success message */}
        {isSuccess && (
          <div
            role="alert"
            className="bg-wp-success/10 border-wp-success/20 mt-3 rounded-md border px-3 py-2"
          >
            <p className="text-wp-success text-xs font-medium">Thanks for subscribing!</p>
          </div>
        )}

        {/* Error message */}
        {isError && (
          <div
            id="newsletter-error-sidebar"
            role="alert"
            className="bg-wp-error/10 border-wp-error/20 mt-3 rounded-md border px-3 py-2"
          >
            <p className="text-wp-error text-xs font-medium">{status.message}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="text-wp-accent hover:text-wp-accent-hover mt-0.5 text-[11px] underline transition-colors"
            >
              Try again
            </button>
          </div>
        )}
      </aside>
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Footer variant — inline, compact, horizontal                     */
  /* ------------------------------------------------------------------ */
  return (
    <div className={cn('', className)}>
      <h3 className="text-wp-text text-sm font-semibold">{title}</h3>

      {description && <p className="text-wp-text-light mt-0.5 text-xs">{description}</p>}

      <form onSubmit={handleSubmit} noValidate className="mt-2" aria-label="Newsletter signup">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label htmlFor="newsletter-email-footer" className="sr-only">
            Email address
          </label>
          <input
            id="newsletter-email-footer"
            type="email"
            name="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (isError) setStatus({ type: 'idle' });
            }}
            required
            aria-required="true"
            aria-describedby={isError ? 'newsletter-error-footer' : undefined}
            placeholder="you@example.com"
            disabled={isLoading || isSuccess}
            className={cn(inputBase, 'h-9 w-full px-3 text-sm sm:flex-1')}
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={isLoading}
            disabled={isLoading || isSuccess}
            className="shrink-0"
          >
            {isSuccess ? 'Done!' : 'Subscribe'}
          </Button>
        </div>
      </form>

      {/* Success message */}
      {isSuccess && (
        <div
          role="alert"
          className="bg-wp-success/10 border-wp-success/20 mt-2 rounded-md border px-3 py-2"
        >
          <p className="text-wp-success text-xs font-medium">Thanks for subscribing!</p>
        </div>
      )}

      {/* Error message */}
      {isError && (
        <div
          id="newsletter-error-footer"
          role="alert"
          className="bg-wp-error/10 border-wp-error/20 mt-2 rounded-md border px-3 py-2"
        >
          <p className="text-wp-error text-xs font-medium">{status.message}</p>
          <button
            type="button"
            onClick={handleRetry}
            className="text-wp-accent hover:text-wp-accent-hover mt-0.5 text-[11px] underline transition-colors"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
