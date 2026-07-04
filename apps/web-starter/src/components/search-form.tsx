'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@nodepressjs/ui';

interface SearchFormProps {
  className?: string;
  placeholder?: string;
  large?: boolean;
}

export function SearchForm({
  className,
  placeholder = 'Search...',
  large = false,
}: SearchFormProps) {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const handleClear = () => {
    setQuery('');
  };

  const baseInputStyles =
    'w-full rounded-md border border-wp-border bg-background text-wp-text placeholder:text-wp-text-light focus:outline-none focus:ring-2 focus:ring-wp-accent focus:border-transparent transition-colors';

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className={cn('relative', className)}
      aria-label="Site search"
    >
      <label htmlFor="search-input" className="sr-only">
        {placeholder}
      </label>

      <div className="relative">
        {/* Search magnifying glass icon */}
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={large ? 20 : 16}
            height={large ? 20 : 16}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-wp-text-light"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </div>

        <input
          id="search-input"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className={cn(
            baseInputStyles,
            large ? 'py-3 pl-10 pr-10 text-base' : 'py-2 pl-9 pr-8 text-sm',
          )}
          aria-label={placeholder}
        />

        {/* Clear button — only visible when text is present */}
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="text-wp-text-light hover:text-wp-text absolute inset-y-0 right-0 flex items-center pr-2 transition-colors"
            aria-label="Clear search"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={large ? 18 : 14}
              height={large ? 18 : 14}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
    </form>
  );
}
