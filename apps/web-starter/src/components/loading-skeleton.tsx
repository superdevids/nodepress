import { cn } from '@nodepressjs/ui';

// ---------------------------------------------------------------------------
// Base skeleton block
// ---------------------------------------------------------------------------

interface SkeletonProps {
  className?: string;
}

function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn('bg-wp-border-light/60 animate-pulse rounded-md', className)}
      aria-hidden="true"
    />
  );
}

// ---------------------------------------------------------------------------
// Post card skeleton
// ---------------------------------------------------------------------------

export function PostCardSkeleton() {
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
// Grid of post card skeletons
// ---------------------------------------------------------------------------

interface PostListSkeletonProps {
  count?: number;
  cols?: 2 | 3;
}

export function PostListSkeleton({ count = 6, cols = 3 }: PostListSkeletonProps) {
  return (
    <div
      className={cn(
        'grid gap-6',
        'grid-cols-1 sm:grid-cols-2',
        cols === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2',
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single post page skeleton
// ---------------------------------------------------------------------------

export function PostDetailSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Skeleton className="mb-6 h-4 w-24" />
      <Skeleton className="mb-4 h-10 w-5/6" />
      <Skeleton className="mb-8 h-4 w-1/3" />
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
// Hero skeleton
// ---------------------------------------------------------------------------

export function HeroSkeleton() {
  return (
    <div className="flex flex-col items-center gap-6 py-20 sm:py-28">
      <Skeleton className="h-12 w-2/3 sm:h-14 sm:w-1/2" />
      <Skeleton className="h-5 w-3/4 sm:w-2/5" />
      <div className="mt-4 flex gap-4">
        <Skeleton className="h-11 w-36 rounded-md" />
        <Skeleton className="h-11 w-36 rounded-md" />
      </div>
    </div>
  );
}
