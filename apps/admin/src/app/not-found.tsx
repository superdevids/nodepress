import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md text-center">
        {/* 404 illustration */}
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gray-100">
          <span className="text-4xl font-bold text-gray-300">404</span>
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-bold text-gray-900">Page not found</h1>
        <p className="mt-2 text-sm text-gray-500">
          The page you are looking for does not exist or has been moved.
        </p>

        {/* Suggestions */}
        <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 text-left">
          <h2 className="text-sm font-semibold text-gray-700">What would you like to do?</h2>
          <ul className="mt-3 space-y-2 text-sm text-gray-500">
            <li className="flex items-center gap-2">
              <span className="text-gray-400">&rarr;</span>
              Go back to the{' '}
              <Link href="/" className="font-medium text-blue-600 hover:text-blue-700">
                Dashboard
              </Link>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-gray-400">&rarr;</span>
              Check the{' '}
              <Link href="/admin/content" className="font-medium text-blue-600 hover:text-blue-700">
                Content
              </Link>{' '}
              section for your pages
            </li>
            <li className="flex items-center gap-2">
              <span className="text-gray-400">&rarr;</span>
              Visit the{' '}
              <Link
                href="/admin/settings"
                className="font-medium text-blue-600 hover:text-blue-700"
              >
                Settings
              </Link>{' '}
              to configure your site
            </li>
          </ul>
        </div>

        {/* Action button */}
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
