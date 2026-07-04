import { Container } from '@nodepressjs/ui';
import { HeroSkeleton, PostListSkeleton } from '@/components/loading-skeleton';

export default function HomeLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero skeleton */}
      <Container>
        <HeroSkeleton />
      </Container>

      {/* Featured posts skeleton */}
      <section className="border-wp-border bg-wp-bg-light/30 border-t py-16">
        <Container>
          <div className="mb-8">
            <div
              className="bg-wp-border-light/60 h-8 w-48 animate-pulse rounded-md"
              aria-hidden="true"
            />
          </div>
          <PostListSkeleton count={6} cols={3} />
        </Container>
      </section>
    </div>
  );
}
