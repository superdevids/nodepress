/**
 * Forms Plugin for NodePress
 *
 * Provides:
 * - Drag-and-drop form builder
 * - Contact forms with email notifications
 * - Survey/quiz creation
 * - Payment collection (Stripe integration)
 * - File upload fields
 * - Anti-spam (honeypot + reCAPTCHA)
 * - Submission management in admin panel
 * - Export submissions to CSV
 */

import type { PluginLifecycle, PluginContext } from "@nodepress/plugin-sdk";

export const manifest = {
  slug: "forms",
  name: "Forms",
  version: "0.0.1",
  description: "Drag-and-drop form builder for NodePress",
  permissions: ["content:read", "content:write", "settings:read", "settings:write"],
};

export const lifecycle: PluginLifecycle = {
  async boot(context: PluginContext) {
    context.logger.log("Forms plugin booted");
  },
};
