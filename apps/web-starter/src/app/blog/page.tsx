import Link from 'next/link';
import { getPosts } from '../../lib/api';

export default async function BlogPage() {
  const posts = await getPosts();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-8">Blog</h1>
      {posts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No posts yet. Create your first post in the admin panel.</p>
        </div>
      ) : (
        <div className="grid gap-8">
          {posts.map((post: any) => (
            <article key={post.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
              <h2 className="text-2xl font-semibold mb-2">
                <Link href={`/blog/${post.slug}`} className="hover:text-primary">
                  {post.data?.title || post.title || 'Untitled'}
                </Link>
              </h2>
              <p className="text-muted-foreground mb-4">
                {post.data?.excerpt || post.excerpt || ''}
              </p>
              <time className="text-sm text-muted-foreground">
                {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : ''}
              </time>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
