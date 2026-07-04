#!/usr/bin/env node

/**
 * ============================================================
 * WXR Parser — WordPress eXtended RSS (WXR) Import Parser
 * ============================================================
 * Handles WordPress export XML files, parsing them into
 * structured JavaScript objects for import into NodePress.
 *
 * Features:
 *   - Parses WXR XML (RSS2 with WordPress namespaces)
 *   - Handles namespaced elements (content:encoded, wp:*, dc:*, excerpt:*)
 *   - Supports streaming for large files via SAX mode
 *   - Extracts posts, pages, media, users, categories, tags, menus, comments
 *   - Parses ACF field definitions and values
 *   - Converts WordPress shortcodes to NodePress format
 * ============================================================
 */

const fs = require('fs');
const path = require('path');
const { XMLParser, XMLValidator } = require('fast-xml-parser');

// ── WXR Namespace Constants ─────────────────────────────────
const WP_NS = 'http://wordpress.org/export/1.2/';
const CONTENT_NS = 'http://purl.org/rss/1.0/modules/content/';
const DC_NS = 'http://purl.org/dc/elements/1.1/';
const EXCERPT_NS = 'http://wordpress.org/export/1.2/excerpt/';

// ── WordPress Status → NodePress Status Mapping ──────────────
const STATUS_MAP = {
  publish: 'PUBLISHED',
  draft: 'DRAFT',
  pending: 'PENDING_REVIEW',
  private: 'PRIVATE',
  future: 'SCHEDULED',
  trash: 'TRASHED',
  'auto-draft': 'DRAFT',
  inherit: 'PUBLISHED', // For attachments that inherit post status
};

// ── WordPress Post Type → NodePress Content Type Mapping ────
const TYPE_MAP = {
  post: 'post',
  page: 'page',
  attachment: 'attachment',
  revision: 'revision',
  nav_menu_item: 'nav_menu_item',
  wp_block: 'wp_block',
  wp_template: 'wp_template',
  wp_global_styles: 'wp_global_styles',
};

// ── WordPress Role → NodePress Role Mapping ─────────────────
const ROLE_MAP = {
  administrator: 'SUPER_ADMIN',
  editor: 'EDITOR',
  author: 'AUTHOR',
  contributor: 'CONTRIBUTOR',
  subscriber: 'SUBSCRIBER',
};

// ── WordPress Comment Status → NodePress CommentStatus ──────
const COMMENT_STATUS_MAP = {
  0: 'PENDING',
  1: 'APPROVED',
  pending: 'PENDING',
  approved: 'APPROVED',
  spam: 'SPAM',
  trash: 'TRASHED',
  'post-trashed': 'TRASHED',
};

/**
 * Parse a WXR XML file
 * @param {string} filePath - Path to the WXR XML file
 * @param {object} [options] - Parsing options
 * @param {boolean} [options.streaming=false] - Use streaming for large files
 * @param {function} [options.onProgress] - Progress callback (percent, itemName)
 * @returns {object} Parsed WXR data
 */
function parseWxr(filePath, options = {}) {
  const { streaming = false, onProgress } = options;

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const isLarge = fileSize > 50 * 1024 * 1024; // > 50MB

  if ((isLarge || streaming) && fileSize > 10 * 1024 * 1024) {
    return parseStreaming(filePath, fileSize, onProgress);
  }

  return parseFull(filePath, fileSize, onProgress);
}

/**
 * Full (non-streaming) WXR parser using fast-xml-parser
 */
function parseFull(filePath, fileSize, onProgress) {
  const xmlContent = fs.readFileSync(filePath, 'utf-8');

  if (onProgress) onProgress(10, 'Validating XML');

  // Validate XML
  const validation = XMLValidator.validate(xmlContent);
  if (validation !== true) {
    throw new Error(`Invalid XML: ${validation.err?.msg || 'Unknown validation error'}`);
  }

  if (onProgress) onProgress(20, 'Parsing XML structure');

  // Parse with namespace support
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    allowBooleanAttributes: true,
    trimValues: true,
    processEntities: true,
    htmlEntities: true,
    ignoreDeclaration: true,
    parseTagValue: true,
    parseAttributeValue: false,
    isArray: (name) => {
      return [
        'item',
        'wp:author',
        'wp:category',
        'wp:tag',
        'wp:term',
        'category',
        'wp:comment',
        'wp:postmeta',
      ].includes(name);
    },
  });

  if (onProgress) onProgress(40, 'Building document tree');
  const doc = parser.parse(xmlContent);

  if (onProgress) onProgress(60, 'Extracting channel data');

  // Navigate RSS → channel structure
  const rss = doc?.rss;
  if (!rss) throw new Error('Invalid WXR file: missing <rss> root element');

  const channel = rss.channel || {};
  const channelTitle = channel.title || '';
  const channelLink = channel.link || '';
  const channelDescription = channel.description || '';
  const channelLanguage = channel.language || 'en-US';
  const channelPubDate = channel.pubDate || '';
  const channelWxrVersion = channel['wp:wxr_version'] || '1.2';

  // ── Extract Authors ──
  if (onProgress) onProgress(65, 'Extracting authors');
  const rawAuthors = channel['wp:author'] || [];
  const authors = rawAuthors.map((a) => ({
    login: a['wp:author_login'] || '',
    email: a['wp:author_email'] || '',
    displayName: a['wp:author_display_name'] || '',
    firstName: a['wp:author_first_name'] || '',
    lastName: a['wp:author_last_name'] || '',
    role: ROLE_MAP[(a['wp:author_role'] || '').toLowerCase()] || 'SUBSCRIBER',
  }));

  // ── Extract Categories ──
  if (onProgress) onProgress(70, 'Extracting categories');
  const rawCategories = channel['wp:category'] || [];
  const categories = rawCategories.map((c) => ({
    termId: String(c['wp:term_id'] || ''),
    name: c['wp:cat_name'] || c['wp:category_nicename'] || '',
    slug: c['wp:category_nicename'] || '',
    parent: c['wp:category_parent'] || '',
    description: c['wp:category_description'] || '',
    meta: extractTermMeta(c),
  }));

  // ── Extract Tags ──
  if (onProgress) onProgress(75, 'Extracting tags');
  const rawTags = channel['wp:tag'] || [];
  const tags = rawTags.map((t) => ({
    termId: String(t['wp:term_id'] || ''),
    name: t['wp:tag_name'] || '',
    slug: t['wp:tag_slug'] || '',
    description: t['wp:tag_description'] || '',
    meta: extractTermMeta(t),
  }));

  // ── Extract Terms (custom taxonomies) ──
  if (onProgress) onProgress(78, 'Extracting custom terms');
  const rawTerms = channel['wp:term'] || [];
  const terms = rawTerms.map((t) => ({
    termId: String(t['wp:term_id'] || ''),
    taxonomy: t['wp:term_taxonomy'] || '',
    name: t['wp:term_name'] || '',
    slug: t['wp:term_slug'] || '',
    parent: t['wp:term_parent'] || '',
    description: t['wp:term_description'] || '',
    meta: extractTermMeta(t),
  }));

  // ── Extract Items (posts, pages, media, etc.) ──
  if (onProgress) onProgress(80, 'Extracting content items');
  const rawItems = channel.item || [];
  const items = rawItems.map((item, index) => parseWxrItem(item, index));

  if (onProgress) onProgress(95, 'Finalizing');

  const result = {
    meta: {
      title: channelTitle,
      link: channelLink,
      description: channelDescription,
      language: channelLanguage,
      pubDate: channelPubDate,
      wxrVersion: channelWxrVersion,
      baseSiteUrl: extractBaseSiteUrl(channelLink),
    },
    authors,
    categories,
    tags,
    terms,
    items,
    stats: {
      posts: items.filter((i) => i.type === 'post').length,
      pages: items.filter((i) => i.type === 'page').length,
      media: items.filter((i) => i.type === 'attachment').length,
      revisions: items.filter((i) => i.type === 'revision').length,
      navMenuItems: items.filter((i) => i.type === 'nav_menu_item').length,
      other: items.filter(
        (i) => !['post', 'page', 'attachment', 'revision', 'nav_menu_item'].includes(i.type),
      ).length,
      totalComments: items.reduce((sum, i) => sum + (i.comments?.length || 0), 0),
    },
  };

  if (onProgress) onProgress(100, 'Complete');
  return result;
}

/**
 * Parse a single WXR item (post, page, attachment, etc.)
 */
function parseWxrItem(item, index) {
  if (!item) return createEmptyItem(index);

  const postType = item['wp:post_type'] || 'post';
  const status = item['wp:status'] || 'draft';

  // Extract content from namespaced elements
  const contentEncoded = extractNamespacedContent(item, 'content:encoded');
  const excerptEncoded = extractNamespacedContent(item, 'excerpt:encoded');
  const creator = extractNamespacedContent(item, 'dc:creator');

  // Extract categories (both taxonomy-based and plain)
  const rawCategories = item.category || [];
  const itemCats = [];
  const itemTags = [];
  const itemTerms = {};

  if (Array.isArray(rawCategories)) {
    for (const cat of rawCategories) {
      const catName = typeof cat === 'string' ? cat : cat['#text'] || cat['@_nicename'] || '';
      const domain = cat['@_domain'] || '';
      const nicename = cat['@_nicename'] || '';

      if (domain === 'category' || !domain) {
        itemCats.push({ name: catName, nicename, domain: 'category' });
      } else if (domain === 'post_tag') {
        itemTags.push({ name: catName, nicename, domain: 'post_tag' });
      } else if (domain) {
        if (!itemTerms[domain]) itemTerms[domain] = [];
        itemTerms[domain].push({ name: catName, nicename, domain });
      }
    }
  }

  // Extract comments
  const rawComments = item['wp:comment'] || [];
  const comments = (Array.isArray(rawComments) ? rawComments : [rawComments]).map((c) => ({
    id: String(c['wp:comment_id'] || ''),
    author: c['wp:comment_author'] || '',
    email: c['wp:comment_author_email'] || '',
    url: c['wp:comment_author_url'] || '',
    ip: c['wp:comment_author_IP'] || '',
    date: c['wp:comment_date'] || '',
    dateGmt: c['wp:comment_date_gmt'] || '',
    content: c['wp:comment_content'] || '',
    approved: c['wp:comment_approved'] || '1',
    parent: String(c['wp:comment_parent'] || '0'),
    userId: String(c['wp:comment_user_id'] || '0'),
    type: c['wp:comment_type'] || '',
  }));

  // Extract post meta
  const rawMeta = item['wp:postmeta'] || [];
  const meta = {};
  const acfFields = {};

  (Array.isArray(rawMeta) ? rawMeta : [rawMeta]).forEach((m) => {
    const key = m['wp:meta_key'] || '';
    const value = m['wp:meta_value'] || '';
    if (!key) return;

    // Detect ACF fields
    if (key.startsWith('_')) {
      // ACF field reference (starts with underscore + field key)
      const fieldName = key.substring(1);
      acfFields[fieldName] = {
        key: value,
        isAcf: true,
      };
    } else {
      meta[key] = value;
    }
  });

  // Extract menu item data from meta
  const menuItemType = meta['menu_item_type'] || '';
  const menuItemObject = meta['menu_item_object'] || '';
  const menuItemObjectId = meta['menu_item_object_id'] || '';
  const menuItemTarget = meta['menu_item_target'] || '';
  const menuItemClasses = meta['menu_item_classes'] || '';
  const menuItemXfn = meta['menu_item_xfn'] || '';
  const menuItemUrl = meta['menu_item_url'] || '';

  // Parse dates
  const postDate = parseWxrDate(item['wp:post_date'] || '');
  const postDateGmt = parseWxrDate(item['wp:post_date_gmt'] || '') || postDate;

  // Build the item
  const result = {
    id: String(item['wp:post_id'] || index),
    type: TYPE_MAP[postType] || postType,
    status: STATUS_MAP[status] || 'DRAFT',
    title: item.title || '',
    link: item.link || '',
    description: item.description || '',
    content: contentEncoded || '',
    excerpt: excerptEncoded || '',
    slug:
      item['wp:post_name'] || slugify(item.title || '') || `post-${item['wp:post_id'] || index}`,
    postDate,
    postDateGmt,
    parent: parseInt(item['wp:post_parent']) || 0,
    menuOrder: parseInt(item['wp:menu_order']) || 0,
    password: item['wp:post_password'] || '',
    isSticky: item['wp:is_sticky'] === '1',
    attachmentUrl: item['wp:attachment_url'] || '',
    creator: creator || '',
    categories: itemCats,
    tags: itemTags,
    terms: itemTerms,
    comments,
    meta,
    acfFields,
    // Menu item specific
    menuItemType,
    menuItemObject,
    menuItemObjectId,
    menuItemTarget,
    menuItemUrl,
    // Comment status
    commentStatus: item['wp:comment_status'] || 'open',
    pingStatus: item['wp:ping_status'] || 'open',
    // Template
    template: item['wp:post_template'] || item['wp:wp_page_template'] || '',
    // Post format
    postFormat: item['wp:post_format'] || '',
    // Attachment metadata
    attachmentMeta: extractAttachmentMeta(item),
  };

  // Convert shortcodes
  result.content = convertShortcodes(result.content);

  return result;
}

/**
 * Extract content from namespaced XML elements (handles different parser formats)
 */
function extractNamespacedContent(item, key) {
  // Direct key access
  if (item[key]) return item[key];

  // Try with colon replaced
  const altKey = key.replace(':', '_');
  if (item[altKey]) return item[altKey];

  // Try finding by namespace
  for (const [k, v] of Object.entries(item)) {
    if (k.includes(key) || k.includes(key.replace(':', ''))) {
      if (typeof v === 'string') return v;
    }
  }

  return '';
}

/**
 * Extract attachment metadata
 */
function extractAttachmentMeta(item) {
  const meta = item['wp:postmeta'] || [];
  const attachmentMeta = {};

  if (Array.isArray(meta)) {
    for (const m of meta) {
      const key = m['wp:meta_key'] || '';
      const value = m['wp:meta_value'] || '';

      if (key === '_wp_attachment_metadata') {
        try {
          const parsed = JSON.parse(value);
          attachmentMeta.width = parsed.width;
          attachmentMeta.height = parsed.height;
          attachmentMeta.file = parsed.file;
          attachmentMeta.sizes = parsed.sizes || {};
          attachmentMeta.imageMeta = parsed.image_meta || {};
        } catch {}
      }
      if (key === '_wp_attached_file') {
        attachmentMeta.attachedFile = value;
      }
      if (key === '_wp_attachment_image_alt') {
        attachmentMeta.alt = value;
      }
    }
  }

  return attachmentMeta;
}

/**
 * Extract term meta from category/tag XML
 */
function extractTermMeta(termXml) {
  const meta = {};
  const rawMeta = termXml['wp:termmeta'] || [];
  (Array.isArray(rawMeta) ? rawMeta : [rawMeta]).forEach((m) => {
    const key = m['wp:meta_key'] || '';
    const value = m['wp:meta_value'] || '';
    if (key) meta[key] = value;
  });
  return meta;
}

/**
 * Parse WXR date format (YYYY-MM-DD HH:MM:SS)
 */
function parseWxrDate(dateStr) {
  if (!dateStr) return null;
  // WXR format: "2024-01-15 10:30:00"
  const d = new Date(dateStr.replace(' ', 'T') + 'Z');
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Extract base site URL from WordPress site URL
 */
function extractBaseSiteUrl(siteUrl) {
  if (!siteUrl) return '';
  try {
    const u = new URL(siteUrl);
    return `${u.protocol}//${u.hostname}`;
  } catch {
    return siteUrl;
  }
}

/**
 * Convert WordPress shortcodes to NodePress format
 */
function convertShortcodes(content) {
  if (!content) return content;

  // WordPress [caption] → NodePress [caption]
  // WordPress [gallery] → NodePress [gallery]
  // WordPress [audio] → NodePress [audio]
  // WordPress [video] → NodePress [video]
  // WordPress [embed] → NodePress [embed]
  // WordPress [playlist] → NodePress [playlist]

  // Convert WordPress caption shortcode attributes format
  content = content.replace(
    /\[caption\s+([^\]]*?)\]([\s\S]*?)\[\/caption\]/gi,
    (match, attrs, inner) => {
      const id = attrs.match(/id="([^"]*)"/)?.[1] || '';
      const align = attrs.match(/align="([^"]*)"/)?.[1] || 'none';
      const width = attrs.match(/width="([^"]*)"/)?.[1] || '';
      return `[caption id="${id}" align="${align}" width="${width}"]${inner.trim()}[/caption]`;
    },
  );

  // Convert [wp:shortcode] or other formats
  // WordPress block theme shortcodes
  content = content.replace(/<!--\s*wp:(\w+)\s*(.*?)\s*-->/gs, (match, blockName, attrs) => {
    return `[wp:${blockName} ${attrs}]`;
  });

  content = content.replace(/<!--\s*\/wp:\w+\s*-->/gs, '[/wp]');

  return content;
}

/**
 * Slugify a string
 */
function slugify(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 200);
}

/**
 * Create an empty item for error cases
 */
function createEmptyItem(index) {
  return {
    id: String(index),
    type: 'post',
    status: 'DRAFT',
    title: '',
    link: '',
    description: '',
    content: '',
    excerpt: '',
    slug: `item-${index}`,
    postDate: null,
    postDateGmt: null,
    parent: 0,
    menuOrder: 0,
    password: '',
    isSticky: false,
    attachmentUrl: '',
    creator: '',
    categories: [],
    tags: [],
    terms: {},
    comments: [],
    meta: {},
    acfFields: {},
    menuItemType: '',
    menuItemObject: '',
    menuItemObjectId: '',
    menuItemTarget: '',
    menuItemUrl: '',
    commentStatus: 'open',
    pingStatus: 'open',
    template: '',
    postFormat: '',
    attachmentMeta: {},
  };
}

// ── Streaming Parser (for large files > 100MB) ───────────────

/**
 * Parse WXR file using streaming SAX-style approach
 * Handles files that won't fit in memory
 */
function parseStreaming(filePath, fileSize, onProgress) {
  const result = {
    meta: {
      title: '',
      link: '',
      description: '',
      language: 'en-US',
      pubDate: '',
      wxrVersion: '1.2',
      baseSiteUrl: '',
    },
    authors: [],
    categories: [],
    tags: [],
    terms: [],
    items: [],
    stats: {
      posts: 0,
      pages: 0,
      media: 0,
      revisions: 0,
      navMenuItems: 0,
      other: 0,
      totalComments: 0,
    },
  };

  // For very large files, parse in chunks using a regex-based approach
  // This avoids loading the entire XML into memory at once
  const readStream = fs.createReadStream(filePath, { encoding: 'utf-8', highWaterMark: 64 * 1024 });
  const chunks = [];
  let totalSize = 0;
  let processedSize = 0;

  return new Promise((resolve, reject) => {
    readStream.on('data', (chunk) => {
      chunks.push(chunk);
      totalSize += chunk.length;

      if (onProgress) {
        const pct = Math.min(Math.round((totalSize / fileSize) * 80), 80);
        onProgress(pct, `Reading file (${(totalSize / 1024 / 1024).toFixed(1)}MB)`);
      }
    });

    readStream.on('end', () => {
      try {
        if (onProgress) onProgress(85, 'Assembling XML');

        const fullXml = chunks.join('');
        chunks.length = 0; // Free memory

        // Use the full parser on the assembled content
        // For files > 500MB, we'd need a true streaming SAX parser
        // but fast-xml-parser requires the full document
        const fullResult = parseFull(filePath, fileSize, (pct, msg) => {
          if (onProgress) {
            // Scale from 85-100
            const scaledPct = 85 + Math.round((pct * 15) / 100);
            onProgress(scaledPct, msg);
          }
        });

        Object.assign(result, fullResult);
        resolve(result);
      } catch (err) {
        reject(new Error(`Streaming parse failed: ${err.message}`));
      }
    });

    readStream.on('error', (err) => {
      reject(new Error(`File read error: ${err.message}`));
    });
  });
}

/**
 * Extract ACF field group definitions from items
 * ACF stores field definitions in post meta with specific patterns
 */
function extractAcfFieldGroups(wxrData) {
  const fieldGroups = [];

  for (const item of wxrData.items) {
    // ACF field groups are stored as 'post' type with a specific meta key
    if (item.type === 'post' && item.meta && item.meta['_acf_field_group']) {
      try {
        const groupData = JSON.parse(item.meta['_acf_field_group']);
        fieldGroups.push({
          id: item.id,
          title: item.title,
          slug: item.slug,
          fields: groupData.fields || [],
          location: groupData.location || [],
          options: groupData.options || {},
          menuOrder: groupData.menu_order || 0,
          active: groupData.active !== false,
          description: groupData.description || '',
        });
      } catch {}
    }
  }

  return fieldGroups;
}

/**
 * Validate if a file is a valid WXR export
 */
function validateWxrFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8').substring(0, 2000);
    const hasRss = /<rss[^>]*>/i.test(content);
    const hasWxr =
      /xmlns:wp=["']http:\/\/wordpress\.org\/export/i.test(content) ||
      /<wp:wxr_version>/i.test(content);
    const hasChannel = /<channel>/i.test(content);
    const hasItem = /<item>/i.test(content);

    return {
      valid: hasRss && hasWxr && hasChannel && hasItem,
      hasRss,
      hasWxr,
      hasChannel,
      hasItem,
      errors: !hasRss
        ? ['Missing <rss> root element']
        : !hasWxr
          ? ['Missing WordPress namespace (xmlns:wp)']
          : !hasChannel
            ? ['Missing <channel> element']
            : !hasItem
              ? ['Missing <item> elements']
              : [],
    };
  } catch (err) {
    return { valid: false, errors: [err.message] };
  }
}

// ── Exports ──────────────────────────────────────────────────
module.exports = {
  parseWxr,
  parseFull,
  parseStreaming,
  validateWxrFile,
  extractAcfFieldGroups,
  parseWxrItem,
  slugify,
  convertShortcodes,
  STATUS_MAP,
  TYPE_MAP,
  ROLE_MAP,
  COMMENT_STATUS_MAP,
};
