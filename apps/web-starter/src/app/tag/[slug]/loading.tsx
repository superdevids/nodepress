import { Container } from '@nodepressjs/ui';
import { SidebarSkeleton } from '@/components/loading';

export default function TagLoading() {
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
          className="bg-wp-border-light/60 h-4 w-12 animate-pulse rounded-md"
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
              className="bg-wp-border-light/60 h-10 w-36 animate-pulse rounded-md"
              aria-hidden="true"
            />
            <div
              className="bg-wp-border-light/60 mt-3 h-5 w-full max-w-md animate-pulse rounded-md"
              aria-hidden="true"
            />
            <div
              className="bg-wp-border-light/60 mt-2 h-4 w-56 animate-pulse rounded-md"
              aria-hidden="true"
            />
          </div>

          {/* Posts list skeleton */}
          <div className="flex flex-col gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="border-wp-border flex items-center gap-4 rounded-lg border px-4 py-3"
              >
                <div
                  className="bg-wp-border-light/60 h-10 w-10 animate-pulse rounded-full"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div
                    className="bg-wp-border-light/60 h-4 w-3/4 animate-pulse rounded-md"
                    aria-hidden="true"
                  />
                  <div
                    className="bg-wp-border-light/60 mt-1.5 h-3 w-1/3 animate-pulse rounded-md"
                    aria-hidden="true"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar skeleton */}
        <aside className="hidden lg:block">
          <SidebarSkeleton />
        </aside>
      </div>
    </Container>
  );
}
