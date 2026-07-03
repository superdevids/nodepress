import { getPost, getPosts } from '../../../lib/api';
import Link from 'next/link';

export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map((post: any) => ({ slug: post.slug }));
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug);

  if (!post) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Post Not Found</h1>
        <Link href="/blog" className="text-primary hover:underline">← Back to Blog</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Link href="/blog" className="text-primary hover:underline mb-8 block">← Back to Blog</Link>
      <article>
        <h1 className="text-4xl font-bold mb-4">{(post as any).data?.title || (post as any).title}</h1>
        <time className="text-muted-foreground block mb-8">
          {(post as any).publishedAt ? new Date((post as any).publishedAt).toLocaleDateString() : ''}
        </time>
        <div className="prose max-w-none">
          {(post as any).data?.content || (post as any).content || ''}
        </div>
      </article>
    </div>
  );
}
