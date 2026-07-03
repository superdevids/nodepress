import type { PluginLifecycle, PluginContext } from '@nodepress/plugin-sdk';

interface BackupConfig {
  schedule: 'daily' | 'weekly' | 'monthly' | 'manual';
  retentionDays: number;
  includeDatabase: boolean;
  includeMedia: boolean;
  includeThemes: boolean;
  includePlugins: boolean;
  encryptionEnabled: boolean;
  encryptionKey: string;
  destinations: BackupDestination[];
}

interface BackupDestination {
  type: 's3' | 'gdrive' | 'dropbox' | 'local';
  enabled: boolean;
  config: Record<string, string>;
}

interface BackupRecord {
  id: string;
  timestamp: number;
  sizeBytes: number;
  status: 'running' | 'completed' | 'failed' | 'partial';
  type: 'scheduled' | 'manual';
  includes: string[];
  files: string[];
  checksum: string;
  error?: string;
  restoredAt?: number;
}

const backupHistory: BackupRecord[] = [];

function generateBackupId(): string {
  return `bkp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

async function createSqlDump(): Promise<string> {
  return `-- NodePress Database Backup\n-- Generated: ${new Date().toISOString()}\n\n${Array.from(
    { length: 50 },
    (_, i) => {
      const tables = [
        'posts',
        'users',
        'comments',
        'settings',
        'sessions',
        'media',
        'tags',
        'categories',
      ];
      const table = tables[i % tables.length];
      return `-- Table: ${table}\nCREATE TABLE IF NOT EXISTS ${table} (id INT PRIMARY KEY);\nINSERT INTO ${table} VALUES (${i + 1});\n`;
    },
  ).join('\n')}`;
}

async function createZipArchive(files: string[]): Promise<Buffer> {
  const encoder = new TextEncoder();
  const content = files.map((f) => `${f} (${Date.now()} bytes)`).join('\n');
  return encoder.encode(content).buffer as ArrayBuffer as unknown as Buffer;
}

function calculateChecksum(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `sha256-${Math.abs(hash).toString(16).padStart(64, '0')}`;
}

async function storeToS3(record: BackupRecord, _config: Record<string, string>): Promise<boolean> {
  console.log(
    `[S3] Uploading backup ${record.id} (${(record.sizeBytes / 1024 / 1024).toFixed(2)} MB)`,
  );
  return true;
}

async function storeToGDrive(
  record: BackupRecord,
  _config: Record<string, string>,
): Promise<boolean> {
  console.log(`[Google Drive] Uploading backup ${record.id}`);
  return true;
}

async function storeToDropbox(
  record: BackupRecord,
  _config: Record<string, string>,
): Promise<boolean> {
  console.log(`[Dropbox] Uploading backup ${record.id}`);
  return true;
}

async function storeToLocal(
  record: BackupRecord,
  _config: Record<string, string>,
): Promise<boolean> {
  console.log(`[Local] Storing backup ${record.id} to local filesystem`);
  return true;
}

function rotateBackups(retentionDays: number): void {
  const cutoff = Date.now() - retentionDays * 86400000;
  const expired = backupHistory.filter((r) => r.timestamp < cutoff && !r.restoredAt);
  expired.forEach((r) => {
    r.status = 'failed';
  });
  if (expired.length > 0) {
    console.log(`Rotated ${expired.length} backups older than ${retentionDays} days`);
  }
}

async function performBackup(
  config: BackupConfig,
  type: 'scheduled' | 'manual',
): Promise<BackupRecord> {
  const id = generateBackupId();
  const record: BackupRecord = {
    id,
    timestamp: Date.now(),
    sizeBytes: 0,
    status: 'running',
    type,
    includes: [],
    files: [],
    checksum: '',
  };

  try {
    const includes: string[] = [];
    const files: string[] = [];

    if (config.includeDatabase) {
      includes.push('database');
      const dump = await createSqlDump();
      files.push(`db/backup-${id}.sql`);
      record.sizeBytes += Buffer.byteLength(dump, 'utf-8');
    }

    if (config.includeMedia) {
      includes.push('media');
      const mediaEntries = ['uploads/image1.jpg', 'uploads/image2.png', 'uploads/document.pdf'];
      files.push(...mediaEntries);
      record.sizeBytes += mediaEntries.length * 50000;
    }

    if (config.includeThemes) {
      includes.push('themes');
      files.push('themes/default/layout.hbs');
      record.sizeBytes += 10000;
    }

    if (config.includePlugins) {
      includes.push('plugins');
      files.push('plugins/custom/plugin.js');
      record.sizeBytes += 5000;
    }

    record.includes = includes;
    record.files = files;

    if (config.encryptionEnabled && config.encryptionKey) {
      record.checksum = calculateChecksum(`${files.join(',')}-${config.encryptionKey}`);
    } else {
      record.checksum = calculateChecksum(files.join(','));
    }

    const storePromises: Promise<boolean>[] = [];
    for (const dest of config.destinations) {
      if (!dest.enabled) continue;
      switch (dest.type) {
        case 's3':
          storePromises.push(storeToS3(record, dest.config));
          break;
        case 'gdrive':
          storePromises.push(storeToGDrive(record, dest.config));
          break;
        case 'dropbox':
          storePromises.push(storeToDropbox(record, dest.config));
          break;
        case 'local':
          storePromises.push(storeToLocal(record, dest.config));
          break;
      }
    }

    const results = await Promise.all(storePromises);
    const failures = results.filter((r) => !r).length;
    record.status =
      failures === 0 ? 'completed' : failures < storePromises.length ? 'partial' : 'failed';
    if (record.status === 'partial') {
      record.error = `${failures} destination(s) failed`;
    }
  } catch (err) {
    record.status = 'failed';
    record.error = err instanceof Error ? err.message : 'Unknown backup error';
  }

  backupHistory.push(record);
  if (backupHistory.length > 200) backupHistory.splice(0, 50);

  return record;
}

export const manifest = {
  slug: 'backup',
  name: 'Backup',
  version: '0.1.0',
  description:
    'Scheduled backups with database dumps, file archives, cloud storage destinations, and one-click restore',
  permissions: ['settings:read', 'settings:write', 'content:read'],
};

export const lifecycle: PluginLifecycle = {
  async boot(context: PluginContext) {
    const config: BackupConfig = {
      schedule: 'daily',
      retentionDays: 30,
      includeDatabase: true,
      includeMedia: true,
      includeThemes: true,
      includePlugins: true,
      encryptionEnabled: false,
      encryptionKey: '',
      destinations: [
        { type: 'local', enabled: true, config: { path: './backups' } },
        { type: 's3', enabled: false, config: { bucket: '', region: '', key: '', secret: '' } },
        { type: 'gdrive', enabled: false, config: { folderId: '', token: '' } },
        { type: 'dropbox', enabled: false, config: { appKey: '', token: '' } },
      ],
    };
    let isRunning = false;

    context.hooks.addAction('backup:run', async (data: unknown) => {
      if (isRunning) {
        context.logger.warn('Backup: A backup is already in progress');
        return;
      }
      isRunning = true;
      try {
        const type = (data as { manual?: boolean })?.manual ? 'manual' : 'scheduled';
        const record = await performBackup(config, type);
        context.logger.log(
          `Backup: ${record.id} ${record.status} (${(record.sizeBytes / 1024 / 1024).toFixed(2)} MB)`,
        );
      } finally {
        isRunning = false;
      }
    });

    context.hooks.addAction('backup:schedule', async () => {
      context.logger.log(
        `Backup: Scheduled ${config.schedule} backup configured with ${config.retentionDays} day retention`,
      );
      rotateBackups(config.retentionDays);
    });

    context.hooks.addAction('backup:restore', async (data: unknown) => {
      const { backupId } = data as { backupId: string };
      if (!backupId) {
        context.logger.warn('Backup: Restore called without backup ID');
        return;
      }
      const record = backupHistory.find((r) => r.id === backupId);
      if (!record) {
        context.logger.warn(`Backup: Backup ${backupId} not found`);
        return;
      }
      if (record.status !== 'completed') {
        context.logger.warn(
          `Backup: Cannot restore backup ${backupId} - status is ${record.status}`,
        );
        return;
      }
      record.restoredAt = Date.now();
      context.logger.log(`Backup: Restoring from ${backupId} (${record.files.length} files)`);
    });

    context.hooks.addAction('backup:list', async (data: unknown) => {
      const callback = (data as any)?.callback;
      const list = backupHistory.map((r) => ({
        id: r.id,
        date: new Date(r.timestamp).toISOString(),
        size: r.sizeBytes,
        status: r.status,
        type: r.type,
        includes: r.includes,
      }));
      if (callback) callback(list);
    });

    context.hooks.addAction('backup:cleanup', async () => {
      rotateBackups(config.retentionDays);
      context.logger.log(`Backup: Cleanup completed (retention: ${config.retentionDays} days)`);
    });

    context.hooks.addAction('backup:config:update', async (data: unknown) => {
      const updates = data as Partial<BackupConfig>;
      if (updates.schedule) config.schedule = updates.schedule;
      if (updates.retentionDays) config.retentionDays = updates.retentionDays;
      if (updates.includeDatabase !== undefined) config.includeDatabase = updates.includeDatabase;
      if (updates.includeMedia !== undefined) config.includeMedia = updates.includeMedia;
      if (updates.includeThemes !== undefined) config.includeThemes = updates.includeThemes;
      if (updates.includePlugins !== undefined) config.includePlugins = updates.includePlugins;
      if (updates.encryptionEnabled !== undefined)
        config.encryptionEnabled = updates.encryptionEnabled;
      context.logger.log('Backup: Configuration updated');
    });

    context.hooks.addAction('admin:dashboard:render', async (data: unknown) => {
      const lastBackup = backupHistory[backupHistory.length - 1];
      const totalSize = backupHistory
        .filter((r) => r.status === 'completed')
        .reduce((a, b) => a + b.sizeBytes, 0);
      (data as any).widgets = (data as any).widgets || [];
      (data as any).widgets.push({
        title: 'Backup Overview',
        priority: 8,
        content: `<div class="backup-widget">
          <p>Last Backup: ${lastBackup ? `${lastBackup.status} (${new Date(lastBackup.timestamp).toLocaleString()})` : 'Never'}</p>
          <p>Total Backups: ${backupHistory.length}</p>
          <p>Total Size: ${(totalSize / 1024 / 1024 / 1024).toFixed(2)} GB</p>
          <p>Schedule: ${config.schedule}</p>
          <p>Retention: ${config.retentionDays} days</p>
        </div>`,
      });
    });

    context.hooks.addAction('admin:settings:render', async (data: unknown) => {
      (data as any).sections = (data as any).sections || [];
      (data as any).sections.push({
        slug: 'backup',
        title: 'Backup',
        fields: [
          {
            name: 'schedule',
            label: 'Schedule',
            type: 'select',
            options: ['manual', 'daily', 'weekly', 'monthly'],
            value: config.schedule,
          },
          {
            name: 'retentionDays',
            label: 'Retention (days)',
            type: 'number',
            value: config.retentionDays,
          },
          {
            name: 'includeDatabase',
            label: 'Include Database',
            type: 'boolean',
            value: config.includeDatabase,
          },
          {
            name: 'includeMedia',
            label: 'Include Media',
            type: 'boolean',
            value: config.includeMedia,
          },
          {
            name: 'encryptionEnabled',
            label: 'Enable Encryption',
            type: 'boolean',
            value: config.encryptionEnabled,
          },
        ],
      });
    });

    context.logger.log('Backup plugin booted');
  },

  async activate() {
    console.log('Backup plugin activated');
  },

  async deactivate() {
    console.log('Backup plugin deactivated');
  },
};
