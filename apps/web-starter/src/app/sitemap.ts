import type { MetadataRoute } from 'next';
import { getPosts, getCategories, getTags, getPages } from '@/lib/api';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  // ── Static pages ──────────────────────────────────────────────────────────
  const staticPages = [
    { path: '', changeFrequency: 'weekly' as const, priority: 1.0 },
    { path: '/blog', changeFrequency: 'daily' as const, priority: 0.9 },
    { path: '/about', changeFrequency: 'monthly' as const, priority: 0.6 },
    { path: '/contact', changeFrequency: 'monthly' as const, priority: 0.5 },
    { path: '/search', changeFrequency: 'weekly' as const, priority: 0.4 },
  ];

  for (const page of staticPages) {
    entries.push({
      url: `${siteUrl}${page.path}`,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    });
  }

  // ── Blog posts ────────────────────────────────────────────────────────────
  try {
    const postsResult = await getPosts({ limit: 100 });
    const publishedPosts = postsResult.items.filter((post) => post.status === 'publish');

    for (const post of publishedPosts) {
      entries.push({
        url: `${siteUrl}/blog/${post.slug}`,
        lastModified: post.updatedAt ? new Date(post.updatedAt) : undefined,
        changeFrequency: 'monthly' as const,
        priority: 0.8,
      });
    }
  } catch {
    // Posts unavailable — skip post sitemap entries
  }

  // ── Pages (custom CMS pages) ──────────────────────────────────────────────
  try {
    const pagesResult = await getPages({ limit: 100 });
    const publishedPages = pagesResult.items.filter((page) => page.status === 'publish');

    for (const page of publishedPages) {
      entries.push({
        url: `${siteUrl}/${page.slug}`,
        lastModified: page.updatedAt ? new Date(page.updatedAt) : undefined,
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      });
    }
  } catch {
    // Pages unavailable — skip page sitemap entries
  }

  // ── Categories ────────────────────────────────────────────────────────────
  try {
    const categories = await getCategories();
    for (const category of categories) {
      entries.push({
        url: `${siteUrl}/category/${category.slug}`,
        changeFrequency: 'weekly' as const,
        priority: 0.5,
      });
    }
  } catch {
    // Categories unavailable — skip category sitemap entries
  }

  // ── Tags ──────────────────────────────────────────────────────────────────
  try {
    const tags = await getTags();
    for (const tag of tags) {
      entries.push({
        url: `${siteUrl}/tag/${tag.slug}`,
        changeFrequency: 'weekly' as const,
        priority: 0.3,
      });
    }
  } catch {
    // Tags unavailable — skip tag sitemap entries
  }

  return entries;
}
