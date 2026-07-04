export interface CustomizerPanel {
  id: string;
  title: string;
  description?: string;
  sections: CustomizerSection[];
}

export interface CustomizerSection {
  id: string;
  title: string;
  description?: string;
  controls: CustomizerControl[];
}

export type CustomizerControl = {
  id: string;
  label: string;
  type:
    'text' | 'textarea' | 'color' | 'image' | 'select' | 'checkbox' | 'range' | 'dropdown-pages';
  default?: unknown;
  choices?: Record<string, string>;
} & Record<string, unknown>;

const memoryStore = new Map<string, string>();

/**
 * Unified storage wrapper that prefers localStorage when available
 * (browser environment) and falls back to an in-memory Map otherwise
 * (SSR, Node.js, tests).
 */
function getItem(key: string): string | null {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    return localStorage.getItem(key);
  }
  return memoryStore.get(key) ?? null;
}

function setItem(key: string, value: string): void {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    localStorage.setItem(key, value);
  } else {
    memoryStore.set(key, value);
  }
}

export class ThemeCustomizerPanel {
  private panels: Map<string, CustomizerPanel> = new Map();

  constructor() {}

  registerPanel(panel: CustomizerPanel): void {
    this.panels.set(panel.id, panel);
  }

  getPanel(id: string): CustomizerPanel | undefined {
    return this.panels.get(id);
  }

  getAllPanels(): CustomizerPanel[] {
    return Array.from(this.panels.values());
  }

  saveSetting(panelId: string, sectionId: string, controlId: string, value: unknown): void {
    const key = `customizer_${panelId}_${sectionId}_${controlId}`;
    setItem(key, JSON.stringify(value));
  }

  getSetting(panelId: string, sectionId: string, controlId: string): unknown {
    const key = `customizer_${panelId}_${sectionId}_${controlId}`;
    const raw = getItem(key);
    return raw ? JSON.parse(raw) : null;
  }
}

export function registerDefaultCustomizerPanels(customizer: ThemeCustomizerPanel): void {
  customizer.registerPanel({
    id: 'site-identity',
    title: 'Site Identity',
    description: 'Basic site branding settings',
    sections: [
      {
        id: 'title-tagline',
        title: 'Site Title & Tagline',
        controls: [
          { id: 'blogname', label: 'Site Title', type: 'text', default: 'My Site' },
          { id: 'blogdescription', label: 'Tagline', type: 'text', default: '' },
          { id: 'site-icon', label: 'Site Icon', type: 'image' },
        ],
      },
    ],
  });

  customizer.registerPanel({
    id: 'colors',
    title: 'Colors',
    description: 'Theme color settings',
    sections: [
      {
        id: 'theme-colors',
        title: 'Color Scheme',
        controls: [
          { id: 'primary-color', label: 'Primary Color', type: 'color', default: '#2271b1' },
          { id: 'background-color', label: 'Background Color', type: 'color', default: '#ffffff' },
          { id: 'text-color', label: 'Text Color', type: 'color', default: '#3c434a' },
        ],
      },
    ],
  });

  customizer.registerPanel({
    id: 'header',
    title: 'Header',
    description: 'Header layout settings',
    sections: [
      {
        id: 'header-image',
        title: 'Header Image',
        controls: [
          { id: 'header-image', label: 'Upload Header Image', type: 'image' },
          {
            id: 'header-text-color',
            label: 'Header Text Color',
            type: 'color',
            default: '#ffffff',
          },
        ],
      },
    ],
  });

  customizer.registerPanel({
    id: 'layout',
    title: 'Layout',
    description: 'Page layout options',
    sections: [
      {
        id: 'page-layout',
        title: 'Default Layout',
        controls: [
          {
            id: 'container-width',
            label: 'Container Width',
            type: 'range',
            default: 1200,
            choices: { min: '800', max: '1920', step: '20' },
          },
          {
            id: 'sidebar-position',
            label: 'Sidebar Position',
            type: 'select',
            default: 'right',
            choices: { left: 'Left', right: 'Right', none: 'No Sidebar' },
          },
        ],
      },
    ],
  });
}

export const themeCustomizer = new ThemeCustomizerPanel();
registerDefaultCustomizerPanels(themeCustomizer);
