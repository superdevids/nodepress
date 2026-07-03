export interface WidgetArea {
  id: string;
  name: string;
  description: string;
  blocks: WidgetBlock[];
}

export interface WidgetBlock {
  id: string;
  type: string;
  settings: Record<string, unknown>;
}

export class WidgetAreaManager {
  private areas: Map<string, WidgetArea> = new Map();

  register(id: string, name: string, description = ''): void {
    this.areas.set(id, { id, name, description, blocks: [] });
  }

  get(id: string): WidgetArea | undefined {
    return this.areas.get(id);
  }

  getAll(): WidgetArea[] {
    return Array.from(this.areas.values());
  }

  addBlock(areaId: string, block: WidgetBlock): void {
    const area = this.areas.get(areaId);
    if (area) area.blocks.push(block);
  }

  removeBlock(areaId: string, blockId: string): void {
    const area = this.areas.get(areaId);
    if (area) {
      area.blocks = area.blocks.filter((b) => b.id !== blockId);
    }
  }

  render(areaId: string): string {
    const area = this.areas.get(areaId);
    if (!area) return '';
    return area.blocks
      .map(
        (block) =>
          `<div class="widget widget-${block.type}">${JSON.stringify(block.settings)}</div>`,
      )
      .join('\n');
  }
}

export const widgetAreaManager = new WidgetAreaManager();

widgetAreaManager.register('sidebar', 'Sidebar', 'Main sidebar widget area');
widgetAreaManager.register('footer-1', 'Footer Column 1', 'First footer widget column');
widgetAreaManager.register('footer-2', 'Footer Column 2', 'Second footer widget column');
widgetAreaManager.register('footer-3', 'Footer Column 3', 'Third footer widget column');
widgetAreaManager.register('header', 'Header', 'Header widget area (above content)');
