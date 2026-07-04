import Link from 'next/link';
import { Container, Heading, Text, Button } from '@nodepressjs/ui';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Page Not Found',
};

export default function NotFoundPage() {
  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <div className="bg-wp-error/10 mb-6 rounded-full p-6">
        <span className="text-5xl" role="img" aria-hidden="true">
          404
        </span>
      </div>
      <Heading level={1}>Page Not Found</Heading>
      <Text color="muted" size="lg" className="mt-4 max-w-md">
        The page you&apos;re looking for doesn&apos;t exist or has been moved. Check the URL or
        navigate back home.
      </Text>
      <div className="mt-8">
        <Link href="/">
          <Button variant="primary" size="lg">
            Back to Home
          </Button>
        </Link>
      </div>
    </Container>
  );
}
