import { Container, Heading, Text } from '@nodepressjs/ui';
import Link from 'next/link';
import type { SiteSettings } from '@/lib/api';

interface HeroProps {
  settings: SiteSettings | null;
}

export function Hero({ settings }: HeroProps) {
  const siteTitle = settings?.siteTitle ?? 'NodePress';
  const tagline =
    (settings?.tagline as string) ?? 'A modern, type-safe CMS built with Node.js and TypeScript.';

  return (
    <section className="from-wp-primary/5 to-background relative overflow-hidden bg-gradient-to-b py-20 sm:py-28">
      <Container className="text-center">
        <Heading level={1} className="text-4xl sm:text-5xl lg:text-6xl">
          Welcome to {siteTitle}
        </Heading>
        <Text size="lg" color="muted" className="mx-auto mt-6 max-w-2xl">
          {tagline}
        </Text>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/blog"
            className="bg-wp-primary text-wp-primary-text shadow-wp-card hover:bg-wp-primary-hover focus-visible:ring-wp-accent inline-flex h-11 items-center justify-center rounded-md px-8 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            Read the Blog
          </Link>
          <Link
            href="/about"
            className="border-wp-border bg-background text-wp-text hover:bg-wp-hover-bg focus-visible:ring-wp-accent inline-flex h-11 items-center justify-center rounded-md border px-8 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            Learn More
          </Link>
        </div>
      </Container>
    </section>
  );
}
