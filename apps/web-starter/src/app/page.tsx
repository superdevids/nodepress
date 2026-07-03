import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link href="/" className="text-xl font-bold">
            My Site
          </Link>
          <nav className="flex gap-6">
            <Link href="/" className="text-sm hover:text-primary">
              Home
            </Link>
            <Link href="/blog" className="text-sm hover:text-primary">
              Blog
            </Link>
            <Link href="/about" className="text-sm hover:text-primary">
              About
            </Link>
            <Link href="/contact" className="text-sm hover:text-primary">
              Contact
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-24 text-center">
          <h1 className="text-5xl font-bold tracking-tight">
            Welcome to Your NodePress Site
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            A modern, type-safe content management system built with Node.js and TypeScript.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link
              href="/blog"
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Read the Blog
            </Link>
            <Link
              href="/admin"
              className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-6 text-sm font-medium hover:bg-muted"
            >
              Admin Panel
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                title: "Content Types",
                description: "Define custom post types and fields with full TypeScript support.",
              },
              {
                title: "Block Editor",
                description: "Rich block-based editing experience powered by Tiptap.",
              },
              {
                title: "Plugin System",
                description: "Extend functionality with a WordPress-compatible hook system.",
              },
            ].map((feature) => (
              <div key={feature.title} className="rounded-lg border bg-card p-6">
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <p>Powered by NodePress</p>
      </footer>
    </div>
  );
}
