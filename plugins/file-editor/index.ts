/**
 * File Editor Plugin for NodePress
 *
 * Provides:
 * - Monaco Editor for in-browser file editing
 * - Theme file editor (styles, templates, functions)
 * - Plugin file editor
 * - Syntax highlighting for TS/TSX/CSS/JSON/MD
 * - File tree browser
 * - Search & replace across files
 * - Git diff view
 * - Writable file validation
 */

import type { PluginLifecycle, PluginContext } from "@nodepress/plugin-sdk";

export const manifest = {
  slug: "file-editor",
  name: "File Editor",
  version: "0.0.1",
  description: "In-browser code editor for theme and plugin files",
  permissions: ["settings:read", "settings:write"],
};

export const lifecycle: PluginLifecycle = {
  async boot(context: PluginContext) {
    context.logger.log("File Editor plugin booted");
  },
};
