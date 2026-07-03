/**
 * Hook system for plugins.
 * WordPress-inspired Actions & Filters pattern.
 */

export type HookCallback = (...args: unknown[]) => Promise<void> | void;

export interface HookEvent {
  type: "action" | "filter";
  name: string;
  timestamp: number;
  data?: unknown;
}

interface RegisteredHook {
  callback: HookCallback;
  priority: number;
}

export class HookRegistry {
  private actions: Map<string, RegisteredHook[]> = new Map();
  private filters: Map<string, Array<{ callback: (value: unknown, ...args: unknown[]) => unknown; priority: number }>> = new Map();

  /**
   * Register an action hook (add_action equivalent).
   */
  addAction(name: string, callback: HookCallback, priority: number = 10): void {
    if (!this.actions.has(name)) {
      this.actions.set(name, []);
    }
    this.actions.get(name)!.push({ callback, priority });
    this.actions.get(name)!.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Execute all registered action hooks (do_action equivalent).
   */
  async doAction(name: string, ...args: unknown[]): Promise<void> {
    const hooks = this.actions.get(name);
    if (!hooks) return;
    for (const hook of hooks) {
      await hook.callback(...args);
    }
  }

  /**
   * Register a filter hook (add_filter equivalent).
   */
  addFilter(name: string, callback: (value: unknown, ...args: unknown[]) => unknown, priority: number = 10): void {
    if (!this.filters.has(name)) {
      this.filters.set(name, []);
    }
    this.filters.get(name)!.push({ callback, priority });
    this.filters.get(name)!.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Apply all registered filter hooks (apply_filters equivalent).
   */
  async applyFilter<T>(name: string, value: T, ...args: unknown[]): Promise<T> {
    const hooks = this.filters.get(name);
    if (!hooks) return value;

    let result: unknown = value;
    for (const hook of hooks) {
      result = await hook.callback(result, ...args);
    }
    return result as T;
  }

  hasAction(name: string): boolean {
    return (this.actions.get(name)?.length ?? 0) > 0;
  }

  hasFilter(name: string): boolean {
    return (this.filters.get(name)?.length ?? 0) > 0;
  }

  removeAction(name: string, callback: HookCallback): void {
    const hooks = this.actions.get(name);
    if (!hooks) return;
    this.actions.set(name, hooks.filter(h => h.callback !== callback));
  }

  removeFilter(name: string, callback: (value: unknown, ...args: unknown[]) => unknown): void {
    const hooks = this.filters.get(name);
    if (!hooks) return;
    this.filters.set(name, hooks.filter(h => h.callback !== callback));
  }

  getActionNames(): string[] {
    return Array.from(this.actions.keys());
  }

  getFilterNames(): string[] {
    return Array.from(this.filters.keys());
  }
}
