import Link from 'next/link';
import { Container } from '@nodepressjs/ui';

/* -------------------------------------------------------------------------- */
/*  Data                                                                      */
/* -------------------------------------------------------------------------- */

const QUICK_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/blog', label: 'Blog' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
  { href: '/search', label: 'Search' },
];

const RECENT_POSTS = [
  { href: '/blog/getting-started-with-nodepress', label: 'Getting Started with NodePress' },
  {
    href: '/blog/typescript-best-practices',
    label: 'TypeScript Best Practices for CMS Development',
  },
  { href: '/blog/building-with-nextjs-15', label: 'Building Modern Sites with Next.js 15' },
  { href: '/blog/api-design-guide', label: 'API Design Guide for Headless CMS' },
];

const SOCIAL_LINKS = [
  { href: 'https://github.com/nodepress', label: 'GitHub', icon: 'github' },
  { href: 'https://twitter.com/nodepress', label: 'Twitter', icon: 'twitter' },
  { href: 'https://linkedin.com/company/nodepress', label: 'LinkedIn', icon: 'linkedin' },
];

/* -------------------------------------------------------------------------- */
/*  Inline SVG Icons (no icon library dependency)                             */
/* -------------------------------------------------------------------------- */

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function RssIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.199 24C19.199 13.467 10.533 4.8 0 4.8V0c13.165 0 24 10.835 24 24h-4.801zM3.291 17.415a3.3 3.3 0 013.293 3.295A3.303 3.303 0 013.283 24C1.47 24 0 22.526 0 20.71s1.475-3.294 3.291-3.295zM15.909 24h-4.665c0-6.169-5.075-11.245-11.244-11.245V8.09c8.727 0 15.909 7.184 15.909 15.91z" />
    </svg>
  );
}

/* Social icon map */
const socialIconMap: Record<string, React.FC<{ className?: string }>> = {
  github: GithubIcon,
  twitter: TwitterIcon,
  linkedin: LinkedinIcon,
};

/* -------------------------------------------------------------------------- */
/*  Public API                                                                */
/* -------------------------------------------------------------------------- */

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-wp-border bg-wp-bg-light mt-auto border-t" role="contentinfo">
      <Container className="py-12 sm:py-16">
        {/* Multi-column grid: 1 col mobile, 2 col tablet, 4 col desktop */}
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* ---------- Column 1 – Brand ---------- */}
          <div className="flex flex-col gap-4">
            <Link
              href="/"
              className="text-wp-text hover:text-wp-primary text-lg font-semibold transition-colors"
            >
              NodePress
            </Link>
            <p className="text-wp-text-light text-sm leading-relaxed">
              A modern, type-safe CMS built with Node.js &amp; TypeScript. Fast, flexible, and
              developer-friendly.
            </p>
            {/* Social icons */}
            <div className="mt-1 flex items-center gap-3">
              {SOCIAL_LINKS.map(({ href, label, icon }) => {
                const IconComponent = socialIconMap[icon];
                return (
                  <Link
                    key={icon}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="text-wp-text-light hover:text-wp-primary transition-colors"
                  >
                    {IconComponent ? (
                      <IconComponent className="h-5 w-5" />
                    ) : (
                      <span className="text-xs">{label}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* ---------- Column 2 – Quick Links ---------- */}
          <div>
            <h3 className="text-wp-text mb-4 text-sm font-semibold uppercase tracking-wider">
              Quick Links
            </h3>
            <nav aria-label="Quick links" className="flex flex-col gap-2">
              {QUICK_LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="text-wp-text-light hover:text-wp-primary w-fit text-sm transition-colors"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          {/* ---------- Column 3 – Recent Posts ---------- */}
          <div>
            <h3 className="text-wp-text mb-4 text-sm font-semibold uppercase tracking-wider">
              Recent Posts
            </h3>
            <nav aria-label="Recent posts" className="flex flex-col gap-2">
              {RECENT_POSTS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="text-wp-text-light hover:text-wp-primary w-fit text-sm transition-colors"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          {/* ---------- Column 4 – Newsletter ---------- */}
          <div>
            <h3 className="text-wp-text mb-4 text-sm font-semibold uppercase tracking-wider">
              Newsletter
            </h3>
            <p className="text-wp-text-light mb-4 text-sm leading-relaxed">
              Stay up to date with the latest articles, tutorials, and product updates delivered to
              your inbox.
            </p>
            <Link
              href="/contact"
              className="bg-wp-primary text-wp-primary-text hover:bg-wp-primary-hover inline-block rounded-md px-5 py-2.5 text-center text-sm font-medium transition-colors"
            >
              Subscribe
            </Link>
          </div>
        </div>
      </Container>

      {/* ---------- Bottom bar ---------- */}
      <div className="border-wp-border-light border-t">
        <Container>
          <div className="flex flex-col items-center justify-between gap-4 py-6 sm:flex-row">
            <p className="text-wp-text-light text-xs">
              &copy; {year} NodePress. All rights reserved.
            </p>

            <div className="flex items-center gap-4">
              <Link
                href="/api/feed/rss"
                className="text-wp-text-light hover:text-wp-primary flex items-center gap-1.5 text-xs transition-colors"
                aria-label="RSS Feed"
              >
                <RssIcon className="h-3.5 w-3.5" />
                RSS
              </Link>
              <span className="text-wp-text-light text-xs" aria-hidden="true">
                &middot;
              </span>
              <span className="text-wp-text-light text-xs">
                Powered by{' '}
                <Link href="/" className="text-wp-primary hover:underline">
                  NodePress
                </Link>
              </span>
            </div>
          </div>
        </Container>
      </div>
    </footer>
  );
}
