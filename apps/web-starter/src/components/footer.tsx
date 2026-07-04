import Link from 'next/link';

const FOOTER_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/blog', label: 'Blog' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-wp-border bg-wp-bg-light mt-auto border-t">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          {/* Brand */}
          <div className="flex flex-col items-center gap-2 sm:items-start">
            <Link
              href="/"
              className="text-wp-text hover:text-wp-primary text-lg font-semibold transition-colors"
            >
              NodePress
            </Link>
            <p className="text-wp-text-light text-sm">
              A modern, type-safe CMS built with Node.js &amp; TypeScript.
            </p>
          </div>

          {/* Navigation */}
          <nav
            className="flex flex-wrap justify-center gap-x-6 gap-y-2"
            aria-label="Footer navigation"
          >
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-wp-text-light hover:text-wp-text text-sm transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Copyright */}
        <div className="border-wp-border-light text-wp-text-light mt-8 border-t pt-6 text-center text-xs">
          <p>&copy; {year} NodePress. All rights reserved.</p>
          <p className="mt-1">Powered by NodePress</p>
        </div>
      </div>
    </footer>
  );
}
