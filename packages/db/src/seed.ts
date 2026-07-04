/**
 * Database seeder — creates initial data for development.
 *
 * Usage: pnpm --filter @nodepress/db db:seed
 */

import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Create default content types ──────────────────────
  const postType = await prisma.contentType.upsert({
    where: { name: 'post' },
    update: {},
    create: {
      name: 'post',
      label: { singular: 'Post', plural: 'Posts' },
      fields: {
        title: { type: 'text', label: 'Title', required: true },
        body: { type: 'richtext', label: 'Content' },
        excerpt: { type: 'text', label: 'Excerpt' },
      },
      supports: ['revisions', 'seo', 'comments'],
      source: 'CODE',
    },
  });

  const pageType = await prisma.contentType.upsert({
    where: { name: 'page' },
    update: {},
    create: {
      name: 'page',
      label: { singular: 'Page', plural: 'Pages' },
      fields: {
        title: { type: 'text', label: 'Title', required: true },
        body: { type: 'richtext', label: 'Content' },
      },
      supports: ['revisions', 'seo'],
      source: 'CODE',
    },
  });

  console.log(`  ✓ Content types: ${postType.name}, ${pageType.name}`);

  // ─── Create default taxonomies ─────────────────────────
  const category = await prisma.taxonomy.upsert({
    where: { name: 'category' },
    update: {},
    create: { name: 'category', hierarchical: true },
  });

  const tag = await prisma.taxonomy.upsert({
    where: { name: 'tag' },
    update: {},
    create: { name: 'tag', hierarchical: false },
  });

  console.log(`  ✓ Taxonomies: ${category.name}, ${tag.name}`);

  // ─── Create default terms ──────────────────────────────
  const uncategorized = await prisma.term.upsert({
    where: { taxonomyId_slug: { taxonomyId: category.id, slug: 'uncategorized' } },
    update: {},
    create: {
      taxonomyId: category.id,
      name: 'Uncategorized',
      slug: 'uncategorized',
      description: 'Default category for uncategorized posts.',
    },
  });

  console.log(`  ✓ Terms: ${uncategorized.name}`);

  // ─── Create admin user ─────────────────────────────────
  const passwordHash = await bcrypt.hash('admin', 12);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@nodepress.dev' },
    update: {},
    create: {
      email: 'admin@nodepress.dev',
      passwordHash,
      name: 'Admin',
      displayName: 'Admin',
      role: Role.SUPER_ADMIN,
    },
  });

  console.log(`  ✓ Admin user: ${adminUser.email} (password: admin)`);

  // ─── Create default menus ──────────────────────────────
  const primaryMenu = await prisma.menu.upsert({
    where: { location: 'primary' },
    update: {},
    create: { location: 'primary' },
  });

  const footerMenu = await prisma.menu.upsert({
    where: { location: 'footer' },
    update: {},
    create: { location: 'footer' },
  });

  console.log(`  ✓ Menus: ${primaryMenu.location}, ${footerMenu.location}`);

  // ─── Create default settings ───────────────────────────
  const settings = [
    { group: 'general', key: 'site_title', value: 'NodePress', autoload: true },
    { group: 'general', key: 'tagline', value: 'Modern CMS built with Node.js', autoload: true },
    { group: 'general', key: 'site_url', value: 'http://localhost:3000', autoload: true },
    { group: 'general', key: 'admin_email', value: 'admin@nodepress.dev', autoload: true },
    { group: 'reading', key: 'posts_per_page', value: 10, autoload: true },
    { group: 'reading', key: 'page_for_posts', value: null, autoload: true },
    { group: 'discussion', key: 'default_comment_status', value: 'open', autoload: true },
    {
      group: 'permalinks',
      key: 'structure',
      value: '/%year%/%monthnum%/%postname%/',
      autoload: true,
    },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { group_key: { group: setting.group, key: setting.key } },
      update: { value: setting.value },
      create: setting,
    });
  }

  console.log(`  ✓ Settings: ${settings.length} defaults`);

  console.log('\n✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
