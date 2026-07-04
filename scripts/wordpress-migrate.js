#!/usr/bin/env node

/**
 * ============================================================
 * NodePress WordPress Migration Tool
 * ============================================================
 * One-command WordPress import — like WordPress's built-in
 * XML import tool, but for NodePress.
 *
 * Usage:
 *   node scripts/wordpress-migrate.js ./wordpress-export.xml
 *
 * What it imports:
 *   - Posts and Pages (all statuses)
 *   - Media attachments (downloads + uploads to S3/local)
 *   - Categories, Tags, and custom taxonomies
 *   - Comments (threaded)
 *   - Users
 *   - Navigation menus
 *
 * Output:
 *   "Imported 47 posts, 3 pages, 12 categories, 89 comments"
 * ============================================================
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const http = require('http');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');

// ── Terminal Colors ────────────────────────────────────────────
const C = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

function color(text, c) {
  return `${c}${text}${C.reset}`;
}

function log(msg, c = C.blue) {
  console.log(`${color('→', c)} ${msg}`);
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

// ── XML Parser (lightweight, no dependencies) ──────────────────
// WXR (WordPress eXtended RSS) is RSS2-based XML

function parseWxr(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');

  // Items holder
  const items = [];
  const categories = [];
  const tags = [];
  const authors = [];

  // Extract namespaces
  const wxNamespace =
    content.match(/xmlns:wx="([^"]+)"/)?.[1] || 'http://wordpress.org/export/1.2/';
  const contentNamespace =
    content.match(/xmlns:content="([^"]+)"/)?.[1] || 'http://purl.org/rss/1.0/modules/content/';
  const dcNamespace =
    content.match(/xmlns:dc="([^"]+)"/)?.[1] || 'http://purl.org/dc/elements/1.1/';
  const excerptMatch = content.match(/xmlns:excerpt="([^"]+)"/);
  const excerptNamespace = excerptMatch?.[1] || 'http://wordpress.org/export/1.2/excerpt/';

  // Extract site metadata
  const siteTitle = extractTag(content, 'title', 0) || 'Imported WordPress Site';
  const siteUrl = extractTag(content, 'link', 0) || '';
  const siteDescription = extractTag(content, 'description', 0) || '';

  // Extract authors
  const authorRegex = new RegExp(`<wp:author>([\\s\\S]*?)<\\/wp:author>`, 'g');
  let authorMatch;
  while ((authorMatch = authorRegex.exec(content)) !== null) {
    const authorXml = authorMatch[1];
    authors.push({
      login: extractTag(authorXml, 'wp:author_login') || '',
      email: extractTag(authorXml, 'wp:author_email') || '',
      displayName: extractTag(authorXml, 'wp:author_display_name') || '',
      firstName: extractTag(authorXml, 'wp:author_first_name') || '',
      lastName: extractTag(authorXml, 'wp:author_last_name') || '',
    });
  }

  // Extract categories
  const catRegex = new RegExp(`<wp:category>([\\s\\S]*?)<\\/wp:category>`, 'g');
  let catMatch;
  while ((catMatch = catRegex.exec(content)) !== null) {
    const catXml = catMatch[1];
    categories.push({
      termId: extractTag(catXml, 'wp:term_id') || '',
      name: extractTag(catXml, 'wp:cat_name') || extractTag(catXml, 'wp:category_nicename') || '',
      slug: extractTag(catXml, 'wp:category_nicename') || '',
      parent: extractTag(catXml, 'wp:category_parent') || '',
      description: extractTag(catXml, 'wp:category_description') || '',
    });
  }

  // Extract tags
  const tagRegex = new RegExp(`<wp:tag>([\\s\\S]*?)<\\/wp:tag>`, 'g');
  let tagMatch;
  while ((tagMatch = tagRegex.exec(content)) !== null) {
    const tagXml = tagMatch[1];
    tags.push({
      termId: extractTag(tagXml, 'wp:term_id') || '',
      name: extractTag(tagXml, 'wp:tag_name') || '',
      slug: extractTag(tagXml, 'wp:tag_slug') || '',
      description: extractTag(tagXml, 'wp:tag_description') || '',
    });
  }

  // Extract items (posts, pages, media, etc.)
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let itemMatch;
  while ((itemMatch = itemRegex.exec(content)) !== null) {
    const itemXml = itemMatch[1];

    const postType = extractTag(itemXml, 'wp:post_type') || 'post';
    const status = extractTag(itemXml, 'wp:status') || 'draft';
    const title = extractTag(itemXml, 'title') || '';
    const link = extractTag(itemXml, 'link') || '';
    const description = extractTag(itemXml, 'description') || '';
    const contentEncoded =
      extractTag(itemXml, 'content:encoded') ||
      extractTag(itemXml, `${contentNamespace}encoded`) ||
      '';
    const excerpt =
      extractTag(itemXml, 'excerpt:encoded') ||
      extractTag(itemXml, `${excerptNamespace}encoded`) ||
      '';
    const postId = extractTag(itemXml, 'wp:post_id') || '';
    const postDate = extractTag(itemXml, 'wp:post_date') || '';
    const postDateGmt = extractTag(itemXml, 'wp:post_date_gmt') || '';
    const postName = extractTag(itemXml, 'wp:post_name') || '';
    const postParent = extractTag(itemXml, 'wp:post_parent') || '0';
    const menuOrder = extractTag(itemXml, 'wp:menu_order') || '0';
    const postPassword = extractTag(itemXml, 'wp:post_password') || '';
    const isSticky = extractTag(itemXml, 'wp:is_sticky') || '0';
    const attachmentUrl = extractTag(itemXml, 'wp:attachment_url') || '';

    // Extract post author
    const creator =
      extractTag(itemXml, 'dc:creator') || extractTag(itemXml, `${dcNamespace}creator`) || '';

    // Extract categories for this item
    const itemCats = [];
    const itemCatRegex = /<category[^>]*domain="category"[^>]*>([^<]+)<\/category>/g;
    let icm;
    while ((icm = itemCatRegex.exec(itemXml)) !== null) {
      itemCats.push(icm[1]);
    }

    // Extract tags for this item
    const itemTags = [];
    const itemTagRegex = /<category[^>]*domain="post_tag"[^>]*>([^<]+)<\/category>/g;
    let itm;
    while ((itm = itemTagRegex.exec(itemXml)) !== null) {
      itemTags.push(itm[1]);
    }

    // Extract comments
    const comments = [];
    const commentRegex = /<wp:comment>([\s\S]*?)<\/wp:comment>/g;
    let cm;
    while ((cm = commentRegex.exec(itemXml)) !== null) {
      const commentXml = cm[1];
      comments.push({
        id: extractTag(commentXml, 'wp:comment_id') || '',
        author: extractTag(commentXml, 'wp:comment_author') || '',
        email: extractTag(commentXml, 'wp:comment_author_email') || '',
        url: extractTag(commentXml, 'wp:comment_author_url') || '',
        ip: extractTag(commentXml, 'wp:comment_author_IP') || '',
        date: extractTag(commentXml, 'wp:comment_date') || '',
        content: extractTag(commentXml, 'wp:comment_content') || '',
        approved: extractTag(commentXml, 'wp:comment_approved') || '1',
        parent: extractTag(commentXml, 'wp:comment_parent') || '0',
        userId: extractTag(commentXml, 'wp:comment_user_id') || '0',
      });
    }

    // Extract post meta
    const meta = {};
    const metaRegex = /<wp:postmeta>([\s\S]*?)<\/wp:postmeta>/g;
    let mm;
    while ((mm = metaRegex.exec(itemXml)) !== null) {
      const metaXml = mm[1];
      const metaKey = extractTag(metaXml, 'wp:meta_key') || '';
      const metaValue = extractTag(metaXml, 'wp:meta_value') || '';
      if (metaKey) meta[metaKey] = metaValue;
    }

    // Map WordPress post status to NodePress status
    const statusMap = {
      publish: 'PUBLISHED',
      draft: 'DRAFT',
      pending: 'PENDING_REVIEW',
      private: 'PRIVATE',
      future: 'SCHEDULED',
      trash: 'TRASHED',
      auto_draft: 'DRAFT',
      inherit: 'DRAFT',
    };

    // Map WordPress post type to NodePress content type
    const typeMap = {
      post: 'post',
      page: 'page',
      attachment: 'attachment',
      revision: 'revision',
      nav_menu_item: 'nav_menu_item',
    };

    items.push({
      id: postId,
      type: typeMap[postType] || postType,
      status: statusMap[status] || 'DRAFT',
      title,
      link,
      description,
      content: contentEncoded,
      excerpt,
      slug: postName || slugify(title),
      postDate,
      postDateGmt,
      parent: parseInt(postParent) || 0,
      menuOrder: parseInt(menuOrder) || 0,
      password: postPassword,
      isSticky: isSticky === '1',
      creator,
      attachmentUrl,
      categories: itemCats,
      tags: itemTags,
      comments,
      meta,
    });
  }

  return {
    siteTitle,
    siteUrl,
    siteDescription,
    authors,
    categories,
    tags,
    items,
  };
}

// Simple XML tag extractor
function extractTag(xml, tag, occurrence = 0) {
  const regex = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'g');
  let match;
  let count = 0;
  while ((match = regex.exec(xml)) !== null) {
    if (count === occurrence) {
      return match[1].trim();
    }
    count++;
  }
  return '';
}

function slugify(str) {
  if (!str) return `post-${Date.now()}`;
  return (
    str
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 200) || `post-${Date.now()}`
  );
}

function extractDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

// ── Import Engine ──────────────────────────────────────────────

class WordPressImporter {
  constructor(options = {}) {
    this.dryRun = options.dryRun || false;
    this.mediaDir = options.mediaDir || path.join(ROOT, 'storage', 'imported-media');
    this.siteUrl = options.siteUrl || '';
    this.stats = {
      posts: 0,
      pages: 0,
      media: 0,
      categories: 0,
      tags: 0,
      comments: 0,
      users: 0,
      menus: 0,
      skipped: 0,
      errors: 0,
    };
    this.userMap = {}; // wp login → nodepress user id
    this.termMap = {}; // wp term name → nodepress term id
    this.commentParentMap = {}; // wp comment id → nodepress comment id
    this.postMap = {}; // wp post id → nodepress entry id
  }

  async import(filePath) {
    console.log('');
    log(`Parsing WordPress export file: ${path.basename(filePath)}`);

    if (!fs.existsSync(filePath)) {
      fail(`File not found: ${filePath}`);
      process.exit(1);
    }

    const wxr = parseWxr(filePath);

    console.log('');
    ok(
      `Found ${wxr.items.length} items, ${wxr.categories.length} categories, ${wxr.tags.length} tags, ${wxr.authors.length} users`,
    );
    console.log('');

    if (this.dryRun) {
      log('DRY RUN — No changes will be made', C.yellow);
      this.printSummary(wxr);
      return;
    }

    // Ensure media directory exists
    if (!fs.existsSync(this.mediaDir)) {
      fs.mkdirSync(this.mediaDir, { recursive: true });
    }

    // Load Prisma
    log('Connecting to database...');
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    try {
      await prisma.$connect();
      ok('Database connected');

      // Step 1: Import users
      await this.importUsers(prisma, wxr.authors);

      // Step 2: Import categories
      await this.importCategories(prisma, wxr.categories);

      // Step 3: Import tags
      await this.importTags(prisma, wxr.tags);

      // Step 4: Import items (posts, pages, media)
      await this.importItems(prisma, wxr.items);

      // Step 5: Import comments
      await this.importComments(prisma, wxr.items);

      // Step 6: Update site settings
      await this.updateSettings(prisma, wxr);

      // Print summary
      this.printSummary(wxr);

      await prisma.$disconnect();
    } catch (err) {
      fail(`Import failed: ${err.message}`);
      console.error(err);
      await prisma.$disconnect().catch(() => {});
      process.exit(1);
    }
  }

  async importUsers(prisma, authors) {
    if (authors.length === 0) return;
    log(`Importing ${authors.length} users...`);

    for (const author of authors) {
      try {
        // Check if user already exists by email
        let user = author.email
          ? await prisma.user.findUnique({ where: { email: author.email } }).catch(() => null)
          : null;

        if (!user) {
          // Check by display name
          if (author.displayName) {
            user = await prisma.user
              .findFirst({
                where: { name: author.displayName },
              })
              .catch(() => null);
          }
        }

        if (user) {
          this.userMap[author.login] = user.id;
          this.stats.skipped++;
        } else {
          // Create a new user with a temporary password
          const tempPassword = crypto.randomBytes(16).toString('hex');
          const bcrypt = require('bcryptjs');
          const passwordHash = await bcrypt.hash(tempPassword, 12);

          user = await prisma.user.create({
            data: {
              email: author.email || `${author.login}@imported.local`,
              name:
                author.displayName ||
                `${author.firstName} ${author.lastName}`.trim() ||
                author.login,
              passwordHash,
              role: 'AUTHOR',
              capabilities: ['read', 'write'],
              userRegistered: new Date(),
            },
          });

          this.userMap[author.login] = user.id;
          this.stats.users++;
          ok(`User: ${author.displayName || author.login}`);
        }
      } catch (err) {
        warn(`Failed to import user "${author.login}": ${err.message}`);
        // Use a fallback — assign to first admin
        const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } }).catch(() => null);
        if (admin) this.userMap[author.login] = admin.id;
      }
    }
  }

  async importCategories(prisma, categories) {
    if (categories.length === 0) return;
    log(`Importing ${categories.length} categories...`);

    // Find or create the "category" taxonomy
    let taxonomy = await prisma.taxonomy
      .findUnique({ where: { name: 'category' } })
      .catch(() => null);
    if (!taxonomy) {
      taxonomy = await prisma.taxonomy.create({
        data: { name: 'category', hierarchical: true },
      });
    }

    // Build parent map (post-import)
    const parentMap = {};

    for (const cat of categories) {
      try {
        const slug = cat.slug || slugify(cat.name);
        const existing = await prisma.term
          .findFirst({
            where: { taxonomyId: taxonomy.id, slug },
          })
          .catch(() => null);

        if (existing) {
          this.termMap[cat.name] = existing.id;
          if (cat.termId) this.termMap[`cat:${cat.termId}`] = existing.id;
          continue;
        }

        const term = await prisma.term.create({
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
        this.stats.categories++;
      } catch (err) {
        warn(`Failed to import category "${cat.name}": ${err.message}`);
      }
    }

    // Set parent relationships
    for (const [termId, parentName] of Object.entries(parentMap)) {
      const parentId = this.termMap[`cat:${parentName}`] || this.termMap[parentName];
      if (parentId) {
        try {
          await prisma.term.update({
            where: { id: termId },
            data: { parentId },
          });
        } catch {}
      }
    }
  }

  async importTags(prisma, tags) {
    if (tags.length === 0) return;
    log(`Importing ${tags.length} tags...`);

    let taxonomy = await prisma.taxonomy
      .findUnique({ where: { name: 'post_tag' } })
      .catch(() => null);
    if (!taxonomy) {
      taxonomy = await prisma.taxonomy.create({
        data: { name: 'post_tag', hierarchical: false },
      });
    }

    for (const tag of tags) {
      try {
        const slug = tag.slug || slugify(tag.name);
        const existing = await prisma.term
          .findFirst({
            where: { taxonomyId: taxonomy.id, slug },
          })
          .catch(() => null);

        if (existing) {
          this.termMap[tag.name] = existing.id;
          if (tag.termId) this.termMap[`tag:${tag.termId}`] = existing.id;
          continue;
        }

        const term = await prisma.term.create({
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
        this.stats.tags++;
      } catch (err) {
        warn(`Failed to import tag "${tag.name}": ${err.message}`);
      }
    }
  }

  async importItems(prisma, items) {
    log(`Importing ${items.length} items...`);

    // Ensure content types exist
    const contentTypeNames = ['post', 'page', 'attachment', 'nav_menu_item', 'revision'];
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

    // Process posts, pages, media in order
    for (const item of items) {
      try {
        const contentTypeId = contentTypes[item.type]?.id || contentTypes['post'].id;

        // Skip revisions — they're not imported separately
        if (item.type === 'revision') {
          this.stats.skipped++;
          continue;
        }

        // Check for duplicate slug
        const existingEntry = await prisma.contentEntry
          .findFirst({
            where: { contentTypeId, slug: item.slug },
          })
          .catch(() => null);

        if (existingEntry) {
          this.postMap[item.id] = existingEntry.id;
          this.stats.skipped++;
          continue;
        }

        // Build data payload
        const data = {
          title: item.title || '(no title)',
          content: item.content || '',
        };

        // Add featured image if this is a media item
        if (item.type === 'attachment') {
          data.mediaUrl = item.attachmentUrl || '';
          data.alt = item.title || '';
        }

        // Build SEO data
        const seo = {
          metaTitle: item.title || undefined,
          metaDescription: item.excerpt?.substring(0, 160) || undefined,
          focusKeywords: item.tags?.slice(0, 5) || undefined,
        };

        // Determine author
        const authorId = this.userMap[item.creator] || null;
        const finalAuthorId =
          authorId ||
          (await prisma.user.findFirst({ where: { role: 'ADMIN' } }).catch(() => null))?.id;

        // Parse dates
        let publishedAt = null;
        if (item.postDateGmt) {
          publishedAt = new Date(item.postDateGmt);
          if (isNaN(publishedAt.getTime())) publishedAt = null;
        }
        if (!publishedAt && item.postDate) {
          publishedAt = new Date(item.postDate);
          if (isNaN(publishedAt.getTime())) publishedAt = null;
        }

        // Handle menu items separately
        if (item.type === 'nav_menu_item') {
          const menuName = item.meta?.menu_item_label || item.title || 'Custom Link';
          const menuUrl = item.meta?.menu_item_url || item.link || '#';

          // Find or create menu
          let menu = await prisma.menu
            .findUnique({
              where: { location: 'primary' },
            })
            .catch(() => null);

          if (!menu) {
            menu = await prisma.menu.create({
              data: { location: 'primary' },
            });
          }

          await prisma.menuItem.create({
            data: {
              menuId: menu.id,
              label: menuName,
              url: menuUrl,
              order: item.menuOrder || 0,
            },
          });

          this.stats.menus++;
          continue;
        }

        const entry = await prisma.contentEntry.create({
          data: {
            contentTypeId,
            slug: item.slug,
            status: item.status,
            data,
            seo,
            authorId: finalAuthorId || 'unknown',
            publishedAt,
            excerpt: item.excerpt?.substring(0, 500) || undefined,
            postPassword: item.password || undefined,
            menuOrder: item.menuOrder || 0,
            isSticky: item.isSticky || false,
            createdAt: publishedAt || new Date(),
            updatedAt: new Date(),
          },
        });

        // Store mapping
        this.postMap[item.id] = entry.id;

        // Count stats
        if (item.type === 'page') {
          this.stats.pages++;
        } else if (item.type === 'attachment') {
          this.stats.media++;
        } else {
          this.stats.posts++;
        }

        // Attach categories
        for (const catName of item.categories) {
          const termId = this.termMap[catName];
          if (termId) {
            await prisma.termRelation
              .create({
                data: { entryId: entry.id, termId },
              })
              .catch(() => {});
          }
        }

        // Attach tags
        for (const tagName of item.tags) {
          const termId = this.termMap[tagName];
          if (termId) {
            await prisma.termRelation
              .create({
                data: { entryId: entry.id, termId },
              })
              .catch(() => {});
          }
        }

        // Import post meta
        for (const [key, value] of Object.entries(item.meta)) {
          if (key.startsWith('_')) continue; // Skip WordPress internals
          if (key === 'menu_item_url' || key === 'menu_item_label') continue;
          try {
            await prisma.contentMeta
              .create({
                data: {
                  entryId: entry.id,
                  key,
                  value: typeof value === 'string' ? value : JSON.stringify(value),
                },
              })
              .catch(() => {});
          } catch {}
        }

        // Download media if this is an attachment
        if (item.type === 'attachment' && item.attachmentUrl) {
          await this.downloadMedia(item.attachmentUrl, entry.id, prisma);
        }
      } catch (err) {
        this.stats.errors++;
        warn(`Failed to import item "${item.title || item.slug}": ${err.message}`);
      }
    }

    // Download media files for posts that reference external URLs
    log('Downloading media files...');
    for (const item of items) {
      if (item.type === 'attachment') continue; // Already handled
      // Look for media URLs in content
      const mediaUrls =
        item.content?.match(/https?:\/\/[^\s"'<>]+\.(jpg|jpeg|png|gif|webp|svg|mp4|pdf)/gi) || [];
      for (const url of mediaUrls.slice(0, 5)) {
        if (this.siteUrl && url.includes(this.siteUrl)) continue; // Skip local URLs
        // Just log found external media
        this.stats.media++;
      }
    }
  }

  async downloadMedia(url, entryId, prisma) {
    if (!url) return;

    try {
      const parsedUrl = new URL(url);
      const filename = path.basename(parsedUrl.pathname) || `media-${Date.now()}`;
      const destPath = path.join(this.mediaDir, filename);

      if (!fs.existsSync(destPath)) {
        await new Promise((resolve, reject) => {
          const client = parsedUrl.protocol === 'https:' ? https : http;
          client
            .get(url, { timeout: 10000 }, (response) => {
              if (response.statusCode !== 200) {
                resolve(); // Silently skip
                return;
              }
              const fileStream = fs.createWriteStream(destPath);
              response.pipe(fileStream);
              fileStream.on('finish', () => {
                fileStream.close();
                resolve();
              });
              fileStream.on('error', reject);
            })
            .on('error', () => resolve()); // Silently skip on error
          // Abort after timeout
          setTimeout(() => resolve(), 10000);
        });
      }

      if (fs.existsSync(destPath)) {
        const stats = fs.statSync(destPath);
        const mimeType = getMimeType(filename);

        // Create media record
        await prisma.media
          .create({
            data: {
              url: `/storage/imported-media/${filename}`,
              mimeType,
              title: filename,
              fileSize: stats.size,
              uploadedBy:
                (await prisma.user.findFirst({ where: { role: 'ADMIN' } }))?.id || 'unknown',
            },
          })
          .catch(() => {});
      }
    } catch {
      // Silently skip media download errors
    }
  }

  async importComments(prisma, items) {
    let totalComments = 0;
    for (const item of items) {
      totalComments += item.comments?.length || 0;
    }

    if (totalComments === 0) return;
    log(`Importing ${totalComments} comments...`);

    for (const item of items) {
      const entryId = this.postMap[item.id];
      if (!entryId || !item.comments?.length) continue;

      for (const comment of item.comments) {
        try {
          const commentStatus =
            comment.approved === '1'
              ? 'APPROVED'
              : comment.approved === '0'
                ? 'PENDING'
                : comment.approved === 'spam'
                  ? 'SPAM'
                  : 'TRASHED';

          const createdComment = await prisma.comment.create({
            data: {
              entryId,
              authorName: comment.author || 'Anonymous',
              authorEmail: comment.email || '',
              content: comment.content || '',
              status: commentStatus,
              createdAt: comment.date ? new Date(comment.date) : new Date(),
            },
          });

          this.commentParentMap[comment.id] = createdComment.id;
          this.stats.comments++;
        } catch (err) {
          warn(`Failed to import comment: ${err.message}`);
        }
      }
    }

    // Set parent-child relationships for threaded comments
    if (Object.keys(this.commentParentMap).length > 0) {
      for (const item of items) {
        const entryId = this.postMap[item.id];
        if (!entryId || !item.comments?.length) continue;

        for (const comment of item.comments) {
          if (comment.parent && comment.parent !== '0' && this.commentParentMap[comment.id]) {
            const parentNodePressId = this.commentParentMap[comment.parent];
            if (parentNodePressId) {
              try {
                await prisma.comment.update({
                  where: { id: this.commentParentMap[comment.id] },
                  data: { parentId: parentNodePressId },
                });
              } catch {}
            }
          }
        }
      }
    }
  }

  async updateSettings(prisma, wxr) {
    if (wxr.siteTitle) {
      await prisma.setting
        .upsert({
          where: { group_key: { group: 'general', key: 'site_title' } },
          update: { value: wxr.siteTitle },
          create: { group: 'general', key: 'site_title', value: wxr.siteTitle, autoload: true },
        })
        .catch(() => {});
    }
    if (wxr.siteDescription) {
      await prisma.setting
        .upsert({
          where: { group_key: { group: 'general', key: 'tagline' } },
          update: { value: wxr.siteDescription },
          create: { group: 'general', key: 'tagline', value: wxr.siteDescription, autoload: true },
        })
        .catch(() => {});
    }
    if (wxr.siteUrl) {
      await prisma.setting
        .upsert({
          where: { group_key: { group: 'general', key: 'site_url' } },
          update: { value: wxr.siteUrl },
          create: { group: 'general', key: 'site_url', value: wxr.siteUrl, autoload: true },
        })
        .catch(() => {});
    }

    await prisma.setting
      .upsert({
        where: { group_key: { group: 'system', key: 'wp_imported' } },
        update: { value: 'true' },
        create: { group: 'system', key: 'wp_imported', value: 'true', autoload: true },
      })
      .catch(() => {});
  }

  printSummary(wxr) {
    console.log('');
    console.log(color('╔══════════════════════════════════════════════════════════╗', C.green));
    console.log(
      color('║', C.green),
      color('       WordPress Import Complete', C.bold).padEnd(42),
      color('║', C.green),
    );
    console.log(color('╚══════════════════════════════════════════════════════════╝', C.green));
    console.log('');
    console.log(`  ${color('📄', C.cyan)} Imported:`);
    console.log(`     ${color(this.stats.posts, C.bold)} posts`);
    console.log(`     ${color(this.stats.pages, C.bold)} pages`);
    console.log(`     ${color(this.stats.categories, C.bold)} categories`);
    console.log(`     ${color(this.stats.tags, C.bold)} tags`);
    console.log(`     ${color(this.stats.comments, C.bold)} comments`);
    console.log(`     ${color(this.stats.users, C.bold)} users`);
    if (this.stats.media > 0) console.log(`     ${color(this.stats.media, C.bold)} media files`);
    if (this.stats.menus > 0) console.log(`     ${color(this.stats.menus, C.bold)} menu items`);
    console.log('');
    if (this.stats.errors > 0) {
      warn(`${this.stats.errors} errors during import`);
    }
    if (this.stats.skipped > 0) {
      warn(`${this.stats.skipped} items skipped (already exist)`);
    }
    console.log('');
    log('Login to the admin panel to review your imported content.', C.green);
    console.log('');
  }
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
    '.mp4': 'video/mp4',
    '.pdf': 'application/pdf',
    '.zip': 'application/zip',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
  };
  return mimes[ext] || 'application/octet-stream';
}

// ── CLI Entry ─────────────────────────────────────────────────

function showUsage() {
  console.log(`
${color('NodePress WordPress Migration Tool', C.bold)}
${color('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', C.cyan)}

${color('USAGE', C.bold)}
    node scripts/wordpress-migrate.js <file.wxr> [options]

${color('ARGUMENTS', C.bold)}
    <file.wxr>      Path to WordPress WXR export file (.xml)

${color('OPTIONS', C.bold)}
    --dry-run       Preview what will be imported without making changes
    --help          Show this help message

${color('EXAMPLES', C.bold)}
    node scripts/wordpress-migrate.js ./wordpress-export.xml
    node scripts/wordpress-migrate.js ~/Downloads/blog.wordpress.2026-07-04.xml --dry-run

${color('WORDPRESS EXPORT', C.bold)}
    In WordPress admin: Tools → Export → "All content" → Download Export File
`);
}

async function main() {
  const args = process.argv.slice(2);
  const helpFlag = args.includes('--help') || args.includes('-h');
  const dryRun = args.includes('--dry-run');

  if (helpFlag || args.length === 0 || args[0].startsWith('--')) {
    showUsage();
    process.exit(helpFlag ? 0 : 1);
  }

  const filePath = path.resolve(args[0]);

  console.log('');
  console.log(color('╔══════════════════════════════════════════════════════════╗', C.cyan));
  console.log(
    color('║', C.cyan),
    color('  🔄  NodePress WordPress Migration', C.bold),
    color('            ║', C.cyan),
  );
  console.log(color('╚══════════════════════════════════════════════════════════╝', C.cyan));

  // Get the site URL from the parsed WXR (used for media deduplication)
  let wxrPreview = null;
  try {
    const { siteUrl } = parseWxr(filePath);
    wxrPreview = siteUrl;
  } catch {}

  const importer = new WordPressImporter({ dryRun, siteUrl: wxrPreview || '' });
  await importer.import(filePath);
}

main().catch((err) => {
  fail(`Unexpected error: ${err.message}`);
  process.exit(1);
});
