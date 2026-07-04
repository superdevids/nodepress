import Link from 'next/link';
import type { Author } from '@/lib/api';
import { cn, Card, CardTitle } from '@nodepressjs/ui';

export interface AuthorBioProps {
  author: Author;
  className?: string;
}

const SOCIAL_LABELS: Record<string, string> = {
  twitter: 'X',
  github: 'GH',
  linkedin: 'LI',
  youtube: 'YT',
  website: 'WEB',
  facebook: 'FB',
  instagram: 'IG',
  mastodon: 'MD',
  bluesky: 'BS',
  threads: 'TH',
};

const AVATAR_COLORS = [
  'bg-wp-primary',
  'bg-wp-accent',
  'bg-wp-success',
  'bg-wp-warning',
  'bg-wp-admin-bar',
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index] ?? 'bg-wp-primary';
}

function getSocialLabel(platform: string): string {
  const key = platform.toLowerCase();
  return SOCIAL_LABELS[key] || platform.slice(0, 2).toUpperCase();
}

export function AuthorBio({ author, className }: AuthorBioProps) {
  const initials = getInitials(author.name);
  const avatarColor = getAvatarColor(author.name);
  const socialEntries = author.socialLinks ? Object.entries(author.socialLinks) : [];
  const hasPosts = author.postCount > 0;

  return (
    <Card className={cn('flex flex-col items-start gap-6 sm:flex-row', className)}>
      {/* Avatar */}
      <div className="flex-shrink-0">
        {author.avatarUrl ? (
          <img
            src={author.avatarUrl}
            alt={`${author.name}'s avatar`}
            className="border-wp-border-light size-20 rounded-full border-2 object-cover sm:size-24"
          />
        ) : (
          <div
            className={cn(
              'flex size-20 items-center justify-center rounded-full text-lg font-bold text-white sm:size-24 sm:text-xl',
              avatarColor,
            )}
            aria-hidden="true"
          >
            {initials}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 space-y-3">
        {/* Name & Bio */}
        <div>
          <Link href={`/author/${author.slug}`} className="no-underline hover:underline">
            <CardTitle className="text-wp-text hover:text-wp-primary text-xl transition-colors">
              {author.name}
            </CardTitle>
          </Link>
          {author.bio && (
            <p className="text-wp-text-light mt-1 text-sm leading-relaxed">{author.bio}</p>
          )}
        </div>

        {/* Social Links */}
        {socialEntries.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {socialEntries.map(([platform, url]) => (
              <a
                key={platform}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'inline-flex items-center gap-1.5',
                  'text-xs font-medium',
                  'text-wp-text-light hover:text-wp-primary',
                  'transition-colors',
                )}
                aria-label={`${author.name} on ${platform}`}
              >
                <span
                  className={cn(
                    'flex size-6 items-center justify-center rounded-full',
                    'bg-wp-bg-light text-[10px] font-bold uppercase leading-none',
                  )}
                >
                  {getSocialLabel(platform)}
                </span>
                <span className="capitalize">{platform}</span>
              </a>
            ))}
          </div>
        )}

        {/* Archive Link */}
        {hasPosts && (
          <Link
            href={`/author/${author.slug}`}
            className={cn(
              'inline-flex items-center gap-1.5 text-sm font-medium',
              'text-wp-primary hover:text-wp-primary-hover',
              'transition-colors',
            )}
          >
            View all {author.postCount} {author.postCount === 1 ? 'post' : 'posts'}
            <span aria-hidden="true" className="text-xs">
              &rarr;
            </span>
          </Link>
        )}
      </div>
    </Card>
  );
}
