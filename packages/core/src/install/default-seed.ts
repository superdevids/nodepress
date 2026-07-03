import bcrypt from 'bcryptjs'

export interface SeedContext {
  prisma: any
  adminEmail: string
  adminPassword: string
  adminFirstName: string
  adminLastName: string
  siteTitle: string
  siteDescription: string
}

export async function seedDefaultData(ctx: SeedContext): Promise<void> {
  const { prisma } = ctx

  // Content Types: Post & Page
  const postType = await prisma.contentType.upsert({
    where: { name: 'post' },
    update: {},
    create: {
      name: 'post',
      label: { singular: 'Post', plural: 'Posts' },
      fields: {
        title: { type: 'text', label: 'Title', required: true },
        body: { type: 'richtext', label: 'Content' },
        excerpt: { type: 'text', label: 'Excerpt' },
      },
      supports: ['revisions', 'seo', 'comments', 'author', 'featured-image'],
      source: 'CODE',
      menuIcon: 'FileText',
      menuPosition: 10,
      showInMenu: true,
      hasArchive: true,
      publiclyQueryable: true,
      excludeFromSearch: false,
    },
  })

  const pageType = await prisma.contentType.upsert({
    where: { name: 'page' },
    update: {},
    create: {
      name: 'page',
      label: { singular: 'Page', plural: 'Pages' },
      fields: {
        title: { type: 'text', label: 'Title', required: true },
        body: { type: 'richtext', label: 'Content' },
      },
      supports: ['revisions', 'seo', 'author'],
      source: 'CODE',
      menuIcon: 'File',
      menuPosition: 20,
      showInMenu: true,
      hasArchive: false,
      publiclyQueryable: true,
      excludeFromSearch: false,
    },
  })

  // Taxonomies: Category & Tag
  const categoryTax = await prisma.taxonomy.upsert({
    where: { name: 'category' },
    update: {},
    create: { name: 'category', hierarchical: true },
  })

  const tagTax = await prisma.taxonomy.upsert({
    where: { name: 'tag' },
    update: {},
    create: { name: 'tag', hierarchical: false },
  })

  // Default terms
  const uncategorized = await prisma.term.upsert({
    where: {
      taxonomyId_slug: { taxonomyId: categoryTax.id, slug: 'uncategorized' },
    },
    update: {},
    create: {
      taxonomyId: categoryTax.id,
      name: 'Uncategorized',
      slug: 'uncategorized',
      description: 'Default category for uncategorized posts.',
      count: 0,
    },
  })

  // Admin user
  const passwordHash = await bcrypt.hash(ctx.adminPassword, 12)
  const adminUser = await prisma.user.upsert({
    where: { email: ctx.adminEmail },
    update: {},
    create: {
      email: ctx.adminEmail,
      passwordHash,
      name: `${ctx.adminFirstName} ${ctx.adminLastName}`.trim(),
      displayName: ctx.adminFirstName || 'Admin',
      role: 'SUPER_ADMIN',
      capabilities: ['manage_all'],
      userStatus: 0,
    },
  })

  // Hello World post
  const helloWorld = await prisma.contentEntry.upsert({
    where: {
      contentTypeId_slug: { contentTypeId: postType.id, slug: 'hello-world' },
    },
    update: {},
    create: {
      contentTypeId: postType.id,
      slug: 'hello-world',
      status: 'PUBLISHED',
      data: {
        title: 'Hello World!',
        content:
          'Welcome to NodePress. This is your first post. Edit or delete it, then start writing!',
      },
      excerpt:
        'Welcome to NodePress. This is your first post. Edit or delete it, then start writing!',
      authorId: adminUser.id,
      publishedAt: new Date(),
      commentStatus: 'open',
      pingStatus: 'open',
    },
  })

  await prisma.termRelation.upsert({
    where: {
      entryId_termId: {
        entryId: helloWorld.id,
        termId: uncategorized.id,
      },
    },
    update: {},
    create: {
      entryId: helloWorld.id,
      termId: uncategorized.id,
    },
  })

  // Sample Page
  const samplePage = await prisma.contentEntry.upsert({
    where: {
      contentTypeId_slug: { contentTypeId: pageType.id, slug: 'sample-page' },
    },
    update: {},
    create: {
      contentTypeId: pageType.id,
      slug: 'sample-page',
      status: 'PUBLISHED',
      data: {
        title: 'Sample Page',
        content:
          'This is a sample page. It demonstrates a basic page layout. You can customize this content or delete it and start with your own content.',
      },
      authorId: adminUser.id,
      publishedAt: new Date(),
      commentStatus: 'closed',
      pingStatus: 'closed',
    },
  })

  // Primary Menu with Sample Page
  const primaryMenu = await prisma.menu.upsert({
    where: { location: 'primary' },
    update: {},
    create: { location: 'primary' },
  })

  const existingItems = await prisma.menuItem.findMany({
    where: { menuId: primaryMenu.id },
  })
  if (existingItems.length === 0) {
    await prisma.menuItem.create({
      data: {
        menuId: primaryMenu.id,
        label: 'Sample Page',
        url: '/sample-page',
        order: 1,
      },
    })
  }

  // Default Settings
  const defaultSettings = [
    { group: 'general', key: 'site_title', value: ctx.siteTitle, autoload: true },
    { group: 'general', key: 'tagline', value: ctx.siteDescription || 'A Headless CMS built with Node.js', autoload: true },
    { group: 'general', key: 'site_url', value: process.env.APP_URL || 'http://localhost:3000', autoload: true },
    { group: 'general', key: 'admin_email', value: ctx.adminEmail, autoload: true },
    { group: 'general', key: 'language', value: 'en-US', autoload: true },
    { group: 'general', key: 'timezone', value: 'UTC', autoload: true },
    { group: 'general', key: 'date_format', value: 'Y-m-d', autoload: true },
    { group: 'general', key: 'time_format', value: 'H:i', autoload: true },
    { group: 'general', key: 'start_of_week', value: 1, autoload: true },

    { group: 'reading', key: 'posts_per_page', value: 10, autoload: true },
    { group: 'reading', key: 'page_for_posts', value: null, autoload: true },
    { group: 'reading', key: 'page_for_front', value: null, autoload: true },

    { group: 'discussion', key: 'default_comment_status', value: 'open', autoload: true },
    { group: 'discussion', key: 'require_comment_moderation', value: true, autoload: true },
    { group: 'discussion', key: 'comment_moderation_queue', value: true, autoload: true },
    { group: 'discussion', key: 'comments_per_page', value: 50, autoload: true },

    { group: 'permalinks', key: 'structure', value: '/%year%/%monthnum%/%postname%/', autoload: true },
    { group: 'permalinks', key: 'category_base', value: '/category', autoload: true },
    { group: 'permalinks', key: 'tag_base', value: '/tag', autoload: true },

    { group: 'writing', key: 'default_category', value: uncategorized.id, autoload: true },
    { group: 'writing', key: 'default_post_format', value: 'standard', autoload: true },

    { group: 'seo', key: 'search_engine_visibility', value: true, autoload: true },
    { group: 'seo', key: 'enable_sitemap', value: true, autoload: true },
    { group: 'seo', key: 'enable_og_tags', value: true, autoload: true },

    { group: 'cors', key: 'origins', value: process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001', autoload: true },
    { group: 'cors', key: 'methods', value: 'GET,POST,PUT,PATCH,DELETE,OPTIONS', autoload: true },

    { group: 'maintenance', key: 'mode', value: false, autoload: true },
    { group: 'maintenance', key: 'allowed_ips', value: '', autoload: true },
  ]

  for (const setting of defaultSettings) {
    await prisma.setting.upsert({
      where: { group_key: { group: setting.group, key: setting.key } },
      update: { value: setting.value },
      create: setting,
    })
  }
}
