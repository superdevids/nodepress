/**
 * Comments Plugin for NodePress
 *
 * Provides:
 * - Threaded comments with nesting
 * - Moderation workflow (pending → approved/spam/trash)
 * - Akismet anti-spam integration
 * - Gravatar support
 * - Comment notifications
 * - Comment rating (karma)
 */

import type { PluginLifecycle, PluginContext } from "@nodepress/plugin-sdk";

export const manifest = {
  slug: "comments",
  name: "Comments",
  version: "0.0.1",
  description: "Full comment system for NodePress",
  permissions: ["content:read", "content:write", "settings:read", "settings:write"],
};

export const lifecycle: PluginLifecycle = {
  async boot(context: PluginContext) {
    context.logger.log("Comments plugin booted");
  },
};
