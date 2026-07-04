'use client';

export default function LoginError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="space-y-4 text-center">
        <h1 className="text-destructive text-2xl font-bold">Login Error</h1>
        <p className="text-muted-foreground text-sm">
          {error.message || 'Something went wrong during login.'}
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
