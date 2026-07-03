/**
 * WordPress-inspired capability-based authorization system.
 *
 * Each capability is a granular string like "content:product:create".
 * Roles are collections of capabilities with optional hierarchical inheritance.
 */

export type Capability = string;

export interface RoleDefinition {
  name: string;
  capabilities: Set<Capability>;
  inherits?: string[];
}

const DEFAULT_ROLES: Record<string, RoleDefinition> = {
  SUPER_ADMIN: {
    name: "Super Admin",
    capabilities: new Set(["*"]), // Wildcard — full access
  },
  ADMIN: {
    name: "Admin",
    capabilities: new Set([
      "content:*",
      "media:*",
      "users:*",
      "plugins:*",
      "themes:*",
      "settings:*",
      "tools:*",
    ]),
  },
  EDITOR: {
    name: "Editor",
    capabilities: new Set([
      "content:*",
      "content:publish",
      "content:edit:others",
      "content:delete:others",
      "media:upload",
      "media:edit",
      "comments:*",
    ]),
  },
  AUTHOR: {
    name: "Author",
    capabilities: new Set([
      "content:create",
      "content:publish:own",
      "content:edit:own",
      "content:delete:own",
      "media:upload",
    ]),
  },
  CONTRIBUTOR: {
    name: "Contributor",
    capabilities: new Set([
      "content:create",
      "content:edit:own",
    ]),
  },
  SUBSCRIBER: {
    name: "Subscriber",
    capabilities: new Set([
      "content:read",
    ]),
  },
};

export class CapabilityService {
  private roles: Map<string, RoleDefinition> = new Map();

  constructor() {
    // Load default roles
    for (const [name, def] of Object.entries(DEFAULT_ROLES)) {
      this.roles.set(name, def);
    }
  }

  /**
   * Register or update a role definition.
   */
  registerRole(name: string, def: RoleDefinition): void {
    this.roles.set(name, def);
  }

  /**
   * Check if a user (by role) has a specific capability.
   * Supports wildcard matching:
   * - "content:*" matches "content:post:create"
   * - "*" matches everything
   */
  userCan(role: string, capability: Capability, userCapabilities: string[] = []): boolean {
    // Check the specific role
    const roleDef = this.roles.get(role);
    if (!roleDef) return false;

    // Check user-specific capabilities (overrides)
    for (const uc of userCapabilities) {
      if (this.matchCapability(uc, capability)) return true;
    }

    // Check role capabilities
    for (const rc of roleDef.capabilities) {
      if (this.matchCapability(rc, capability)) return true;
    }

    // Check inherited roles
    if (roleDef.inherits) {
      for (const inheritRole of roleDef.inherits) {
        if (this.userCan(inheritRole, capability, userCapabilities)) return true;
      }
    }

    return false;
  }

  /**
   * Match a pattern capability against a target capability.
   */
  private matchCapability(pattern: Capability, target: Capability): boolean {
    if (pattern === "*") return true;

    const patternParts = pattern.split(":");
    const targetParts = target.split(":");

    if (patternParts.length > targetParts.length) return false;

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i] === "*") return true;
      if (patternParts[i] !== targetParts[i]) return false;
    }

    return patternParts.length === targetParts.length;
  }

  /**
   * Get all registered roles.
   */
  getRoles(): Map<string, RoleDefinition> {
    return new Map(this.roles);
  }
}
