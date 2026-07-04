import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { join } from 'path';
import {
  generateSecurityKeys,
  generateConfig,
  buildDatabaseUrl,
  saveConfig,
  loadConfig,
  isInstalled,
  type DatabaseConfig,
  type SecurityKeys,
} from '@nodepressjs/core/config/config-generator';
import { seedDefaultData } from '@nodepressjs/core/install/default-seed';

export interface InstallDbInput {
  host: string;
  port: number;
  name: string;
  user: string;
  password: string;
}

export interface InstallSiteInput {
  title: string;
  description: string;
  adminEmail: string;
  searchEngineVisibility: boolean;
  language: string;
  timezone: string;
  url: string;
  permalink: string;
}

export interface InstallAdminInput {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  avatar?: string;
}

export interface InstallInput {
  db: InstallDbInput;
  site: InstallSiteInput;
  admin: InstallAdminInput;
  plugins: string[];
  theme: string;
  installType: 'fresh' | 'import';
}

const ALL_PLUGINS: { slug: string; name: string }[] = [
  { slug: 'seo', name: 'SEO' },
  { slug: 'analytics', name: 'Analytics' },
  { slug: 'backup', name: 'Backup' },
  { slug: 'cache-redis', name: 'Redis Cache' },
  { slug: 'comments', name: 'Comments' },
  { slug: 'file-editor', name: 'File Editor' },
  { slug: 'forms', name: 'Forms' },
  { slug: 'multilingual', name: 'Multilingual' },
  { slug: 'newsletter', name: 'Newsletter' },
  { slug: 'performance', name: 'Performance' },
  { slug: 'redirection', name: 'Redirection' },
  { slug: 'security', name: 'Security' },
  { slug: 'social-sharing', name: 'Social Sharing' },
];

@Injectable()
export class InstallService {
  private readonly logger = new Logger(InstallService.name);

  async getStatus(): Promise<{ installed: boolean; hasDbConnection: boolean }> {
    const installed = isInstalled();

    let hasDbConnection = false;
    if (installed) {
      try {
        const config = loadConfig();
        if (config) {
          const url = buildDatabaseUrl(config.db);
          const prisma = new PrismaClient({
            datasources: { db: { url } },
          });
          await prisma.$connect();
          await prisma.$disconnect();
          hasDbConnection = true;
        }
      } catch {
        hasDbConnection = false;
      }
    }

    return { installed, hasDbConnection };
  }

  async testDatabaseConnection(db: InstallDbInput): Promise<{ success: boolean; message: string }> {
    const url = buildDatabaseUrl(db);
    let prisma: PrismaClient | null = null;

    try {
      prisma = new PrismaClient({
        datasources: { db: { url } },
      });
      await prisma.$connect();
      return { success: true, message: 'Connection successful' };
    } catch (err: any) {
      const message = err?.message || 'Unknown database error';
      this.logger.error(`Database connection test failed: ${message}`);
      return { success: false, message };
    } finally {
      if (prisma) {
        await prisma
          .$disconnect()
          .catch((err: Error) =>
            this.logger.warn('Failed to disconnect Prisma after DB test', err.message),
          );
      }
    }
  }

  async runInstall(input: InstallInput): Promise<{ success: boolean; adminUrl: string }> {
    if (isInstalled()) {
      throw new BadRequestException(
        'NodePress is already installed. Delete config/nodepress.config.json to reinstall.',
      );
    }

    this.logger.log('Starting NodePress installation...');

    // 1. Generate security keys
    this.logger.log('Generating security keys...');
    const keys = generateSecurityKeys();

    // 2. Build database URL and connect
    const dbUrl = buildDatabaseUrl(input.db);
    this.logger.log(
      `Connecting to database at ${input.db.host}:${input.db.port}/${input.db.name}...`,
    );

    let prisma: PrismaClient | null = null;
    try {
      prisma = new PrismaClient({
        datasources: { db: { url: dbUrl } },
      });
      await prisma.$connect();
      this.logger.log('Database connected.');

      // 3. Run Prisma migrations
      this.logger.log('Running database migrations...');
      try {
        const schemaPath = join(
          __dirname,
          '..',
          '..',
          'node_modules',
          '@nodepress',
          'db',
          'prisma',
          'schema.prisma',
        );
        const migrateCommand = `npx prisma migrate deploy --schema="${schemaPath}"`;
        execSync(migrateCommand, {
          env: { ...process.env, DATABASE_URL: dbUrl },
          stdio: 'pipe',
          timeout: 120000,
        });
        this.logger.log('Migrations completed.');
      } catch (migrateErr: any) {
        this.logger.warn(`Migration deploy failed, trying db push: ${migrateErr.message}`);
        try {
          const schemaPath = join(
            __dirname,
            '..',
            '..',
            'node_modules',
            '@nodepress',
            'db',
            'prisma',
            'schema.prisma',
          );
          execSync(`npx prisma db push --schema="${schemaPath}" --accept-data-loss`, {
            env: { ...process.env, DATABASE_URL: dbUrl },
            stdio: 'pipe',
            timeout: 120000,
          });
          this.logger.log('Schema pushed successfully.');
        } catch (pushErr: any) {
          throw new Error(`Database migration failed: ${pushErr.message}`);
        }
      }

      // 4. Seed default data
      this.logger.log('Seeding default data...');
      await seedDefaultData({
        prisma,
        adminEmail: input.site.adminEmail,
        adminPassword: input.admin.password,
        adminFirstName: input.admin.firstName,
        adminLastName: input.admin.lastName,
        siteTitle: input.site.title,
        siteDescription: input.site.description,
      });
      this.logger.log('Default data seeded.');

      // 5. Save extended site settings
      this.logger.log('Saving site settings...');
      const siteSettings = [
        { group: 'general', key: 'site_title', value: input.site.title, autoload: true },
        { group: 'general', key: 'tagline', value: input.site.description || '', autoload: true },
        { group: 'general', key: 'site_url', value: input.site.url, autoload: true },
        { group: 'general', key: 'admin_email', value: input.site.adminEmail, autoload: true },
        {
          group: 'general',
          key: 'language',
          value: input.site.language || 'en-US',
          autoload: true,
        },
        { group: 'general', key: 'timezone', value: input.site.timezone || 'UTC', autoload: true },
        { group: 'permalinks', key: 'structure', value: input.site.permalink, autoload: true },
      ];

      for (const setting of siteSettings) {
        await prisma.setting.upsert({
          where: { group_key: { group: setting.group, key: setting.key } },
          update: { value: setting.value },
          create: setting,
        });
      }

      // 6. Update SEO visibility setting
      await prisma.setting.upsert({
        where: { group_key: { group: 'seo', key: 'search_engine_visibility' } },
        update: { value: true },
        create: {
          group: 'seo',
          key: 'search_engine_visibility',
          value: true,
          autoload: true,
        },
      });

      // 7. Activate selected plugins
      if (input.plugins && input.plugins.length > 0) {
        this.logger.log(`Activating ${input.plugins.length} plugin(s)...`);
        for (const slug of input.plugins) {
          const pluginInfo = ALL_PLUGINS.find((p) => p.slug === slug);
          if (!pluginInfo) {
            this.logger.warn(`Unknown plugin slug "${slug}", skipping.`);
            continue;
          }
          try {
            await prisma.plugin.upsert({
              where: { slug },
              update: { active: true, version: '0.1.0' },
              create: {
                slug,
                version: '0.1.0',
                active: true,
              },
            });
            this.logger.log(`Plugin "${pluginInfo.name}" activated.`);
          } catch (pluginErr: any) {
            this.logger.warn(`Failed to activate plugin "${slug}": ${pluginErr.message}`);
          }
        }
      }

      // 8. Save selected theme as active setting
      if (input.theme) {
        await prisma.setting.upsert({
          where: { group_key: { group: 'theme', key: 'active_theme' } },
          update: { value: input.theme },
          create: {
            group: 'theme',
            key: 'active_theme',
            value: input.theme,
            autoload: true,
          },
        });
      }

      // 9. Save config file
      this.logger.log('Saving configuration...');
      const config = generateConfig(input.db, keys);
      saveConfig(config);
      this.logger.log('Configuration saved.');

      await prisma.$disconnect();
      prisma = null;

      this.logger.log('Installation complete!');
      return {
        success: true,
        adminUrl: '/admin/login',
      };
    } catch (err: any) {
      this.logger.error(`Installation failed: ${err.message}`);
      if (prisma) {
        await prisma
          .$disconnect()
          .catch((err: Error) =>
            this.logger.warn('Failed to disconnect Prisma after install failure', err.message),
          );
      }
      throw new BadRequestException(`Installation failed: ${err.message}`);
    }
  }

  async generateKeys(): Promise<SecurityKeys> {
    return generateSecurityKeys();
  }

  async getDatabaseUrl(): Promise<string | null> {
    const config = loadConfig();
    if (!config) return null;
    return buildDatabaseUrl(config.db);
  }
}
