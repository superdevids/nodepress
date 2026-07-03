import type { Config } from 'tailwindcss';
import { nodepressPreset } from '@nodepress/config';

const config: Config = {
  presets: [nodepressPreset],
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
