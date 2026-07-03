import type { PrismaClient } from "@nodepressjs/db";

export interface PluginCapability {
  slug: string;
  name: string;
  label?: string;
  description?: string;
  defaultRoles: string[];
}

type CapabilityCheck = (capability: string, userId: string) => boolean | Promise<boolean>;

export class CapabilityRegistrar {
  private prisma: PrismaClient;
  private capabilities = new Map<string, PluginCapability>();
  private checkHooks: CapabilityCheck[] = [];

  constructor(prisma: PrismaClient, _hooks?: unknown) {
    this.prisma = prisma;
  }

  registerCapability(slug: string, def: Omit<PluginCapability, "slug">): void {
    const key = `${slug}:${def.name}`;
    if (this.capabilities.has(key)) {
      throw new Error(`Capability "${key}" is already registered.`);
    }
    this.capabilities.set(key, { ...def, slug });

    for (const roleName of def.defaultRoles) {
      const role = roleName.toUpperCase() as
        | "SUPER_ADMIN"
        | "ADMIN"
        | "EDITOR"
        | "AUTHOR"
        | "CONTRIBUTOR"
        | "SUBSCRIBER";
      this.addCapabilityToRole(role, def.name).catch((err) => {
        console.error(`[CapabilityRegistrar] Failed to add capability to role ${roleName}:`, err);
      });
    }
  }

  unregisterCapability(slug: string, name: string): void {
    this.capabilities.delete(`${slug}:${name}`);
  }

  getCapabilities(slug?: string): PluginCapability[] {
    const all = Array.from(this.capabilities.values());
    return slug ? all.filter((c) => c.slug === slug) : all;
  }

  addCapabilityCheck(check: CapabilityCheck): void {
    this.checkHooks.push(check);
  }

  async check(capability: string, userId: string): Promise<boolean> {
    for (const check of this.checkHooks) {
      const result = await check(capability, userId);
      if (!result) return false;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, capabilities: true },
    });

    if (!user) return false;

    if (user.role === "SUPER_ADMIN") return true;
    if (user.capabilities.includes(capability)) return true;

    const roleCapMap: Record<string, string[]> = {
      ADMIN: ["*"],
      EDITOR: [],
      AUTHOR: [],
      CONTRIBUTOR: [],
      SUBSCRIBER: [],
    };

    const roleCap = roleCapMap[user.role];
    if (roleCap?.includes("*")) return true;
    if (roleCap?.includes(capability)) return true;

    return false;
  }

  private async addCapabilityToRole(
    role: "SUPER_ADMIN" | "ADMIN" | "EDITOR" | "AUTHOR" | "CONTRIBUTOR" | "SUBSCRIBER",
    capability: string
  ): Promise<void> {
    await this.prisma.$executeRawUnsafe(
      `UPDATE users SET capabilities = array_append(capabilities, $1)
       WHERE role = $2::role AND NOT ($1 = ANY(capabilities))`,
      capability,
      role
    );
  }
}
