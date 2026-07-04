'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { AdminSidebar } from './admin-sidebar';
import { AdminHeader } from './admin-header';
import { AdminBar } from './admin-bar';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/admin/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AdminBar />

      <div className="flex flex-1">
        <AdminSidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

        <div className="flex flex-1 flex-col">
          <AdminHeader onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

          <main className="flex-1 p-6 pt-4">{children}</main>

          <footer className="text-muted-foreground border-t px-6 py-3 text-xs">
            <div className="flex items-center justify-between">
              <span>NodePress v0.1.0</span>
              <span>
                <a
                  href="https://nodepress.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground"
                >
                  Documentation
                </a>
                {' · '}
                <a
                  href="https://github.com/nodepress/nodepress"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground"
                >
                  GitHub
                </a>
              </span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
