/**
 * NodePress Install Detection Middleware
 * =======================================
 * Like WordPress: if not installed → redirect ALL routes to /install
 *
 * This middleware checks the API server's /api/install/status endpoint.
 * If the system is not installed, every route redirects to /install.
 * The /install page itself and static assets are excluded from redirect.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Cache the install status check to avoid hammering the API
let installStatusCache: { installed: boolean; timestamp: number } | null = null;
const CACHE_TTL_MS = 30_000; // 30-second cache

async function checkInstallStatus(request: NextRequest): Promise<boolean> {
  // Use the cached value if still fresh
  if (installStatusCache && Date.now() - installStatusCache.timestamp < CACHE_TTL_MS) {
    return installStatusCache.installed;
  }

  // Determine the API URL
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.API_URL ||
    new URL('/api', request.url).toString();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${apiUrl.replace(/\/+$/, '')}/install/status`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      // API responded but with error — assume not installed
      installStatusCache = { installed: false, timestamp: Date.now() };
      return false;
    }

    const data = await response.json();
    const installed = data?.installed === true;

    // Cache the result
    installStatusCache = { installed, timestamp: Date.now() };
    return installed;
  } catch {
    // API not reachable (not started yet, or still compiling)
    // Allow request to proceed — client-side check in InstallWizard handles it
    return true; // Assume installed to avoid false redirects during startup
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Never redirect these paths
  const skipPaths = ['/install', '/_next/static', '/_next/image', '/favicon', '/api', '/__nextjs'];

  if (skipPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Skip static file extensions
  if (/\.(ico|png|jpg|jpeg|gif|svg|webp|css|js|woff2?|ttf|eot|map)$/i.test(pathname)) {
    return NextResponse.next();
  }

  // Check installation status
  const installed = await checkInstallStatus(request);

  if (!installed) {
    // Not installed → redirect to /install
    const installUrl = new URL('/install', request.url);
    // Preserve the original URL as a query param so we can redirect back after install
    if (pathname !== '/' && pathname !== '/admin') {
      installUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(installUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static assets and internal Next.js paths
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:ico|png|jpg|jpeg|gif|svg|webp|css|js|woff2?|ttf|eot|map)$).*)',
  ],
};
