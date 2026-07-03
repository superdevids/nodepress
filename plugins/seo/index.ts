/**
 * SEO Plugin for NodePress
 *
 * Provides:
 * - Meta title & description fields
 * - Open Graph & Twitter Card support
 * - XML Sitemap generation
 * - Schema.org structured data
 * - robots.txt customization
 * - Redirect management
 * - Breadcrumb generation
 */

import type { PluginLifecycle, PluginContext } from "@nodepress/plugin-sdk";

export const manifest = {
  slug: "seo",
  name: "SEO",
  version: "0.0.1",
  description: "Advanced SEO tools for NodePress",
  permissions: ["content:read", "content:write", "settings:read", "settings:write"],
};

export const lifecycle: PluginLifecycle = {
  async boot(context: PluginContext) {
    context.logger.log("SEO plugin booted");
  },
};
