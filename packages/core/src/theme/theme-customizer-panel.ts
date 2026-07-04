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

function getStorage(): Storage | null {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    return localStorage;
  }
  return null;
}

const memoryStore = new Map<string, string>();

export class ThemeCustomizerPanel {
  private panels: Map<string, CustomizerPanel> = new Map();
  private storage: Storage | null;

  constructor() {
    this.storage = getStorage();
  }

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
    const serialized = JSON.stringify(value);
    if (this.storage) {
      this.storage.setItem(key, serialized);
    } else {
      memoryStore.set(key, serialized);
    }
  }

  getSetting(panelId: string, sectionId: string, controlId: string): unknown {
    const key = `customizer_${panelId}_${sectionId}_${controlId}`;
    let raw: string | null = null;
    if (this.storage) {
      raw = this.storage.getItem(key);
    } else {
      raw = memoryStore.get(key) ?? null;
    }
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
