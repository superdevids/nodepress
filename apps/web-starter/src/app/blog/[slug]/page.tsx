import Link from 'next/link';
import { Container, Heading, Text, Badge } from '@nodepressjs/ui';
import { getPost, getPosts } from '@/lib/api';
import { PostList } from '@/components/post-list';
import type { Metadata } from 'next';

interface BlogPostPageProps {
  params: { slug: string };
}

// Generate static params at build time for all published posts
export async function generateStaticParams() {
  try {
    const result = await getPosts({ limit: 100 });
    return result.items.map((post) => ({ slug: post.slug }));
  } catch {
    return [];
  }
}

// Dynamic metadata per post
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
      tags: post.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt || undefined,
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = params;
  const post = await getPost(slug);

  // Post not found
  if (!post) {
    return (
      <Container className="py-20 text-center">
        <Heading level={1}>Post Not Found</Heading>
        <Text color="muted" size="lg" className="mt-4">
          The post you&apos;re looking for doesn&apos;t exist or has been removed.
        </Text>
        <div className="mt-8">
          <Link
            href="/blog"
            className="text-wp-primary hover:text-wp-primary-hover underline underline-offset-4"
          >
            ← Back to Blog
          </Link>
        </div>
      </Container>
    );
  }

  // Format dates
  const publishedDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const updatedDate = post.updatedAt
    ? new Date(post.updatedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  // Fetch related posts (same tags, excluding current post)
  let relatedPosts = await getRelatedPosts(post);

  // JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: {
      '@type': 'Person',
      name: post.authorId ? `Author ${post.authorId.slice(0, 8)}` : 'NodePress',
    },
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
        {/* Back link */}
        <Link
          href="/blog"
          className="text-wp-text-light hover:text-wp-text mb-8 inline-flex items-center text-sm transition-colors"
        >
          <svg
            className="mr-1 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to Blog
        </Link>

        <article>
          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Badge key={tag} variant="default" size="md">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Title */}
          <Heading level={1} className="text-3xl sm:text-4xl">
            {post.title}
          </Heading>

          {/* Meta */}
          <div className="text-wp-text-light mt-4 flex flex-wrap items-center gap-4 text-sm">
            {publishedDate && (
              <time dateTime={post.publishedAt!} className="flex items-center gap-1">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
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
            {updatedDate && updatedDate !== publishedDate && (
              <span className="flex items-center gap-1">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
                  />
                </svg>
                Updated {updatedDate}
              </span>
            )}
            <span className="flex items-center gap-1">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
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
              {post.viewCount} view{post.viewCount !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Content */}
          <div className="prose prose-gray mt-8 max-w-none">
            {post.content ? (
              <div
                className="text-wp-text leading-relaxed"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />
            ) : (
              <Text color="muted">{post.excerpt || 'No content available.'}</Text>
            )}
          </div>
        </article>

        {/* Related posts */}
        {relatedPosts.length > 0 && (
          <section className="border-wp-border mt-16 border-t pt-12">
            <PostList posts={relatedPosts} title="Related Posts" emptyMessage="" />
          </section>
        )}
      </Container>
    </>
  );
}

/**
 * Fetch related posts sharing tags with the current post.
 * Excludes the current post and limits to 3 results.
 */
async function getRelatedPosts(post: { id: string; tags: string[] }) {
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
