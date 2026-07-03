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
}

export interface InstallAdminInput {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface InstallInput {
  db: InstallDbInput;
  site: InstallSiteInput;
  admin: InstallAdminInput;
}

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
        await prisma.$disconnect().catch(() => {});
      }
    }
  }

  async runInstall(input: InstallInput): Promise<{ success: boolean; adminUrl: string }> {
    if (isInstalled()) {
      throw new BadRequestException('NodePress is already installed. Delete config/nodepress.config.json to reinstall.');
    }

    this.logger.log('Starting NodePress installation...');

    // 1. Generate security keys
    this.logger.log('Generating security keys...');
    const keys = generateSecurityKeys();

    // 2. Build database URL and connect
    const dbUrl = buildDatabaseUrl(input.db);
    this.logger.log(`Connecting to database at ${input.db.host}:${input.db.port}/${input.db.name}...`);

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
        const schemaPath = join(__dirname, '..', '..', 'node_modules', '@nodepress', 'db', 'prisma', 'schema.prisma');
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
          const schemaPath = join(__dirname, '..', '..', 'node_modules', '@nodepress', 'db', 'prisma', 'schema.prisma');
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

      // 5. Update SEO visibility setting
      await prisma.setting.upsert({
        where: { group_key: { group: 'seo', key: 'search_engine_visibility' } },
        update: { value: input.site.searchEngineVisibility },
        create: {
          group: 'seo',
          key: 'search_engine_visibility',
          value: input.site.searchEngineVisibility,
          autoload: true,
        },
      });

      // 6. Save config file
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
        await prisma.$disconnect().catch(() => {});
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
