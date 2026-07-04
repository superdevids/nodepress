import { Container } from '@nodepressjs/ui';
import { BlogListSkeleton, SidebarSkeleton } from '@/components/loading';

export default function BlogLoading() {
  return (
    <Container className="py-12 sm:py-16">
      {/* Breadcrumbs skeleton */}
      <div className="mb-6 flex items-center gap-2">
        <div
          className="bg-wp-border-light/60 h-4 w-16 animate-pulse rounded-md"
          aria-hidden="true"
        />
        <div
          className="bg-wp-border-light/60 h-4 w-4 animate-pulse rounded-md"
          aria-hidden="true"
        />
        <div
          className="bg-wp-border-light/60 h-4 w-20 animate-pulse rounded-md"
          aria-hidden="true"
        />
      </div>

      {/* Page header skeleton */}
      <div className="mb-8">
        <div
          className="bg-wp-border-light/60 h-10 w-24 animate-pulse rounded-md"
          aria-hidden="true"
        />
        <div
          className="bg-wp-border-light/60 mt-3 h-5 w-96 animate-pulse rounded-md"
          aria-hidden="true"
        />
      </div>

      {/* Search bar skeleton */}
      <div className="mb-8 max-w-md">
        <div
          className="bg-wp-border-light/60 h-10 w-full animate-pulse rounded-md"
          aria-hidden="true"
        />
      </div>

      {/* Filter pills skeleton */}
      <div className="mb-8 flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="bg-wp-border-light/60 h-8 w-20 animate-pulse rounded-full"
            aria-hidden="true"
          />
        ))}
      </div>

      {/* Main content + Sidebar layout */}
      <div className="lg:grid lg:grid-cols-[1fr_300px] lg:gap-10">
        {/* Posts grid skeleton */}
        <div>
          <div
            className="bg-wp-border-light/60 mb-4 h-4 w-32 animate-pulse rounded-md"
            aria-hidden="true"
          />
          <BlogListSkeleton />
        </div>

        {/* Sidebar skeleton */}
        <aside className="mt-12 lg:mt-0">
          <SidebarSkeleton />
        </aside>
      </div>
    </Container>
  );
}
