'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Container, Heading, Text, Button } from '@nodepressjs/ui';

interface ErrorBoundaryProps {
  error: Error;
  reset?: () => void;
  title?: string;
  message?: string;
}

export default function ErrorBoundary({
  error,
  reset,
  title = 'Something went wrong',
  message,
}: ErrorBoundaryProps) {
  useEffect(() => {
    console.error('ErrorBoundary caught:', error);
  }, [error]);

  return (
    <div role="alert">
      <Container className="flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
        {/* Error icon — exclamation triangle */}
        <div className="bg-wp-error/10 mb-6 rounded-full p-6">
          <svg
            className="text-wp-error h-8 w-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>

        {/* Error heading */}
        <Heading level={1}>{title}</Heading>

        {/* Error message */}
        <Text color="muted" size="lg" className="mt-4 max-w-md">
          {message ??
            'An unexpected error occurred. Please try again, and if the problem persists, contact support.'}
        </Text>

        {/* Actions */}
        <div className="mt-8 flex gap-4">
          {reset && (
            <Button variant="primary" size="lg" onClick={reset}>
              Try Again
            </Button>
          )}
          <Link
            href="/"
            className="border-wp-border bg-background hover:bg-wp-hover-bg hover:text-wp-text focus-visible:ring-wp-accent inline-flex h-12 items-center justify-center rounded-lg border px-6 text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            Go Home
          </Link>
        </div>
      </Container>
    </div>
  );
}
