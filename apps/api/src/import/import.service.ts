import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as https from 'https';
import * as http from 'http';
import { WxrParser } from './wxr-parser-api';

export interface ImportPreviewItem {
  id: string;
  title: string;
  type: string;
  status: string;
  author: string;
  date: string;
  willImport: boolean;
}

export interface ImportResult {
  success: boolean;
  sessionId: string;
  stats: {
    posts: number;
    pages: number;
    media: number;
    categories: number;
    tags: number;
    comments: number;
    users: number;
    menus: number;
    menuItems: number;
    skipped: number;
    errors: number;
  };
  errors: string[];
}

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);
  private readonly uploadsDir: string;
  private readonly rollbackFile: string;

  constructor(private readonly prisma: PrismaService) {
    this.uploadsDir = process.env.MEDIA_DIR || path.join(process.cwd(), 'uploads', 'imported');
    this.rollbackFile = path.join(process.cwd(), 'storage', '.wp-import-rollback.json');
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  /**
   * Preview a WXR file before importing
   */
  async previewWxr(filePath: string): Promise<{
    preview: ImportPreviewItem[];
    counts: {
      posts: number;
      pages: number;
      media: number;
      categories: number;
      tags: number;
      users: number;
      comments: number;
      menuItems: number;
    };
    meta: any;
  }> {
    if (!fs.existsSync(filePath)) {
      throw new BadRequestException('Uploaded file not found on server');
    }

    const parser = new WxrParser();
    const wxr = parser.parse(filePath);

    // Build preview items
    const preview: ImportPreviewItem[] = wxr.items
      .filter((i: any) => i.type !== 'revision' && i.type !== 'nav_menu_item')
      .slice(0, 200) // Limit preview to 200 items
      .map((item: any) => ({
        id: item.id,
        title: item.title || '(no title)',
        type: item.type,
        status: item.status || 'DRAFT',
        author: item.creator || 'Unknown',
        date: item.postDate ? new Date(item.postDate).toISOString().split('T')[0] : '',
        willImport: true,
      }));

    return {
      preview,
      counts: {
        posts: wxr.stats.posts,
        pages: wxr.stats.pages,
        media: wxr.stats.media,
        categories: wxr.categories.length,
        tags: wxr.tags.length,
        users: wxr.authors.length,
        comments: wxr.stats.totalComments,
        menuItems: wxr.stats.navMenuItems,
      },
      meta: wxr.meta,
    };
  }

  /**
   * Execute a full WXR import
   */
  async importWxr(
    filePath: string,
    options: {
      importMedia?: boolean;
      importUsers?: boolean;
      downloadMedia?: boolean;
      baseSiteUrl?: string;
    } = {},
  ): Promise<ImportResult> {
    if (!fs.existsSync(filePath)) {
      throw new BadRequestException('Uploaded file not found on server');
    }

    const parser = new WxrParser();
    const wxr = parser.parse(filePath);

    const sessionId = `api-import-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;
    const errors: string[] = [];
    const startTime = Date.now();

    // Mappings
    const userMap: Record<string, string> = {};
    const termMap: Record<string, string> = {};
    const postMap: Record<string, string> = {};
    const commentIdMap: Record<string, string> = {};

    // Stats
    const stats = {
      posts: 0,
      pages: 0,
      media: 0,
      categories: 0,
      tags: 0,
      comments: 0,
      users: 0,
      menus: 0,
      menuItems: 0,
      skipped: 0,
      errors: 0,
    };

    // Rollback tracking
    const rollbackData: any = {
      sessionId,
      timestamp: new Date().toISOString(),
      filePath,
      createdUserIds: [],
      createdTermIds: [],
      createdEntryIds: [],
      createdCommentIds: [],
      createdMediaIds: [],
      createdMenuIds: [],
      createdMenuItemIds: [],
      updatedSettingKeys: [],
    };

    try {
      // Step 1: Import users
      if (options.importUsers !== false) {
        for (const author of wxr.authors) {
          try {
            let user = author.email
              ? await this.prisma.user
                  .findUnique({ where: { email: author.email } })
                  .catch(() => null)
              : null;

            if (!user && author.displayName) {
              user = await this.prisma.user
                .findFirst({
                  where: { name: author.displayName },
                })
                .catch(() => null);
            }

            if (user) {
              userMap[author.login] = user.id;
              stats.skipped++;
            } else {
              const tempPassword = crypto.randomBytes(16).toString('hex');
              const bcrypt = require('bcryptjs');
              const passwordHash = await bcrypt.hash(tempPassword, 12);

              user = await this.prisma.user.create({
                data: {
                  email: author.email || `${author.login}@imported.local`,
                  name:
                    author.displayName ||
                    `${author.firstName} ${author.lastName}`.trim() ||
                    author.login,
                  displayName: author.displayName || author.login,
                  passwordHash,
                  role: 'AUTHOR',
                  capabilities: ['read', 'write', 'upload_files'],
                  userRegistered: new Date(),
                  forcePasswordChange: true,
                },
              });
              userMap[author.login] = user.id;
              rollbackData.createdUserIds.push(user.id);
              stats.users++;
            }
          } catch (err: any) {
            errors.push(`User "${author.login}": ${err.message}`);
            stats.errors++;
            const admin = await this.prisma.user
              .findFirst({
                where: { role: 'ADMIN' },
              })
              .catch(() => null);
            if (admin) userMap[author.login] = admin.id;
          }
        }
        this.logger.log(`Imported ${stats.users} users`);
      }

      // Step 2: Import categories
      if (wxr.categories.length > 0) {
        let taxonomy = await this.prisma.taxonomy
          .findUnique({ where: { name: 'category' } })
          .catch(() => null);
        if (!taxonomy) {
          taxonomy = await this.prisma.taxonomy.create({
            data: { name: 'category', hierarchical: true },
          });
        }

        const parentMap: Record<string, string> = {};
        for (const cat of wxr.categories) {
          try {
            const slug = cat.slug || this.slugify(cat.name);
            const existing = await this.prisma.term
              .findFirst({
                where: { taxonomyId: taxonomy.id, slug },
              })
              .catch(() => null);

            if (existing) {
              termMap[cat.name] = existing.id;
              if (cat.termId) termMap[`cat:${cat.termId}`] = existing.id;
              continue;
            }

            const term = await this.prisma.term.create({
              data: {
                taxonomyId: taxonomy.id,
                name: cat.name,
                slug,
                description: cat.description || '',
                count: 0,
              },
            });
            termMap[cat.name] = term.id;
            if (cat.termId) termMap[`cat:${cat.termId}`] = term.id;
            if (cat.parent) parentMap[term.id] = cat.parent;
            rollbackData.createdTermIds.push(term.id);
            stats.categories++;
          } catch (err: any) {
            errors.push(`Category "${cat.name}": ${err.message}`);
            stats.errors++;
          }
        }

        // Set parent relationships
        for (const [termId, parentName] of Object.entries(parentMap)) {
          const parentId = termMap[`cat:${parentName}`] || termMap[parentName];
          if (parentId) {
            await this.prisma.term
              .update({
                where: { id: termId },
                data: { parentId },
              })
              .catch(() => {});
          }
        }
      }

      // Step 3: Import tags
      if (wxr.tags.length > 0) {
        let taxonomy = await this.prisma.taxonomy
          .findUnique({ where: { name: 'post_tag' } })
          .catch(() => null);
        if (!taxonomy) {
          taxonomy = await this.prisma.taxonomy.create({
            data: { name: 'post_tag', hierarchical: false },
          });
        }

        for (const tag of wxr.tags) {
          try {
            const slug = tag.slug || this.slugify(tag.name);
            const existing = await this.prisma.term
              .findFirst({
                where: { taxonomyId: taxonomy.id, slug },
              })
              .catch(() => null);

            if (existing) {
              termMap[tag.name] = existing.id;
              if (tag.termId) termMap[`tag:${tag.termId}`] = existing.id;
              continue;
            }

            const term = await this.prisma.term.create({
              data: {
                taxonomyId: taxonomy.id,
                name: tag.name,
                slug,
                description: tag.description || '',
                count: 0,
              },
            });
            termMap[tag.name] = term.id;
            if (tag.termId) termMap[`tag:${tag.termId}`] = term.id;
            rollbackData.createdTermIds.push(term.id);
            stats.tags++;
          } catch (err: any) {
            errors.push(`Tag "${tag.name}": ${err.message}`);
            stats.errors++;
          }
        }
      }

      // Step 4: Ensure content types exist
      const contentTypeNames = ['post', 'page', 'attachment', 'nav_menu_item', 'revision'];
      const contentTypes: Record<string, any> = {};
      for (const name of contentTypeNames) {
        let ct = await this.prisma.contentType.findUnique({ where: { name } }).catch(() => null);
        if (!ct) {
          ct = await this.prisma.contentType.create({
            data: {
              name,
              label: { singular: name, plural: `${name}s` },
              fields: {},
              supports: ['title', 'editor', 'thumbnail'],
            },
          });
        }
        contentTypes[name] = ct;
      }

      // Step 5: Import content items
      const defaultAuthor = await this.prisma.user
        .findFirst({
          where: { role: 'ADMIN' },
          orderBy: { createdAt: 'asc' },
        })
        .catch(() => null);

      for (const item of wxr.items) {
        try {
          if (item.type === 'revision') {
            stats.skipped++;
            continue;
          }

          // Handle nav_menu_item separately
          if (item.type === 'nav_menu_item') {
            const menuName = item.meta?.menu_item_menu_name || 'primary';
            let menu = await this.prisma.menu
              .findUnique({ where: { location: menuName } })
              .catch(() => null);
            if (!menu) {
              menu = await this.prisma.menu.create({ data: { location: menuName } });
              rollbackData.createdMenuIds.push(menu.id);
              stats.menus++;
            }

            const label = item.meta?.menu_item_label || item.title || 'Custom Link';
            const url = item.meta?.menu_item_url || '#';

            if (item.status === 'PUBLISHED' || item.status === 'publish') {
              const menuItem = await this.prisma.menuItem.create({
                data: {
                  menuId: menu.id,
                  label,
                  url,
                  order: item.menuOrder || 0,
                },
              });
              rollbackData.createdMenuItemIds.push(menuItem.id);
              stats.menuItems++;
            }
            continue;
          }

          const contentTypeId = contentTypes[item.type]?.id || contentTypes['post'].id;

          // Check for duplicates
          const existing = await this.prisma.contentEntry
            .findFirst({
              where: { contentTypeId, slug: item.slug },
            })
            .catch(() => null);
          if (existing) {
            postMap[item.id] = existing.id;
            stats.skipped++;
            continue;
          }

          const authorId = userMap[item.creator] || defaultAuthor?.id || '';

          const data: any = {
            title: item.title || '(no title)',
            content: item.content || '',
          };

          // Clean content URLs
          if (wxr.meta?.baseSiteUrl && data.content) {
            data.content = data.content.replace(
              new RegExp(this.escapeRegex(wxr.meta.baseSiteUrl), 'g'),
              '',
            );
          }

          if (item.type === 'attachment' && item.attachmentUrl) {
            data.mediaUrl = item.attachmentUrl;
            data.alt = item.meta?._wp_attachment_image_alt || item.title || '';
            data.caption = item.excerpt || '';
          }

          let publishedAt = item.postDateGmt || item.postDate || null;

          const entry = await this.prisma.contentEntry.create({
            data: {
              contentTypeId,
              slug: item.slug,
              status: item.status || 'DRAFT',
              data,
              seo: {
                metaTitle: item.title?.substring(0, 60) || undefined,
                metaDescription: item.excerpt?.substring(0, 160) || undefined,
              },
              authorId: authorId || defaultAuthor?.id || '',
              publishedAt,
              excerpt: item.excerpt?.substring(0, 500) || undefined,
              commentStatus: item.commentStatus || 'open',
              menuOrder: item.menuOrder || 0,
              isSticky: item.isSticky || false,
              template: item.template || undefined,
            },
          });

          postMap[item.id] = entry.id;
          rollbackData.createdEntryIds.push(entry.id);

          if (item.type === 'page') stats.pages++;
          else if (item.type === 'attachment') stats.media++;
          else stats.posts++;

          // Attach categories
          for (const cat of item.categories) {
            const termId = termMap[cat.name] || termMap[`cat:${cat.nicename}`];
            if (termId) {
              await this.prisma.termRelation
                .create({
                  data: { entryId: entry.id, termId },
                })
                .catch(() => {});
            }
          }

          // Attach tags
          for (const tag of item.tags) {
            const termId = termMap[tag.name] || termMap[`tag:${tag.nicename}`];
            if (termId) {
              await this.prisma.termRelation
                .create({
                  data: { entryId: entry.id, termId },
                })
                .catch(() => {});
            }
          }

          // Import meta
          for (const [key, value] of Object.entries(item.meta || {})) {
            if (key.startsWith('_') && !key.startsWith('_acf') && !key.startsWith('_wp_attachment'))
              continue;
            try {
              let parsedValue: any = value;
              try {
                parsedValue = JSON.parse(value as string);
              } catch {}
              await this.prisma.contentMeta
                .create({
                  data: { entryId: entry.id, key, value: parsedValue },
                })
                .catch(() => {});
            } catch {}
          }
        } catch (err: any) {
          errors.push(`Item "${item.title || item.slug}": ${err.message}`);
          stats.errors++;
        }
      }

      // Step 6: Import comments
      for (const item of wxr.items) {
        const entryId = postMap[item.id];
        if (!entryId || !item.comments?.length) continue;

        for (const comment of item.comments) {
          try {
            const status =
              comment.approved === '1'
                ? 'APPROVED'
                : comment.approved === '0'
                  ? 'PENDING'
                  : comment.approved === 'spam'
                    ? 'SPAM'
                    : 'APPROVED';

            const created = await this.prisma.comment.create({
              data: {
                entryId,
                authorName: comment.author || 'Anonymous',
                authorEmail: comment.email || '',
                content: comment.content || '',
                status: status as any,
                createdAt: comment.date ? new Date(comment.date) : new Date(),
                ipAddress: comment.ip || '',
              },
            });
            commentIdMap[comment.id] = created.id;
            rollbackData.createdCommentIds.push(created.id);
            stats.comments++;
          } catch (err: any) {
            errors.push(`Comment: ${err.message}`);
            stats.errors++;
          }
        }
      }

      // Set threaded comment relationships
      for (const item of wxr.items) {
        const entryId = postMap[item.id];
        if (!entryId || !item.comments?.length) continue;
        for (const comment of item.comments) {
          if (comment.parent && comment.parent !== '0') {
            const childId = commentIdMap[comment.id];
            const parentId = commentIdMap[comment.parent];
            if (childId && parentId) {
              await this.prisma.comment
                .update({
                  where: { id: childId },
                  data: { parentId },
                })
                .catch(() => {});
            }
          }
        }
      }

      // Step 7: Download media (if requested)
      if (options.downloadMedia) {
        let mediaCount = 0;
        for (const item of wxr.items) {
          if (item.type !== 'attachment' || !item.attachmentUrl) continue;
          try {
            const success = await this.downloadMediaFile(item.attachmentUrl);
            if (success) mediaCount++;
          } catch {}
        }
        this.logger.log(`Downloaded ${mediaCount} media files`);
      }

      // Step 8: Update settings
      await this.prisma.setting
        .upsert({
          where: { group_key: { group: 'general', key: 'site_title' } },
          update: { value: wxr.meta.title || '' },
          create: {
            group: 'general',
            key: 'site_title',
            value: wxr.meta.title || '',
            autoload: true,
          },
        })
        .catch(() => {});
      await this.prisma.setting
        .upsert({
          where: { group_key: { group: 'system', key: 'wp_imported' } },
          update: { value: 'true' },
          create: { group: 'system', key: 'wp_imported', value: 'true', autoload: true },
        })
        .catch(() => {});
      await this.prisma.setting
        .upsert({
          where: { group_key: { group: 'system', key: 'wp_import_session_id' } },
          update: { value: sessionId },
          create: {
            group: 'system',
            key: 'wp_import_session_id',
            value: sessionId,
            autoload: true,
          },
        })
        .catch(() => {});

      // Save rollback data
      await this.saveRollbackData(rollbackData);

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      this.logger.log(
        `Import complete in ${elapsed}s: ${stats.posts} posts, ${stats.pages} pages, ${stats.comments} comments`,
      );

      return {
        success: true,
        sessionId,
        stats,
        errors,
      };
    } catch (err: any) {
      this.logger.error(`Import failed: ${err.message}`, err.stack);
      throw err;
    }
  }

  /**
   * Rollback the last import
   */
  async rollback(): Promise<{ success: boolean; message: string }> {
    if (!fs.existsSync(this.rollbackFile)) {
      throw new BadRequestException('No rollback data found. Nothing to undo.');
    }

    let rollbacks: any[];
    try {
      rollbacks = JSON.parse(fs.readFileSync(this.rollbackFile, 'utf-8'));
    } catch {
      throw new BadRequestException('Corrupted rollback data file');
    }

    if (!rollbacks.length) {
      throw new BadRequestException('No previous imports to rollback');
    }

    const lastImport = rollbacks[rollbacks.length - 1];
    const rd = lastImport;

    // Delete in reverse order
    if (rd.createdMenuItemIds?.length) {
      await this.prisma.menuItem
        .deleteMany({
          where: { id: { in: rd.createdMenuItemIds } },
        })
        .catch(() => {});
    }
    if (rd.createdMenuIds?.length) {
      await this.prisma.menu
        .deleteMany({
          where: { id: { in: rd.createdMenuIds } },
        })
        .catch(() => {});
    }
    if (rd.createdCommentIds?.length) {
      await this.prisma.comment
        .deleteMany({
          where: { id: { in: rd.createdCommentIds } },
        })
        .catch(() => {});
    }
    if (rd.createdMediaIds?.length) {
      await this.prisma.media
        .deleteMany({
          where: { id: { in: rd.createdMediaIds } },
        })
        .catch(() => {});
    }
    if (rd.createdEntryIds?.length) {
      await this.prisma.termRelation
        .deleteMany({
          where: { entryId: { in: rd.createdEntryIds } },
        })
        .catch(() => {});
      await this.prisma.contentMeta
        .deleteMany({
          where: { entryId: { in: rd.createdEntryIds } },
        })
        .catch(() => {});
      await this.prisma.contentEntry
        .deleteMany({
          where: { id: { in: rd.createdEntryIds } },
        })
        .catch(() => {});
    }
    if (rd.createdTermIds?.length) {
      await this.prisma.termRelation
        .deleteMany({
          where: { termId: { in: rd.createdTermIds } },
        })
        .catch(() => {});
      await this.prisma.term
        .deleteMany({
          where: { id: { in: rd.createdTermIds } },
        })
        .catch(() => {});
    }
    if (rd.createdUserIds?.length) {
      await this.prisma.user
        .deleteMany({
          where: { id: { in: rd.createdUserIds } },
        })
        .catch(() => {});
    }

    // Remove from file
    rollbacks.pop();
    if (rollbacks.length) {
      fs.writeFileSync(this.rollbackFile, JSON.stringify(rollbacks, null, 2));
    } else {
      fs.unlinkSync(this.rollbackFile);
    }

    return {
      success: true,
      message: `Rollback complete. Removed import from ${rd.timestamp}`,
    };
  }

  // ── Helpers ────────────────────────────────────────────────

  private async downloadMediaFile(url: string): Promise<boolean> {
    try {
      const parsedUrl = new URL(url);
      const filename = path.basename(parsedUrl.pathname) || `media-${Date.now()}`;
      const destPath = path.join(this.uploadsDir, filename.replace(/[^a-zA-Z0-9._-]/g, '_'));

      if (fs.existsSync(destPath)) return true;

      return new Promise((resolve) => {
        const client = parsedUrl.protocol === 'https:' ? https : http;
        const req = client.get(url, { timeout: 30000 }, (res) => {
          if (res.statusCode !== 200) {
            resolve(false);
            return;
          }
          const fileStream = fs.createWriteStream(destPath);
          res.pipe(fileStream);
          fileStream.on('finish', () => {
            fileStream.close();
            resolve(true);
          });
          fileStream.on('error', () => resolve(false));
        });
        req.on('error', () => resolve(false));
        req.on('timeout', () => {
          req.destroy();
          resolve(false);
        });
      });
    } catch {
      return false;
    }
  }

  private async saveRollbackData(data: any): Promise<void> {
    try {
      const dir = path.dirname(this.rollbackFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      let existing: any[] = [];
      if (fs.existsSync(this.rollbackFile)) {
        existing = JSON.parse(fs.readFileSync(this.rollbackFile, 'utf-8'));
      }
      existing.push(data);
      if (existing.length > 5) existing = existing.slice(-5);
      fs.writeFileSync(this.rollbackFile, JSON.stringify(existing, null, 2));
    } catch {}
  }

  private slugify(str: string): string {
    if (!str) return '';
    return str
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 200);
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
