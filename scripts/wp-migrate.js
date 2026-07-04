#!/usr/bin/env node

/**
 * ============================================================
 * NodePress WordPress Migration Tool (CLI)
 * ============================================================
 * One-command WordPress import — like WordPress's built-in
 * XML import tool, but for NodePress.
 *
 * Usage:
 *   node scripts/wp-migrate.js --file=wordpress-export.xml
 *   node scripts/wp-migrate.js --file=wordpress-export.xml --url=https://old-site.com --media
 *   node scripts/wp-migrate.js --dir=./wp-exports/           # batch import
 *   node scripts/wp-migrate.js --file=export.xml --dry-run    # preview only
 *   node scripts/wp-migrate.js --rollback                     # undo last import
 *
 * Imports:
 *   ✓ Posts & Pages (all statuses)
 *   ✓ Media attachments (downloads + uploads)
 *   ✓ Categories & Tags (hierarchical)
 *   ✓ Custom taxonomies & terms
 *   ✓ Users with role mapping
 *   ✓ Comments (threaded)
 *   ✓ Navigation menus
 *   ✓ Custom fields & meta
 *   ✓ ACF field values
 * ============================================================
 */

// ── Dependencies ─────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const http = require('http');
const https = require('https');
const cliProgress = require('cli-progress');

// ── Local Imports ───────────────────────────────────────────
const {
  parseWxr,
  validateWxrFile,
  slugify,
  ROLE_MAP,
  COMMENT_STATUS_MAP,
} = require('./lib/wxr-parser');

// ── Constants ───────────────────────────────────────────────
const ROOT = path.resolve(__dirname, '..');
const IMPORT_SESSION_FILE = path.join(ROOT, 'storage', '.wp-import-session.json');
const IMPORT_ERROR_LOG = path.join(ROOT, 'storage', 'wp-import-errors.log');
const IMPORT_MEDIA_DIR = path.join(ROOT, 'storage', 'imported-media');
const ROLLBACK_FILE = path.join(ROOT, 'storage', '.wp-import-rollback.json');

// ── Terminal Colors ──────────────────────────────────────────
const C = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

function color(text, c) {
  return `${c}${text}${C.reset}`;
}

function log(msg, c = C.blue) {
  console.log(`  ${color('→', c)} ${msg}`);
}

function ok(msg) {
  console.log(`  ${color('✓', C.green)} ${msg}`);
}

function warn(msg) {
  console.log(`  ${color('⚠', C.yellow)} ${msg}`);
}

function fail(msg) {
  console.log(`  ${color('✗', C.red)} ${msg}`);
}

function header(text) {
  const line = '─'.repeat(Math.min(text.length + 4, 60));
  console.log(`\n  ${color(line, C.cyan)}`);
  console.log(`  ${color('❖', C.cyan)} ${color(text, C.bold)}`);
  console.log(`  ${color(line, C.cyan)}\n`);
}

// ── Prisma Connector ────────────────────────────────────────
let prisma = null;

async function getPrisma() {
  if (prisma) return prisma;
  const { PrismaClient } = require('@prisma/client');
  prisma = new PrismaClient();
  await prisma.$connect();
  return prisma;
}

async function disconnectPrisma() {
  if (prisma) {
    await prisma.$disconnect().catch(() => {});
    prisma = null;
  }
}

// ── Progress Bar ────────────────────────────────────────────
class ProgressBar {
  constructor(name, total) {
    this.bar = new cliProgress.SingleBar({
      format: `  ${color('▸', C.cyan)} ${color('{name}', C.dim)} |${color('{bar}', C.green)}| ${color('{value}/{total}', C.bold)} {percentage}%`,
      barCompleteChar: '█',
      barIncompleteChar: '░',
      hideCursor: true,
      clearOnComplete: false,
      stopOnComplete: true,
    });
    this.name = name;
    this.total = total;
    this.value = 0;
  }

  start() {
    this.bar.start(this.total, 0, { name: this.name });
  }

  increment(n = 1) {
    this.value += n;
    this.bar.update(this.value);
  }

  update(value) {
    this.value = value;
    this.bar.update(value);
  }

  stop() {
    this.bar.stop();
  }
}

// ── Error Logger ─────────────────────────────────────────────
function logError(context, message, data = {}) {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] [${context}] ${message} ${Object.keys(data).length ? JSON.stringify(data) : ''}`;
  fs.appendFileSync(IMPORT_ERROR_LOG, entry + '\n');
  warn(`${context}: ${message}`);
}

// ── WordPress Importer ──────────────────────────────────────
class WordPressImporter {
  constructor(options = {}) {
    this.filePath = options.filePath || '';
    this.dryRun = options.dryRun || false;
    this.options = options;
    this.sessionId = generateSessionId();
    this.startTime = Date.now();

    // Mappings
    this.userMap = {}; // wp login → nodepress user id
    this.termMap = {}; // wp term name → nodepress term id
    this.commentParentMap = {}; // wp comment id → nodepress comment id
    this.postMap = {}; // wp post id → nodepress entry id
    this.mediaUrlMap = {}; // wp attachment url → nodepress media id
    this.oldToNewCommentId = {}; // wp comment id → nodepress comment id

    // Stats
    this.stats = {
      posts: 0,
      pages: 0,
      media: 0,
      categories: 0,
      tags: 0,
      customTerms: 0,
      comments: 0,
      users: 0,
      menus: 0,
      menuItems: 0,
      metaEntries: 0,
      skipped: 0,
      errors: 0,
      warnings: 0,
    };

    // Rollback tracking
    this.rollbackData = {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      filePath: this.filePath,
      createdUserIds: [],
      createdTermIds: [],
      createdEntryIds: [],
      createdCommentIds: [],
      createdMediaIds: [],
      createdMenuIds: [],
      createdMenuItemIds: [],
      updatedSettingKeys: [],
    };
  }

  // ── Main Import Entry ──────────────────────────────────────
  async import() {
    header(`WordPress Import: ${path.basename(this.filePath)}`);
    log('Parsing WordPress export file...');

    if (!fs.existsSync(this.filePath)) {
      fail(`File not found: ${this.filePath}`);
      process.exit(1);
    }

    // Validate WXR
    const validation = validateWxrFile(this.filePath);
    if (!validation.valid) {
      fail(`Invalid WXR file: ${validation.errors.join(', ')}`);
      process.exit(1);
    }

    // Parse WXR
    const wxr = parseWxr(this.filePath, {
      onProgress: (pct, msg) => {
        // Silently track progress
      },
    });

    ok(
      `Parsed ${wxr.items.length} items, ${wxr.categories.length} categories, ${wxr.tags.length} tags, ${wxr.authors.length} users`,
    );

    // Print preview
    this.printPreview(wxr);

    if (this.dryRun) {
      log(color('DRY RUN — No changes were made', C.yellow));
      console.log('');
      return { dryRun: true, ...this.stats };
    }

    // Check for confirmation
    if (!this.options.yes) {
      const confirmed = await this.confirmImport();
      if (!confirmed) {
        log('Import cancelled.', C.yellow);
        return;
      }
    }

    // Ensure directories exist
    if (!fs.existsSync(path.dirname(IMPORT_SESSION_FILE))) {
      fs.mkdirSync(path.dirname(IMPORT_SESSION_FILE), { recursive: true });
    }
    if (!fs.existsSync(IMPORT_MEDIA_DIR)) {
      fs.mkdirSync(IMPORT_MEDIA_DIR, { recursive: true });
    }

    try {
      await getPrisma();
      ok('Database connected');

      // Step 1: Import users
      await this.importUsers(wxr.authors);

      // Step 2: Import categories
      await this.importCategories(wxr.categories);

      // Step 3: Import tags
      await this.importTags(wxr.tags);

      // Step 4: Import custom terms
      await this.importCustomTerms(wxr.terms);

      // Step 5: Import content items
      await this.importItems(wxr.items, wxr.meta.baseSiteUrl);

      // Step 6: Import comments
      await this.importComments(wxr.items);

      // Step 7: Import menus
      await this.importMenus(wxr.items);

      // Step 8: Transfer featured images
      await this.transferFeaturedImages(wxr.items);

      // Step 9: Update site settings
      await this.updateSettings(wxr.meta);

      // Step 10: Download media (if requested)
      if (this.options.media) {
        await this.downloadAllMedia(wxr.items, wxr.meta.baseSiteUrl);
      }

      // Save rollback data
      await this.saveRollbackData();

      // Print summary
      this.printSummary(wxr);

      return this.stats;
    } catch (err) {
      fail(`Import failed: ${err.message}`);
      console.error(err);
      throw err;
    } finally {
      await disconnectPrisma();
    }
  }

  // ── Preview ────────────────────────────────────────────────
  printPreview(wxr) {
    const s = wxr.stats || {};
    console.log('');
    log(color('Preview of items to import:', C.bold));
    console.log(
      `    ${color(`${s.posts || 0} posts`, C.bold)}  ${color(`${s.pages || 0} pages`, C.bold)}  ${color(`${s.media || 0} media`, C.bold)}`,
    );
    console.log(
      `    ${color(`${wxr.categories.length} categories`, C.bold)}  ${color(`${wxr.tags.length} tags`, C.bold)}  ${color(`${wxr.terms.length} custom terms`, C.bold)}`,
    );
    console.log(
      `    ${color(`${wxr.authors.length} users`, C.bold)}  ${color(`${s.totalComments || 0} comments`, C.bold)}  ${color(`${s.navMenuItems || 0} menu items`, C.bold)}`,
    );
    console.log('');
  }

  async confirmImport() {
    return new Promise((resolve) => {
      const rl = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      rl.question(`  ${color('Continue with import? (Y/n) ', C.yellow)}`, (answer) => {
        rl.close();
        resolve(answer.toLowerCase() !== 'n' && answer.toLowerCase() !== 'no');
      });
    });
  }

  // ── Step 1: Import Users ───────────────────────────────────
  async importUsers(authors) {
    if (!authors.length) return;
    header('Importing Users');

    const bar = new ProgressBar('Users', authors.length);
    bar.start();

    for (const author of authors) {
      try {
        // Check if user exists by email
        let user = null;
        if (author.email) {
          user = await prisma.user.findUnique({ where: { email: author.email } }).catch(() => null);
        }

        if (!user && author.displayName) {
          user = await prisma.user
            .findFirst({
              where: { name: author.displayName },
            })
            .catch(() => null);
        }

        if (user) {
          this.userMap[author.login] = user.id;
          this.stats.skipped++;
        } else {
          // Create user with random password
          const tempPassword = crypto.randomBytes(16).toString('hex');
          const bcrypt = require('bcryptjs');
          const passwordHash = await bcrypt.hash(tempPassword, 12);

          const role = author.role || 'AUTHOR';
          const capabilities = this.getRoleCapabilities(role);

          user = await prisma.user.create({
            data: {
              email: author.email || `${author.login}@imported.local`,
              name:
                author.displayName ||
                `${author.firstName} ${author.lastName}`.trim() ||
                author.login,
              displayName: author.displayName || author.login,
              passwordHash,
              role: role,
              capabilities,
              userRegistered: new Date(),
              forcePasswordChange: true,
            },
          });

          this.userMap[author.login] = user.id;
          this.rollbackData.createdUserIds.push(user.id);
          this.stats.users++;
        }
        bar.increment();
      } catch (err) {
        this.stats.errors++;
        logError('User', `Failed "${author.login}": ${err.message}`, { login: author.login });

        // Fallback: assign to admin
        const admin = await prisma.user
          .findFirst({
            where: { OR: [{ role: 'SUPER_ADMIN' }, { role: 'ADMIN' }] },
          })
          .catch(() => null);
        if (admin) {
          this.userMap[author.login] = admin.id;
        }
      }
    }
    bar.stop();
    ok(`Imported ${this.stats.users} users, ${this.stats.skipped} existing`);
  }

  getRoleCapabilities(role) {
    const caps = {
      SUPER_ADMIN: ['*'],
      ADMIN: [
        'read',
        'write',
        'delete',
        'publish',
        'manage_options',
        'upload_files',
        'edit_users',
        'delete_users',
        'manage_categories',
        'moderate_comments',
      ],
      EDITOR: [
        'read',
        'write',
        'delete',
        'publish',
        'upload_files',
        'edit_others',
        'delete_others',
        'manage_categories',
        'moderate_comments',
      ],
      AUTHOR: ['read', 'write', 'delete', 'publish', 'upload_files'],
      CONTRIBUTOR: ['read', 'write'],
      SUBSCRIBER: ['read'],
    };
    return caps[role] || ['read'];
  }

  // ── Step 2: Import Categories ─────────────────────────────
  async importCategories(categories) {
    if (!categories.length) return;
    header('Importing Categories');

    // Find or create "category" taxonomy
    let taxonomy = await prisma.taxonomy
      .findUnique({ where: { name: 'category' } })
      .catch(() => null);
    if (!taxonomy) {
      taxonomy = await prisma.taxonomy.create({ data: { name: 'category', hierarchical: true } });
    }

    // Build hierarchy: process parents first
    const categoriesWithParent = [];
    const categoriesWithoutParent = [];

    for (const cat of categories) {
      if (cat.parent) {
        categoriesWithParent.push(cat);
      } else {
        categoriesWithoutParent.push(cat);
      }
    }

    const orderedCategories = [...categoriesWithoutParent, ...categoriesWithParent];
    const bar = new ProgressBar('Categories', orderedCategories.length);
    bar.start();

    const parentMap = {};

    for (const cat of orderedCategories) {
      try {
        const slug = cat.slug || slugify(cat.name);
        let term = await prisma.term
          .findFirst({
            where: { taxonomyId: taxonomy.id, slug },
          })
          .catch(() => null);

        if (term) {
          this.termMap[cat.name] = term.id;
          if (cat.termId) this.termMap[`cat:${cat.termId}`] = term.id;
          bar.increment();
          continue;
        }

        term = await prisma.term.create({
          data: {
            taxonomyId: taxonomy.id,
            name: cat.name,
            slug,
            description: cat.description || '',
            count: 0,
          },
        });

        this.termMap[cat.name] = term.id;
        if (cat.termId) this.termMap[`cat:${cat.termId}`] = term.id;
        if (cat.parent) {
          parentMap[term.id] = cat.parent;
        }

        this.rollbackData.createdTermIds.push(term.id);
        this.stats.categories++;

        // Import term meta
        if (cat.meta && Object.keys(cat.meta).length > 0) {
          for (const [key, value] of Object.entries(cat.meta)) {
            await prisma.termMeta
              .create({
                data: { termId: term.id, key, value },
              })
              .catch(() => {});
          }
        }

        bar.increment();
      } catch (err) {
        this.stats.errors++;
        logError('Category', `Failed "${cat.name}": ${err.message}`);
        bar.increment();
      }
    }

    // Set parent relationships
    for (const [termId, parentName] of Object.entries(parentMap)) {
      const parentId = this.termMap[`cat:${parentName}`] || this.termMap[parentName];
      if (parentId) {
        await prisma.term
          .update({
            where: { id: termId },
            data: { parentId },
          })
          .catch(() => {});
      }
    }

    bar.stop();
    ok(`Imported ${this.stats.categories} categories`);
  }

  // ── Step 3: Import Tags ───────────────────────────────────
  async importTags(tags) {
    if (!tags.length) return;
    header('Importing Tags');

    let taxonomy = await prisma.taxonomy
      .findUnique({ where: { name: 'post_tag' } })
      .catch(() => null);
    if (!taxonomy) {
      taxonomy = await prisma.taxonomy.create({
        data: { name: 'post_tag', hierarchical: false },
      });
    }

    const bar = new ProgressBar('Tags', tags.length);
    bar.start();

    for (const tag of tags) {
      try {
        const slug = tag.slug || slugify(tag.name);
        let term = await prisma.term
          .findFirst({
            where: { taxonomyId: taxonomy.id, slug },
          })
          .catch(() => null);

        if (term) {
          this.termMap[tag.name] = term.id;
          if (tag.termId) this.termMap[`tag:${tag.termId}`] = term.id;
          bar.increment();
          continue;
        }

        term = await prisma.term.create({
          data: {
            taxonomyId: taxonomy.id,
            name: tag.name,
            slug,
            description: tag.description || '',
            count: 0,
          },
        });

        this.termMap[tag.name] = term.id;
        if (tag.termId) this.termMap[`tag:${tag.termId}`] = term.id;
        this.rollbackData.createdTermIds.push(term.id);
        this.stats.tags++;

        // Import term meta
        if (tag.meta && Object.keys(tag.meta).length > 0) {
          for (const [key, value] of Object.entries(tag.meta)) {
            await prisma.termMeta
              .create({
                data: { termId: term.id, key, value },
              })
              .catch(() => {});
          }
        }

        bar.increment();
      } catch (err) {
        this.stats.errors++;
        logError('Tag', `Failed "${tag.name}": ${err.message}`);
        bar.increment();
      }
    }
    bar.stop();
    ok(`Imported ${this.stats.tags} tags`);
  }

  // ── Step 4: Import Custom Terms ───────────────────────────
  async importCustomTerms(terms) {
    if (!terms.length) return;
    header('Importing Custom Taxonomies');
    log(`${terms.length} custom terms found`);

    const bar = new ProgressBar('Custom Terms', terms.length);
    bar.start();

    for (const term of terms) {
      try {
        // Find or create taxonomy
        let taxonomy = await prisma.taxonomy
          .findUnique({
            where: { name: term.taxonomy },
          })
          .catch(() => null);

        if (!taxonomy) {
          taxonomy = await prisma.taxonomy.create({
            data: {
              name: term.taxonomy,
              hierarchical: term.parent ? true : false,
            },
          });
        }

        const slug = term.slug || slugify(term.name);
        let existingTerm = await prisma.term
          .findFirst({
            where: { taxonomyId: taxonomy.id, slug },
          })
          .catch(() => null);

        if (existingTerm) {
          this.termMap[term.name] = existingTerm.id;
          if (term.termId) this.termMap[`term:${term.termId}`] = existingTerm.id;
          bar.increment();
          continue;
        }

        // Find parent
        let parentId = null;
        if (term.parent) {
          parentId = this.termMap[term.parent] || this.termMap[`term:${term.parent}`] || null;
        }

        const createdTerm = await prisma.term.create({
          data: {
            taxonomyId: taxonomy.id,
            name: term.name,
            slug,
            description: term.description || '',
            parentId,
            count: 0,
          },
        });

        this.termMap[term.name] = createdTerm.id;
        if (term.termId) this.termMap[`term:${term.termId}`] = createdTerm.id;
        this.rollbackData.createdTermIds.push(createdTerm.id);
        this.stats.customTerms++;

        if (term.meta && Object.keys(term.meta).length > 0) {
          for (const [key, value] of Object.entries(term.meta)) {
            await prisma.termMeta
              .create({
                data: { termId: createdTerm.id, key, value },
              })
              .catch(() => {});
          }
        }

        bar.increment();
      } catch (err) {
        this.stats.errors++;
        logError('CustomTerm', `Failed "${term.taxonomy}/${term.name}": ${err.message}`);
        bar.increment();
      }
    }
    bar.stop();
    ok(`Imported ${this.stats.customTerms} custom terms`);
  }

  // ── Step 5: Import Content Items ──────────────────────────
  async importItems(items, baseSiteUrl) {
    const contentItems = items.filter((i) => i.type !== 'nav_menu_item' && i.type !== 'revision');
    const totalItems = contentItems.length;

    if (!totalItems) return;
    header('Importing Content');

    // Ensure content types exist
    const contentTypeNames = [
      'post',
      'page',
      'attachment',
      'revision',
      'nav_menu_item',
      'wp_block',
      'wp_template',
    ];
    const contentTypes = {};
    for (const name of contentTypeNames) {
      let ct = await prisma.contentType.findUnique({ where: { name } }).catch(() => null);
      if (!ct) {
        ct = await prisma.contentType.create({
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

    // Find default author (for fallback)
    const defaultAuthor = await prisma.user
      .findFirst({
        where: { OR: [{ role: 'SUPER_ADMIN' }, { role: 'ADMIN' }] },
        orderBy: { createdAt: 'asc' },
      })
      .catch(() => null);

    const bar = new ProgressBar('Items', totalItems);
    bar.start();

    for (const item of contentItems) {
      try {
        if (item.type === 'revision') {
          this.stats.skipped++;
          bar.increment();
          continue;
        }

        const contentTypeId = contentTypes[item.type]?.id || contentTypes['post'].id;

        // Skip duplicates
        const existing = await prisma.contentEntry
          .findFirst({
            where: { contentTypeId, slug: item.slug },
          })
          .catch(() => null);

        if (existing) {
          this.postMap[item.id] = existing.id;
          this.stats.skipped++;
          bar.increment();
          continue;
        }

        // Build data payload
        const data = {
          title: item.title || '(no title)',
          content: item.content || '',
        };

        // Determine author
        const authorId = this.userMap[item.creator] || defaultAuthor?.id || '';

        // Parse dates
        let publishedAt = item.postDateGmt || item.postDate || null;

        // Handle media attachments
        if (item.type === 'attachment' && item.attachmentUrl) {
          data.mediaUrl = item.attachmentUrl;
          data.alt = item.meta?._wp_attachment_image_alt || item.title || '';
          data.caption = item.excerpt || '';
          data.description = item.content || '';
        }

        // Clean content - replace site URLs
        if (baseSiteUrl && data.content) {
          data.content = data.content.replace(new RegExp(escapeRegex(baseSiteUrl), 'g'), '');
        }

        // Build SEO
        const seo = {
          metaTitle: item.title?.substring(0, 60) || undefined,
          metaDescription: item.excerpt?.substring(0, 160) || undefined,
        };

        // Create the entry
        const entry = await prisma.contentEntry.create({
          data: {
            contentTypeId,
            slug: item.slug,
            status: item.status || 'DRAFT',
            data,
            seo,
            authorId: authorId || defaultAuthor?.id || '',
            publishedAt,
            excerpt: item.excerpt?.substring(0, 500) || undefined,
            commentStatus: item.commentStatus || 'open',
            pingStatus: item.pingStatus || 'open',
            postPassword: item.password || undefined,
            menuOrder: item.menuOrder || 0,
            isSticky: item.isSticky || false,
            template: item.template || undefined,
            createdAt: publishedAt || new Date(),
          },
        });

        this.postMap[item.id] = entry.id;
        this.rollbackData.createdEntryIds.push(entry.id);

        // Count stats
        if (item.type === 'page') {
          this.stats.pages++;
        } else if (item.type === 'attachment') {
          this.stats.media++;
        } else {
          this.stats.posts++;
        }

        // Attach categories
        for (const cat of item.categories) {
          const termId = this.termMap[cat.name] || this.termMap[`cat:${cat.nicename}`];
          if (termId) {
            await prisma.termRelation
              .create({
                data: { entryId: entry.id, termId },
              })
              .catch(() => {});
          }
        }

        // Attach tags
        for (const tag of item.tags) {
          const termId = this.termMap[tag.name] || this.termMap[`tag:${tag.nicename}`];
          if (termId) {
            await prisma.termRelation
              .create({
                data: { entryId: entry.id, termId },
              })
              .catch(() => {});
          }
        }

        // Attach custom terms
        for (const [domain, domainTerms] of Object.entries(item.terms || {})) {
          for (const term of domainTerms) {
            const termId = this.termMap[term.name] || this.termMap[`term:${term.nicename}`];
            if (termId) {
              await prisma.termRelation
                .create({
                  data: { entryId: entry.id, termId },
                })
                .catch(() => {});
            }
          }
        }

        // Import meta
        for (const [key, value] of Object.entries(item.meta)) {
          if (key.startsWith('_') && !key.startsWith('_acf') && !key.startsWith('_wp_attachment'))
            continue;

          try {
            // Try to parse JSON values
            let parsedValue = value;
            try {
              parsedValue = JSON.parse(value);
            } catch {}

            await prisma.contentMeta
              .create({
                data: { entryId: entry.id, key, value: parsedValue },
              })
              .catch(() => {});
            this.stats.metaEntries++;
          } catch {}
        }

        // Import ACF field values
        for (const [fieldName, fieldData] of Object.entries(item.acfFields || {})) {
          // ACF field values are stored under the field name (not prefixed with _)
          const fieldValue = item.meta[fieldName];
          if (fieldValue !== undefined) {
            try {
              let parsedValue = fieldValue;
              try {
                parsedValue = JSON.parse(fieldValue);
              } catch {}

              await prisma.contentMeta
                .create({
                  data: { entryId: entry.id, key: `acf_${fieldName}`, value: parsedValue },
                })
                .catch(() => {});
            } catch {}
          }
        }

        // Handle parent/child relationships for pages
        if (item.parent && item.parent > 0) {
          // We'll handle this in a second pass
        }

        bar.increment();
      } catch (err) {
        this.stats.errors++;
        logError('Content', `Failed "${item.title || item.slug}": ${err.message}`, {
          id: item.id,
          type: item.type,
        });
        bar.increment();
      }
    }

    bar.stop();

    // Second pass: set parent/child relationships
    for (const item of contentItems) {
      if (item.parent && item.parent > 0) {
        const childId = this.postMap[item.id];
        const parentId = this.postMap[String(item.parent)];
        if (childId && parentId) {
          await prisma.contentEntry
            .update({
              where: { id: childId },
              data: {
                data: {
                  ...item.meta,
                  parentId,
                },
              },
            })
            .catch(() => {});
        }
      }
    }

    ok(`Imported: ${this.stats.posts} posts, ${this.stats.pages} pages, ${this.stats.media} media`);
  }

  // ── Step 6: Import Comments ───────────────────────────────
  async importComments(items) {
    const allComments = [];
    for (const item of items) {
      if (item.comments?.length) {
        allComments.push({ entryId: item.id, comments: item.comments });
      }
    }

    if (!allComments.length) return;
    header('Importing Comments');

    const total = allComments.reduce((s, c) => s + c.comments.length, 0);
    const bar = new ProgressBar('Comments', total);
    bar.start();

    // First pass: create comments
    for (const { entryId, comments } of allComments) {
      const nodepressEntryId = this.postMap[entryId];
      if (!nodepressEntryId) {
        bar.increment(comments.length);
        continue;
      }

      for (const comment of comments) {
        try {
          const status =
            COMMENT_STATUS_MAP[comment.approved] || COMMENT_STATUS_MAP[comment.status] || 'PENDING';

          const created = await prisma.comment.create({
            data: {
              entryId: nodepressEntryId,
              authorName: comment.author || 'Anonymous',
              authorEmail: comment.email || '',
              content: comment.content || '',
              status,
              createdAt: comment.date ? new Date(comment.date) : new Date(),
              userAgent: '',
              ipAddress: comment.ip || '',
              commentType: comment.type || 'comment',
            },
          });

          this.oldToNewCommentId[comment.id] = created.id;
          this.rollbackData.createdCommentIds.push(created.id);
          this.stats.comments++;
          bar.increment();
        } catch (err) {
          this.stats.errors++;
          logError('Comment', `Failed: ${err.message}`);
          bar.increment();
        }
      }
    }

    bar.stop();

    // Second pass: set parent-child relationships
    let threadedCount = 0;
    for (const { entryId, comments } of allComments) {
      for (const comment of comments) {
        if (comment.parent && comment.parent !== '0') {
          const childId = this.oldToNewCommentId[comment.id];
          const parentId = this.oldToNewCommentId[comment.parent];
          if (childId && parentId) {
            await prisma.comment
              .update({
                where: { id: childId },
                data: { parentId },
              })
              .catch(() => {});
            threadedCount++;
          }
        }
      }
    }

    if (threadedCount > 0) {
      ok(`${threadedCount} threaded comment relationships restored`);
    }
    ok(`Imported ${this.stats.comments} comments`);
  }

  // ── Step 7: Import Menus ──────────────────────────────────
  async importMenus(items) {
    const menuItems = items.filter((i) => i.type === 'nav_menu_item');
    if (!menuItems.length) return;
    header('Importing Menus');

    // Extract unique menu names from meta
    const menuNames = new Set();
    for (const item of menuItems) {
      const menuName = item.meta?.['menu_item_menu_name'] || 'primary';
      menuNames.add(menuName);
    }

    const bar = new ProgressBar('Menu Items', menuItems.length);
    bar.start();

    for (const menuName of menuNames) {
      // Find or create menu
      let menu = await prisma.menu.findUnique({ where: { location: menuName } }).catch(() => null);
      if (!menu) {
        menu = await prisma.menu.create({ data: { location: menuName } });
        this.rollbackData.createdMenuIds.push(menu.id);
      }

      const menuItemsForMenu = menuItems.filter(
        (i) => (i.meta?.['menu_item_menu_name'] || 'primary') === menuName,
      );

      // Build parent map
      const menuItemIdMap = {}; // wp post id → nodepress menu item id
      const parentMap = {};

      for (const item of menuItemsForMenu) {
        try {
          const menuItemType = item.meta?.['menu_item_type'] || 'custom';
          let url = item.meta?.['menu_item_url'] || '#';
          const objectId = item.meta?.['menu_item_object_id'] || '';
          const object = item.meta?.['menu_item_object'] || '';
          const target = item.meta?.['menu_item_target'] || '';
          const classes = item.meta?.['menu_item_classes'] || '';

          // For internal links, generate proper URL
          if (menuItemType === 'post_type' && object === 'page' && objectId) {
            const linkedEntryId = this.postMap[objectId];
            if (linkedEntryId) {
              const linkedEntry = await prisma.contentEntry
                .findUnique({
                  where: { id: linkedEntryId },
                })
                .catch(() => null);
              if (linkedEntry) {
                url = `/${linkedEntry.slug}`;
              }
            }
          } else if (menuItemType === 'post_type' && object === 'post' && objectId) {
            const linkedEntryId = this.postMap[objectId];
            if (linkedEntryId) {
              url = `/post/${objectId}`;
            }
          } else if (menuItemType === 'taxonomy' && objectId) {
            url = `/category/${object}`;
          }

          const label = item.meta?.['menu_item_label'] || item.title || 'Custom Link';
          const postStatus = item.status || 'PUBLISHED';

          // Only import published menu items
          if (postStatus !== 'PUBLISHED' && postStatus !== 'publish') {
            bar.increment();
            continue;
          }

          const menuItem = await prisma.menuItem.create({
            data: {
              menuId: menu.id,
              label,
              url,
              order: item.menuOrder || 0,
            },
          });

          menuItemIdMap[item.id] = menuItem.id;
          this.rollbackData.createdMenuItemIds.push(menuItem.id);
          this.stats.menuItems++;

          // Track parent relationships
          const parent = item.meta?.['menu_item_menu_item_parent'] || '';
          if (parent && parent !== '0') {
            parentMap[menuItem.id] = parent;
          }

          bar.increment();
        } catch (err) {
          this.stats.errors++;
          logError('MenuItem', `Failed "${item.title}": ${err.message}`);
          bar.increment();
        }
      }

      // Set parent-child relationships
      for (const [childId, parentPostId] of Object.entries(parentMap)) {
        const parentMenuItemId = menuItemIdMap[parentPostId];
        if (parentMenuItemId) {
          await prisma.menuItem
            .update({
              where: { id: childId },
              data: { parentId: parentMenuItemId },
            })
            .catch(() => {});
        }
      }
    }

    bar.stop();
    this.stats.menus = menuNames.size;
    ok(`Imported ${this.stats.menus} menus with ${this.stats.menuItems} items`);
  }

  // ── Step 8: Transfer Featured Images ──────────────────────
  async transferFeaturedImages(items) {
    header('Setting Featured Images');

    let count = 0;
    for (const item of items) {
      const entryId = this.postMap[item.id];
      if (!entryId) continue;

      const thumbnailMeta = item.meta?.['_thumbnail_id'];
      if (!thumbnailMeta) continue;

      const mediaId = this.postMap[thumbnailMeta];
      if (!mediaId) continue;

      // Find the media record
      const media = await prisma.media
        .findFirst({
          where: { uploadedBy: mediaId },
        })
        .catch(() => null);

      if (!media) {
        // Try finding by entry id
        const linkedEntry = await prisma.contentEntry
          .findUnique({
            where: { id: mediaId },
          })
          .catch(() => null);
        if (linkedEntry) {
          const mediaRecord = await prisma.media
            .findFirst({
              where: { url: { contains: linkedEntry.slug } },
            })
            .catch(() => null);
          if (mediaRecord) {
            await prisma.contentEntry
              .update({
                where: { id: entryId },
                data: { featuredImageId: mediaRecord.id },
              })
              .catch(() => {});
            count++;
          }
        }
        continue;
      }

      await prisma.contentEntry
        .update({
          where: { id: entryId },
          data: { featuredImageId: media.id },
        })
        .catch(() => {});
      count++;
    }

    ok(`Set ${count} featured images`);
  }

  // ── Step 9: Update Site Settings ──────────────────────────
  async updateSettings(meta) {
    header('Updating Site Settings');

    const updates = [];
    if (meta.title) {
      updates.push(
        prisma.setting
          .upsert({
            where: { group_key: { group: 'general', key: 'site_title' } },
            update: { value: meta.title },
            create: { group: 'general', key: 'site_title', value: meta.title, autoload: true },
          })
          .catch(() => {}),
      );
      this.rollbackData.updatedSettingKeys.push('general:site_title');
    }

    if (meta.description) {
      updates.push(
        prisma.setting
          .upsert({
            where: { group_key: { group: 'general', key: 'tagline' } },
            update: { value: meta.description },
            create: { group: 'general', key: 'tagline', value: meta.description, autoload: true },
          })
          .catch(() => {}),
      );
      this.rollbackData.updatedSettingKeys.push('general:tagline');
    }

    if (meta.link) {
      updates.push(
        prisma.setting
          .upsert({
            where: { group_key: { group: 'general', key: 'site_url' } },
            update: { value: meta.link },
            create: { group: 'general', key: 'site_url', value: meta.link, autoload: true },
          })
          .catch(() => {}),
      );
      this.rollbackData.updatedSettingKeys.push('general:site_url');
    }

    // Mark as WordPress imported
    updates.push(
      prisma.setting
        .upsert({
          where: { group_key: { group: 'system', key: 'wp_imported' } },
          update: { value: 'true' },
          create: { group: 'system', key: 'wp_imported', value: 'true', autoload: true },
        })
        .catch(() => {}),
    );
    updates.push(
      prisma.setting
        .upsert({
          where: { group_key: { group: 'system', key: 'wp_import_session_id' } },
          update: { value: this.sessionId },
          create: {
            group: 'system',
            key: 'wp_import_session_id',
            value: this.sessionId,
            autoload: true,
          },
        })
        .catch(() => {}),
    );

    await Promise.all(updates);
    ok('Site settings updated');
  }

  // ── Step 10: Download Media ───────────────────────────────
  async downloadAllMedia(items, baseSiteUrl) {
    const attachments = items.filter((i) => i.type === 'attachment' && i.attachmentUrl);
    if (!attachments.length) return;

    header('Downloading Media');
    log(`Downloading ${attachments.length} media files...`);

    const bar = new ProgressBar('Media', attachments.length);
    bar.start();

    let downloaded = 0;
    let failed = 0;

    for (const item of attachments) {
      try {
        const success = await this.downloadAndStoreMedia(item);
        if (success) downloaded++;
        else failed++;
      } catch (err) {
        failed++;
        logError('Media', `Failed "${item.attachmentUrl}": ${err.message}`);
      }
      bar.increment();
    }

    bar.stop();
    if (downloaded > 0) ok(`Downloaded ${downloaded} media files`);
    if (failed > 0) warn(`${failed} media files failed to download`);
  }

  async downloadAndStoreMedia(item) {
    const url = item.attachmentUrl;
    if (!url) return false;

    try {
      const parsedUrl = new URL(url);
      const filename = path.basename(parsedUrl.pathname) || `media-${item.id}`;
      // Sanitize filename
      const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const destPath = path.join(IMPORT_MEDIA_DIR, safeFilename);

      if (!fs.existsSync(destPath)) {
        const downloaded = await downloadFile(url, destPath);
        if (!downloaded) return false;
      }

      if (fs.existsSync(destPath)) {
        const stats = fs.statSync(destPath);
        const mimeType = getMimeType(safeFilename);

        // Check if media record already exists
        const existingMedia = await prisma.media
          .findFirst({
            where: { url: { contains: safeFilename } },
          })
          .catch(() => null);

        if (!existingMedia) {
          const uploader = await prisma.user
            .findFirst({
              where: { OR: [{ role: 'SUPER_ADMIN' }, { role: 'ADMIN' }] },
              orderBy: { createdAt: 'asc' },
            })
            .catch(() => null);

          const media = await prisma.media.create({
            data: {
              url: `/storage/imported-media/${safeFilename}`,
              mimeType,
              title: item.title || safeFilename,
              altText: item.meta?._wp_attachment_image_alt || item.title || '',
              caption: item.excerpt || '',
              description: item.content || '',
              fileSize: stats.size,
              uploadedBy: uploader?.id || '',
            },
          });

          this.rollbackData.createdMediaIds.push(media.id);
        }

        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  // ── Rollback Support ─────────────────────────────────────
  async saveRollbackData() {
    try {
      let existingRollbacks = [];
      if (fs.existsSync(ROLLBACK_FILE)) {
        existingRollbacks = JSON.parse(fs.readFileSync(ROLLBACK_FILE, 'utf-8'));
      }
      existingRollbacks.push(this.rollbackData);
      // Keep only last 5 rollbacks
      if (existingRollbacks.length > 5) {
        existingRollbacks = existingRollbacks.slice(-5);
      }
      fs.writeFileSync(ROLLBACK_FILE, JSON.stringify(existingRollbacks, null, 2));
    } catch (err) {
      warn(`Failed to save rollback data: ${err.message}`);
    }
  }

  // ── Summary ────────────────────────────────────────────────
  printSummary(wxr) {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);

    console.log('');
    console.log(color('╔══════════════════════════════════════════════════════════╗', C.green));
    console.log(
      color('║', C.green),
      color('       ✅  WordPress Import Complete', C.bold).padEnd(42),
      color('║', C.green),
    );
    console.log(color('╚══════════════════════════════════════════════════════════╝', C.green));
    console.log('');
    console.log(`  ${color('📊 Import Summary:', C.bold)}`);
    console.log(`     ${color(String(this.stats.posts), C.bold)} posts`);
    console.log(`     ${color(String(this.stats.pages), C.bold)} pages`);
    console.log(`     ${color(String(this.stats.categories), C.bold)} categories`);
    console.log(`     ${color(String(this.stats.tags), C.bold)} tags`);
    console.log(`     ${color(String(this.stats.customTerms), C.bold)} custom terms`);
    console.log(`     ${color(String(this.stats.comments), C.bold)} comments`);
    console.log(`     ${color(String(this.stats.users), C.bold)} users`);
    console.log(`     ${color(String(this.stats.media), C.bold)} media files`);
    console.log(
      `     ${color(String(this.stats.menus), C.bold)} menus with ${color(String(this.stats.menuItems), C.bold)} items`,
    );
    console.log(`     ${color(String(this.stats.metaEntries), C.bold)} meta entries`);
    console.log('');
    console.log(`  ${color('⏱', C.cyan)} Completed in ${color(elapsed + 's', C.bold)}`);
    console.log(`  ${color('🔑', C.cyan)} Session: ${color(this.sessionId, C.dim)}`);
    if (this.stats.errors > 0) {
      console.log(
        `  ${color('⚠', C.yellow)} ${color(String(this.stats.errors) + ' errors', C.yellow)} (see storage/wp-import-errors.log)`,
      );
    }
    if (this.stats.warnings > 0) {
      console.log(
        `  ${color('⚠', C.yellow)} ${color(String(this.stats.warnings) + ' warnings', C.yellow)}`,
      );
    }
    console.log('');
    log('Login to the admin panel to review your imported content.', C.green);
    console.log('');
  }
}

// ── Rollback Handler ─────────────────────────────────────────
async function handleRollback() {
  header('Rollback: Undo Last WordPress Import');

  if (!fs.existsSync(ROLLBACK_FILE)) {
    fail('No rollback data found. Nothing to undo.');
    return;
  }

  let rollbacks;
  try {
    rollbacks = JSON.parse(fs.readFileSync(ROLLBACK_FILE, 'utf-8'));
  } catch {
    fail('Corrupted rollback data file.');
    return;
  }

  if (!rollbacks.length) {
    fail('No previous imports to rollback.');
    return;
  }

  const lastImport = rollbacks[rollbacks.length - 1];
  console.log('');
  log(`Rolling back import from: ${path.basename(lastImport.filePath)}`);
  log(`Session: ${lastImport.sessionId}`);
  log(`Date: ${lastImport.timestamp}`);
  console.log('');

  // Confirm
  const rl = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question(
    `  ${color('This will delete all imported content. Continue? (y/N) ', C.yellow)}`,
    async (answer) => {
      rl.close();

      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        log('Rollback cancelled.', C.yellow);
        return;
      }

      try {
        await getPrisma();
        ok('Database connected');

        const rd = lastImport;

        // Delete in reverse order (children before parents)
        // Menu items
        if (rd.createdMenuItemIds?.length) {
          await prisma.menuItem
            .deleteMany({
              where: { id: { in: rd.createdMenuItemIds } },
            })
            .catch(() => {});
          ok(`Deleted ${rd.createdMenuItemIds.length} menu items`);
        }

        // Menus
        if (rd.createdMenuIds?.length) {
          await prisma.menu
            .deleteMany({
              where: { id: { in: rd.createdMenuIds } },
            })
            .catch(() => {});
          ok(`Deleted ${rd.createdMenuIds.length} menus`);
        }

        // Comments (cascade handles children)
        if (rd.createdCommentIds?.length) {
          await prisma.comment
            .deleteMany({
              where: { id: { in: rd.createdCommentIds } },
            })
            .catch(() => {});
          ok(`Deleted ${rd.createdCommentIds.length} comments`);
        }

        // Content entries and media
        if (rd.createdMediaIds?.length) {
          await prisma.media
            .deleteMany({
              where: { id: { in: rd.createdMediaIds } },
            })
            .catch(() => {});
          ok(`Deleted ${rd.createdMediaIds.length} media files`);
        }

        if (rd.createdEntryIds?.length) {
          // Delete term relations first
          await prisma.termRelation
            .deleteMany({
              where: { entryId: { in: rd.createdEntryIds } },
            })
            .catch(() => {});
          // Delete content meta
          await prisma.contentMeta
            .deleteMany({
              where: { entryId: { in: rd.createdEntryIds } },
            })
            .catch(() => {});
          // Delete entries
          await prisma.contentEntry
            .deleteMany({
              where: { id: { in: rd.createdEntryIds } },
            })
            .catch(() => {});
          ok(`Deleted ${rd.createdEntryIds.length} content entries`);
        }

        // Terms
        if (rd.createdTermIds?.length) {
          await prisma.termRelation
            .deleteMany({
              where: { termId: { in: rd.createdTermIds } },
            })
            .catch(() => {});
          await prisma.term
            .deleteMany({
              where: { id: { in: rd.createdTermIds } },
            })
            .catch(() => {});
          ok(`Deleted ${rd.createdTermIds.length} terms`);
        }

        // Users
        if (rd.createdUserIds?.length) {
          await prisma.user
            .deleteMany({
              where: { id: { in: rd.createdUserIds } },
            })
            .catch(() => {});
          ok(`Deleted ${rd.createdUserIds.length} users`);
        }

        // Restore settings
        for (const key of rd.updatedSettingKeys || []) {
          const [group, settingKey] = key.split(':');
          await prisma.setting
            .delete({
              where: { group_key: { group, key: settingKey } },
            })
            .catch(() => {});
        }

        // Remove from rollback file
        rollbacks.pop();
        if (rollbacks.length) {
          fs.writeFileSync(ROLLBACK_FILE, JSON.stringify(rollbacks, null, 2));
        } else {
          fs.unlinkSync(ROLLBACK_FILE);
        }

        console.log('');
        ok(color('Rollback complete! All imported content has been removed.', C.green));
        console.log('');

        await disconnectPrisma();
      } catch (err) {
        fail(`Rollback failed: ${err.message}`);
        console.error(err);
        await disconnectPrisma();
      }
    },
  );
}

// ── Batch Import ─────────────────────────────────────────────
async function batchImport(directory, options) {
  const files = fs
    .readdirSync(directory)
    .filter((f) => f.endsWith('.xml') || f.endsWith('.wxr'))
    .map((f) => path.join(directory, f));

  if (!files.length) {
    fail(`No WXR files found in ${directory}`);
    return;
  }

  log(`Found ${files.length} WXR files in ${directory}`);
  console.log('');

  const totalStats = {
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

  for (let i = 0; i < files.length; i++) {
    console.log('');
    log(color(`[${i + 1}/${files.length}] Processing: ${path.basename(files[i])}`, C.bold), C.cyan);

    const importer = new WordPressImporter({
      filePath: files[i],
      dryRun: options.dryRun || false,
      media: options.media || false,
      yes: true,
    });

    try {
      const stats = await importer.import();
      for (const key of Object.keys(totalStats)) {
        totalStats[key] += stats?.[key] || 0;
      }
    } catch (err) {
      totalStats.errors++;
      logError('Batch', `Failed to import ${path.basename(files[i])}: ${err.message}`);
    }

    await new Promise((r) => setTimeout(r, 1000)); // Cooldown between imports
  }

  // Print total
  console.log('');
  console.log(color('╔══════════════════════════════════════════════════════════╗', C.green));
  console.log(
    color('║', C.green),
    color('       ✅  Batch Import Complete', C.bold).padEnd(42),
    color('║', C.green),
  );
  console.log(color('╚══════════════════════════════════════════════════════════╝', C.green));
  console.log('');
  console.log(`  ${color('📊 Total across all files:', C.bold)}`);
  console.log(`     ${color(String(totalStats.posts), C.bold)} posts`);
  console.log(`     ${color(String(totalStats.pages), C.bold)} pages`);
  console.log(`     ${color(String(totalStats.media), C.bold)} media`);
  console.log(`     ${color(String(totalStats.categories), C.bold)} categories`);
  console.log(`     ${color(String(totalStats.tags), C.bold)} tags`);
  console.log(`     ${color(String(totalStats.comments), C.bold)} comments`);
  console.log(`     ${color(String(totalStats.users), C.bold)} users`);
  console.log('');
}

// ── Helper Functions ────────────────────────────────────────
function generateSessionId() {
  const ts = Date.now().toString(36);
  const rand = crypto.randomBytes(4).toString('hex');
  return `wp-import-${ts}-${rand}`;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const mimes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.avif': 'image/avif',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.pdf': 'application/pdf',
    '.zip': 'application/zip',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.csv': 'text/csv',
    '.json': 'application/json',
    '.txt': 'text/plain',
    '.md': 'text/markdown',
  };
  return mimes[ext] || 'application/octet-stream';
}

/**
 * Download a file from URL to local path
 */
function downloadFile(url, destPath) {
  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(url);
      const client = parsedUrl.protocol === 'https:' ? https : http;

      const req = client.get(
        url,
        {
          timeout: 30000,
          headers: {
            'User-Agent': 'NodePress-WP-Migration/1.0',
          },
        },
        (response) => {
          // Follow redirects
          if (
            response.statusCode >= 300 &&
            response.statusCode < 400 &&
            response.headers.location
          ) {
            const redirectUrl = new URL(response.headers.location, url).href;
            client
              .get(redirectUrl, { timeout: 30000 }, (redirectResponse) => {
                if (redirectResponse.statusCode !== 200) {
                  resolve(false);
                  return;
                }
                const fileStream = fs.createWriteStream(destPath);
                redirectResponse.pipe(fileStream);
                fileStream.on('finish', () => {
                  fileStream.close();
                  resolve(true);
                });
                fileStream.on('error', () => {
                  resolve(false);
                });
              })
              .on('error', () => resolve(false));
            return;
          }

          if (response.statusCode !== 200) {
            resolve(false);
            return;
          }

          const fileStream = fs.createWriteStream(destPath);
          response.pipe(fileStream);
          fileStream.on('finish', () => {
            fileStream.close();
            resolve(true);
          });
          fileStream.on('error', () => {
            resolve(false);
          });
        },
      );

      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    } catch {
      resolve(false);
    }
  });
}

// ── CLI Entry Point ──────────────────────────────────────────
function showUsage() {
  console.log(`
${color('NodePress WordPress Migration Tool', C.bold)}
${color('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', C.cyan)}

${color('DESCRIPTION', C.bold)}
    Import WordPress WXR export files into NodePress.
    Supports posts, pages, media, categories, tags, users,
    comments, menus, custom fields, and ACF fields.

${color('USAGE', C.bold)}
    node scripts/wp-migrate.js --file=<wxr-file>   [options]
    node scripts/wp-migrate.js --dir=<directory>    [options]
    node scripts/wp-migrate.js --rollback
    node scripts/wp-migrate.js --help

${color('ARGUMENTS', C.bold)}
    --file=<path>       Path to WordPress WXR export file (.xml)
    --dir=<path>        Directory containing multiple WXR files (batch import)
    --url=<url>         Original WordPress site URL (for media URL rewriting)
    --media             Download media files from WordPress
    --dry-run           Preview import without making changes
    --yes, -y           Skip confirmation prompt
    --rollback          Undo the last WordPress import
    --help, -h          Show this help message

${color('EXAMPLES', C.bold)}
    node scripts/wp-migrate.js --file=wordpress-export.xml
    node scripts/wp-migrate.js --file=export.xml --url=https://old-site.com --media
    node scripts/wp-migrate.js --file=export.xml --dry-run
    node scripts/wp-migrate.js --dir=./wp-exports/
    node scripts/wp-migrate.js --rollback

${color('WORDPRESS EXPORT', C.bold)}
    In WordPress admin: Tools → Export → "All content" → Download Export File

${color('ROLLBACK', C.bold)}
    Use --rollback to undo the last import. The tool tracks what was
    created and removes it in the correct order (comments first,
    then content, then users). Only the last 5 sessions are kept.
`);
}

async function main() {
  const args = process.argv.slice(2);
  const options = {
    file: null,
    dir: null,
    url: null,
    media: false,
    dryRun: false,
    yes: false,
    rollback: false,
    help: false,
  };

  // Parse args
  for (const arg of args) {
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--media') options.media = true;
    else if (arg === '--yes' || arg === '-y') options.yes = true;
    else if (arg === '--rollback') options.rollback = true;
    else if (arg.startsWith('--file=')) options.file = arg.split('=')[1];
    else if (arg.startsWith('--dir=')) options.dir = arg.split('=')[1];
    else if (arg.startsWith('--url=')) options.url = arg.split('=')[1];
  }

  if (options.help || (!options.file && !options.dir && !options.rollback)) {
    showUsage();
    process.exit(options.help ? 0 : 1);
  }

  // Handle rollback
  if (options.rollback) {
    await handleRollback();
    return;
  }

  // Handle directory (batch import)
  if (options.dir) {
    const dirPath = path.resolve(options.dir);
    if (!fs.existsSync(dirPath)) {
      fail(`Directory not found: ${dirPath}`);
      process.exit(1);
    }
    await batchImport(dirPath, options);
    return;
  }

  // Handle single file import
  const filePath = path.resolve(options.file);
  if (!fs.existsSync(filePath)) {
    fail(`File not found: ${filePath}`);
    process.exit(1);
  }

  console.log('');
  console.log(color('╔══════════════════════════════════════════════════════════╗', C.cyan));
  console.log(
    color('║', C.cyan),
    color('  🔄  NodePress WordPress Migration Tool', C.bold),
    color('    ║', C.cyan),
  );
  console.log(color('╚══════════════════════════════════════════════════════════╝', C.cyan));

  const importer = new WordPressImporter({
    filePath,
    dryRun: options.dryRun,
    media: options.media,
    url: options.url,
    yes: options.yes,
  });

  try {
    const result = await importer.import();
    if (result?.dryRun) {
      process.exit(0);
    }
  } catch (err) {
    fail(`Import failed: ${err.message}`);
    process.exit(1);
  }
}

// ── Execute ──────────────────────────────────────────────────
main().catch((err) => {
  fail(`Unexpected error: ${err.message}`);
  process.exit(1);
});
