import { Injectable } from '@nestjs/common';

export interface AdminMenuItem {
  slug: string;
  label: string;
  icon?: string;
  position: number;
  submenu?: AdminSubMenuItem[];
}

export interface AdminSubMenuItem {
  slug: string;
  label: string;
}

export const ADMIN_MENU: AdminMenuItem[] = [
  { slug: 'dashboard', label: 'Dashboard', icon: 'dashboard', position: 1 },
  {
    slug: 'content',
    label: 'Content',
    icon: 'file-text',
    position: 2,
    submenu: [
      { slug: 'content/post', label: 'Posts' },
      { slug: 'content/page', label: 'Pages' },
      { slug: 'content/media', label: 'Media' },
      { slug: 'content/categories', label: 'Categories' },
      { slug: 'content/tags', label: 'Tags' },
    ],
  },
  { slug: 'comments', label: 'Comments', icon: 'message-square', position: 3 },
  {
    slug: 'appearance',
    label: 'Appearance',
    icon: 'palette',
    position: 4,
    submenu: [
      { slug: 'themes', label: 'Themes' },
      { slug: 'customize', label: 'Customize' },
      { slug: 'widgets', label: 'Widgets' },
      { slug: 'menus', label: 'Menus' },
    ],
  },
  { slug: 'plugins', label: 'Plugins', icon: 'plug', position: 5 },
  { slug: 'users', label: 'Users', icon: 'users', position: 6 },
  {
    slug: 'tools',
    label: 'Tools',
    icon: 'wrench',
    position: 7,
    submenu: [
      { slug: 'tools/import', label: 'Import' },
      { slug: 'tools/export', label: 'Export' },
      { slug: 'tools/health', label: 'Site Health' },
      { slug: 'tools/database', label: 'Database' },
    ],
  },
  {
    slug: 'settings',
    label: 'Settings',
    icon: 'settings',
    position: 8,
    submenu: [
      { slug: 'settings/general', label: 'General' },
      { slug: 'settings/reading', label: 'Reading' },
      { slug: 'settings/permalink', label: 'Permalinks' },
      { slug: 'settings/seo', label: 'SEO' },
      { slug: 'settings/security', label: 'Security' },
    ],
  },
];

@Injectable()
export class AdminMenuService {
  private menuItems: AdminMenuItem[] = [...ADMIN_MENU];

  getMenu(): AdminMenuItem[] {
    return [...this.menuItems].sort((a, b) => a.position - b.position);
  }

  addMenuItem(item: AdminMenuItem): void {
    const existing = this.menuItems.findIndex((m) => m.slug === item.slug);
    if (existing >= 0) {
      this.menuItems[existing] = item;
    } else {
      this.menuItems.push(item);
    }
  }

  removeMenuItem(slug: string): void {
    this.menuItems = this.menuItems.filter((m) => m.slug !== slug);
  }

  addSubMenuItem(parentSlug: string, item: AdminSubMenuItem): void {
    const parent = this.menuItems.find((m) => m.slug === parentSlug);
    if (parent) {
      if (!parent.submenu) parent.submenu = [];
      const existing = parent.submenu.findIndex((s) => s.slug === item.slug);
      if (existing >= 0) {
        parent.submenu[existing] = item;
      } else {
        parent.submenu.push(item);
      }
    }
  }

  removeSubMenuItem(parentSlug: string, subSlug: string): void {
    const parent = this.menuItems.find((m) => m.slug === parentSlug);
    if (parent?.submenu) {
      parent.submenu = parent.submenu.filter((s) => s.slug !== subSlug);
    }
  }
}
