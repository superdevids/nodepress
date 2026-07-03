import type { Config } from 'tailwindcss';

export const nodepressPreset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        wp: {
          primary: '#2271b1',
          'primary-hover': '#135e96',
          'primary-text': '#ffffff',
          accent: '#72aee6',
          success: '#46b450',
          warning: '#f0b849',
          error: '#dc3232',
          'bg-dark': '#1d2327',
          'bg-light': '#f0f0f1',
          text: '#3c434a',
          'text-light': '#646970',
          border: '#c3c4c7',
          'border-light': '#dcdcde',
          'hover-bg': '#f0f0f1',
          'admin-bar': '#1d2327',
          'admin-bar-text': '#abb8c3',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
        mono: ['"SF Mono"', 'Monaco', '"Cascadia Code"', '"Fira Code"', 'Consolas', 'monospace'],
      },
      spacing: {
        'wp-xs': '4px',
        'wp-sm': '8px',
        'wp-md': '12px',
        'wp-lg': '16px',
        'wp-xl': '24px',
        'wp-2xl': '32px',
        'admin-bar': '32px',
        'admin-sidebar': '160px',
        'admin-sidebar-collapsed': '36px',
      },
      borderRadius: {
        wp: '4px',
        'wp-lg': '8px',
      },
      boxShadow: {
        'wp-card': '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
        'wp-popover': '0 2px 8px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)',
        'wp-modal': '0 4px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
      },
      animation: {
        'wp-fade-in': 'fadeIn 0.15s ease-in-out',
        'wp-slide-up': 'slideUp 0.2s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
