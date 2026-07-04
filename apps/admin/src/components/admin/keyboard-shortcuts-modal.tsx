'use client';

import * as React from 'react';
import { X, Keyboard } from 'lucide-react';
import { SHORTCUTS, type Shortcut } from '@/lib/keyboard-shortcuts';
import { cn } from '@/lib/utils';

/**
 * WordPress-style Keyboard Shortcuts Modal
 *
 * Shows all available keyboard shortcuts grouped by category.
 * Triggered by pressing `?` key.
 */

interface KeyboardShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

const categoryLabels: Record<string, string> = {
  navigation: 'Navigation',
  editing: 'Editing',
  actions: 'Actions',
  modals: 'Modals & Dialogs',
};

function ShortcutKey({ keys }: { keys: string }) {
  return (
    <kbd className="inline-flex items-center gap-0.5 rounded border border-[#c3c4c7] bg-[#f0f0f1] px-1.5 py-0.5 font-mono text-[11px] text-[#3c434a] shadow-sm dark:border-[#50575e] dark:bg-[#2c3338] dark:text-[#f0f0f1]">
      {keys.split('+').map((part, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="mx-0.5 opacity-50">+</span>}
          <span className="font-semibold">{part}</span>
        </React.Fragment>
      ))}
    </kbd>
  );
}

export function KeyboardShortcutsModal({ open, onClose }: KeyboardShortcutsModalProps) {
  // Close on Escape
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const grouped = SHORTCUTS.reduce<Record<string, Shortcut[]>>((acc, shortcut) => {
    if (!acc[shortcut.category]) acc[shortcut.category] = [];
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {});

  return (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className={cn(
          'relative w-full max-w-lg rounded-lg bg-white shadow-2xl',
          'dark:border dark:border-[#50575e] dark:bg-[#1d2327]',
          'mx-4 max-h-[80vh] overflow-y-auto',
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Keyboard Shortcuts"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#c3c4c7] px-6 py-4 dark:border-[#50575e]">
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-[#2271b1]" />
            <h2 className="text-lg font-semibold text-[#3c434a] dark:text-[#f0f0f1]">
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-[#f0f0f1] dark:hover:bg-[#2c3338]"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-[#787c82]" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6 px-6 py-4">
          {Object.entries(grouped).map(([category, shortcuts]) => (
            <div key={category}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#787c82] dark:text-[#9ca2a7]">
                {categoryLabels[category] || category}
              </h3>
              <div className="space-y-1">
                {shortcuts.map((shortcut) => (
                  <div key={shortcut.id} className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-[#3c434a] dark:text-[#f0f0f1]">
                      {shortcut.description}
                    </span>
                    <ShortcutKey keys={shortcut.label} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-[#c3c4c7] px-6 py-3 dark:border-[#50575e]">
          <p className="text-xs text-[#787c82] dark:text-[#9ca2a7]">
            Press <ShortcutKey keys="?" /> at any time to open this dialog. Press{' '}
            <ShortcutKey keys="Esc" /> to close.
          </p>
        </div>
      </div>
    </div>
  );
}
