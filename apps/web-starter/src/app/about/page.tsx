import { Container, Heading, Text } from '@nodepressjs/ui';
import { getSiteSettings } from '@/lib/api';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About',
  description: 'Learn more about NodePress — a modern, type-safe CMS.',
  openGraph: {
    title: 'About — NodePress',
    description: 'Learn more about NodePress — a modern, type-safe CMS.',
  },
};

export default async function AboutPage() {
  const settings = await getSiteSettings();
  const siteTitle = settings?.siteTitle ?? 'NodePress';
  const tagline =
    (settings?.tagline as string) ?? 'A modern, type-safe CMS built with Node.js and TypeScript.';

  return (
    <Container size="md" className="py-12 sm:py-16">
      <article>
        {/* Header */}
        <div className="mb-12">
          <Heading level={1}>About {siteTitle}</Heading>
          <Text size="lg" color="muted" className="mt-4">
            {tagline}
          </Text>
        </div>

        {/* Content sections */}
        <div className="space-y-8">
          <section>
            <Heading level={2}>Our Mission</Heading>
            <Text className="mt-3 leading-relaxed">
              NodePress is built to provide a modern, type-safe content management experience that
              combines flexibility with the power of TypeScript and modern Node.js frameworks.
            </Text>
            <Text className="mt-3 leading-relaxed">
              We believe content management should be developer-friendly without sacrificing
              editorial usability. Our headless architecture decouples the content backend from the
              presentation layer, allowing you to build anything from blogs and marketing sites to
              complex web applications — all powered by the same content API.
            </Text>
          </section>

          <section>
            <Heading level={2}>Key Features</Heading>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {[
                {
                  title: 'Type-Safe API',
                  description:
                    'Full TypeScript support from database to frontend with shared type definitions.',
                },
                {
                  title: 'Headless Architecture',
                  description:
                    'Decoupled backend and frontend. Use any framework — Next.js, Nuxt, SvelteKit, or a mobile app.',
                },
                {
                  title: 'Block Editor',
                  description:
                    'Rich content editing powered by Tiptap with extensible block system.',
                },
                {
                  title: 'Plugin System',
                  description: 'Modern CMS hook system for extending functionality.',
                },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="border-wp-border bg-card shadow-wp-card rounded-lg border p-5"
                >
                  <h3 className="text-wp-text font-semibold">{feature.title}</h3>
                  <p className="text-wp-text-light mt-1.5 text-sm">{feature.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <Heading level={2}>Technology Stack</Heading>
            <Text className="mt-3 leading-relaxed">
              NodePress is built on a modern stack: NestJS for the API layer, Prisma ORM for
              database access, PostgreSQL for storage, Redis for caching, and React/Next.js for the
              frontend. Every layer is fully typed with TypeScript.
            </Text>
          </section>
        </div>
      </article>
    </Container>
  );
}
