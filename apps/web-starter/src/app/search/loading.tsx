import { Container } from '@nodepressjs/ui';
import { SearchSkeleton } from '@/components/loading';

export default function SearchLoading() {
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

      <SearchSkeleton />
    </Container>
  );
}
