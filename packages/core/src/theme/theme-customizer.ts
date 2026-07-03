export type CustomizerFieldType =
  | "color"
  | "image"
  | "select"
  | "text"
  | "checkbox"
  | "range"
  | "textarea";

export interface CustomizerField {
  id: string;
  label: string;
  type: CustomizerFieldType;
  default?: unknown;
  options?: { label: string; value: string }[];
  min?: number;
  max?: number;
  step?: number;
  description?: string;
}

export interface CustomizerSection {
  id: string;
  title: string;
  fields: CustomizerField[];
}

export interface CustomizerPanel {
  id: string;
  title: string;
  sections: CustomizerSection[];
  priority?: number;
}

export interface SelectiveRefreshRule {
  key: string;
  type: "css-vars" | "partial-reload" | "full-reload";
  selector?: string;
}

export type PreviewDevice = "desktop" | "tablet" | "mobile";

export interface ThemePreviewState {
  themeSlug: string;
  device: PreviewDevice;
  customizerValues: Record<string, unknown>;
  lastUpdated: number;
}

export class ThemeCustomizer {
  private panels: Map<string, CustomizerPanel> = new Map();
  private listeners: Map<string, Set<(key: string, value: unknown, panel: string) => void>> = new Map();
  private previewSessions: Map<string, ThemePreviewState> = new Map();
  private selectiveRefreshRules: Map<string, SelectiveRefreshRule> = new Map();

  registerPanel(panel: CustomizerPanel): void {
    if (this.panels.has(panel.id)) {
      throw new Error(`Customizer panel "${panel.id}" is already registered.`);
    }
    this.panels.set(panel.id, panel);
  }

  getPanel(id: string): CustomizerPanel | undefined {
    return this.panels.get(id);
  }

  getAllPanels(): CustomizerPanel[] {
    return Array.from(this.panels.values()).sort((a, b) => (a.priority ?? 10) - (b.priority ?? 10));
  }

  getDefaultValues(): Record<string, unknown> {
    const values: Record<string, unknown> = {};
    for (const panel of this.panels.values()) {
      for (const section of panel.sections) {
        for (const field of section.fields) {
          values[field.id] = field.default;
        }
      }
    }
    return values;
  }

  registerSelectiveRefreshRule(key: string, rule: SelectiveRefreshRule): void {
    this.selectiveRefreshRules.set(key, rule);
  }

  getSelectiveRefreshRule(key: string): SelectiveRefreshRule | undefined {
    return this.selectiveRefreshRules.get(key);
  }

  getRefreshType(key: string): "css-vars" | "partial-reload" | "full-reload" {
    return this.selectiveRefreshRules.get(key)?.type ?? "full-reload";
  }

  subscribe(panelId: string, listener: (key: string, value: unknown, panel: string) => void): () => void {
    if (!this.listeners.has(panelId)) {
      this.listeners.set(panelId, new Set());
    }
    this.listeners.get(panelId)!.add(listener);

    return () => {
      this.listeners.get(panelId)?.delete(listener);
    };
  }

  notifyChange(panelId: string, key: string, value: unknown): void {
    const panelListeners = this.listeners.get(panelId);
    if (panelListeners) {
      for (const listener of panelListeners) {
        listener(key, value, panelId);
      }
    }
  }

  createPreviewSession(sessionId: string, themeSlug: string, device: PreviewDevice = "desktop"): ThemePreviewState {
    const state: ThemePreviewState = {
      themeSlug,
      device,
      customizerValues: this.getDefaultValues(),
      lastUpdated: Date.now(),
    };
    this.previewSessions.set(sessionId, state);
    return state;
  }

  getPreviewSession(sessionId: string): ThemePreviewState | undefined {
    return this.previewSessions.get(sessionId);
  }

  updatePreviewValue(sessionId: string, key: string, value: unknown): void {
    const session = this.previewSessions.get(sessionId);
    if (session) {
      session.customizerValues[key] = value;
      session.lastUpdated = Date.now();
    }
  }

  setPreviewDevice(sessionId: string, device: PreviewDevice): void {
    const session = this.previewSessions.get(sessionId);
    if (session) {
      session.device = device;
      session.lastUpdated = Date.now();
    }
  }

  endPreviewSession(sessionId: string): void {
    this.previewSessions.delete(sessionId);
  }

  buildPreviewUrl(baseUrl: string, themeSlug: string, sessionId: string): string {
    const url = new URL(baseUrl);
    url.searchParams.set("theme_preview", themeSlug);
    url.searchParams.set("preview_session", sessionId);
    url.searchParams.set("preview_device", "desktop");
    return url.toString();
  }

  getDefaultPanels(): CustomizerPanel[] {
    return [
      {
        id: "site-identity",
        title: "Site Identity",
        priority: 1,
        sections: [
          {
            id: "logo",
            title: "Logo",
            fields: [
              { id: "custom_logo", label: "Logo", type: "image", description: "Upload your site logo" },
              { id: "site_title", label: "Site Title", type: "text", default: "NodePress" },
              { id: "tagline", label: "Tagline", type: "text", default: "A modern CMS" },
            ],
          },
        ],
      },
      {
        id: "colors",
        title: "Colors",
        priority: 2,
        sections: [
          {
            id: "base-colors",
            title: "Base Colors",
            fields: [
              { id: "background_color", label: "Background Color", type: "color", default: "#ffffff" },
              { id: "text_color", label: "Text Color", type: "color", default: "#1a1a1a" },
              { id: "link_color", label: "Link Color", type: "color", default: "#0066cc" },
              { id: "heading_color", label: "Heading Color", type: "color", default: "#000000" },
            ],
          },
          {
            id: "button-colors",
            title: "Button Colors",
            fields: [
              { id: "button_bg", label: "Button Background", type: "color", default: "#0066cc" },
              { id: "button_text", label: "Button Text", type: "color", default: "#ffffff" },
            ],
          },
        ],
      },
      {
        id: "layout",
        title: "Layout",
        priority: 3,
        sections: [
          {
            id: "content-width",
            title: "Content Width",
            fields: [
              { id: "content_size", label: "Content Size", type: "text", default: "840px" },
              { id: "wide_size", label: "Wide Size", type: "text", default: "1100px" },
            ],
          },
        ],
      },
      {
        id: "typography",
        title: "Typography",
        priority: 4,
        sections: [
          {
            id: "fonts",
            title: "Fonts",
            fields: [
              { id: "font_family", label: "Font Family", type: "text", default: "-apple-system, sans-serif" },
              { id: "font_size_base", label: "Base Font Size", type: "text", default: "16px" },
              { id: "line_height", label: "Line Height", type: "range", default: 1.6, min: 1, max: 3, step: 0.1 },
            ],
          },
        ],
      },
      {
        id: "background",
        title: "Background Image",
        priority: 5,
        sections: [
          {
            id: "background-image",
            title: "Background Image",
            fields: [
              { id: "background_image", label: "Image", type: "image" },
              { id: "background_repeat", label: "Repeat", type: "select", default: "no-repeat", options: [
                { label: "No Repeat", value: "no-repeat" },
                { label: "Repeat", value: "repeat" },
                { label: "Repeat X", value: "repeat-x" },
                { label: "Repeat Y", value: "repeat-y" },
              ]},
              { id: "background_position", label: "Position", type: "select", default: "center center", options: [
                { label: "Center", value: "center center" },
                { label: "Top", value: "top center" },
                { label: "Bottom", value: "bottom center" },
              ]},
              { id: "background_size", label: "Size", type: "select", default: "cover", options: [
                { label: "Cover", value: "cover" },
                { label: "Contain", value: "contain" },
                { label: "Auto", value: "auto" },
              ]},
            ],
          },
        ],
      },
    ];
  }
}
