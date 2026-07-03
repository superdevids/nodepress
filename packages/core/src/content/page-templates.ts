import type { ThemeEngine } from "../theme/theme-engine.js";

export interface PageTemplate {
  name: string;
  label: string;
  description?: string;
  render: (data: PageTemplateData) => string | Promise<string>;
}

export interface PageTemplateData {
  entry: Record<string, unknown>;
  theme: string;
  context: Record<string, unknown>;
}

export class PageTemplateRegistry {
  private templates: Map<string, PageTemplate> = new Map();

  register(template: PageTemplate): void {
    if (this.templates.has(template.name)) {
      throw new Error(`Page template "${template.name}" is already registered.`);
    }
    this.templates.set(template.name, template);
  }

  unregister(name: string): void {
    this.templates.delete(name);
  }

  get(name: string): PageTemplate | undefined {
    return this.templates.get(name);
  }

  getAll(): PageTemplate[] {
    return Array.from(this.templates.values());
  }

  has(name: string): boolean {
    return this.templates.has(name);
  }

  resolve(entry: Record<string, unknown>): PageTemplate | undefined {
    const templateName = entry["template"] as string | undefined;
    if (!templateName) return undefined;
    return this.templates.get(templateName);
  }

  async render(entry: Record<string, unknown>, data: PageTemplateData): Promise<string> {
    const template = this.resolve(entry);
    if (!template) {
      return this.renderDefault(data);
    }

    return template.render({
      ...data,
      entry,
    });
  }

  private renderDefault(data: PageTemplateData): string {
    const entry = data.entry;
    return `<div class="page-template-default"><article>${JSON.stringify(entry)}</article></div>`;
  }
}

export class PageTemplateResolver {
  private registry: PageTemplateRegistry;
  private themeEngine: ThemeEngine | null;

  constructor(registry: PageTemplateRegistry, themeEngine?: ThemeEngine) {
    this.registry = registry;
    this.themeEngine = themeEngine ?? null;
  }

  setThemeEngine(engine: ThemeEngine): void {
    this.themeEngine = engine;
  }

  resolveTemplate(entry: Record<string, unknown>): PageTemplate | undefined {
    const customTemplate = this.registry.resolve(entry);
    if (customTemplate) return customTemplate;

    const type = (entry["type"] as string) ?? "page";
    const slug = (entry["slug"] as string) ?? "";
    const format = (entry["postFormat"] as string) ?? "";

    if (this.themeEngine) {
      const hierarchy = this.themeEngine.resolveTemplateHierarchy(
        type === "post" ? "single" : "page",
        slug,
        format,
      );
    }

    return this.registry.get("default");
  }

  async renderEntry(entry: Record<string, unknown>, context: Record<string, unknown> = {}): Promise<string> {
    const template = this.resolveTemplate(entry);
    if (!template) {
      return `<div class="entry-content">${JSON.stringify(entry)}</div>`;
    }

    const theme = this.themeEngine?.getActiveTheme();
    return template.render({
      entry,
      theme: theme?.slug ?? "default",
      context,
    });
  }
}
