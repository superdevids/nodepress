'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md rounded-lg border border-red-200 bg-white p-8 shadow-sm">
        {/* Error icon */}
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <svg
            className="h-8 w-8 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>

        {/* Error heading */}
        <h1 className="text-center text-xl font-semibold text-gray-900">Something went wrong</h1>

        {/* Error details */}
        <div className="mt-3 rounded-md bg-red-50 p-3">
          <p className="text-center text-sm text-red-700">
            {error.message || 'An unexpected error occurred.'}
          </p>
        </div>

        {/* Error ID */}
        {error.digest && (
          <p className="mt-3 text-center text-xs text-gray-400">
            Error ID: <code className="font-mono">{error.digest}</code>
          </p>
        )}

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={reset}
            className="w-full rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Try again
          </button>
          <button
            onClick={() => (window.location.href = '/')}
            className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
          >
            Go to Dashboard
          </button>
        </div>
      </div>

      {/* Footer hint */}
      <p className="mt-8 text-xs text-gray-400">
        If this problem persists, please check the server logs or contact support.
      </p>
    </div>
  );
}
