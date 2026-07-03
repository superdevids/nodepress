export interface StickyPostEntry {
  id: string;
  title: string;
  stickyOrder?: number;
}

export class StickyPosts {
  private stickyIds: Set<string> = new Set();
  private maxSticky: number;

  constructor(maxSticky: number = 5) {
    this.maxSticky = maxSticky;
  }

  setMaxSticky(max: number): void {
    this.maxSticky = max;
  }

  getMaxSticky(): number {
    return this.maxSticky;
  }

  add(entryId: string): void {
    if (this.stickyIds.size >= this.maxSticky) {
      throw new Error(`Maximum sticky posts limit (${this.maxSticky}) reached`);
    }
    this.stickyIds.add(entryId);
  }

  remove(entryId: string): void {
    this.stickyIds.delete(entryId);
  }

  isSticky(entryId: string): boolean {
    return this.stickyIds.has(entryId);
  }

  getAll(): string[] {
    return Array.from(this.stickyIds);
  }

  clear(): void {
    this.stickyIds.clear();
  }

  getCount(): number {
    return this.stickyIds.size;
  }

  sortStickyFirst<T extends { id: string }>(entries: T[]): T[] {
    const sticky: T[] = [];
    const normal: T[] = [];

    for (const entry of entries) {
      if (this.stickyIds.has(entry.id)) {
        sticky.push(entry);
      } else {
        normal.push(entry);
      }
    }

    return [...sticky, ...normal];
  }

  toFilter(): { isSticky: boolean } | {} {
    if (this.stickyIds.size === 0) return {};
    return { isSticky: true };
  }
}
