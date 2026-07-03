export type { PermalinkTag, PermalinkParts, ParsedStructure } from "./permalink-structure.js";
export type { PermalinkSettings, PermalinkStorage } from "./permalink-manager.js";

export {
  parseStructure,
  generateUrl,
  matchUrl,
  isValidTag,
  getDefaultStructures,
  PERMALINK_TAGS,
} from "./permalink-structure.js";

export {
  PermalinkManager,
  DEFAULT_SETTINGS,
} from "./permalink-manager.js";

import { PermalinkManager } from "./permalink-manager.js";
import type { PermalinkParts } from "./permalink-structure.js";

export class PermalinkService {
  public readonly manager: PermalinkManager;

  constructor() {
    this.manager = new PermalinkManager();
  }

  setStructure(pattern: string): void {
    this.manager.saveSettings({ structure: pattern });
  }

  getStructure() {
    return this.manager.getParsedStructure();
  }

  generate(parts: PermalinkParts): string {
    return this.manager.generate(parts);
  }

  static getDefaults() {
    return new PermalinkManager().getDefaults();
  }
}
