import { z, type ZodSchema, type ZodType } from "zod";
import type { PrismaClient } from "@nodepress/db";
import { HookRegistry } from "./hook-registry.js";

export type SettingFieldType =
  | "text"
  | "number"
  | "boolean"
  | "select"
  | "multiselect"
  | "textarea"
  | "color"
  | "media";

export interface SettingRegistration {
  slug: string;
  key: string;
  type: SettingFieldType;
  label: string;
  section: string;
  schema: ZodSchema;
  default: unknown;
  sanitize?: (value: unknown) => unknown;
  options?: { label: string; value: string }[];
  placeholder?: string;
  instructions?: string;
  required?: boolean;
}

export class SettingsApi {
  private prisma: PrismaClient;
  private hooks: HookRegistry;
  private registrations = new Map<string, SettingRegistration>();

  constructor(prisma: PrismaClient, hooks: HookRegistry) {
    this.prisma = prisma;
    this.hooks = hooks;
  }

  registerSetting(slug: string, def: Omit<SettingRegistration, "slug">): void {
    const key = `${slug}.${def.key}`;
    if (this.registrations.has(key)) {
      throw new Error(`Setting "${key}" is already registered.`);
    }
    this.registrations.set(key, { ...def, slug });
  }

  unregisterSetting(slug: string, key: string): void {
    this.registrations.delete(`${slug}.${key}`);
  }

  getRegistrations(slug?: string): SettingRegistration[] {
    const all = Array.from(this.registrations.values());
    return slug ? all.filter((r) => r.slug === slug) : all;
  }

  async getSettings(slug: string): Promise<Record<string, unknown>> {
    const records = await this.prisma.setting.findMany({
      where: { pluginId: slug },
    });

    const result: Record<string, unknown> = {};
    const registrations = this.getRegistrations(slug);

    for (const reg of registrations) {
      const record = records.find((r) => r.key === reg.key);
      result[reg.key] = record !== undefined ? record.value : reg.default;
    }

    return result;
  }

  async updateSettings(slug: string, settings: Record<string, unknown>): Promise<Record<string, unknown>> {
    const registrations = this.getRegistrations(slug);
    const registryMap = new Map(registrations.map((r) => [r.key, r]));
    const validated: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(settings)) {
      const reg = registryMap.get(key);
      if (!reg) continue;

      let parsed: unknown = value;
      try {
        parsed = reg.schema.parse(value);
      } catch {
        continue;
      }

      if (reg.sanitize) {
        parsed = reg.sanitize(parsed);
      }

      validated[key] = parsed;

      await this.prisma.setting.upsert({
        where: {
          group_key: { group: slug, key },
        },
        create: {
          group: slug,
          key,
          value: parsed as never,
          pluginId: slug,
          autoload: true,
        },
        update: {
          value: parsed as never,
        },
      });
    }

    await this.hooks.doAction("plugin_settings_updated", slug, validated);

    return this.getSettings(slug);
  }

  buildSchema(slug: string): ZodType<Record<string, unknown>> {
    const registrations = this.getRegistrations(slug);
    const shape: Record<string, ZodSchema> = {};

    for (const reg of registrations) {
      shape[reg.key] = reg.schema;
    }

    return z.object(shape);
  }
}
