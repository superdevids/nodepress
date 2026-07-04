'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Container, Heading, Text } from '@nodepressjs/ui';

interface TagErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function TagError({ error, reset }: TagErrorProps) {
  useEffect(() => {
    console.error('Tag page error:', error);
  }, [error]);

  return (
    <Container className="flex min-h-[50vh] flex-col items-center justify-center py-20 text-center">
      <div className="bg-wp-error/10 mb-6 rounded-full p-6">
        <svg
          className="text-wp-error h-8 w-8"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      </div>
      <Heading level={1}>Failed to load tag</Heading>
      <Text color="muted" size="lg" className="mt-4 max-w-md">
        Something went wrong while loading posts for this tag. Please try again.
      </Text>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <button
          onClick={reset}
          className="bg-wp-primary text-wp-primary-text hover:bg-wp-primary-hover inline-flex h-11 items-center justify-center rounded-lg px-6 text-sm font-semibold transition-colors"
        >
          Try Again
        </button>
        <Link
          href="/blog"
          className="border-wp-border text-wp-text hover:bg-wp-hover-bg inline-flex h-11 items-center justify-center rounded-lg border px-6 text-sm font-semibold transition-colors"
        >
          Back to Blog
        </Link>
      </div>
    </Container>
  );
}
