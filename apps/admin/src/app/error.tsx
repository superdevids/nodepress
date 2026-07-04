'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <h1 className="text-destructive text-4xl font-bold">Something went wrong</h1>
      <p className="text-muted-foreground mt-4 text-sm">
        {error.message || 'An unexpected error occurred.'}
      </p>
      <button
        onClick={reset}
        className="bg-primary text-primary-foreground hover:bg-primary/90 mt-6 rounded-md px-4 py-2 text-sm font-medium"
      >
        Try again
      </button>
    </div>
  );
}
