export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Top navigation skeleton */}
      <header className="border-b px-6 py-3">
        <div className="flex items-center gap-4">
          <div className="h-8 w-32 animate-pulse rounded bg-gray-200" />
          <div className="ml-auto flex items-center gap-3">
            <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
            <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar skeleton */}
        <aside className="hidden w-60 border-r p-4 md:block">
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-4 w-4 animate-pulse rounded bg-gray-200" />
                <div className="h-4 flex-1 animate-pulse rounded bg-gray-200" />
              </div>
            ))}
          </div>
        </aside>

        {/* Main content skeleton */}
        <main className="flex-1 p-6">
          {/* Breadcrumb */}
          <div className="mb-6 flex items-center gap-2">
            <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-4 text-gray-300">/</div>
            <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
          </div>

          {/* Page title */}
          <div className="mb-8">
            <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
            <div className="mt-2 h-4 w-96 animate-pulse rounded bg-gray-200" />
          </div>

          {/* Content cards */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-6">
                <div className="mb-4 h-5 w-32 animate-pulse rounded bg-gray-200" />
                <div className="space-y-2">
                  <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
                  <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
                </div>
              </div>
            ))}
          </div>

          {/* Table skeleton */}
          <div className="mt-8 rounded-lg border">
            <div className="border-b p-4">
              <div className="h-5 w-48 animate-pulse rounded bg-gray-200" />
            </div>
            <div className="divide-y">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4">
                  <div className="h-4 w-4 animate-pulse rounded bg-gray-200" />
                  <div className="h-4 w-48 animate-pulse rounded bg-gray-200" />
                  <div className="ml-auto h-4 w-24 animate-pulse rounded bg-gray-200" />
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
