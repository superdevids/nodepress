export interface DependencySpec {
  plugin: string;
  version: string;
}

export interface DependencyResolution {
  order: string[];
  missing: string[];
  circular: string[];
}

interface Node {
  slug: string;
  version: string;
  deps: Map<string, string>;
}

function parseSemver(v: string): { major: number; minor: number; patch: number; pre: string[] } {
  const cleaned = v.replace(/^[~^>=<]*/, "");
  const [verRaw, ...pre] = cleaned.split("-");
  const ver = verRaw ?? "0.0.0";
  const parts = ver.split(".").map(Number);
  return {
    major: parts[0] ?? 0,
    minor: parts[1] ?? 0,
    patch: parts[2] ?? 0,
    pre: pre.length ? pre.join("-").split(".") : [],
  };
}

function satisfies(version: string, range: string): boolean {
  const v = parseSemver(version);
  const trimmed = range.trim();

  if (trimmed.startsWith(">=")) {
    const min = parseSemver(trimmed.slice(2));
    return cmpGte(v, min);
  }
  if (trimmed.startsWith("<=")) {
    const max = parseSemver(trimmed.slice(2));
    return cmpLte(v, max);
  }
  if (trimmed.startsWith(">")) {
    const min = parseSemver(trimmed.slice(1));
    return cmpGt(v, min);
  }
  if (trimmed.startsWith("<")) {
    const max = parseSemver(trimmed.slice(1));
    return cmpLt(v, max);
  }
  if (trimmed.startsWith("^")) {
    const base = parseSemver(trimmed.slice(1));
    return (
      v.major === base.major &&
      (v.minor > base.minor || (v.minor === base.minor && v.patch >= base.patch))
    );
  }
  if (trimmed.startsWith("~")) {
    const base = parseSemver(trimmed.slice(1));
    return (
      v.major === base.major &&
      v.minor === base.minor &&
      v.patch >= base.patch
    );
  }
  const exact = parseSemver(trimmed);
  return v.major === exact.major && v.minor === exact.minor && v.patch === exact.patch;
}

function cmpGte(a: { major: number; minor: number; patch: number }, b: { major: number; minor: number; patch: number }): boolean {
  if (a.major !== b.major) return a.major > b.major;
  if (a.minor !== b.minor) return a.minor > b.minor;
  return a.patch >= b.patch;
}

function cmpLte(a: { major: number; minor: number; patch: number }, b: { major: number; minor: number; patch: number }): boolean {
  if (a.major !== b.major) return a.major < b.major;
  if (a.minor !== b.minor) return a.minor < b.minor;
  return a.patch <= b.patch;
}

function cmpGt(a: { major: number; minor: number; patch: number }, b: { major: number; minor: number; patch: number }): boolean {
  if (a.major !== b.major) return a.major > b.major;
  if (a.minor !== b.minor) return a.minor > b.minor;
  return a.patch > b.patch;
}

function cmpLt(a: { major: number; minor: number; patch: number }, b: { major: number; minor: number; patch: number }): boolean {
  if (a.major !== b.major) return a.major < b.major;
  if (a.minor !== b.minor) return a.minor < b.minor;
  return a.patch < b.patch;
}

export class DependencyResolver {
  private nodes = new Map<string, Node>();

  registerPlugin(slug: string, version: string, dependencies: DependencySpec[]): void {
    const node: Node = { slug, version, deps: new Map() };
    for (const dep of dependencies) {
      node.deps.set(dep.plugin, dep.version);
    }
    this.nodes.set(slug, node);
  }

  unregisterPlugin(slug: string): void {
    this.nodes.delete(slug);
  }

  resolve(slug: string): DependencyResolution {
    const visited = new Set<string>();
    const inStack = new Set<string>();
    const order: string[] = [];
    const missing: string[] = [];
    const circular: string[] = [];

    const node = this.nodes.get(slug);
    if (!node) {
      return { order: [], missing: [slug], circular: [] };
    }

    this.dfs(slug, visited, inStack, order, circular);

    for (const s of order) {
      const n = this.nodes.get(s);
      if (!n) continue;
      for (const [depName, depVersion] of n.deps) {
        const depNode = this.nodes.get(depName);
        if (!depNode) {
          if (!missing.includes(depName)) missing.push(depName);
          continue;
        }
        if (!satisfies(depNode.version, depVersion)) {
          if (!missing.includes(`${depName}@${depVersion}`)) missing.push(`${depName}@${depVersion}`);
        }
      }
    }

    return { order, missing, circular };
  }

  getActivationOrder(slugs: string[]): string[] {
    const all: string[] = [];
    const seen = new Set<string>();
    const inStack = new Set<string>();
    const dummyCirc: string[] = [];

    for (const slug of slugs) {
      if (!seen.has(slug) && this.nodes.has(slug)) {
        this.dfs(slug, seen, inStack, all, dummyCirc);
      }
    }
    return all;
  }

  private dfs(
    slug: string,
    visited: Set<string>,
    inStack: Set<string>,
    order: string[],
    circular: string[]
  ): void {
    if (inStack.has(slug)) {
      if (!circular.includes(slug)) circular.push(slug);
      return;
    }
    if (visited.has(slug)) return;

    visited.add(slug);
    inStack.add(slug);

    const node = this.nodes.get(slug);
    if (node) {
      for (const depName of node.deps.keys()) {
        const depNode = this.nodes.get(depName);
        if (depNode) {
          this.dfs(depName, visited, inStack, order, circular);
        }
      }
    }

    inStack.delete(slug);
    order.push(slug);
  }
}
