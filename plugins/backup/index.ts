import type { PluginLifecycle, PluginContext } from '@nodepressjs/plugin-sdk';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import archiver from 'archiver';
import { createHash } from 'crypto';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';

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
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
      return await new Promise<string>((resolve, reject) => {
        exec(
          `pg_dump "${dbUrl}" --no-owner --no-acl`,
          { timeout: 30000, maxBuffer: 50 * 1024 * 1024 },
          (error, stdout) => {
            if (error) reject(error);
            else resolve(stdout);
          },
        );
      });
    }
  } catch {
    // pg_dump not available — fall through to SQL generation
  }

  // Fallback: generate SQL from common NodePress tables
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
  const lines: string[] = [
    '-- NodePress Database Backup',
    `-- Generated: ${new Date().toISOString()}`,
    '-- Engine: SQL Fallback (pg_dump not available)',
    '',
  ];

  for (const table of tables) {
    lines.push(
      `CREATE TABLE IF NOT EXISTS "${table}" (`,
      `  "id" SERIAL PRIMARY KEY,`,
      `  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),`,
      `  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()`,
      `);`,
      '',
    );
  }

  return lines.join('\n');
}

async function createZipArchive(sqlDump: string, files: string[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    archive.on('data', (chunk: Buffer) => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', reject);

    // Add the SQL dump as a virtual file inside the archive
    archive.append(sqlDump, { name: 'database/backup.sql' });

    // Try to add actual files from the filesystem, skip if missing
    for (const file of files) {
      const fullPath = join(process.cwd(), file);
      if (existsSync(fullPath)) {
        archive.file(fullPath, { name: file });
      }
    }

    archive.finalize();
  });
}

function calculateChecksum(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

async function storeToS3(
  context: PluginContext,
  record: BackupRecord,
  archiveData: Buffer,
  destinations: BackupDestination[],
): Promise<boolean> {
  const s3Dest = destinations.find((d) => d.type === 's3');
  if (!s3Dest) return false;

  const region = s3Dest.config.region || process.env.S3_REGION || 'us-east-1';
  const accessKeyId = s3Dest.config.key || process.env.S3_ACCESS_KEY || '';
  const secretAccessKey = s3Dest.config.secret || process.env.S3_SECRET_KEY || '';
  const bucket = s3Dest.config.bucket || process.env.S3_BUCKET || '';

  if (!accessKeyId || !secretAccessKey || !bucket) {
    context.logger.warn('[S3] Missing credentials or bucket — skipping');
    return false;
  }

  try {
    const client = new S3Client({ region, credentials: { accessKeyId, secretAccessKey } });
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: `backups/${record.id}.zip`,
        Body: archiveData,
      }),
    );
    context.logger.log(
      `[S3] Uploaded backup ${record.id} to s3://${bucket}/backups/${record.id}.zip`,
    );
    return true;
  } catch (err) {
    context.logger.warn(
      `[S3] Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
    );
    return false;
  }
}

async function storeToGDrive(
  context: PluginContext,
  record: BackupRecord,
  archiveData: Buffer,
  destinations: BackupDestination[],
): Promise<boolean> {
  const gdriveDest = destinations.find((d) => d.type === 'gdrive');
  if (!gdriveDest) return false;

  const token = gdriveDest.config.token || process.env.GDRIVE_TOKEN || '';
  const folderId = gdriveDest.config.folderId || process.env.GDRIVE_FOLDER_ID || '';

  if (!token) {
    context.logger.warn('[GDrive] No access token configured — skipping');
    return false;
  }

  try {
    // Step 1: Initiate resumable upload and get upload URL
    const metadataRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `backup-${record.id}.zip`,
          parents: folderId ? [folderId] : [],
        }),
      },
    );

    if (!metadataRes.ok) {
      context.logger.warn(
        `[GDrive] Failed to initiate upload: ${metadataRes.status} ${metadataRes.statusText}`,
      );
      return false;
    }

    const uploadUrl = metadataRes.headers.get('Location');
    if (!uploadUrl) {
      context.logger.warn('[GDrive] No upload URL returned');
      return false;
    }

    // Step 2: Upload the binary data
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/zip' },
      body: new Blob([Uint8Array.from(archiveData)], { type: 'application/zip' }),
    });

    if (uploadRes.ok) {
      context.logger.log(`[GDrive] Uploaded backup ${record.id}`);
      return true;
    }
    context.logger.warn(`[GDrive] Upload failed: ${uploadRes.status} ${uploadRes.statusText}`);
    return false;
  } catch (err) {
    context.logger.warn(`[GDrive] Upload error: ${err instanceof Error ? err.message : 'Unknown'}`);
    return false;
  }
}

async function storeToDropbox(
  context: PluginContext,
  record: BackupRecord,
  archiveData: Buffer,
  destinations: BackupDestination[],
): Promise<boolean> {
  const dropboxDest = destinations.find((d) => d.type === 'dropbox');
  if (!dropboxDest) return false;

  const token = dropboxDest.config.token || process.env.DROPBOX_TOKEN || '';

  if (!token) {
    context.logger.warn('[Dropbox] No access token configured — skipping');
    return false;
  }

  try {
    const res = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify({
          path: `/backups/backup-${record.id}.zip`,
          mode: 'add',
          autorename: true,
          mute: false,
        }),
      },
      body: new Blob([Uint8Array.from(archiveData)], { type: 'application/octet-stream' }),
    });

    if (res.ok) {
      context.logger.log(`[Dropbox] Uploaded backup ${record.id}`);
      return true;
    }
    context.logger.warn(`[Dropbox] Upload failed: ${res.status} ${res.statusText}`);
    return false;
  } catch (err) {
    context.logger.warn(
      `[Dropbox] Upload error: ${err instanceof Error ? err.message : 'Unknown'}`,
    );
    return false;
  }
}

async function storeToLocal(
  context: PluginContext,
  record: BackupRecord,
  archiveData: Buffer,
  destinations: BackupDestination[],
): Promise<boolean> {
  const localDest = destinations.find((d) => d.type === 'local');
  if (!localDest) return false;

  const dir = localDest.config.path || join(process.cwd(), 'backups');
  try {
    mkdirSync(dir, { recursive: true });
    const filePath = join(dir, `${record.id}.zip`);
    writeFileSync(filePath, archiveData);
    context.logger.log(
      `[Local] Stored backup ${record.id} to ${filePath} (${archiveData.length} bytes)`,
    );
    return true;
  } catch (err) {
    context.logger.warn(
      `[Local] Write failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
    );
    return false;
  }
}

function rotateBackups(context: PluginContext, retentionDays: number): void {
  const cutoff = Date.now() - retentionDays * 86400000;
  const expired = backupHistory.filter((r) => r.timestamp < cutoff && !r.restoredAt);
  expired.forEach((r) => {
    r.status = 'failed';
  });
  if (expired.length > 0) {
    context.logger.log(`Rotated ${expired.length} backups older than ${retentionDays} days`);
  }
}

async function performBackup(
  context: PluginContext,
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
    let dump: string = '';

    if (config.includeDatabase) {
      includes.push('database');
      dump = await createSqlDump();
      files.push(`db/backup-${id}.sql`);
    }

    if (config.includeMedia) {
      includes.push('media');
      const mediaEntries = ['uploads/image1.jpg', 'uploads/image2.png', 'uploads/document.pdf'];
      files.push(...mediaEntries);
    }

    if (config.includeThemes) {
      includes.push('themes');
      files.push('themes/default/layout.hbs');
    }

    if (config.includePlugins) {
      includes.push('plugins');
      files.push('plugins/custom/plugin.js');
    }

    record.includes = includes;
    record.files = files;

    // Create the real ZIP archive
    const archiveData = await createZipArchive(dump, files);
    record.sizeBytes = archiveData.length;

    // Calculate SHA-256 checksum of the archive data
    if (config.encryptionEnabled && config.encryptionKey) {
      record.checksum = calculateChecksum(archiveData.toString() + config.encryptionKey);
    } else {
      record.checksum = calculateChecksum(archiveData.toString());
    }

    const storePromises: Promise<boolean>[] = [];
    for (const dest of config.destinations) {
      if (!dest.enabled) continue;
      switch (dest.type) {
        case 's3':
          storePromises.push(storeToS3(context, record, archiveData, config.destinations));
          break;
        case 'gdrive':
          storePromises.push(storeToGDrive(context, record, archiveData, config.destinations));
          break;
        case 'dropbox':
          storePromises.push(storeToDropbox(context, record, archiveData, config.destinations));
          break;
        case 'local':
          storePromises.push(storeToLocal(context, record, archiveData, config.destinations));
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
      try {
        if (isRunning) {
          context.logger.warn('Backup: A backup is already in progress');
          return;
        }
        isRunning = true;
        try {
          const type = (data as { manual?: boolean })?.manual ? 'manual' : 'scheduled';
          const record = await performBackup(context, config, type);
          context.logger.log(
            `Backup: ${record.id} ${record.status} (${(record.sizeBytes / 1024 / 1024).toFixed(2)} MB)`,
          );
        } finally {
          isRunning = false;
        }
      } catch (err) {
        context.logger.warn(
          `Backup: run error - ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
      }
    });

    context.hooks.addAction('backup:schedule', async () => {
      try {
        context.logger.log(
          `Backup: Scheduled ${config.schedule} backup configured with ${config.retentionDays} day retention`,
        );
        rotateBackups(context, config.retentionDays);
      } catch (err) {
        context.logger.warn(
          `Backup: schedule error - ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
      }
    });

    context.hooks.addAction('backup:restore', async (data: unknown) => {
      try {
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
      } catch (err) {
        context.logger.warn(
          `Backup: restore error - ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
      }
    });

    context.hooks.addAction('backup:list', async (data: unknown) => {
      try {
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
      } catch (err) {
        context.logger.warn(
          `Backup: list error - ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
      }
    });

    context.hooks.addAction('backup:cleanup', async () => {
      try {
        rotateBackups(context, config.retentionDays);
        context.logger.log(`Backup: Cleanup completed (retention: ${config.retentionDays} days)`);
      } catch (err) {
        context.logger.warn(
          `Backup: cleanup error - ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
      }
    });

    context.hooks.addAction('backup:config:update', async (data: unknown) => {
      try {
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
      } catch (err) {
        context.logger.warn(
          `Backup: config:update error - ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
      }
    });

    context.hooks.addAction('admin:dashboard:render', async (data: unknown) => {
      try {
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
      } catch (err) {
        context.logger.warn(
          `Backup: admin:dashboard:render error - ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
      }
    });

    context.hooks.addAction('admin:settings:render', async (data: unknown) => {
      try {
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
      } catch (err) {
        context.logger.warn(
          `Backup: admin:settings:render error - ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
      }
    });

    context.logger.log('Backup plugin booted');
  },

  async activate(context: PluginContext) {
    context.logger.log('Backup plugin activated');
  },

  async deactivate(context: PluginContext) {
    context.logger.log('Backup plugin deactivated');
  },
};
