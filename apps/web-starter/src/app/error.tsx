'use client';

import { Container, Heading, Text, Button } from '@nodepressjs/ui';
import { useEffect } from 'react';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Unhandled error:', error);
  }, [error]);

  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <div className="bg-wp-error/10 mb-6 rounded-full p-6">
        <span className="text-4xl" role="img" aria-hidden="true">
          !
        </span>
      </div>
      <Heading level={1}>Something went wrong</Heading>
      <Text color="muted" size="lg" className="mt-4 max-w-md">
        An unexpected error occurred. Please try again, and if the problem persists, contact
        support.
      </Text>
      <div className="mt-8 flex gap-4">
        <Button variant="primary" size="lg" onClick={reset}>
          Try Again
        </Button>
        <Button variant="outline" size="lg" onClick={() => (window.location.href = '/')}>
          Go Home
        </Button>
      </div>
    </Container>
  );
}
