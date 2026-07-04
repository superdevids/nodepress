import Link from 'next/link';
import { Container, Heading, Text, Badge } from '@nodepressjs/ui';
import { getPost, getPosts } from '@/lib/api';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { ShareButtons } from '@/components/share-buttons';
import { AuthorBio } from '@/components/author-bio';
import { RelatedPosts } from '@/components/related-posts';
import { NewsletterForm } from '@/components/newsletter-form';
import type { Metadata } from 'next';
import type { ContentEntry } from '@/lib/api';

interface BlogPostPageProps {
  params: { slug: string };
}

// ─── Generate static params at build time for all published posts ───
export async function generateStaticParams() {
  try {
    const result = await getPosts({ limit: 100 });
    return result.items.map((post) => ({ slug: post.slug }));
  } catch {
    return [];
  }
}

// ─── Dynamic metadata per post ───
export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = params;
  const post = await getPost(slug);

  if (!post) {
    return { title: 'Post Not Found' };
  }

  return {
    title: post.title,
    description: post.excerpt || `Read "${post.title}" on NodePress.`,
    openGraph: {
      title: post.title,
      description: post.excerpt || undefined,
      type: 'article',
      publishedTime: post.publishedAt ?? undefined,
      modifiedTime: post.updatedAt ?? undefined,
      tags: post.tags,
      authors: post.authorId ? [post.authorId] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt || undefined,
    },
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
  };
}

// ─── Utility formatters ───

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function readingTime(content: string): string {
  const words = content.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
}

// ─── Page component ───

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = params;
  const post = await getPost(slug);

  // ── Post not found ─────────────────────────────────────────────────
  if (!post) {
    return (
      <Container className="py-20 text-center">
        <div className="mx-auto max-w-md">
          <svg
            className="text-wp-text-light mx-auto mb-6 h-16 w-16"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
            />
          </svg>
          <Heading level={1}>Post Not Found</Heading>
          <Text color="muted" size="lg" className="mt-4">
            The post you&apos;re looking for doesn&apos;t exist or has been removed.
          </Text>
          <div className="mt-8">
            <Link
              href="/blog"
              className="bg-wp-primary text-wp-primary-text hover:bg-wp-primary/90 inline-flex items-center rounded-md px-6 py-2.5 text-sm font-medium no-underline transition-colors"
            >
              &larr; Back to Blog
            </Link>
          </div>
        </div>
      </Container>
    );
  }

  // ── Format dates ───────────────────────────────────────────────────
  const publishedDate = post.publishedAt ? formatDate(post.publishedAt) : null;
  const publishedISO = post.publishedAt ?? undefined;
  const updatedDate = post.updatedAt ? formatDate(post.updatedAt) : null;
  const readTime = readingTime(post.content || post.excerpt || '');

  // ── Fetch related posts (same tags, excluding current post) ────────
  const relatedPosts = await getRelatedPosts(post);

  // ── Fetch author info ──────────────────────────────────────────────
  // Derive author slug from post authorId (in a real app you'd have a proper author lookup)
  const authorName = post.authorId
    ? post.authorId.charAt(0).toUpperCase() + post.authorId.slice(1, 8)
    : 'NodePress';
  const authorSlug = post.authorId?.toLowerCase().replace(/\s+/g, '-') || 'admin';

  // ── Build previous/next navigation ─────────────────────────────────
  const allPosts = await getAllPublishedPosts();
  const currentIndex = allPosts.findIndex((p) => p.id === post.id);
  const prevPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null;
  const nextPost = currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null;

  // ── Site URL for canonical / share ─────────────────────────────────
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nodepress.app';
  const postUrl = `${siteUrl}/blog/${post.slug}`;

  // ── JSON-LD structured data (Article) ──────────────────────────────
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    image: (post as ContentEntry & { featuredImage?: string }).featuredImage || undefined,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    author: {
      '@type': 'Person',
      name: authorName,
      url: authorSlug ? `${siteUrl}/author/${authorSlug}` : undefined,
    },
    publisher: {
      '@type': 'Organization',
      name: 'NodePress',
      url: siteUrl,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': postUrl,
    },
    wordCount: (post.content || '').trim().split(/\s+/).length,
    ...(post.tags.length > 0 && {
      keywords: post.tags.join(', '),
    }),
  };

  return (
    <>
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Container size="md" className="py-12 sm:py-16">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Blog', href: '/blog' },
            { label: post.title },
          ]}
          className="mb-6"
        />

        {/* Back link */}
        <Link
          href="/blog"
          className="text-wp-text-light hover:text-wp-text mb-8 inline-flex items-center text-sm no-underline transition-colors"
        >
          <svg
            className="mr-1.5 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to Blog
        </Link>

        <article>
          {/* Featured image placeholder */}
          <div className="mb-8 overflow-hidden rounded-xl bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10">
            <div className="flex aspect-[21/9] items-center justify-center sm:aspect-[2/1]">
              <div className="text-center">
                <svg
                  className="text-wp-text-light/20 mx-auto h-16 w-16"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1}
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
                  />
                </svg>
                <span className="text-wp-text-light/30 mt-2 block text-sm">Featured image</span>
              </div>
            </div>
          </div>

          {/* Category badges */}
          {post.tags.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Link key={tag} href={`/blog?tag=${tag}`} className="no-underline">
                  <Badge
                    variant="default"
                    size="md"
                    className="hover:bg-wp-primary/10 cursor-pointer transition-colors"
                  >
                    {tag}
                  </Badge>
                </Link>
              ))}
            </div>
          )}

          {/* Title */}
          <Heading level={1} className="text-3xl sm:text-4xl lg:text-5xl">
            {post.title}
          </Heading>

          {/* Share buttons — below title */}
          <ShareButtons
            url={postUrl}
            title={post.title}
            description={post.excerpt || undefined}
            className="mt-4"
          />

          {/* Meta: Date, Author, Reading time, Views */}
          <div className="text-wp-text-light mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            {/* Author */}
            <Link
              href={`/author/${authorSlug}`}
              className="hover:text-wp-text flex items-center gap-1.5 no-underline transition-colors"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 text-[10px] font-bold text-white">
                {authorName.charAt(0).toUpperCase()}
              </div>
              <span className="text-wp-text-light hover:text-wp-text text-sm">{authorName}</span>
            </Link>

            <span className="text-wp-text-light/30" aria-hidden="true">
              &middot;
            </span>

            {/* Published date */}
            {publishedDate && publishedISO && (
              <time dateTime={publishedISO} className="flex items-center gap-1">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                  />
                </svg>
                {publishedDate}
              </time>
            )}

            {/* Updated date if different */}
            {updatedDate && post.updatedAt !== post.publishedAt && (
              <>
                <span className="text-wp-text-light/30" aria-hidden="true">
                  &middot;
                </span>
                <span className="flex items-center gap-1">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
                    />
                  </svg>
                  Updated {updatedDate}
                </span>
              </>
            )}

            <span className="text-wp-text-light/30" aria-hidden="true">
              &middot;
            </span>

            {/* Reading time */}
            <span className="flex items-center gap-1">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {readTime}
            </span>

            <span className="text-wp-text-light/30" aria-hidden="true">
              &middot;
            </span>

            {/* View count */}
            <span className="flex items-center gap-1">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {post.viewCount.toLocaleString()} view{post.viewCount !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Content — prose styled */}
          <div className="prose prose-gray mt-10 max-w-none">
            {post.content ? (
              <div
                className="text-wp-text leading-relaxed"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />
            ) : (
              <div className="border-wp-border bg-wp-bg-light/30 rounded-lg border p-6">
                <Text color="muted" size="lg">
                  {post.excerpt || 'No content available for this post.'}
                </Text>
              </div>
            )}
          </div>
        </article>

        {/* Share buttons — below content */}
        <ShareButtons
          url={postUrl}
          title={post.title}
          description={post.excerpt || undefined}
          className="border-wp-border mt-10 border-t pt-6"
        />

        {/* Author bio */}
        <div className="mt-10">
          <AuthorBio
            author={{
              id: post.authorId || 'author-unknown',
              name: authorName,
              slug: authorSlug,
              bio: `Author of "${post.title}" and other NodePress articles.`,
              avatarUrl: '',
              email: '',
              socialLinks: {},
              postCount: allPosts.filter((p) => p.authorId === post.authorId).length,
              createdAt: post.createdAt,
            }}
          />
        </div>

        {/* Newsletter section */}
        <div className="mt-10">
          <NewsletterForm
            variant="hero"
            title="Enjoying this article?"
            description="Subscribe to get the latest posts delivered straight to your inbox."
          />
        </div>

        {/* Previous / Next navigation */}
        {(prevPost || nextPost) && (
          <nav
            className="border-wp-border mt-10 border-t pt-8"
            aria-label="Previous and next articles"
          >
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Previous post */}
              {prevPost ? (
                <Link
                  href={`/blog/${prevPost.slug}`}
                  className="border-wp-border hover:bg-wp-bg-light/50 group flex flex-col rounded-lg border p-4 no-underline transition-colors"
                >
                  <span className="text-wp-text-light mb-1 flex items-center gap-1 text-xs font-medium uppercase tracking-wider">
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 19.5L8.25 12l7.5-7.5"
                      />
                    </svg>
                    Previous Article
                  </span>
                  <span className="text-wp-text group-hover:text-wp-primary line-clamp-2 text-sm font-medium transition-colors">
                    {prevPost.title}
                  </span>
                </Link>
              ) : (
                <div />
              )}

              {/* Next post */}
              {nextPost ? (
                <Link
                  href={`/blog/${nextPost.slug}`}
                  className="border-wp-border hover:bg-wp-bg-light/50 group flex flex-col rounded-lg border p-4 text-right no-underline transition-colors sm:text-right"
                >
                  <span className="text-wp-text-light mb-1 flex items-center justify-end gap-1 text-xs font-medium uppercase tracking-wider">
                    Next Article
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8.25 4.5l7.5 7.5-7.5 7.5"
                      />
                    </svg>
                  </span>
                  <span className="text-wp-text group-hover:text-wp-primary line-clamp-2 text-sm font-medium transition-colors">
                    {nextPost.title}
                  </span>
                </Link>
              ) : (
                <div />
              )}
            </div>
          </nav>
        )}

        {/* Related posts */}
        {relatedPosts.length > 0 && (
          <div className="border-wp-border mt-12 border-t pt-10">
            <RelatedPosts posts={relatedPosts} />
          </div>
        )}

        {/* Comments placeholder */}
        <section className="border-wp-border mt-12 border-t pt-10" aria-label="Comments">
          <div className="border-wp-border bg-wp-bg-light/30 rounded-lg border p-8 text-center">
            <svg
              className="text-wp-text-light mx-auto mb-3 h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
              />
            </svg>
            <Heading level={3} className="text-wp-text-light">
              Comments are closed
            </Heading>
            <Text color="muted" className="mt-1 text-sm">
              Discussion for this article is not available.
            </Text>
          </div>
        </section>
      </Container>
    </>
  );
}

// ─── Helper functions ──────────────────────────────────────────────────

/**
 * Fetch related posts sharing tags with the current post.
 * Excludes the current post and limits to 3 results.
 */
async function getRelatedPosts(post: ContentEntry): Promise<ContentEntry[]> {
  if (post.tags.length === 0) return [];

  try {
    const result = await getPosts({ limit: 20 });
    return result.items
      .filter((p) => p.id !== post.id && p.tags.some((tag) => post.tags.includes(tag)))
      .slice(0, 3);
  } catch {
    return [];
  }
}

/**
 * Fetch all published posts for prev/next navigation.
 * Caches across concurrent calls via the shared fetch cache.
 */
async function getAllPublishedPosts(): Promise<ContentEntry[]> {
  try {
    const result = await getPosts({ limit: 200 });
    // Sort by publishedAt descending for chronological prev/next
    return result.items.sort((a, b) => {
      const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return dateB - dateA;
    });
  } catch {
    return [];
  }
}
