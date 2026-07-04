export type { PermalinkTag, PermalinkParts, ParsedStructure } from './permalink-structure.js';
export type { PermalinkSettings, PermalinkStorage } from './permalink-manager.js';

export {
  parseStructure,
  generateUrl,
  matchUrl,
  isValidTag,
  getDefaultStructures,
  PERMALINK_TAGS,
} from './permalink-structure.js';

export { PermalinkManager, DEFAULT_SETTINGS } from './permalink-manager.js';

import { PermalinkManager } from './permalink-manager.js';
import type { PermalinkParts } from './permalink-structure.js';

export class PermalinkService {
  public readonly manager: PermalinkManager;

  constructor() {
    this.manager = new PermalinkManager();
    // TODO: Wire up PermalinkStorage (e.g. from ConfigService or database settings)
    // so that loadSettings() can persist and retrieve permalink structure.
    // Currently loadSettings() is a no-op because storage is null.
  }

  /**
   * Initialize permalink settings from storage.
   * Must be called after dependency injection sets up storage on the manager.
   */
  async initialize(): Promise<void> {
    await this.manager.loadSettings();
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
