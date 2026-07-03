/**
 * Hook system for the block editor.
 * Allows plugins to hook into editor lifecycle events.
 */

type HookCallback = (...args: unknown[]) => unknown;

class EditorHooks {
  private hooks = new Map<string, HookCallback[]>();

  addHook(name: string, callback: HookCallback): void {
    const existing = this.hooks.get(name) ?? [];
    existing.push(callback);
    this.hooks.set(name, existing);
  }

  removeHook(name: string, callback: HookCallback): void {
    const existing = this.hooks.get(name) ?? [];
    this.hooks.set(
      name,
      existing.filter((cb) => cb !== callback),
    );
  }

  applyHooks(name: string, ...args: unknown[]): unknown[] {
    const callbacks = this.hooks.get(name) ?? [];
    return callbacks.map((cb) => cb(...args));
  }

  async applyHooksAsync(name: string, ...args: unknown[]): Promise<unknown[]> {
    const callbacks = this.hooks.get(name) ?? [];
    const results: unknown[] = [];
    for (const cb of callbacks) {
      results.push(await cb(...args));
    }
    return results;
  }

  clearHooks(name?: string): void {
    if (name) {
      this.hooks.delete(name);
    } else {
      this.hooks.clear();
    }
  }

  hasHook(name: string): boolean {
    return (this.hooks.get(name)?.length ?? 0) > 0;
  }
}

export const editorHooks = new EditorHooks();

export const EditorHookNames = {
  BLOCK_INIT: "block:init",
  BLOCK_RENDER: "block:render",
  BLOCK_TRANSFORM: "block:transform",
  EDITOR_INIT: "editor:init",
  EDITOR_SAVE: "editor:save",
  INSERTER_SEARCH: "inserter:search",
  AFTER_INSERT: "block:afterInsert",
  BEFORE_DELETE: "block:beforeDelete",
  AFTER_UPDATE: "block:afterUpdate",
} as const;