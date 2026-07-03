const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface Post {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  publishedAt: string;
}

export async function getPosts(): Promise<Post[]> {
  try {
    const res = await fetch(`${API_URL}/api/content/post?status=publish&limit=10`);
    const json = await res.json();
    return json.data?.items || json.items || [];
  } catch {
    return [];
  }
}

export async function getPost(slug: string): Promise<Post | null> {
  try {
    const res = await fetch(`${API_URL}/api/content/post?slug=${slug}`);
    const json = await res.json();
    const items = json.data?.items || json.items || [];
    return items[0] || null;
  } catch {
    return null;
  }
}
