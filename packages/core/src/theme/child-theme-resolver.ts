import { existsSync } from "node:fs";

export interface ChildThemeManifest {
  name: string;
  template: string;
  version?: string;
  description?: string;
  author?: string;
  tags?: string[];
}

export interface ResolvedTemplatePath {
  source: "child" | "parent" | "default";
  path: string;
}

export class ChildThemeResolver {
  private manifests: Map<string, ChildThemeManifest> = new Map();

  constructor() {
  }

  registerChildTheme(slug: string, manifest: ChildThemeManifest): void {
    if (this.manifests.has(slug)) {
      throw new Error(`Child theme "${slug}" is already registered.`);
    }
    this.manifests.set(slug, manifest);
  }

  getManifest(slug: string): ChildThemeManifest | undefined {
    return this.manifests.get(slug);
  }

  getAllChildThemes(): ChildThemeManifest[] {
    return Array.from(this.manifests.values());
  }

  getTemplatePath(themeSlug: string, templateType: string, _extensions: string[] = ["tsx", "ts"]): ResolvedTemplatePath {
    const manifest = this.manifests.get(themeSlug);
    if (!manifest) {
      return { source: "default", path: `themes/default/${templateType}.tsx` };
    }

    for (const ext of _extensions) {
      if (existsSync(`themes/${themeSlug}/${templateType}.${ext}`)) {
        return { source: "child", path: `themes/${themeSlug}/${templateType}.${ext}` };
      }
    }

    if (manifest.template) {
      for (const ext of _extensions) {
        if (existsSync(`themes/${manifest.template}/${templateType}.${ext}`)) {
          return { source: "parent", path: `themes/${manifest.template}/${templateType}.${ext}` };
        }
      }
    }

    return { source: "default", path: `themes/default/${templateType}.tsx` };
  }

  async mergeParentUpdate(childSlug: string, updatedParentFiles: string[]): Promise<{ merged: string[]; skipped: string[] }> {
    const manifest = this.manifests.get(childSlug);
    if (!manifest) {
      throw new Error(`Child theme "${childSlug}" not found.`);
    }

    const merged: string[] = [];
    const skipped: string[] = [];

    for (const filePath of updatedParentFiles) {
      const childFilePath = filePath.replace(`themes/${manifest.template}/`, `themes/${childSlug}/`);
      const childExists = existsSync(childFilePath);

      if (!childExists) {
        merged.push(filePath);
      } else {
        skipped.push(filePath);
      }
    }

    return { merged, skipped };
  }

  async getTemplateChain(themeSlug: string): Promise<string[]> {
    const chain: string[] = [themeSlug];
    const manifest = this.manifests.get(themeSlug);
    if (manifest?.template) {
      chain.push(manifest.template);
      const parentManifest = this.manifests.get(manifest.template);
      if (parentManifest?.template) {
        chain.push(parentManifest.template);
      }
    }
    chain.push("default");
    return chain;
  }
}

export function generateChildThemeConfig(parentSlug: string, childName: string): string {
  return JSON.stringify(
    {
      name: childName,
      template: parentSlug,
      version: "1.0.0",
      description: `Child theme of ${parentSlug}`,
    },
    null,
    2,
  );
}
