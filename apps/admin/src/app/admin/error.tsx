'use client';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="space-y-4 text-center">
        <h1 className="text-destructive text-2xl font-bold">Admin Error</h1>
        <p className="text-muted-foreground max-w-md text-sm">
          {error.message || 'An unexpected error occurred in the admin panel.'}
        </p>
        <button
          onClick={reset}
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
