import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { join } from 'path';
import { createHmac } from 'crypto';
import {
  generateSecurityKeys,
  generateConfig,
  buildDatabaseUrl,
  saveConfig,
  loadConfig,
  isInstalled,
} from '@nodepressjs/core/config/config-generator';
import { seedDefaultData } from '@nodepressjs/core/install/default-seed';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface InstallDbInput {
  host: string;
  port: number;
  name: string;
  user: string;
  password: string;
}

export interface InstallAdminInput {
  email: string;
  password: string;
  name: string;
}

export interface InstallSiteInput {
  siteName: string;
  tagline?: string;
  url: string;
  language?: string;
  timezone?: string;
}

export interface InstallPluginsInput {
  plugins: string[];
}

export interface InstallThemeInput {
  theme: string;
}

export interface InstallWizardState {
  step1?: InstallDbInput;
  step2?: InstallAdminInput;
  step3?: InstallSiteInput;
  step4?: InstallPluginsInput;
  step5?: InstallThemeInput;
}

export type StepResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
};

// ─────────────────────────────────────────────────────────────
// JWT Helper — signs a JWT using HS256 with Node built-in crypto
// ─────────────────────────────────────────────────────────────

function base64UrlEncode(data: string): string {
  return Buffer.from(data).toString('base64url');
}

function signJwt(
  payload: Record<string, unknown>,
  secret: string,
  expiresIn: string = '7d',
): string {
  const header = { alg: 'HS256', typ: 'JWT' };

  // Parse expiresIn
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  let expSeconds = 604800; // default 7 days
  if (match) {
    const num = parseInt(match[1], 10);
    switch (match[2]) {
      case 's':
        expSeconds = num;
        break;
      case 'm':
        expSeconds = num * 60;
        break;
      case 'h':
        expSeconds = num * 3600;
        break;
      case 'd':
        expSeconds = num * 86400;
        break;
    }
  }

  const now = Math.floor(Date.now() / 1000);
  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + expSeconds,
    iss: 'nodepress',
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(tokenPayload));
  const signature = createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

// ─────────────────────────────────────────────────────────────
// Available plugins
// ─────────────────────────────────────────────────────────────

const AVAILABLE_PLUGINS: { slug: string; name: string; description: string }[] = [
  { slug: 'seo', name: 'SEO', description: 'Search engine optimization tools' },
  { slug: 'analytics', name: 'Analytics', description: 'Site analytics and tracking' },
  { slug: 'backup', name: 'Backup', description: 'Automated database backups' },
  { slug: 'cache-redis', name: 'Redis Cache', description: 'Redis-based page and object cache' },
  { slug: 'comments', name: 'Comments', description: 'Advanced commenting system' },
  {
    slug: 'file-editor',
    name: 'File Editor',
    description: 'Code editor for theme and plugin files',
  },
  { slug: 'forms', name: 'Forms', description: 'Drag-and-drop form builder' },
  { slug: 'multilingual', name: 'Multilingual', description: 'Multi-language site support' },
  {
    slug: 'newsletter',
    name: 'Newsletter',
    description: 'Email newsletter subscription management',
  },
  { slug: 'performance', name: 'Performance', description: 'Performance optimization tools' },
  { slug: 'redirection', name: 'Redirection', description: 'URL redirection manager' },
  { slug: 'security', name: 'Security', description: 'Security hardening and firewall' },
  { slug: 'social-sharing', name: 'Social Sharing', description: 'Social media share buttons' },
];

// ─────────────────────────────────────────────────────────────
// Available themes
// ─────────────────────────────────────────────────────────────

const AVAILABLE_THEMES: { slug: string; name: string; description: string }[] = [
  {
    slug: 'web-starter',
    name: 'Web Starter',
    description: 'Modern starter theme with full site editing support',
  },
  { slug: 'blogify', name: 'Blogify', description: 'Clean blog theme optimized for readability' },
  { slug: 'minimal', name: 'Minimal', description: 'Lightweight minimal theme' },
];

// ─────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────

@Injectable()
export class InstallService {
  private readonly logger = new Logger(InstallService.name);

  /**
   * In-memory wizard state. Resets on server restart.
   * Steps 1-5 populate this; complete() consumes it.
   */
  private wizardState: InstallWizardState = {};

  // ── Status ──────────────────────────────────────────────────

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

  // ── Wizard helpers ──────────────────────────────────────────

  private checkNotInstalled(): void {
    if (isInstalled()) {
      throw new BadRequestException(
        'NodePress is already installed. Delete the config file to reinstall.',
      );
    }
  }

  private getStateOrThrow<T>(key: keyof InstallWizardState): T {
    const value = this.wizardState[key];
    if (!value) {
      throw new BadRequestException(
        `Step "${key}" has not been completed yet. Please complete the wizard steps in order.`,
      );
    }
    return value as T;
  }

  /**
   * Reset the entire wizard state (used after successful install or on error).
   */
  resetWizard(): void {
    this.wizardState = {};
    this.logger.log('Wizard state reset');
  }

  // ── Step 1: Test DB Connection ──────────────────────────────

  async step1TestDb(dto: InstallDbInput): Promise<StepResponse<{ dbUrl: string }>> {
    this.checkNotInstalled();

    const dbUrl = buildDatabaseUrl(dto);
    let prisma: PrismaClient | null = null;

    try {
      prisma = new PrismaClient({
        datasources: { db: { url: dbUrl } },
      });
      await prisma.$connect();
      await prisma.$disconnect();
      prisma = null;

      // Store in wizard state
      this.wizardState.step1 = { ...dto };

      this.logger.log(`Step 1: DB connection successful (${dto.host}:${dto.port}/${dto.name})`);
      return {
        success: true,
        data: { dbUrl: buildDatabaseUrl({ ...dto, password: '********' }) },
      };
    } catch (err: any) {
      const message = err?.message || 'Unknown database error';
      this.logger.error(`Step 1: DB connection failed: ${message}`);
      return { success: false, error: message };
    } finally {
      if (prisma) {
        await prisma.$disconnect().catch(() => {});
      }
    }
  }

  // ── Step 2: Create Admin Account ────────────────────────────

  async step2Admin(dto: InstallAdminInput): Promise<StepResponse<{ email: string; name: string }>> {
    this.checkNotInstalled();

    if (!this.wizardState.step1) {
      return { success: false, error: 'Please complete Step 1 (database connection) first.' };
    }

    // Validate password strength
    if (dto.password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters long.' };
    }

    // Store in wizard state
    this.wizardState.step2 = { ...dto };

    this.logger.log(`Step 2: Admin account data saved (email: ${dto.email})`);
    return {
      success: true,
      data: { email: dto.email, name: dto.name },
    };
  }

  // ── Step 3: Site Settings ───────────────────────────────────

  async step3Site(dto: InstallSiteInput): Promise<StepResponse<{ siteName: string; url: string }>> {
    this.checkNotInstalled();

    if (!this.wizardState.step1) {
      return { success: false, error: 'Please complete Step 1 (database connection) first.' };
    }

    this.wizardState.step3 = {
      siteName: dto.siteName,
      tagline: dto.tagline || '',
      url: dto.url,
      language: dto.language || 'en-US',
      timezone: dto.timezone || 'UTC',
    };

    this.logger.log(`Step 3: Site settings saved (name: ${dto.siteName})`);
    return {
      success: true,
      data: { siteName: dto.siteName, url: dto.url },
    };
  }

  // ── Step 4: Select Plugins ──────────────────────────────────

  async step4Plugins(dto: InstallPluginsInput): Promise<StepResponse<{ plugins: string[] }>> {
    this.checkNotInstalled();

    if (!this.wizardState.step1) {
      return { success: false, error: 'Please complete Step 1 (database connection) first.' };
    }

    // Validate plugin slugs
    const validSlugs = new Set(AVAILABLE_PLUGINS.map((p) => p.slug));
    const invalidPlugins = (dto.plugins || []).filter((slug) => !validSlugs.has(slug));
    if (invalidPlugins.length > 0) {
      return {
        success: false,
        error: `Unknown plugin(s): ${invalidPlugins.join(', ')}`,
      };
    }

    this.wizardState.step4 = { plugins: dto.plugins || [] };

    this.logger.log(`Step 4: ${dto.plugins?.length || 0} plugin(s) selected`);
    return {
      success: true,
      data: { plugins: dto.plugins || [] },
    };
  }

  // ── Step 5: Select Theme ────────────────────────────────────

  async step5Theme(dto: InstallThemeInput): Promise<StepResponse<{ theme: string }>> {
    this.checkNotInstalled();

    if (!this.wizardState.step1) {
      return { success: false, error: 'Please complete Step 1 (database connection) first.' };
    }

    // Validate theme slug
    const validSlugs = new Set(AVAILABLE_THEMES.map((t) => t.slug));
    if (!validSlugs.has(dto.theme)) {
      return {
        success: false,
        error: `Unknown theme "${dto.theme}". Available themes: ${Array.from(validSlugs).join(', ')}`,
      };
    }

    this.wizardState.step5 = { theme: dto.theme };

    this.logger.log(`Step 5: Theme selected (${dto.theme})`);
    return {
      success: true,
      data: { theme: dto.theme },
    };
  }

  // ── Complete: Execute Full Installation ─────────────────────

  async complete(): Promise<
    StepResponse<{ adminUrl: string; accessToken: string; user: { email: string; name: string } }>
  > {
    this.checkNotInstalled();

    // Validate all steps completed
    const db = this.wizardState.step1;
    const admin = this.wizardState.step2;
    const site = this.wizardState.step3;
    const plugins = this.wizardState.step4;
    const theme = this.wizardState.step5;

    const missingSteps: string[] = [];
    if (!db) missingSteps.push('Step 1 (Database Connection)');
    if (!admin) missingSteps.push('Step 2 (Admin Account)');
    if (!site) missingSteps.push('Step 3 (Site Settings)');
    if (!plugins) missingSteps.push('Step 4 (Plugins)');
    if (!theme) missingSteps.push('Step 5 (Theme)');

    if (missingSteps.length > 0) {
      return {
        success: false,
        error: `Cannot complete installation: missing ${missingSteps.join(', ')}`,
      };
    }

    this.logger.log('Starting full installation...');

    // ── 1. Generate security keys ───────────────────────────
    this.logger.log('Generating security keys...');
    const keys = generateSecurityKeys();

    // ── 2. Build database URL ───────────────────────────────
    const dbUrl = buildDatabaseUrl(db);
    this.logger.log(`Connecting to database at ${db.host}:${db.port}/${db.name}...`);

    let prisma: PrismaClient | null = null;

    try {
      prisma = new PrismaClient({
        datasources: { db: { url: dbUrl } },
      });
      await prisma.$connect();
      this.logger.log('Database connected.');

      // ── 3. Run Prisma migrations ──────────────────────────
      this.logger.log('Running database migrations...');

      // Resolve Prisma schema path with fallbacks for monorepo / production
      const { existsSync } = require('fs') as typeof import('fs');
      const schemaCandidates = [
        process.env.PRISMA_SCHEMA_PATH,
        join(process.cwd(), 'node_modules', '@nodepressjs', 'db', 'prisma', 'schema.prisma'),
        join(__dirname, '..', '..', '..', '..', 'packages', 'db', 'prisma', 'schema.prisma'),
        join(process.cwd(), 'packages', 'db', 'prisma', 'schema.prisma'),
        join(__dirname, '..', '..', 'node_modules', '@nodepressjs', 'db', 'prisma', 'schema.prisma'),
      ].filter(Boolean) as string[];

      let schemaPath = schemaCandidates[0];
      for (const p of schemaCandidates) {
        if (existsSync(p)) {
          schemaPath = p;
          break;
        }
      }
      this.logger.log(`Using Prisma schema: ${schemaPath}`);

      try {
        execSync(`npx prisma migrate deploy --schema="${schemaPath}"`, {
          env: { ...process.env, DATABASE_URL: dbUrl },
          stdio: 'pipe',
          timeout: 120000,
        });
        this.logger.log('Migrations completed via migrate deploy.');
      } catch (migrateErr: any) {
        this.logger.warn(`migrate deploy failed, trying db push: ${migrateErr.message}`);
        try {
          execSync(`npx prisma db push --schema="${schemaPath}" --accept-data-loss`, {
            env: { ...process.env, DATABASE_URL: dbUrl },
            stdio: 'pipe',
            timeout: 120000,
          });
          this.logger.log('Schema pushed successfully via db push.');
        } catch (pushErr: any) {
          throw new Error(`Database migration failed: ${pushErr.message}`);
        }
      }

      // ── 4. Seed default data ──────────────────────────────
      this.logger.log('Seeding default data...');
      const nameParts = admin.name.trim().split(/\s+/);
      const firstName = nameParts[0] || 'Admin';
      const lastName = nameParts.slice(1).join(' ') || '';

      await seedDefaultData({
        prisma,
        adminEmail: admin.email,
        adminPassword: admin.password,
        adminFirstName: firstName,
        adminLastName: lastName,
        siteTitle: site.siteName,
        siteDescription: site.tagline || '',
      });
      this.logger.log('Default data seeded.');

      // ── 5. Save extended site settings ────────────────────
      this.logger.log('Saving site settings...');
      const siteSettings = [
        { group: 'general', key: 'site_title', value: site.siteName, autoload: true },
        { group: 'general', key: 'tagline', value: site.tagline || '', autoload: true },
        { group: 'general', key: 'site_url', value: site.url, autoload: true },
        { group: 'general', key: 'admin_email', value: admin.email, autoload: true },
        { group: 'general', key: 'language', value: site.language || 'en-US', autoload: true },
        { group: 'general', key: 'timezone', value: site.timezone || 'UTC', autoload: true },
      ];

      for (const setting of siteSettings) {
        await prisma.setting.upsert({
          where: { group_key: { group: setting.group, key: setting.key } },
          update: { value: setting.value },
          create: setting,
        });
      }

      // ── 6. Activate selected plugins ──────────────────────
      if (plugins.plugins && plugins.plugins.length > 0) {
        this.logger.log(`Activating ${plugins.plugins.length} plugin(s)...`);
        for (const slug of plugins.plugins) {
          const pluginInfo = AVAILABLE_PLUGINS.find((p) => p.slug === slug);
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

      // ── 7. Install & activate selected theme ──────────────
      this.logger.log(`Installing theme "${theme.theme}"...`);
      const themeInfo = AVAILABLE_THEMES.find((t) => t.slug === theme.theme);
      if (themeInfo) {
        // Deactivate all themes first
        await prisma.theme.updateMany({
          where: { active: true },
          data: { active: false },
        });

        // Upsert and activate the chosen theme
        await prisma.theme.upsert({
          where: { slug: theme.theme },
          update: {
            active: true,
            name: themeInfo.name,
            version: '1.0.0',
          },
          create: {
            slug: theme.theme,
            name: themeInfo.name,
            version: '1.0.0',
            description: themeInfo.description,
            author: 'NodePress',
            active: true,
            supports: [],
            tags: [],
            settings: {},
          },
        });

        // Save active theme in settings
        await prisma.setting.upsert({
          where: { group_key: { group: 'theme', key: 'active_theme' } },
          update: { value: theme.theme },
          create: {
            group: 'theme',
            key: 'active_theme',
            value: theme.theme,
            autoload: true,
          },
        });

        this.logger.log(`Theme "${themeInfo.name}" installed and activated.`);
      }

      // ── 8. Mark installation as complete in DB ────────────
      await prisma.setting.upsert({
        where: { group_key: { group: 'system', key: 'installed' } },
        update: { value: true },
        create: {
          group: 'system',
          key: 'installed',
          value: true,
          autoload: true,
        },
      });

      // ── 8b. Save version info in DB ─────────────────────
      await prisma.setting.upsert({
        where: { group_key: { group: 'system', key: 'version' } },
        update: { value: '0.1.0' },
        create: {
          group: 'system',
          key: 'version',
          value: '0.1.0',
          autoload: true,
        },
      });

      // ── 9. Save config file ───────────────────────────────
      this.logger.log('Saving configuration file...');
      const config = generateConfig(db, keys);
      saveConfig(config);
      this.logger.log('Configuration saved.');

      await prisma.$disconnect();
      prisma = null;

      // ── 10. Generate JWT for admin user ───────────────────
      this.logger.log('Generating admin JWT token...');

      // Resolve the JWT signing key
      // Priority: 1) process.env.JWT_SECRET, 2) process.env.NODEPRESS_JWT_SECRET,
      // 3) config SECRET_KEY (from generated keys)
      let jwtSecret = process.env.JWT_SECRET || process.env.NODEPRESS_JWT_SECRET;
      if (!jwtSecret) {
        jwtSecret = keys.SECRET_KEY;
        // Set it in the environment so JwtStrategy can verify subsequent requests
        process.env.JWT_SECRET = jwtSecret;
      }

      // Fetch the created admin user from DB to get the ID
      const adminPrisma = new PrismaClient({
        datasources: { db: { url: dbUrl } },
      });
      await adminPrisma.$connect();
      const adminUser = await adminPrisma.user.findUnique({
        where: { email: admin.email },
      });
      await adminPrisma.$disconnect();

      if (!adminUser) {
        throw new Error(`Admin user with email "${admin.email}" not found after seeding.`);
      }

      const jwtPayload = {
        sub: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
        permissions: adminUser.capabilities?.length ? adminUser.capabilities : ['manage_all'],
      };

      const accessToken = signJwt(jwtPayload, jwtSecret, '7d');

      // ── 11. Reset wizard state ──────────────────────────
      this.resetWizard();

      this.logger.log('Installation complete!');

      return {
        success: true,
        data: {
          adminUrl: '/admin',
          accessToken,
          user: {
            email: adminUser.email,
            name: adminUser.name,
          },
        },
      };
    } catch (err: any) {
      this.logger.error(`Installation failed: ${err.message}`);

      // ── Rollback: clean up any partial state ──────────────
      try {
        if (prisma) {
          // Try to clean up partial data
          await prisma.setting
            .deleteMany({
              where: { group: 'system', key: 'installed' },
            })
            .catch(() => {});
          await prisma.$disconnect().catch(() => {});
        }
      } catch {
        // Best-effort cleanup
      }

      // Reset wizard state so user can start fresh
      this.resetWizard();

      throw new InternalServerErrorException(`Installation failed: ${err.message}`);
    }
  }

  // ── Backward Compat: Full Install (legacy) ─────────────────

  async runInstall(input: {
    db: InstallDbInput;
    site: {
      title: string;
      description: string;
      adminEmail: string;
      url: string;
      language: string;
      timezone: string;
      permalink: string;
    };
    admin: {
      username: string;
      password: string;
      firstName: string;
      lastName: string;
      avatar?: string;
    };
    plugins: string[];
    theme: string;
  }): Promise<{ success: boolean; adminUrl: string }> {
    // Map legacy input to wizard state and run complete
    this.wizardState.step1 = { ...input.db };
    this.wizardState.step2 = {
      email: input.site.adminEmail,
      password: input.admin.password,
      name: `${input.admin.firstName} ${input.admin.lastName}`.trim(),
    };
    this.wizardState.step3 = {
      siteName: input.site.title,
      tagline: input.site.description,
      url: input.site.url,
      language: input.site.language || 'en-US',
      timezone: input.site.timezone || 'UTC',
    };
    this.wizardState.step4 = { plugins: input.plugins || [] };
    this.wizardState.step5 = { theme: input.theme || 'web-starter' };

    const result = await this.complete();

    if (!result.success) {
      throw new BadRequestException(result.error || 'Installation failed');
    }

    return { success: true, adminUrl: '/admin/login' };
  }

  // ── DB Connection Test (legacy) ────────────────────────────

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

  // ── Key generation (legacy) ────────────────────────────────

  async generateKeys() {
    return generateSecurityKeys();
  }

  // ── Get DB URL from config (legacy) ────────────────────────

  async getDatabaseUrl(): Promise<string | null> {
    const config = loadConfig();
    if (!config) return null;
    return buildDatabaseUrl(config.db);
  }

  // ── Get wizard state progress ──────────────────────────────

  getWizardProgress(): { completedSteps: string[]; totalSteps: number } {
    const steps: { key: keyof InstallWizardState; label: string }[] = [
      { key: 'step1', label: 'Database Connection' },
      { key: 'step2', label: 'Admin Account' },
      { key: 'step3', label: 'Site Settings' },
      { key: 'step4', label: 'Plugins' },
      { key: 'step5', label: 'Theme' },
    ];

    const completedSteps = steps
      .filter((s) => this.wizardState[s.key] !== undefined)
      .map((s) => s.label);

    return { completedSteps, totalSteps: steps.length };
  }
}
