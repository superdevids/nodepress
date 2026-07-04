import { cn } from '@nodepressjs/ui';

// ---------------------------------------------------------------------------
// Skeleton — base animated placeholder block
// ---------------------------------------------------------------------------

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn('bg-wp-border-light/60 animate-pulse rounded-md', className)}
      aria-hidden="true"
    />
  );
}

// ---------------------------------------------------------------------------
// Internal: post card skeleton (reusable building block)
// ---------------------------------------------------------------------------

function PostCardSkeleton() {
  return (
    <div className="border-wp-border flex flex-col gap-3 rounded-lg border p-6">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="mt-2 h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-2/3" />
      <div className="mt-3 flex gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PageSkeleton — full-page placeholder with breadcrumb, title & body content
// ---------------------------------------------------------------------------

export function PageSkeleton() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      {/* Breadcrumb trail */}
      <div className="mb-8 flex items-center gap-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-24" />
      </div>

      {/* Page title */}
      <Skeleton className="h-10 w-2/3" />

      {/* Body paragraphs */}
      <div className="mt-8 space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BlogListSkeleton — grid of six post card skeletons (default blog listing)
// ---------------------------------------------------------------------------

export function BlogListSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PostDetailSkeleton — single blog-post detail view
// ---------------------------------------------------------------------------

export function PostDetailSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12" aria-hidden="true">
      {/* Back / breadcrumb */}
      <Skeleton className="mb-6 h-4 w-24" />

      {/* Title */}
      <Skeleton className="mb-4 h-10 w-5/6" />

      {/* Meta (date / reading time) */}
      <Skeleton className="mb-8 h-4 w-1/3" />

      {/* Content */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SidebarSkeleton — typical sidebar widget placeholders
// ---------------------------------------------------------------------------

export function SidebarSkeleton() {
  return (
    <div className="space-y-8" aria-hidden="true">
      {/* Search widget */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>

      {/* Categories widget */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-28" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>

      {/* Recent posts widget */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-24" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-14 w-14 flex-shrink-0 rounded-md" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ArchiveSkeleton — archive / date listing placeholder
// ---------------------------------------------------------------------------

export function ArchiveSkeleton() {
  return (
    <div className="divide-wp-border divide-y" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between py-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-8" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SearchSkeleton — search results page placeholder
// ---------------------------------------------------------------------------

export function SearchSkeleton() {
  return (
    <div className="space-y-8" aria-hidden="true">
      {/* Search header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Result items */}
      <div className="space-y-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-20 w-20 flex-shrink-0 rounded-md" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
