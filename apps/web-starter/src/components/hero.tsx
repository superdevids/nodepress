import { Container, Heading, Text, Button } from '@nodepressjs/ui';
import Link from 'next/link';
import type { SiteSettings, ContentEntry } from '@/lib/api';

interface HeroProps {
  settings: SiteSettings | null;
  featuredPost?: ContentEntry | null;
  className?: string;
}

export function Hero({ settings, featuredPost, className }: HeroProps) {
  const siteTitle = settings?.siteTitle ?? 'NodePress';
  const tagline =
    (settings?.tagline as string) ?? 'A modern, type-safe CMS built with Node.js and TypeScript.';

  const featuredDate = featuredPost
    ? new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(new Date(featuredPost.publishedAt ?? featuredPost.createdAt))
    : null;

  return (
    <section
      className={`from-wp-primary/5 to-background relative overflow-hidden bg-gradient-to-b py-20 sm:py-28 ${className ?? ''}`}
    >
      <Container>
        {featuredPost ? (
          /* ── Side-by-side layout when a featured post exists ── */
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div className="text-left">
              <Heading level={1} className="text-4xl sm:text-5xl lg:text-6xl">
                {siteTitle}
              </Heading>
              <Text size="lg" color="muted" className="mx-auto mt-6 max-w-2xl lg:mx-0">
                {tagline}
              </Text>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <form action="/blog" method="GET">
                  <Button type="submit">Read the Blog</Button>
                </form>
                <form action="/about" method="GET">
                  <Button type="submit" variant="outline">
                    Learn More
                  </Button>
                </form>
              </div>
            </div>

            {/* Featured Post Card */}
            <article className="border-wp-border bg-background/80 hover:bg-wp-hover-bg rounded-xl border p-6 shadow-sm transition-colors sm:p-8">
              <header>
                <p className="text-wp-primary text-xs font-semibold uppercase tracking-wider">
                  Featured Post
                </p>
                <Heading level={2} className="mt-3 text-xl sm:text-2xl">
                  <Link
                    href={`/blog/${featuredPost.slug}`}
                    className="hover:text-wp-primary transition-colors"
                  >
                    {featuredPost.title}
                  </Link>
                </Heading>
              </header>

              {featuredPost.excerpt && (
                <Text size="sm" color="muted" className="mt-4 line-clamp-3">
                  {featuredPost.excerpt}
                </Text>
              )}

              <footer className="mt-6 flex items-center justify-between">
                {featuredDate && (
                  <time
                    dateTime={featuredPost.publishedAt ?? featuredPost.createdAt}
                    className="text-wp-text-secondary text-sm"
                  >
                    {featuredDate}
                  </time>
                )}
                <Link
                  href={`/blog/${featuredPost.slug}`}
                  className="text-wp-primary hover:text-wp-primary-hover text-sm font-medium transition-colors"
                >
                  Read More &rarr;
                </Link>
              </footer>
            </article>
          </div>
        ) : (
          /* ── Centered layout ── */
          <div className="text-center">
            <Heading level={1} className="text-4xl sm:text-5xl lg:text-6xl">
              {siteTitle}
            </Heading>
            <Text size="lg" color="muted" className="mx-auto mt-6 max-w-2xl">
              {tagline}
            </Text>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <form action="/blog" method="GET">
                <Button type="submit">Read the Blog</Button>
              </form>
              <form action="/about" method="GET">
                <Button type="submit" variant="outline">
                  Learn More
                </Button>
              </form>
            </div>
          </div>
        )}
      </Container>
    </section>
  );
}
