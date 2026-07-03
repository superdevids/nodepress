import Conf from 'conf';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import dotenv from 'dotenv';

// ─── Configuration Store ────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../../');

export interface CliConfig {
  databaseUrl?: string;
  nodeEnv?: string;
  port?: number;
  coreVersion?: string;
  pluginsDir?: string;
  themesDir?: string;
  backupDir?: string;
  uploadsDir?: string;
}

const store = new Conf<CliConfig>({
  projectName: 'nodepress',
  schema: {
    databaseUrl: { type: 'string', default: 'postgresql://localhost:5432/nodepress' },
    nodeEnv: { type: 'string', default: 'development' },
    port: { type: 'number', default: 3000 },
    coreVersion: { type: 'string' },
    pluginsDir: { type: 'string' },
    themesDir: { type: 'string' },
    backupDir: { type: 'string' },
    uploadsDir: { type: 'string' },
  },
});

// ─── Environment Loader ─────────────────────────────────────────────────────

export function loadEnvironment(): void {
  // Try loading .env from project root
  const envPaths = [
    path.join(projectRoot, '.env'),
    path.join(projectRoot, '.env.local'),
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), '.env.local'),
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
      break;
    }
  }

  // Merge env into config
  if (process.env.DATABASE_URL) {
    store.set('databaseUrl', process.env.DATABASE_URL);
  }
  if (process.env.NODE_ENV) {
    store.set('nodeEnv', process.env.NODE_ENV);
  }
  if (process.env.PORT) {
    store.set('port', parseInt(process.env.PORT, 10));
  }
}

// ─── Config Accessors ───────────────────────────────────────────────────────

export function getConfig(): CliConfig {
  return store.store as CliConfig;
}

export function getDatabaseUrl(): string {
  return store.get('databaseUrl') || 'postgresql://localhost:5432/nodepress';
}

export function getProjectRoot(): string {
  return projectRoot;
}

export function getPluginsDir(): string {
  return store.get('pluginsDir') || path.join(projectRoot, 'plugins');
}

export function getThemesDir(): string {
  return store.get('themesDir') || path.join(projectRoot, 'themes');
}

export function getBackupDir(): string {
  return store.get('backupDir') || path.join(projectRoot, 'storage', 'backups');
}

export function getUploadsDir(): string {
  return store.get('uploadsDir') || path.join(projectRoot, 'storage', 'uploads');
}

export { store };
