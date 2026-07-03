import { getDatabaseUrl, getBackupDir } from './config.js';
import { createSpinner, success, error } from './logger.js';
import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// ─── Database Connection ────────────────────────────────────────────────────

let prismaClient: any = null;

export async function getPrismaClient(): Promise<any> {
  if (prismaClient) return prismaClient;

  try {
    const { PrismaClient } = await import('@nodepressjs/db');
    prismaClient = new PrismaClient({
      datasources: { db: { url: getDatabaseUrl() } },
    });
    await prismaClient.$connect();
    return prismaClient;
  } catch {
    // Fallback — try importing prisma client directly
    try {
      const { PrismaClient } = await import('@prisma/client');
      prismaClient = new PrismaClient({
        datasources: { db: { url: getDatabaseUrl() } },
      });
      await prismaClient.$connect();
      return prismaClient;
    } catch (err) {
      throw new Error(
        `Cannot connect to database at ${getDatabaseUrl()}. Make sure the database is running and @nodepressjs/db is installed.`,
      );
    }
  }
}

export async function disconnectPrisma(): Promise<void> {
  if (prismaClient) {
    await prismaClient.$disconnect();
    prismaClient = null;
  }
}

// ─── Prisma CLI Wrapper ────────────────────────────────────────────────────

function findPrismaCli(): string {
  const candidates = [
    path.join(process.cwd(), 'node_modules', '.bin', 'prisma'),
    path.join(process.cwd(), 'node_modules', '.prisma', 'client'),
    path.join(process.cwd(), '..', 'db', 'node_modules', '.bin', 'prisma'),
    'npx.cmd',
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }

  // On Windows, check for .cmd variants
  for (const c of candidates) {
    const cmdPath = c + '.cmd';
    if (fs.existsSync(cmdPath)) return cmdPath;
  }

  return 'npx.cmd';
}

export async function pushSchema(): Promise<void> {
  const spinner = createSpinner('Pushing schema to database...');
  spinner.start();

  try {
    const dbPackageDir = path.resolve(getConfigPathRelative(), '..', '..', 'db');
    const prismaBin = findPrismaCli();

    execSync(
      `${prismaBin} prisma db push --schema=${path.join(dbPackageDir, 'prisma', 'schema.prisma')}`,
      {
        cwd: dbPackageDir,
        stdio: 'pipe',
        env: { ...process.env, DATABASE_URL: getDatabaseUrl() },
      },
    );

    spinner.succeed('Schema pushed successfully');
  } catch (err: any) {
    spinner.fail('Failed to push schema');
    error(err.stderr?.toString() || err.message);
    throw err;
  }
}

export async function runMigrations(): Promise<void> {
  const spinner = createSpinner('Running migrations...');
  spinner.start();

  try {
    const dbPackageDir = path.resolve(getConfigPathRelative(), '..', '..', 'db');
    const prismaBin = findPrismaCli();

    execSync(`${prismaBin} prisma migrate deploy`, {
      cwd: dbPackageDir,
      stdio: 'pipe',
      env: { ...process.env, DATABASE_URL: getDatabaseUrl() },
    });

    spinner.succeed('Migrations applied successfully');
  } catch (err: any) {
    spinner.fail('Failed to run migrations');
    error(err.stderr?.toString() || err.message);
    throw err;
  }
}

export async function rollbackMigration(): Promise<void> {
  const spinner = createSpinner('Rolling back last migration...');
  spinner.start();

  try {
    const dbPackageDir = path.resolve(getConfigPathRelative(), '..', '..', 'db');
    const prismaBin = findPrismaCli();

    execSync(`${prismaBin} prisma migrate resolve --rolled-back`, {
      cwd: dbPackageDir,
      stdio: 'pipe',
      env: { ...process.env, DATABASE_URL: getDatabaseUrl() },
    });

    spinner.succeed('Migration rolled back successfully');
  } catch (err: any) {
    spinner.fail('Failed to rollback migration');
    error(err.stderr?.toString() || err.message);
    throw err;
  }
}

export async function seedDatabase(): Promise<void> {
  const spinner = createSpinner('Seeding database with dummy data...');
  spinner.start();

  try {
    const prisma = await getPrismaClient();

    // ─── Seed Users ───────────────────────────────────────────────────────
    const users = [
      {
        email: 'admin@nodepress.local',
        name: 'Admin',
        displayName: 'Super Admin',
        role: 'SUPER_ADMIN',
      },
      {
        email: 'editor@nodepress.local',
        name: 'Editor User',
        displayName: 'Editor',
        role: 'EDITOR',
      },
      {
        email: 'author@nodepress.local',
        name: 'Author User',
        displayName: 'Author',
        role: 'AUTHOR',
      },
      {
        email: 'subscriber@nodepress.local',
        name: 'Subscriber User',
        displayName: 'Subscriber',
        role: 'SUBSCRIBER',
      },
    ];

    const bcrypt = await import('bcryptjs');
    const defaultPasswordHash = await bcrypt.hash('admin', 10);

    for (const user of users) {
      await prisma.user.upsert({
        where: { email: user.email },
        update: {},
        create: {
          ...user,
          passwordHash: defaultPasswordHash,
          userStatus: 0,
        },
      });
    }
    success(`Created ${users.length} users`);

    // ─── Seed Content Types ───────────────────────────────────────────────
    const postType = await prisma.contentType.upsert({
      where: { name: 'post' },
      update: {},
      create: {
        name: 'post',
        label: { singular: 'Post', plural: 'Posts' },
        fields: [
          { name: 'title', type: 'text', required: true },
          { name: 'content', type: 'richtext', required: true },
          { name: 'excerpt', type: 'textarea' },
        ],
        supports: ['title', 'editor', 'excerpt', 'thumbnail', 'comments'],
        source: 'CODE',
        menuPosition: 5,
        showInMenu: true,
        hasArchive: true,
      },
    });

    const pageType = await prisma.contentType.upsert({
      where: { name: 'page' },
      update: {},
      create: {
        name: 'page',
        label: { singular: 'Page', plural: 'Pages' },
        fields: [
          { name: 'title', type: 'text', required: true },
          { name: 'content', type: 'richtext', required: true },
        ],
        supports: ['title', 'editor', 'thumbnail'],
        source: 'CODE',
        menuPosition: 10,
        showInMenu: true,
        hasArchive: false,
      },
    });
    success('Created content types: post, page');

    // ─── Seed Taxonomies ──────────────────────────────────────────────────
    const categoryTax = await prisma.taxonomy.upsert({
      where: { name: 'category' },
      update: {},
      create: { name: 'category', hierarchical: true },
    });

    const tagTax = await prisma.taxonomy.upsert({
      where: { name: 'tag' },
      update: {},
      create: { name: 'tag', hierarchical: false },
    });
    success('Created taxonomies: category, tag');

    // ─── Seed Terms ───────────────────────────────────────────────────────
    const terms = [
      { taxonomyId: categoryTax.id, name: 'Uncategorized', slug: 'uncategorized' },
      { taxonomyId: categoryTax.id, name: 'News', slug: 'news' },
      { taxonomyId: categoryTax.id, name: 'Tutorials', slug: 'tutorials' },
      { taxonomyId: tagTax.id, name: 'JavaScript', slug: 'javascript' },
      { taxonomyId: tagTax.id, name: 'TypeScript', slug: 'typescript' },
      { taxonomyId: tagTax.id, name: 'Node.js', slug: 'nodejs' },
    ];

    for (const term of terms) {
      await prisma.term.upsert({
        where: { taxonomyId_slug: { taxonomyId: term.taxonomyId, slug: term.slug } },
        update: {},
        create: term,
      });
    }
    success(`Created ${terms.length} terms`);

    // ─── Seed Settings ────────────────────────────────────────────────────
    const settings = [
      { group: 'general', key: 'site_title', value: '"NodePress CMS"' },
      {
        group: 'general',
        key: 'site_tagline',
        value: '"The WordPress alternative for JavaScript developers"',
      },
      { group: 'general', key: 'site_url', value: '"http://localhost:3000"' },
      { group: 'general', key: 'admin_email', value: '"admin@nodepress.local"' },
      { group: 'general', key: 'language', value: '"en_US"' },
      { group: 'reading', key: 'posts_per_page', value: '10' },
      { group: 'discussion', key: 'default_comment_status', value: '"open"' },
    ];

    for (const setting of settings) {
      await prisma.setting.upsert({
        where: { group_key: { group: setting.group, key: setting.key } },
        update: {},
        create: setting as any,
      });
    }
    success(`Created ${settings.length} settings`);

    spinner.succeed('Database seeded successfully');
  } catch (err: any) {
    spinner.fail('Failed to seed database');
    error(err.message);
    throw err;
  } finally {
    await disconnectPrisma();
  }
}

// ─── Database Export/Import ─────────────────────────────────────────────────

export async function exportDatabase(filePath?: string): Promise<string> {
  const spinner = createSpinner('Exporting database...');
  spinner.start();

  try {
    const url = new URL(getDatabaseUrl());
    const outputPath =
      filePath ||
      path.join(
        getBackupDir(),
        `nodepress-export-${new Date().toISOString().replace(/[:.]/g, '-')}.sql`,
      );

    // Ensure output directory exists
    const outDir = path.dirname(outputPath);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    execSync(
      `pg_dump --no-owner --no-acl -h ${url.hostname} -p ${url.port || 5432} -U ${url.username} -d ${url.pathname.replace('/', '')} -f "${outputPath}"`,
      {
        stdio: 'pipe',
        env: { ...process.env, PGPASSWORD: url.password },
      },
    );

    spinner.succeed(`Database exported to: ${outputPath}`);
    return outputPath;
  } catch (err: any) {
    spinner.fail('Failed to export database');
    error(err.stderr?.toString() || err.message);
    throw err;
  }
}

export async function importDatabase(filePath: string): Promise<void> {
  const spinner = createSpinner(`Importing database from ${filePath}...`);
  spinner.start();

  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const url = new URL(getDatabaseUrl());

    execSync(
      `psql -h ${url.hostname} -p ${url.port || 5432} -U ${url.username} -d ${url.pathname.replace('/', '')} -f "${filePath}"`,
      {
        stdio: 'pipe',
        env: { ...process.env, PGPASSWORD: url.password },
      },
    );

    spinner.succeed('Database imported successfully');
  } catch (err: any) {
    spinner.fail('Failed to import database');
    error(err.stderr?.toString() || err.message);
    throw err;
  }
}

// ─── Database Optimization ──────────────────────────────────────────────────

export async function optimizeDatabase(): Promise<void> {
  const spinner = createSpinner('Optimizing database...');
  spinner.start();

  try {
    const prisma = await getPrismaClient();

    // Run ANALYZE to update statistics
    await prisma.$executeRawUnsafe('ANALYZE');

    // Reindex all tables
    await prisma.$executeRawUnsafe('REINDEX DATABASE CONCURRENTLY');

    // Vacuum all tables
    await prisma.$executeRawUnsafe('VACUUM ANALYZE');

    spinner.succeed('Database optimized successfully');

    // Show optimization summary
    const tables = await prisma.$queryRawUnsafe<
      { tablename: string; size: string; bloat_ratio: string }[]
    >(`
      SELECT
        schemaname || '.' || tablename as tablename,
        pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) as size,
        'N/A' as bloat_ratio
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC
      LIMIT 10
    `);

    if (tables.length > 0) {
      success('Top 10 largest tables:');
      for (const t of tables) {
        console.log(`  ${t.tablename}: ${t.size}`);
      }
    }
  } catch (err: any) {
    spinner.fail('Failed to optimize database');
    error(err.message);
    throw err;
  } finally {
    await disconnectPrisma();
  }
}

// ─── Helper ─────────────────────────────────────────────────────────────────

function getConfigPathRelative(): string {
  return path.dirname(new URL(import.meta.url).pathname);
}
