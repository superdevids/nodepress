/**
 * NodePress-inspired Actions & Filters hook system.
 *
 * Actions — for side effects (do_action / add_action)
 * Filters — for modifying data (apply_filters / add_filter)
 */

export type HookCallback = (...args: unknown[]) => Promise<void> | void;
type ActionCallback = HookCallback;
type FilterCallback<T = unknown> = (value: T, ...args: unknown[]) => T | Promise<T>;

export interface HookEvent {
  type: 'action' | 'filter';
  name: string;
  timestamp: number;
  data?: unknown;
}

export class HookRegistry {
  private actions: Map<string, Set<{ callback: ActionCallback; priority: number }>> = new Map();
  private filters: Map<string, Set<{ callback: FilterCallback; priority: number }>> = new Map();

  // ─── Actions ─────────────────────────────────────────────

  /**
   * Register an action hook (add_action equivalent).
   */
  addAction(name: string, callback: ActionCallback, priority: number = 10): void {
    if (!this.actions.has(name)) {
      this.actions.set(name, new Set());
    }
    this.actions.get(name)!.add({ callback, priority });
  }

  /**
   * Remove an action hook.
   */
  removeAction(name: string, callback: ActionCallback): void {
    const hooks = this.actions.get(name);
    if (!hooks) return;
    for (const hook of hooks) {
      if (hook.callback === callback) {
        hooks.delete(hook);
        break;
      }
    }
  }

  /**
   * Execute all registered action hooks (do_action equivalent).
   */
  async doAction(name: string, ...args: unknown[]): Promise<void> {
    const hooks = this.actions.get(name);
    if (!hooks) return;

    const sorted = Array.from(hooks).sort((a, b) => a.priority - b.priority);
    for (const hook of sorted) {
      await hook.callback(...args);
    }
  }

  // ─── Filters ─────────────────────────────────────────────

  /**
   * Register a filter hook (add_filter equivalent).
   */
  addFilter<T>(name: string, callback: FilterCallback<T>, priority: number = 10): void {
    if (!this.filters.has(name)) {
      this.filters.set(name, new Set());
    }
    this.filters.get(name)!.add({ callback: callback as FilterCallback, priority });
  }

  /**
   * Remove a filter hook.
   */
  removeFilter<T>(name: string, callback: FilterCallback<T>): void {
    const hooks = this.filters.get(name);
    if (!hooks) return;
    for (const hook of hooks) {
      if (hook.callback === callback) {
        hooks.delete(hook);
        break;
      }
    }
  }

  /**
   * Apply all registered filter hooks (apply_filters equivalent).
   */
  async applyFilter<T>(name: string, value: T, ...args: unknown[]): Promise<T> {
    const hooks = this.filters.get(name);
    if (!hooks) return value;

    const sorted = Array.from(hooks).sort((a, b) => a.priority - b.priority);
    let result = value;
    for (const hook of sorted) {
      result = await (hook.callback as FilterCallback<T>)(result, ...args);
    }
    return result;
  }

  /**
   * Check if a hook has registered callbacks.
   */
  hasAction(name: string): boolean {
    return (this.actions.get(name)?.size ?? 0) > 0;
  }

  hasFilter(name: string): boolean {
    return (this.filters.get(name)?.size ?? 0) > 0;
  }

  /**
   * Get all registered action names.
   */
  getActionNames(): string[] {
    return Array.from(this.actions.keys());
  }

  /**
   * Get all registered filter names.
   */
  getFilterNames(): string[] {
    return Array.from(this.filters.keys());
  }
}
