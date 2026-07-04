'use client';

/**
 * NodePress-style Admin Color Schemes
 *
 * Available schemes:
 * - default:  NodePress blue (#2271b1)
 * - light:    Clean white/light gray
 * - dark:     Dark mode
 * - modern:   Purple/teal
 *
 * User can select in Profile settings.
 * Stored in localStorage under `nodepress_color_scheme`.
 */

export type ColorSchemeId =
  'default' | 'light' | 'dark' | 'modern' | 'ocean' | 'sunrise' | 'midnight';

export interface ColorScheme {
  id: ColorSchemeId;
  label: string;
  description: string;
  /** CSS custom property overrides to apply to :root */
  colors: Record<string, string>;
  /** Tailwind dark mode class to add */
  darkModeClass?: string;
}

export const COLOR_SCHEMES: Record<ColorSchemeId, ColorScheme> = {
  default: {
    id: 'default',
    label: 'Default',
    description: 'NodePress classic blue',
    colors: {
      '--primary': '221.2 83.2% 53.3%',
      '--primary-foreground': '210 40% 98%',
      '--ring': '221.2 83.2% 53.3%',
      '--adminbar-background': '222.2 84% 4.9%',
      '--adminbar-foreground': '210 40% 98%',
      '--sidebar-background': '222.2 84% 4.9%',
      '--sidebar-foreground': '210 40% 98%',
      '--sidebar-accent': '217.2 32.6% 17.5%',
      '--sidebar-border': '217.2 32.6% 17.5%',
    },
  },

  light: {
    id: 'light',
    label: 'Light',
    description: 'Modern white with soft grays',
    colors: {
      '--primary': '221.2 83.2% 53.3%',
      '--primary-foreground': '210 40% 98%',
      '--ring': '221.2 83.2% 53.3%',
      '--background': '0 0% 100%',
      '--foreground': '222.2 84% 4.9%',
      '--card': '0 0% 100%',
      '--card-foreground': '222.2 84% 4.9%',
      '--muted': '210 40% 96.1%',
      '--muted-foreground': '215.4 16.3% 46.9%',
      '--border': '214.3 31.8% 91.4%',
      '--adminbar-background': '0 0% 100%',
      '--adminbar-foreground': '222.2 84% 4.9%',
      '--sidebar-background': '0 0% 100%',
      '--sidebar-foreground': '222.2 84% 4.9%',
      '--sidebar-accent': '210 40% 96.1%',
      '--sidebar-accent-foreground': '222.2 47.4% 11.2%',
      '--sidebar-border': '214.3 31.8% 91.4%',
      '--sidebar-muted': '210 40% 96.1%',
      '--sidebar-ring': '221.2 83.2% 53.3%',
    },
  },

  dark: {
    id: 'dark',
    label: 'Dark',
    description: 'Dark background, light text',
    colors: {
      '--background': '222.2 84% 4.9%',
      '--foreground': '210 40% 98%',
      '--card': '222.2 84% 4.9%',
      '--card-foreground': '210 40% 98%',
      '--popover': '222.2 84% 4.9%',
      '--popover-foreground': '210 40% 98%',
      '--primary': '217.2 91.2% 59.8%',
      '--primary-foreground': '222.2 47.4% 11.2%',
      '--secondary': '217.2 32.6% 17.5%',
      '--secondary-foreground': '210 40% 98%',
      '--muted': '217.2 32.6% 17.5%',
      '--muted-foreground': '215 20.2% 65.1%',
      '--accent': '217.2 32.6% 17.5%',
      '--accent-foreground': '210 40% 98%',
      '--destructive': '0 62.8% 30.6%',
      '--destructive-foreground': '210 40% 98%',
      '--border': '217.2 32.6% 17.5%',
      '--input': '217.2 32.6% 17.5%',
      '--ring': '224.3 76.3% 48%',
      '--sidebar-background': '0 0% 0%',
      '--sidebar-foreground': '210 40% 98%',
      '--sidebar-muted': '217.2 32.6% 17.5%',
      '--sidebar-accent': '217.2 32.6% 17.5%',
      '--sidebar-accent-foreground': '210 40% 98%',
      '--sidebar-border': '217.2 32.6% 17.5%',
      '--sidebar-ring': '224.3 76.3% 48%',
      '--adminbar-background': '0 0% 0%',
      '--adminbar-foreground': '210 40% 98%',
    },
    darkModeClass: 'dark',
  },

  modern: {
    id: 'modern',
    label: 'Modern',
    description: 'Purple primary, teal accents',
    colors: {
      '--primary': '270 95% 60%',
      '--primary-foreground': '210 40% 98%',
      '--ring': '270 95% 60%',
      '--sidebar-background': '270 50% 15%',
      '--sidebar-foreground': '210 40% 98%',
      '--sidebar-accent': '270 30% 25%',
      '--sidebar-border': '270 30% 25%',
      '--sidebar-muted': '270 30% 25%',
      '--sidebar-ring': '270 95% 60%',
      '--adminbar-background': '270 50% 15%',
      '--adminbar-foreground': '210 40% 98%',
    },
  },

  ocean: {
    id: 'ocean',
    label: 'Ocean',
    description: 'Teal and blue tones',
    colors: {
      '--primary': '187 85% 40%',
      '--primary-foreground': '210 40% 98%',
      '--ring': '187 85% 40%',
      '--sidebar-background': '200 60% 12%',
      '--sidebar-foreground': '210 40% 98%',
      '--sidebar-accent': '200 30% 22%',
      '--sidebar-border': '200 30% 22%',
      '--sidebar-muted': '200 30% 22%',
      '--sidebar-ring': '187 85% 40%',
      '--adminbar-background': '200 60% 12%',
      '--adminbar-foreground': '210 40% 98%',
    },
  },

  sunrise: {
    id: 'sunrise',
    label: 'Sunrise',
    description: 'Warm orange and gold',
    colors: {
      '--primary': '24 95% 50%',
      '--primary-foreground': '210 40% 98%',
      '--ring': '24 95% 50%',
      '--sidebar-background': '24 60% 12%',
      '--sidebar-foreground': '210 40% 98%',
      '--sidebar-accent': '24 30% 22%',
      '--sidebar-border': '24 30% 22%',
      '--sidebar-muted': '24 30% 22%',
      '--sidebar-ring': '24 95% 50%',
      '--adminbar-background': '24 60% 12%',
      '--adminbar-foreground': '210 40% 98%',
    },
  },

  midnight: {
    id: 'midnight',
    label: 'Midnight',
    description: 'Deep blue-black for low light',
    colors: {
      '--background': '240 20% 6%',
      '--foreground': '210 40% 98%',
      '--card': '240 15% 10%',
      '--card-foreground': '210 40% 98%',
      '--popover': '240 15% 10%',
      '--popover-foreground': '210 40% 98%',
      '--primary': '230 80% 55%',
      '--primary-foreground': '210 40% 98%',
      '--secondary': '240 10% 18%',
      '--secondary-foreground': '210 40% 98%',
      '--muted': '240 10% 18%',
      '--muted-foreground': '240 5% 60%',
      '--accent': '240 10% 18%',
      '--accent-foreground': '210 40% 98%',
      '--destructive': '0 62.8% 30.6%',
      '--destructive-foreground': '210 40% 98%',
      '--border': '240 10% 18%',
      '--input': '240 10% 18%',
      '--ring': '230 80% 55%',
      '--radius': '0.5rem',
      '--sidebar-background': '240 20% 4%',
      '--sidebar-foreground': '210 40% 98%',
      '--sidebar-muted': '240 10% 14%',
      '--sidebar-accent': '240 10% 14%',
      '--sidebar-accent-foreground': '210 40% 98%',
      '--sidebar-border': '240 10% 14%',
      '--sidebar-ring': '230 80% 55%',
      '--adminbar-background': '240 20% 4%',
      '--adminbar-foreground': '210 40% 98%',
    },
    darkModeClass: 'dark',
  },
};

export const COLOR_SCHEME_STORAGE_KEY = 'nodepress_color_scheme';

/** Get the current color scheme from localStorage */
export function getStoredColorScheme(): ColorSchemeId {
  if (typeof window === 'undefined') return 'default';
  try {
    const stored = localStorage.getItem(COLOR_SCHEME_STORAGE_KEY);
    if (stored && stored in COLOR_SCHEMES) return stored as ColorSchemeId;
  } catch {
    // localStorage unavailable
  }
  return 'default';
}

/** Apply a color scheme to the document */
export function applyColorScheme(schemeId: ColorSchemeId): void {
  if (typeof document === 'undefined') return;

  const scheme = COLOR_SCHEMES[schemeId];
  if (!scheme) return;

  const root = document.documentElement;

  // Apply all CSS custom properties
  Object.entries(scheme.colors).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  // Handle dark mode class
  if (scheme.darkModeClass) {
    root.classList.add(scheme.darkModeClass);
  } else {
    root.classList.remove('dark');
  }

  // Store preference
  try {
    localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, schemeId);
  } catch {
    // Storage unavailable
  }
}

/** Check if current scheme is dark */
export function isDarkScheme(schemeId: ColorSchemeId): boolean {
  return !!COLOR_SCHEMES[schemeId]?.darkModeClass;
}
