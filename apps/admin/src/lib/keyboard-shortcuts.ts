'use client';

/**
 * NodePress-Style Keyboard Shortcuts
 *
 * Implements a centralized keyboard shortcuts system
 * that mirrors NodePress admin keyboard navigation.
 *
 * Available shortcuts:
 * - Ctrl+Alt+N  → New post
 * - Ctrl+Alt+P  → Posts list
 * - Ctrl+Shift+P → Preview current content
 * - Ctrl+S      → Save draft
 * - Esc         → Close modal / cancel
 * - ?           → Show shortcuts modal
 * - Ctrl+Alt+E  → Open content editor
 * - Ctrl+Alt+M  → Open media library
 * - Ctrl+Alt+T  → Open themes
 * - Ctrl+Alt+S  → Open settings
 * - Ctrl+Alt+U  → Open users
 * - Ctrl+Alt+L  → Logout
 */

export interface Shortcut {
  id: string;
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  label: string;
  description: string;
  category: 'navigation' | 'editing' | 'actions' | 'modals';
}

export const SHORTCUTS: Shortcut[] = [
  // Navigation
  {
    id: 'new-post',
    key: 'n',
    ctrl: true,
    alt: true,
    label: 'Ctrl+Alt+N',
    description: 'New post',
    category: 'navigation',
  },
  {
    id: 'posts-list',
    key: 'p',
    ctrl: true,
    alt: true,
    label: 'Ctrl+Alt+P',
    description: 'Posts list',
    category: 'navigation',
  },
  {
    id: 'media-library',
    key: 'm',
    ctrl: true,
    alt: true,
    label: 'Ctrl+Alt+M',
    description: 'Media library',
    category: 'navigation',
  },
  {
    id: 'themes',
    key: 't',
    ctrl: true,
    alt: true,
    label: 'Ctrl+Alt+T',
    description: 'Themes',
    category: 'navigation',
  },
  {
    id: 'settings',
    key: 's',
    ctrl: true,
    alt: true,
    label: 'Ctrl+Alt+S',
    description: 'Settings',
    category: 'navigation',
  },
  {
    id: 'users',
    key: 'u',
    ctrl: true,
    alt: true,
    label: 'Ctrl+Alt+U',
    description: 'Users',
    category: 'navigation',
  },

  // Editing
  {
    id: 'save-draft',
    key: 's',
    ctrl: true,
    label: 'Ctrl+S',
    description: 'Save draft',
    category: 'editing',
  },
  {
    id: 'preview',
    key: 'p',
    ctrl: true,
    shift: true,
    label: 'Ctrl+Shift+P',
    description: 'Preview',
    category: 'editing',
  },

  // Actions
  {
    id: 'logout',
    key: 'l',
    ctrl: true,
    alt: true,
    label: 'Ctrl+Alt+L',
    description: 'Logout',
    category: 'actions',
  },

  // Modals
  {
    id: 'close-modal',
    key: 'Escape',
    label: 'Esc',
    description: 'Close modal / cancel',
    category: 'modals',
  },
  {
    id: 'show-help',
    key: '?',
    label: '?',
    description: 'Show keyboard shortcuts help',
    category: 'modals',
  },
];

type ShortcutCallback = () => void;

const registeredCallbacks = new Map<string, ShortcutCallback>();
const isListening = { current: false };
const globalHandler = (e: KeyboardEvent) => {
  // Don't trigger shortcuts when typing in inputs/textareas
  const target = e.target as HTMLElement;
  const isEditable =
    target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

  for (const shortcut of SHORTCUTS) {
    // For Escape and ?, always fire regardless of focus
    if (shortcut.key === 'Escape' || shortcut.key === '?') {
      // continue to check
    } else if (isEditable) {
      continue;
    }

    const ctrl = shortcut.ctrl ?? false;
    const meta = shortcut.meta ?? false;
    const shift = shortcut.shift ?? false;
    const alt = shortcut.alt ?? false;

    if (
      e.key.toLowerCase() === shortcut.key.toLowerCase() &&
      e.ctrlKey === ctrl &&
      e.metaKey === meta &&
      e.shiftKey === shift &&
      e.altKey === alt
    ) {
      e.preventDefault();
      e.stopPropagation();
      const cb = registeredCallbacks.get(shortcut.id);
      cb?.();
      return;
    }
  }
};

function ensureListening() {
  if (!isListening.current) {
    window.addEventListener('keydown', globalHandler);
    isListening.current = true;
  }
}

/**
 * Register a callback for a keyboard shortcut.
 * Returns an unsubscribe function.
 */
export function registerShortcut(id: string, callback: ShortcutCallback): () => void {
  ensureListening();
  registeredCallbacks.set(id, callback);
  return () => {
    registeredCallbacks.delete(id);
    if (registeredCallbacks.size === 0 && isListening.current) {
      window.removeEventListener('keydown', globalHandler);
      isListening.current = false;
    }
  };
}

/**
 * React hook to register a keyboard shortcut.
 */
import { useEffect } from 'react';

export function useKeyboardShortcut(id: string, callback: ShortcutCallback) {
  useEffect(() => {
    return registerShortcut(id, callback);
  }, [id, callback]);
}

/**
 * Get shortcut by ID
 */
export function getShortcut(id: string): Shortcut | undefined {
  return SHORTCUTS.find((s) => s.id === id);
}

/**
 * Check if a shortcut is pressed (for inline usage)
 */
export function isShortcutPressed(e: KeyboardEvent, id: string): boolean {
  const shortcut = SHORTCUTS.find((s) => s.id === id);
  if (!shortcut) return false;
  return (
    e.key.toLowerCase() === shortcut.key.toLowerCase() &&
    e.ctrlKey === (shortcut.ctrl ?? false) &&
    e.metaKey === (shortcut.meta ?? false) &&
    e.shiftKey === (shortcut.shift ?? false) &&
    e.altKey === (shortcut.alt ?? false)
  );
}
