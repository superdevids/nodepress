import Link from 'next/link';
import { Heading, cn } from '@nodepressjs/ui';
import type { Category, Tag, ContentEntry, ArchiveEntry } from '@/lib/api';
import { getPosts, getCategories, getTags, getArchive } from '@/lib/api';

interface SidebarProps {
  categories?: Category[];
  tags?: Tag[];
  recentPosts?: ContentEntry[];
  archiveData?: ArchiveEntry[];
  className?: string;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatArchiveLabel(year: number, month: number): string {
  const date = new Date(year, month - 1);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
}

export async function Sidebar({
  categories,
  tags,
  recentPosts,
  archiveData,
  className,
}: SidebarProps) {
  // Fetch missing data if not provided via props, with graceful error handling
  const [fetchedPosts, fetchedCategories, fetchedTags, fetchedArchive] = await Promise.all([
    !recentPosts
      ? getPosts({ limit: 5, status: 'publish' })
          .then((r) => r.items)
          .catch(() => [] as ContentEntry[])
      : Promise.resolve(undefined),
    !categories ? getCategories().catch(() => [] as Category[]) : Promise.resolve(undefined),
    !tags ? getTags().catch(() => [] as Tag[]) : Promise.resolve(undefined),
    !archiveData ? getArchive().catch(() => [] as ArchiveEntry[]) : Promise.resolve(undefined),
  ]);

  const effectiveRecentPosts = recentPosts ?? fetchedPosts ?? [];
  const effectiveCategories = categories ?? fetchedCategories ?? [];
  const effectiveTags = tags ?? fetchedTags ?? [];
  const effectiveArchive = archiveData ?? fetchedArchive ?? [];

  // Tag cloud size computation
  const maxTagCount = Math.max(...effectiveTags.map((t) => t.count), 0);

  function getTagSizeClass(count: number): string {
    if (maxTagCount === 0) return 'text-xs';
    const ratio = count / maxTagCount;
    if (ratio > 0.75) return 'text-sm font-semibold';
    if (ratio > 0.5) return 'text-sm font-medium';
    if (ratio > 0.25) return 'text-xs font-medium';
    return 'text-xs';
  }

  // Build visible sections list so borders are drawn correctly between widgets
  const sections: { id: string; content: React.ReactNode }[] = [];

  if (effectiveRecentPosts.length > 0) {
    sections.push({
      id: 'recent-posts',
      content: (
        <>
          <Heading level={3} className="text-wp-text mb-4">
            Recent Posts
          </Heading>
          <ul className="space-y-3">
            {effectiveRecentPosts.slice(0, 5).map((post) => (
              <li key={post.id}>
                <Link href={`/posts/${post.slug}`} className="group block no-underline">
                  <span className="text-wp-text group-hover:text-wp-primary line-clamp-2 text-sm transition-colors">
                    {post.title}
                  </span>
                  <time
                    dateTime={post.publishedAt ?? post.createdAt}
                    className="text-wp-text-light mt-0.5 block text-xs"
                  >
                    {formatDate(post.publishedAt ?? post.createdAt)}
                  </time>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ),
    });
  }

  if (effectiveCategories.length > 0) {
    sections.push({
      id: 'categories',
      content: (
        <>
          <Heading level={3} className="text-wp-text mb-4">
            Categories
          </Heading>
          <ul className="space-y-2">
            {effectiveCategories.map((category) => (
              <li key={category.id}>
                <Link
                  href={`/category/${category.slug}`}
                  className="group flex items-center justify-between no-underline"
                >
                  <span className="text-wp-text group-hover:text-wp-primary text-sm transition-colors">
                    {category.name}
                  </span>
                  <span className="bg-wp-bg-light/60 text-wp-text-light inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium">
                    {category.count}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ),
    });
  }

  if (effectiveTags.length > 0) {
    sections.push({
      id: 'tags',
      content: (
        <>
          <Heading level={3} className="text-wp-text mb-4">
            Tags
          </Heading>
          <div className="flex flex-wrap gap-2">
            {effectiveTags.map((tag) => (
              <Link
                key={tag.id}
                href={`/tag/${tag.slug}`}
                className={cn(
                  'border-wp-border bg-wp-bg-light/30 hover:border-wp-primary hover:text-wp-primary inline-flex items-center rounded-full border px-3 py-1 no-underline transition-colors',
                  getTagSizeClass(tag.count),
                )}
              >
                {tag.name}
              </Link>
            ))}
          </div>
        </>
      ),
    });
  }

  if (effectiveArchive.length > 0) {
    sections.push({
      id: 'archives',
      content: (
        <>
          <Heading level={3} className="text-wp-text mb-4">
            Archives
          </Heading>
          <ul className="space-y-2">
            {effectiveArchive.map((entry) => (
              <li key={`${entry.year}-${entry.month}`}>
                <Link
                  href={`/${entry.year}/${String(entry.month).padStart(2, '0')}`}
                  className="group flex items-center justify-between no-underline"
                >
                  <span className="text-wp-text group-hover:text-wp-primary text-sm transition-colors">
                    {formatArchiveLabel(entry.year, entry.month)}
                  </span>
                  <span className="bg-wp-bg-light/60 text-wp-text-light inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium">
                    {entry.count}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ),
    });
  }

  if (sections.length === 0) {
    return null;
  }

  return (
    <aside className={cn('w-full', className)}>
      {sections.map((section, index) => (
        <div
          key={section.id}
          className={cn(
            'pb-6',
            index > 0 && 'border-wp-border border-t pt-6',
            index < sections.length - 1 && 'mb-6',
          )}
        >
          {section.content}
        </div>
      ))}
    </aside>
  );
}
