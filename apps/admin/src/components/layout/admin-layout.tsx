'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { AdminSidebar } from './admin-sidebar';
import { AdminHeader } from './admin-header';
import { AdminBar } from './admin-bar';
import { APP_VERSION, STORAGE_KEYS } from '@/lib/constants';
import { useKeyboardShortcut, registerShortcut } from '@/lib/keyboard-shortcuts';
import { KeyboardShortcutsModal } from '@/components/admin/keyboard-shortcuts-modal';
import { getStoredColorScheme, applyColorScheme, type ColorSchemeId } from '@/lib/color-schemes';
import { AdminNotices } from './admin-notices';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  // ─── Auth guard ───────────────────────────────────────────
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/admin/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // ─── Apply admin color scheme on mount and when user changes ──
  useEffect(() => {
    if (!isAuthenticated) return;
    const storedScheme: ColorSchemeId = getStoredColorScheme();
    applyColorScheme(storedScheme);
  }, [isAuthenticated]);

  // ─── Keyboard shortcuts ───────────────────────────────────
  useKeyboardShortcut(
    'show-help',
    useCallback(() => {
      setShortcutsModalOpen(true);
    }, []),
  );

  // Register navigation shortcuts
  useEffect(() => {
    if (!isAuthenticated) return;

    const unsub1 = registerShortcut('new-post', () => router.push('/admin/content/post/new'));
    const unsub2 = registerShortcut('posts-list', () => router.push('/admin/content'));
    const unsub3 = registerShortcut('media-library', () => router.push('/admin/media'));
    const unsub4 = registerShortcut('settings', () => router.push('/admin/settings'));
    const unsub5 = registerShortcut('users', () => router.push('/admin/users'));
    const unsub6 = registerShortcut('logout', () => {
      // Use auth logout
      import('@/lib/auth').then(({ useAuth }) => {
        // The actual logout is handled by the auth context
        window.location.href = '/admin/login';
      });
    });

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
      unsub6();
    };
  }, [isAuthenticated, router]);

  // ─── Escape closes the shortcuts modal ────────────────────
  useEffect(() => {
    if (!shortcutsModalOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShortcutsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcutsModalOpen]);

  if (isLoading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: '#f0f0f1' }}
      >
        <div className="space-y-4 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#2271b1] border-t-transparent" />
          <p className="text-sm text-[#787c82]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: '#f0f0f1' }}>
      <AdminBar />

      <div className="flex flex-1 pt-8">
        <AdminSidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

        <div className="flex min-w-0 flex-1 flex-col">
          <AdminHeader onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

          {/* Admin notices area */}
          <AdminNotices />

          <main className="flex-1">{children}</main>

          <footer className="text-muted-foreground dark:bg-background mt-auto border-t bg-white px-6 py-3 text-xs">
            <div className="flex items-center justify-between">
              <span>
                NodePress v{APP_VERSION}
                <span className="text-muted-foreground/40 mx-2">|</span>
                <button
                  onClick={() => setShortcutsModalOpen(true)}
                  className="hover:text-foreground transition-colors"
                >
                  Keyboard Shortcuts
                </button>
              </span>
              <span>
                <a
                  href="https://nodepress.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  Documentation
                </a>
                <span className="text-muted-foreground/40 mx-1.5">·</span>
                <a
                  href="https://github.com/nodepress/nodepress"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  GitHub
                </a>
              </span>
            </div>
          </footer>
        </div>
      </div>

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        open={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
      />
    </div>
  );
}
