import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <h1 className="text-muted-foreground text-6xl font-bold">404</h1>
      <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
      <p className="text-muted-foreground mt-2 text-sm">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/admin"
        className="bg-primary text-primary-foreground hover:bg-primary/90 mt-6 rounded-md px-4 py-2 text-sm font-medium"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
