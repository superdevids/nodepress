import { Container } from '@nodepressjs/ui';
import { Hero } from '@/components/hero';
import { PostList } from '@/components/post-list';
import { getPosts, getSiteSettings } from '@/lib/api';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Home',
  description: 'Welcome to NodePress — a modern, type-safe CMS built with Node.js and TypeScript.',
  openGraph: {
    title: 'NodePress — A Modern CMS',
    description: 'A modern, type-safe content management system built with Node.js and TypeScript.',
  },
};

export default async function HomePage() {
  // Fetch data in parallel for performance
  const [postsResult, settings] = await Promise.all([getPosts({ limit: 6 }), getSiteSettings()]);

  const posts = postsResult.items;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero section */}
      <Hero settings={settings} />

      {/* Featured posts */}
      {posts.length > 0 && (
        <section className="border-wp-border bg-wp-bg-light/30 border-t py-16 sm:py-20">
          <Container>
            <PostList
              posts={posts}
              title="Latest Posts"
              showViewAll
              emptyMessage="No posts published yet."
            />
          </Container>
        </section>
      )}

      {/* Features section (visible when no posts, or always as supplementary) */}
      {posts.length === 0 && (
        <section className="border-wp-border bg-wp-bg-light/30 border-t py-16 sm:py-20">
          <Container>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: 'Content Types',
                  description: 'Define custom post types and fields with full TypeScript support.',
                },
                {
                  title: 'Block Editor',
                  description: 'Rich block-based editing experience powered by Tiptap.',
                },
                {
                  title: 'Plugin System',
                  description: 'Extend functionality with a WordPress-compatible hook system.',
                },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="border-wp-border bg-card shadow-wp-card rounded-lg border p-6"
                >
                  <h3 className="text-wp-text font-semibold">{feature.title}</h3>
                  <p className="text-wp-text-light mt-2 text-sm">{feature.description}</p>
                </div>
              ))}
            </div>
          </Container>
        </section>
      )}
    </div>
  );
}
