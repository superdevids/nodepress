import { Container } from '@nodepressjs/ui';
import { BlogListSkeleton, SidebarSkeleton } from '@/components/loading';

export default function CategoryLoading() {
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
        <div
          className="bg-wp-border-light/60 h-4 w-4 animate-pulse rounded-md"
          aria-hidden="true"
        />
        <div
          className="bg-wp-border-light/60 h-4 w-24 animate-pulse rounded-md"
          aria-hidden="true"
        />
      </div>

      <div className="grid gap-12 lg:grid-cols-[1fr_300px]">
        {/* Main content */}
        <div>
          {/* Page header skeleton */}
          <div className="mb-10">
            <div
              className="bg-wp-border-light/60 h-10 w-48 animate-pulse rounded-md"
              aria-hidden="true"
            />
            <div
              className="bg-wp-border-light/60 mt-3 h-5 w-full max-w-lg animate-pulse rounded-md"
              aria-hidden="true"
            />
            <div
              className="bg-wp-border-light/60 mt-2 h-4 w-24 animate-pulse rounded-md"
              aria-hidden="true"
            />
          </div>

          {/* Posts grid skeleton */}
          <BlogListSkeleton />
        </div>

        {/* Sidebar skeleton */}
        <aside className="hidden lg:block">
          <SidebarSkeleton />
        </aside>
      </div>
    </Container>
  );
}
