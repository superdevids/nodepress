import { Container, Heading, Text } from '@nodepressjs/ui';
import { Hero } from '@/components/hero';
import { PostList } from '@/components/post-list';
import { NewsletterForm } from '@/components/newsletter-form';
import { getPosts, getSiteSettings, getCategories } from '@/lib/api';
import type { ContentEntry } from '@/lib/api';
import Link from 'next/link';
import type { Metadata } from 'next';

// ---------------------------------------------------------------------------
// SEO — generateMetadata with structured data
// ---------------------------------------------------------------------------

export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = await getSiteSettings();
    const siteTitle = settings?.siteTitle ?? 'NodePress';
    const tagline =
      (settings?.tagline as string) ?? 'A modern, type-safe CMS built with Node.js and TypeScript.';

    return {
      title: siteTitle,
      description: tagline,
      openGraph: {
        title: `${siteTitle} — A Modern CMS`,
        description: tagline,
        type: 'website',
        siteName: siteTitle,
      },
      other: {
        'application/ld+json': JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: siteTitle,
          description: tagline,
          url: settings?.siteUrl ?? undefined,
        }),
      },
    };
  } catch {
    return {
      title: 'NodePress',
      description: 'A modern, type-safe CMS built with Node.js and TypeScript.',
      openGraph: {
        title: 'NodePress — A Modern CMS',
        description:
          'A modern, type-safe content management system built with Node.js and TypeScript.',
      },
    };
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FEATURES = [
  {
    title: 'Content Types',
    description: 'Define custom post types and fields with full TypeScript support.',
  },
  {
    title: 'Block Editor',
    description: 'Rich block-based editing experience powered by Tiptap.',
  },
  {
    title: 'Plugin System',
    description: 'Extend functionality with a Modern CMS hook system.',
  },
] as const;

const EMPTY_PAGINATION = { items: [] as ContentEntry[], total: 0, page: 1, limit: 6 };

// ---------------------------------------------------------------------------
// Home Page
// ---------------------------------------------------------------------------

export default async function HomePage() {
  // Fetch all data in parallel — individual catches prevent one failure
  // from crashing the entire page.
  const [postsResult, settings, categories] = await Promise.all([
    getPosts({ limit: 6 }).catch(() => EMPTY_PAGINATION),
    getSiteSettings().catch(() => null),
    getCategories().catch(() => []),
    // getTags is available but not displayed on the homepage
  ]);

  const posts = postsResult.items;
  const featuredPost = posts.length > 0 ? posts[0] : null;
  const hasPosts = posts.length > 0;
  const hasCategories = categories.length > 0;

  return (
    <div className="flex min-h-screen flex-col">
      {/* ──────────────────────────────────────────────────────────────── */}
      {/*  1. Hero                                                       */}
      {/* ──────────────────────────────────────────────────────────────── */}
      <section>
        <Hero settings={settings} featuredPost={featuredPost} />
      </section>

      {/* ──────────────────────────────────────────────────────────────── */}
      {/*  2. Latest Posts (only when content exists)                    */}
      {/* ──────────────────────────────────────────────────────────────── */}
      {hasPosts && (
        <section className="border-wp-border bg-wp-bg-light/30 border-t py-16 sm:py-20">
          <Container>
            <PostList
              posts={posts}
              title="Latest Posts"
              featured
              showViewAll
              emptyMessage="No posts published yet."
            />
          </Container>
        </section>
      )}

      {/* ──────────────────────────────────────────────────────────────── */}
      {/*  3. Categories (only when taxonomies exist)                    */}
      {/* ──────────────────────────────────────────────────────────────── */}
      {hasCategories && (
        <section className="border-wp-border border-t py-16 sm:py-20">
          <Container>
            <div className="mb-8">
              <Heading level={2}>Browse by Category</Heading>
              <Text size="sm" color="muted" className="mt-2">
                Explore content organized by topic
              </Text>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/category/${category.slug}`}
                  className="border-wp-border bg-card shadow-wp-card hover:bg-wp-hover-bg group rounded-lg border p-6 transition-colors"
                >
                  <h3 className="text-wp-text group-hover:text-wp-primary font-semibold transition-colors">
                    {category.name}
                  </h3>

                  {category.description && (
                    <p className="text-wp-text-light mt-2 line-clamp-2 text-sm">
                      {category.description}
                    </p>
                  )}

                  <p className="text-wp-text-secondary mt-4 text-xs font-medium">
                    {category.count} {category.count === 1 ? 'post' : 'posts'}
                  </p>
                </Link>
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* ──────────────────────────────────────────────────────────────── */}
      {/*  4. Empty state — feature cards (when no posts or categories)  */}
      {/* ──────────────────────────────────────────────────────────────── */}
      {!hasPosts && (
        <section className="border-wp-border bg-wp-bg-light/30 border-t py-16 sm:py-20">
          <Container>
            <div className="mb-8 text-center">
              <Heading level={2}>Welcome to NodePress</Heading>
              <Text size="sm" color="muted" className="mt-2">
                A modern, type-safe CMS built with Node.js and TypeScript.
              </Text>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="border-wp-border bg-card shadow-wp-card rounded-lg border p-6"
                >
                  <h3 className="text-wp-text font-semibold">{feature.title}</h3>
                  <p className="text-wp-text-light mt-2 text-sm">{feature.description}</p>
                </div>
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* ──────────────────────────────────────────────────────────────── */}
      {/*  5. Call to Action                                             */}
      {/* ──────────────────────────────────────────────────────────────── */}
      <section className="from-wp-primary/10 to-background relative overflow-hidden bg-gradient-to-b py-20 sm:py-24">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <Heading level={2} className="text-3xl sm:text-4xl">
              Ready to Get Started?
            </Heading>

            <Text size="lg" color="muted" className="mx-auto mt-4 max-w-xl">
              Whether you&rsquo;re a developer looking for a modern CMS or a content creator wanting
              a blazing-fast blog, NodePress has you covered.
            </Text>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/blog"
                className="bg-wp-primary text-wp-primary-foreground hover:bg-wp-primary-hover inline-flex h-12 items-center justify-center rounded-lg px-8 text-base font-semibold transition-colors"
              >
                Read the Blog
              </Link>
              <Link
                href="/about"
                className="border-wp-border text-wp-text hover:bg-wp-hover-bg inline-flex h-12 items-center justify-center rounded-lg border px-8 text-base font-semibold transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* ──────────────────────────────────────────────────────────────── */}
      {/*  6. Newsletter                                                 */}
      {/* ──────────────────────────────────────────────────────────────── */}
      <section className="border-wp-border border-t">
        <NewsletterForm
          variant="hero"
          title="Stay in the Loop"
          description="Get the latest posts and updates delivered straight to your inbox."
        />
      </section>
    </div>
  );
}
