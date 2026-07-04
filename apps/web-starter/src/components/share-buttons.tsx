'use client';

import { useCallback, useState } from 'react';
import { cn } from '@nodepressjs/ui';

interface ShareButtonsProps {
  url: string;
  title: string;
  description?: string;
  className?: string;
}

export function ShareButtons({ url, title, description, className }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback for older browsers or non-HTTPS contexts
      try {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch {
        // Clipboard not available — silently fail
        return;
      }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [url]);

  const shareOnTwitter = useCallback(() => {
    const shareText = description ? `${title} — ${description}` : title;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`,
      '_blank',
      'noopener,noreferrer',
    );
  }, [url, title, description]);

  const shareOnFacebook = useCallback(() => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      '_blank',
      'noopener,noreferrer',
    );
  }, [url]);

  const shareOnLinkedIn = useCallback(() => {
    window.open(
      `https://www.linkedin.com/sharing/share-offset/?url=${encodeURIComponent(url)}`,
      '_blank',
      'noopener,noreferrer',
    );
  }, [url]);

  const buttonBase =
    'rounded-full p-2.5 text-wp-text-light transition-colors ' +
    'hover:bg-wp-hover-bg hover:text-wp-text ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wp-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background ' +
    'disabled:opacity-50 disabled:pointer-events-none';

  const emailSubject = encodeURIComponent(title);
  const emailBody = encodeURIComponent(description ? `${description}\n\n${url}` : url);

  return (
    <div
      className={cn('flex items-center gap-1', className)}
      role="group"
      aria-label="Share this page"
    >
      {/* Twitter / X */}
      <button
        type="button"
        onClick={shareOnTwitter}
        className={buttonBase}
        aria-label="Share on X (formerly Twitter)"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </button>

      {/* Facebook */}
      <button
        type="button"
        onClick={shareOnFacebook}
        className={buttonBase}
        aria-label="Share on Facebook"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      </button>

      {/* LinkedIn */}
      <button
        type="button"
        onClick={shareOnLinkedIn}
        className={buttonBase}
        aria-label="Share on LinkedIn"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      </button>

      {/* Copy Link */}
      <button
        type="button"
        onClick={copyToClipboard}
        className={buttonBase}
        aria-label={copied ? 'Link copied' : 'Copy link to clipboard'}
      >
        {copied ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-wp-success h-5 w-5"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        )}
      </button>

      {/* Email */}
      <a
        href={`mailto:?subject=${emailSubject}&body=${emailBody}`}
        className={buttonBase}
        aria-label="Share via email"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      </a>
    </div>
  );
}
