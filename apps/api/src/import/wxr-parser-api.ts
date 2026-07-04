/**
 * WXR Parser API Wrapper
 *
 * Wraps the shared WXR parser from scripts/lib for use in the NestJS API.
 * The API service delegates to this wrapper to parse WordPress export files.
 */

const {
  parseWxr,
  validateWxrFile,
  slugify,
  convertShortcodes,
  STATUS_MAP,
  TYPE_MAP,
} = require('../../../scripts/lib/wxr-parser');

/**
 * WXR Parser class for the NestJS API context.
 * This mirrors the scripts/lib/wxr-parser.js functionality but
 * is importable as a NestJS-friendly module.
 */
export class WxrParser {
  /**
   * Parse a WXR file and return structured data
   */
  parse(filePath: string): any {
    return parseWxr(filePath);
  }

  /**
   * Validate a WXR file
   */
  validate(filePath: string): { valid: boolean; errors: string[] } {
    return validateWxrFile(filePath);
  }

  /**
   * Convert WordPress shortcodes to NodePress format
   */
  convertShortcodes(content: string): string {
    return convertShortcodes(content);
  }

  /**
   * Slugify a string
   */
  slugify(str: string): string {
    return slugify(str);
  }
}
