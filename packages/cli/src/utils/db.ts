import { getDatabaseUrl, getBackupDir } from './config.js';
import { createSpinner, success, error } from './logger.js';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

function resolveDbPackageDir(): string {
  // Cross-platform: use fileURLToPath instead of .pathname for Windows compat
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const pkgDir = path.resolve(__dirname, '..', '..', '..', 'db');
  if (fs.existsSync(pkgDir)) return pkgDir;
  return process.cwd();
}

export async function pushSchema(): Promise<void> {
  const spinner = createSpinner('Pushing schema to database...');
  spinner.start();

  try {
    const dbPackageDir = resolveDbPackageDir();
    // Use 'npx prisma' which works cross-platform on both Windows and Unix
    execSync(
      `npx prisma db push --schema="${path.join(dbPackageDir, 'prisma', 'schema.prisma')}"`,
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
    const dbPackageDir = resolveDbPackageDir();

    execSync(`npx prisma migrate deploy`, {
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
    const dbPackageDir = resolveDbPackageDir();

    execSync(`npx prisma migrate resolve --rolled-back`, {
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
        value: '"A modern CMS for JavaScript developers"',
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
  const spinner = createSpinner('Exporting database via Prisma...');
  spinner.start();

  try {
    const outputPath =
      filePath ||
      path.join(
        getBackupDir(),
        `nodepress-export-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
      );

    // Ensure output directory exists
    const outDir = path.dirname(outputPath);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    // Cross-platform: Use Prisma to export all tables as JSON instead of pg_dump
    const prisma = await getPrismaClient();
    const tables = await prisma.$queryRawUnsafe<{ tablename: string }[]>(
      `SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public' AND tablename != '_prisma_migrations' ORDER BY tablename`,
    );

    const data: Record<string, unknown[]> = {};
    for (const { tablename } of tables) {
      data[tablename] = await prisma.$queryRawUnsafe<unknown[]>(`SELECT * FROM "${tablename}"`);
    }

    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');
    await disconnectPrisma();

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

    // Cross-platform: Use Prisma to import JSON data instead of psql
    const prisma = await getPrismaClient();
    const content = fs.readFileSync(filePath, 'utf-8');
    const data: Record<string, unknown[]> = JSON.parse(content);

    // Disable foreign key triggers during restore to avoid ordering issues
    await prisma.$executeRawUnsafe('SET session_replication_role = replica');

    try {
      for (const [table, rows] of Object.entries(data)) {
        if (!rows || rows.length === 0) continue;

        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);

        const batchSize = 50;
        for (let i = 0; i < rows.length; i += batchSize) {
          const batch = rows.slice(i, i + batchSize);
          for (const row of batch) {
            const r = row as Record<string, unknown>;
            const keys = Object.keys(r);
            const cols = keys.map((k) => `"${k}"`).join(', ');
            const placeholders = keys.map((_, idx) => `$${idx + 1}`).join(', ');
            const values = keys.map((k) => r[k]);

            await prisma.$executeRawUnsafe(
              `INSERT INTO "${table}" (${cols}) VALUES (${placeholders})`,
              ...values,
            );
          }
        }
      }
    } finally {
      await prisma.$executeRawUnsafe('SET session_replication_role = origin');
    }

    await disconnectPrisma();
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
// Path resolution is handled by resolveDbPackageDir() using fileURLToPath
// which works correctly on both Windows and Unix.
