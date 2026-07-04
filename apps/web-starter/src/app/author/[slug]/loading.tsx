import { Container } from '@nodepressjs/ui';
import { BlogListSkeleton } from '@/components/loading';

export default function AuthorLoading() {
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

      {/* Author bio skeleton */}
      <div className="border-wp-border mb-12 flex flex-col items-start gap-6 rounded-lg border p-6 sm:flex-row">
        {/* Avatar skeleton */}
        <div
          className="bg-wp-border-light/60 h-20 w-20 animate-pulse rounded-full sm:h-24 sm:w-24"
          aria-hidden="true"
        />
        {/* Content skeleton */}
        <div className="flex-1 space-y-3">
          <div
            className="bg-wp-border-light/60 h-6 w-40 animate-pulse rounded-md"
            aria-hidden="true"
          />
          <div className="space-y-2">
            <div
              className="bg-wp-border-light/60 h-4 w-full animate-pulse rounded-md"
              aria-hidden="true"
            />
            <div
              className="bg-wp-border-light/60 h-4 w-5/6 animate-pulse rounded-md"
              aria-hidden="true"
            />
          </div>
          <div className="flex gap-4">
            <div
              className="bg-wp-border-light/60 h-5 w-16 animate-pulse rounded-full"
              aria-hidden="true"
            />
            <div
              className="bg-wp-border-light/60 h-5 w-16 animate-pulse rounded-full"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>

      {/* Posts header skeleton */}
      <div className="mb-8">
        <div
          className="bg-wp-border-light/60 h-7 w-48 animate-pulse rounded-md"
          aria-hidden="true"
        />
        <div
          className="bg-wp-border-light/60 mt-1 h-4 w-28 animate-pulse rounded-md"
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
    </Container>
  );
}
