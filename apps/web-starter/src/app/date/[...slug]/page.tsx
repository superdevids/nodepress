import Link from 'next/link';
import { Container, Heading, Text } from '@nodepressjs/ui';
import { getPostsByDate } from '@/lib/api';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { PostList } from '@/components/post-list';
import { Pagination } from '@/components/pagination';
import { Sidebar } from '@/components/sidebar';
import type { Metadata } from 'next';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DateArchivePageProps {
  params: { slug: string[] };
  searchParams: { page?: string };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

interface ParsedDate {
  year: number;
  month: number | undefined;
  day: number | undefined;
  isValid: boolean;
  title: string;
  breadcrumbs: { label: string; href?: string }[];
}

/**
 * Parse the slug array into a validated date.
 * Slug patterns: [year], [year, month], [year, month, day].
 */
function parseDateSlug(slug: string[]): ParsedDate {
  const parts: number[] = slug.map(Number);

  // Validate all parts are finite numbers
  if (parts.length === 0 || parts.some((p) => !Number.isFinite(p))) {
    return {
      year: 0,
      month: undefined,
      day: undefined,
      isValid: false,
      title: 'Invalid Date',
      breadcrumbs: [{ label: 'Invalid Date' }],
    };
  }

  const yearVal: number = parts[0] as number;
  const monthVal: number | undefined = parts.length >= 2 ? (parts[1] as number) : undefined;
  const dayVal: number | undefined = parts.length >= 3 ? (parts[2] as number) : undefined;

  // Year must be 4 digits and reasonable (1900-2100)
  if (yearVal < 1900 || yearVal > 2100 || String(yearVal).length !== 4) {
    return {
      year: 0,
      month: undefined,
      day: undefined,
      isValid: false,
      title: 'Invalid Date',
      breadcrumbs: [{ label: 'Invalid Date' }],
    };
  }

  // Validate month if provided (1-12)
  if (monthVal !== undefined && (monthVal < 1 || monthVal > 12)) {
    return {
      year: yearVal,
      month: undefined,
      day: undefined,
      isValid: false,
      title: 'Invalid Date',
      breadcrumbs: [{ label: 'Invalid Date' }],
    };
  }

  // Validate day if provided (1-31) — simple range check without month-specific validation
  if (dayVal !== undefined && (dayVal < 1 || dayVal > 31)) {
    return {
      year: yearVal,
      month: monthVal,
      day: undefined,
      isValid: false,
      title: 'Invalid Date',
      breadcrumbs: [{ label: 'Invalid Date' }],
    };
  }

  // Build title
  let title: string;
  const breadcrumbs: { label: string; href?: string }[] = [
    { label: 'Home', href: '/' },
    { label: 'Archives', href: '/blog' },
  ];

  if (monthVal !== undefined && dayVal !== undefined) {
    const monthName: string = MONTH_NAMES[monthVal - 1] as string;
    title = `${monthName} ${dayVal}, ${yearVal}`;
    breadcrumbs.push(
      { label: String(yearVal), href: `/date/${yearVal}` },
      {
        label: monthName,
        href: `/date/${yearVal}/${String(monthVal).padStart(2, '0')}`,
      },
      { label: String(dayVal) },
    );
  } else if (monthVal !== undefined) {
    const monthName: string = MONTH_NAMES[monthVal - 1] as string;
    title = `${monthName} ${yearVal}`;
    breadcrumbs.push({ label: String(yearVal), href: `/date/${yearVal}` }, { label: monthName });
  } else {
    title = `Year: ${yearVal}`;
    breadcrumbs.push({ label: String(yearVal) });
  }

  return {
    year: yearVal,
    month: monthVal,
    day: dayVal,
    isValid: true,
    title,
    breadcrumbs,
  };
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }: DateArchivePageProps): Promise<Metadata> {
  const slug = params?.slug ?? [];
  const parsed = parseDateSlug(slug);

  if (!parsed.isValid) {
    return { title: 'Invalid Date Archive' };
  }

  const title = `${parsed.title} Archives — NodePress`;
  const description = `Browse all posts published in ${parsed.title}.`;

  return {
    title: `${parsed.title} Archives`,
    description,
    openGraph: {
      title,
      description,
      url: `/date/${slug.join('/')}`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: `/date/${slug.join('/')}`,
    },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function DateArchivePage({ params, searchParams }: DateArchivePageProps) {
  const slug = params?.slug ?? [];
  const currentPage = Number(searchParams?.page) || 1;
  const limit = 9;

  const parsed = parseDateSlug(slug);

  // Invalid date — show empty state
  if (!parsed.isValid) {
    return (
      <Container className="py-20 text-center">
        <Heading level={1}>Invalid Date Archive</Heading>
        <Text color="muted" size="lg" className="mx-auto mt-4 max-w-md">
          The date you specified is invalid. Please check the URL and try again.
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

  // After the early-return guard, the date is guaranteed valid
  const validYear: number = parsed.year!;
  const validMonth: number | undefined = parsed.month;
  const validDay: number | undefined = parsed.day;

  // Fetch posts by date
  const postsResult = await getPostsByDate(validYear, validMonth, validDay, {
    page: currentPage,
    limit,
  });

  const { items: posts, total, limit: pageSize } = postsResult;
  const totalPages = Math.ceil(total / pageSize);

  // JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${parsed.title} Archives — NodePress`,
    description: `Browse all posts published in ${parsed.title}.`,
    url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'}/date/${slug.join('/')}`,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: posts.map((post, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'BlogPosting',
          headline: post.title,
          url: `/blog/${post.slug}`,
        },
      })),
    },
  };

  return (
    <>
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Container className="py-12 sm:py-16">
        {/* Breadcrumbs */}
        <Breadcrumbs items={parsed.breadcrumbs} className="mb-6" />

        <div className="grid gap-12 lg:grid-cols-[1fr_300px]">
          {/* Main content */}
          <div>
            {/* Page header */}
            <div className="mb-10">
              <Heading level={1}>{parsed.title} Archives</Heading>
              {total === 0 ? (
                <Text color="muted" size="lg" className="mt-3">
                  No posts found for this date. Try browsing a different time period.
                </Text>
              ) : (
                <>
                  <Text color="muted" size="lg" className="mt-3">
                    Browse all posts published in {parsed.title}.
                  </Text>
                  <Text color="muted" size="sm" className="mt-2">
                    {total} {total === 1 ? 'post' : 'posts'} found
                  </Text>
                </>
              )}
            </div>

            {/* Posts */}
            <PostList
              posts={posts}
              variant="grid"
              columns={3}
              emptyMessage="No posts found for this date."
            />

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                basePath={`/date/${slug.join('/')}`}
                className="mt-12"
                showSummary
                total={total}
              />
            )}

            {/* Empty state with navigation links */}
            {total === 0 && (
              <div className="border-wp-border bg-wp-bg-light/50 mt-4 rounded-lg border py-12 text-center">
                <Heading level={2} className="text-wp-text text-xl">
                  No posts found
                </Heading>
                <Text color="muted" className="mx-auto mt-2 max-w-md">
                  There are no posts published on this date. Try browsing a different archive.
                </Text>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
                  <Link
                    href="/blog"
                    className="text-wp-primary hover:text-wp-primary-hover text-sm font-medium underline underline-offset-4"
                  >
                    ← Browse all posts
                  </Link>
                  {parsed.month === undefined && (
                    <Link
                      href={
                        new Date().getFullYear() > parsed.year ? `/date/${parsed.year + 1}` : '#'
                      }
                      className={`text-sm font-medium underline underline-offset-4 ${
                        new Date().getFullYear() > parsed.year
                          ? 'text-wp-primary hover:text-wp-primary-hover'
                          : 'text-wp-text-light pointer-events-none'
                      }`}
                    >
                      Browse {parsed.year + 1} →
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="hidden lg:block">
            <Sidebar />
          </aside>
        </div>
      </Container>
    </>
  );
}
