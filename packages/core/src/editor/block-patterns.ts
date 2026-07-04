import { BlockContent } from '../theme/block-patterns.js';

export interface EditorPattern {
  name: string;
  title: string;
  description: string;
  category: string;
  content: BlockContent;
  keywords: string[];
}

const t = (text: string) => ({ type: 'text' as const, text });
const p = (...content: ReturnType<typeof t>[]) => ({ type: 'paragraph' as const, content });
const h = (level: number, ...content: ReturnType<typeof t>[]) => ({
  type: 'heading' as const,
  attrs: { level },
  content,
});
const img = (src: string, alt = '') => ({ type: 'image' as const, attrs: { src, alt } });
const bulletItem = (
  ...content: {
    type: string;
    content?: unknown[];
    attrs?: Record<string, unknown>;
    text?: string;
  }[]
) => ({ type: 'listItem' as const, content });

export const BLOCK_PATTERNS: EditorPattern[] = [
  {
    name: 'hero-background',
    title: 'Hero with Background Image',
    description: 'Full-width hero section with background image, heading, text, and CTA button',
    category: 'hero',
    content: {
      type: 'doc',
      content: [
        {
          type: 'cover',
          attrs: { url: '', dimRatio: 50, fadeIn: true, minHeight: 600 },
          content: [
            {
              type: 'group',
              attrs: { align: 'center', layout: 'full' },
              content: [
                h(1, t('Welcome to NodePress')),
                p(
                  t(
                    'A powerful, modern CMS built with TypeScript and Node.js. Start building your next project today.',
                  ),
                ),
                {
                  type: 'buttons',
                  content: [
                    {
                      type: 'button',
                      attrs: { text: 'Get Started', variant: 'primary', url: '#' },
                    },
                    {
                      type: 'button',
                      attrs: { text: 'Learn More', variant: 'secondary', url: '#' },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    keywords: ['hero', 'banner', 'cover', 'cta', 'welcome'],
  },
  {
    name: 'two-column-content',
    title: 'Two-Column Content Layout',
    description: 'Side-by-side text and image layout for feature descriptions',
    category: 'features',
    content: {
      type: 'doc',
      content: [
        {
          type: 'columns',
          attrs: { columns: 2 },
          content: [
            {
              type: 'column',
              content: [
                h(2, t('Our Mission')),
                p(
                  t(
                    'We strive to deliver the best content management experience for developers and content creators alike.',
                  ),
                ),
                p(
                  t(
                    'Our platform combines the flexibility of a headless CMS with an intuitive editing experience.',
                  ),
                ),
              ],
            },
            {
              type: 'column',
              content: [
                { type: 'image', attrs: { src: '', alt: 'About us', width: 600, height: 400 } },
              ],
            },
          ],
        },
      ],
    },
    keywords: ['columns', 'two column', 'layout', 'content', 'feature'],
  },
  {
    name: 'three-column-features',
    title: 'Three-Column Features Grid',
    description: 'Three-column grid showcasing product features with icons',
    category: 'features',
    content: {
      type: 'doc',
      content: [
        h(2, t('Our Features')),
        p(t('Everything you need to manage your content effectively.')),
        {
          type: 'columns',
          attrs: { columns: 3 },
          content: [
            {
              type: 'column',
              content: [
                { type: 'icon', attrs: { icon: 'zap', size: 48 } },
                h(3, t('Lightning Fast')),
                p(t('Built for speed with optimized queries and caching at every layer.')),
              ],
            },
            {
              type: 'column',
              content: [
                { type: 'icon', attrs: { icon: 'shield', size: 48 } },
                h(3, t('Secure by Default')),
                p(t('Enterprise-grade security with role-based access and encryption.')),
              ],
            },
            {
              type: 'column',
              content: [
                { type: 'icon', attrs: { icon: 'expand', size: 48 } },
                h(3, t('Highly Scalable')),
                p(t('From blogs to enterprise portals, scale without limits.')),
              ],
            },
          ],
        },
      ],
    },
    keywords: ['features', 'grid', 'columns', 'three column', 'icon'],
  },
  {
    name: 'team-members',
    title: 'Team Members Grid',
    description: 'Grid layout displaying team members with photos, names, and roles',
    category: 'team',
    content: {
      type: 'doc',
      content: [
        h(2, t('Meet Our Team')),
        p(t('Talented people behind our success.')),
        {
          type: 'columns',
          attrs: { columns: 4 },
          content: [
            {
              type: 'column',
              content: [
                {
                  type: 'image',
                  attrs: { src: '', alt: 'Team member', width: 200, height: 200, round: true },
                },
                h(3, t('Jane Doe')),
                p(t('CEO & Founder')),
              ],
            },
            {
              type: 'column',
              content: [
                {
                  type: 'image',
                  attrs: { src: '', alt: 'Team member', width: 200, height: 200, round: true },
                },
                h(3, t('John Smith')),
                p(t('CTO')),
              ],
            },
            {
              type: 'column',
              content: [
                {
                  type: 'image',
                  attrs: { src: '', alt: 'Team member', width: 200, height: 200, round: true },
                },
                h(3, t('Alice Johnson')),
                p(t('Design Lead')),
              ],
            },
            {
              type: 'column',
              content: [
                {
                  type: 'image',
                  attrs: { src: '', alt: 'Team member', width: 200, height: 200, round: true },
                },
                h(3, t('Bob Wilson')),
                p(t('Engineering Lead')),
              ],
            },
          ],
        },
      ],
    },
    keywords: ['team', 'members', 'grid', 'people', 'about'],
  },
  {
    name: 'pricing-table',
    title: 'Pricing Table (3 Tiers)',
    description: 'Three-tier pricing table with features and CTA buttons',
    category: 'pricing',
    content: {
      type: 'doc',
      content: [
        h(2, t('Choose Your Plan')),
        p(t('Select the perfect plan for your needs.')),
        {
          type: 'columns',
          attrs: { columns: 3 },
          content: [
            {
              type: 'column',
              attrs: { className: 'pricing-card' },
              content: [
                h(3, t('Starter')),
                { type: 'paragraph', attrs: { className: 'price' }, content: [t('$9/mo')] },
                bulletItem(t('1 website')),
                bulletItem(t('10 GB storage')),
                bulletItem(t('Basic support')),
                { type: 'button', attrs: { text: 'Get Started', variant: 'outline', url: '#' } },
              ],
            },
            {
              type: 'column',
              attrs: { className: 'pricing-card featured' },
              content: [
                h(3, t('Professional')),
                { type: 'paragraph', attrs: { className: 'price' }, content: [t('$29/mo')] },
                bulletItem(t('10 websites')),
                bulletItem(t('50 GB storage')),
                bulletItem(t('Priority support')),
                bulletItem(t('Advanced analytics')),
                { type: 'button', attrs: { text: 'Get Started', variant: 'primary', url: '#' } },
              ],
            },
            {
              type: 'column',
              attrs: { className: 'pricing-card' },
              content: [
                h(3, t('Enterprise')),
                { type: 'paragraph', attrs: { className: 'price' }, content: [t('$99/mo')] },
                bulletItem(t('Unlimited websites')),
                bulletItem(t('500 GB storage')),
                bulletItem(t('24/7 dedicated support')),
                bulletItem(t('Custom integrations')),
                bulletItem(t('SLA guarantee')),
                { type: 'button', attrs: { text: 'Contact Sales', variant: 'outline', url: '#' } },
              ],
            },
          ],
        },
      ],
    },
    keywords: ['pricing', 'plans', 'subscription', 'tiers', 'table'],
  },
  {
    name: 'call-to-action',
    title: 'Call to Action Section',
    description: 'Bold CTA section with heading, text, and prominent button',
    category: 'call-to-action',
    content: {
      type: 'doc',
      content: [
        {
          type: 'group',
          attrs: { align: 'center', backgroundColor: '#2271b1', padding: 60, textColor: '#ffffff' },
          content: [
            h(2, t('Ready to Get Started?')),
            p(t('Join thousands of satisfied users and take your content to the next level.')),
            {
              type: 'buttons',
              content: [
                {
                  type: 'button',
                  attrs: { text: 'Start Free Trial', variant: 'primary', url: '#' },
                },
              ],
            },
          ],
        },
      ],
    },
    keywords: ['cta', 'call to action', 'button', 'conversion'],
  },
  {
    name: 'testimonial-slider',
    title: 'Testimonial Slider',
    description: 'Customer testimonial section with quotes, avatars, and names',
    category: 'testimonials',
    content: {
      type: 'doc',
      content: [
        h(2, t('What Our Customers Say')),
        {
          type: 'columns',
          attrs: { columns: 3 },
          content: [
            {
              type: 'column',
              content: [
                {
                  type: 'image',
                  attrs: { src: '', alt: 'Avatar', width: 80, height: 80, round: true },
                },
                p(t('NodePress transformed how we manage our content. Incredible flexibility!')),
                p(t('— Sarah K.')),
              ],
            },
            {
              type: 'column',
              content: [
                {
                  type: 'image',
                  attrs: { src: '', alt: 'Avatar', width: 80, height: 80, round: true },
                },
                p(t('The best CMS we have ever used. Fast, secure, and developer-friendly.')),
                p(t('— Mike R.')),
              ],
            },
            {
              type: 'column',
              content: [
                {
                  type: 'image',
                  attrs: { src: '', alt: 'Avatar', width: 80, height: 80, round: true },
                },
                p(
                  t(
                    'Migrated our entire content library in a day. The API is a dream to work with.',
                  ),
                ),
                p(t('— Emily T.')),
              ],
            },
          ],
        },
      ],
    },
    keywords: ['testimonial', 'review', 'quote', 'social proof', 'customers'],
  },
  {
    name: 'faq-accordion',
    title: 'FAQ Accordion',
    description: 'Frequently asked questions section with expandable items',
    category: 'text',
    content: {
      type: 'doc',
      content: [
        h(2, t('Frequently Asked Questions')),
        {
          type: 'accordion',
          content: [
            {
              type: 'accordion-item',
              attrs: { title: 'What is NodePress?' },
              content: [
                p(
                  t(
                    'NodePress is a modern, headless CMS built with TypeScript and Node.js, designed to give developers full control over their content architecture.',
                  ),
                ),
              ],
            },
            {
              type: 'accordion-item',
              attrs: { title: 'Can I migrate from WordPress?' },
              content: [
                p(
                  t(
                    'Yes, NodePress offers equivalent features including plugins, themes, hooks, shortcodes, and more for easy migration from other platforms.',
                  ),
                ),
              ],
            },
            {
              type: 'accordion-item',
              attrs: { title: 'Can I host it myself?' },
              content: [
                p(
                  t(
                    'Absolutely. NodePress is self-hosted and open source. Deploy anywhere Node.js runs.',
                  ),
                ),
              ],
            },
            {
              type: 'accordion-item',
              attrs: { title: 'Does it support multi-language?' },
              content: [
                p(
                  t(
                    'Yes, NodePress includes a built-in i18n engine supporting multiple languages and locales.',
                  ),
                ),
              ],
            },
          ],
        },
      ],
    },
    keywords: ['faq', 'questions', 'accordion', 'help', 'support'],
  },
  {
    name: 'contact-form',
    title: 'Contact Form Layout',
    description: 'Contact section with form fields and submit button',
    category: 'forms',
    content: {
      type: 'doc',
      content: [
        h(2, t('Get in Touch')),
        p(t('Have a question? We would love to hear from you.')),
        {
          type: 'columns',
          attrs: { columns: 2 },
          content: [
            {
              type: 'column',
              content: [
                {
                  type: 'form',
                  attrs: { id: 'contact' },
                  content: [
                    {
                      type: 'field',
                      attrs: {
                        label: 'Name',
                        type: 'text',
                        required: true,
                        placeholder: 'Your name',
                      },
                    },
                    {
                      type: 'field',
                      attrs: {
                        label: 'Email',
                        type: 'email',
                        required: true,
                        placeholder: 'your@email.com',
                      },
                    },
                    {
                      type: 'field',
                      attrs: {
                        label: 'Subject',
                        type: 'text',
                        required: true,
                        placeholder: 'Subject',
                      },
                    },
                    {
                      type: 'field',
                      attrs: {
                        label: 'Message',
                        type: 'textarea',
                        required: true,
                        placeholder: 'Your message',
                        rows: 5,
                      },
                    },
                    { type: 'button', attrs: { text: 'Send Message', variant: 'primary' } },
                  ],
                },
              ],
            },
            {
              type: 'column',
              content: [
                { type: 'image', attrs: { src: '', alt: 'Contact', width: 400, height: 400 } },
              ],
            },
          ],
        },
      ],
    },
    keywords: ['contact', 'form', 'email', 'message', 'support'],
  },
  {
    name: 'portfolio-gallery',
    title: 'Portfolio Gallery Grid',
    description: 'Masonry-style portfolio grid with image cards',
    category: 'portfolio',
    content: {
      type: 'doc',
      content: [
        h(2, t('Our Portfolio')),
        p(t('Browse our latest projects and case studies.')),
        {
          type: 'gallery',
          attrs: { columns: 3, spacing: 10 },
          content: [
            {
              type: 'gallery-item',
              attrs: { src: '', alt: 'Project 1', caption: 'Project Alpha' },
            },
            { type: 'gallery-item', attrs: { src: '', alt: 'Project 2', caption: 'Project Beta' } },
            {
              type: 'gallery-item',
              attrs: { src: '', alt: 'Project 3', caption: 'Project Gamma' },
            },
            {
              type: 'gallery-item',
              attrs: { src: '', alt: 'Project 4', caption: 'Project Delta' },
            },
            {
              type: 'gallery-item',
              attrs: { src: '', alt: 'Project 5', caption: 'Project Epsilon' },
            },
            { type: 'gallery-item', attrs: { src: '', alt: 'Project 6', caption: 'Project Zeta' } },
          ],
        },
      ],
    },
    keywords: ['portfolio', 'gallery', 'grid', 'projects', 'showcase'],
  },
  {
    name: 'blog-posts-grid',
    title: 'Blog Post Grid',
    description: 'Grid layout displaying recent blog posts with featured images and excerpts',
    category: 'blog',
    content: {
      type: 'doc',
      content: [
        h(2, t('Latest Articles')),
        p(t('Stay up to date with our latest news and insights.')),
        {
          type: 'columns',
          attrs: { columns: 3 },
          content: [
            {
              type: 'column',
              content: [
                { type: 'image', attrs: { src: '', alt: 'Post', width: 400, height: 250 } },
                h(3, t('Getting Started with NodePress')),
                p(t('Learn how to set up your first NodePress project in minutes.')),
                { type: 'button', attrs: { text: 'Read More', variant: 'link', url: '#' } },
              ],
            },
            {
              type: 'column',
              content: [
                { type: 'image', attrs: { src: '', alt: 'Post', width: 400, height: 250 } },
                h(3, t('Advanced Plugin Development')),
                p(t('Deep dive into creating powerful plugins for NodePress.')),
                { type: 'button', attrs: { text: 'Read More', variant: 'link', url: '#' } },
              ],
            },
            {
              type: 'column',
              content: [
                { type: 'image', attrs: { src: '', alt: 'Post', width: 400, height: 250 } },
                h(3, t('Performance Optimization Tips')),
                p(t('Best practices for keeping your NodePress site blazing fast.')),
                { type: 'button', attrs: { text: 'Read More', variant: 'link', url: '#' } },
              ],
            },
          ],
        },
      ],
    },
    keywords: ['blog', 'posts', 'grid', 'articles', 'news'],
  },
  {
    name: 'newsletter-signup',
    title: 'Newsletter Signup Form',
    description: 'Email newsletter subscription section with input and submit button',
    category: 'forms',
    content: {
      type: 'doc',
      content: [
        {
          type: 'group',
          attrs: { align: 'center', backgroundColor: '#f0f0f1', padding: 40 },
          content: [
            h(2, t('Subscribe to Our Newsletter')),
            p(t('Get the latest updates, tips, and resources delivered to your inbox.')),
            {
              type: 'form',
              attrs: { id: 'newsletter', layout: 'inline' },
              content: [
                {
                  type: 'field',
                  attrs: {
                    label: 'Email',
                    type: 'email',
                    required: true,
                    placeholder: 'you@example.com',
                  },
                },
                { type: 'button', attrs: { text: 'Subscribe', variant: 'primary' } },
              ],
            },
          ],
        },
      ],
    },
    keywords: ['newsletter', 'subscribe', 'email', 'signup', 'mailing list'],
  },
  {
    name: 'logo-cloud',
    title: 'Logo Cloud / Clients Section',
    description: 'Grid of client or partner logos displayed in a row',
    category: 'logos',
    content: {
      type: 'doc',
      content: [
        h(2, t('Trusted by Leading Companies')),
        {
          type: 'gallery',
          attrs: { columns: 5, spacing: 20, grayscale: true },
          content: [
            { type: 'gallery-item', attrs: { src: '', alt: 'Client 1', caption: '' } },
            { type: 'gallery-item', attrs: { src: '', alt: 'Client 2', caption: '' } },
            { type: 'gallery-item', attrs: { src: '', alt: 'Client 3', caption: '' } },
            { type: 'gallery-item', attrs: { src: '', alt: 'Client 4', caption: '' } },
            { type: 'gallery-item', attrs: { src: '', alt: 'Client 5', caption: '' } },
            { type: 'gallery-item', attrs: { src: '', alt: 'Client 6', caption: '' } },
            { type: 'gallery-item', attrs: { src: '', alt: 'Client 7', caption: '' } },
            { type: 'gallery-item', attrs: { src: '', alt: 'Client 8', caption: '' } },
            { type: 'gallery-item', attrs: { src: '', alt: 'Client 9', caption: '' } },
            { type: 'gallery-item', attrs: { src: '', alt: 'Client 10', caption: '' } },
          ],
        },
      ],
    },
    keywords: ['logo', 'clients', 'partners', 'trusted by', 'brands'],
  },
  {
    name: 'stats-counter',
    title: 'Stats Counter Row',
    description: 'Row of statistics numbers with labels for social proof',
    category: 'stats',
    content: {
      type: 'doc',
      content: [
        {
          type: 'group',
          attrs: { align: 'center', backgroundColor: '#1a1a1a', padding: 60, textColor: '#ffffff' },
          content: [
            {
              type: 'columns',
              attrs: { columns: 4 },
              content: [
                {
                  type: 'column',
                  content: [
                    { type: 'counter', attrs: { value: 10000, suffix: '+', label: 'Users' } },
                  ],
                },
                {
                  type: 'column',
                  content: [
                    {
                      type: 'counter',
                      attrs: { value: 50000, suffix: '+', label: 'Posts Published' },
                    },
                  ],
                },
                {
                  type: 'column',
                  content: [
                    { type: 'counter', attrs: { value: 99.9, suffix: '%', label: 'Uptime' } },
                  ],
                },
                {
                  type: 'column',
                  content: [
                    { type: 'counter', attrs: { value: 150, suffix: '+', label: 'Countries' } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    keywords: ['stats', 'counter', 'numbers', 'social proof', 'metrics'],
  },
  {
    name: 'timeline-layout',
    title: 'Timeline Layout',
    description: 'Vertical timeline with alternating left-right event cards',
    category: 'content',
    content: {
      type: 'doc',
      content: [
        h(2, t('Our Journey')),
        {
          type: 'timeline',
          content: [
            {
              type: 'timeline-item',
              attrs: { year: '2024', side: 'left' },
              content: [
                h(3, t('Company Founded')),
                p(t('NodePress was founded with a vision to modernize content management.')),
              ],
            },
            {
              type: 'timeline-item',
              attrs: { year: '2025', side: 'right' },
              content: [
                h(3, t('Alpha Launch')),
                p(t('First public alpha release with core CMS features and plugin system.')),
              ],
            },
            {
              type: 'timeline-item',
              attrs: { year: '2026', side: 'left' },
              content: [
                h(3, t('Beta Release')),
                p(t('Beta launch with Modern CMS APIs, themes, and migration tools.')),
              ],
            },
            {
              type: 'timeline-item',
              attrs: { year: '2027', side: 'right' },
              content: [
                h(3, t('Enterprise Ready')),
                p(t('Full enterprise features including SSO, audit logs, and dedicated support.')),
              ],
            },
          ],
        },
      ],
    },
    keywords: ['timeline', 'history', 'roadmap', 'journey', 'events'],
  },
  {
    name: 'card-grid',
    title: 'Card Grid',
    description: 'Grid of info cards with icons, titles, and descriptions',
    category: 'features',
    content: {
      type: 'doc',
      content: [
        h(2, t('Why Choose NodePress')),
        {
          type: 'columns',
          attrs: { columns: 3 },
          content: [
            {
              type: 'column',
              attrs: { className: 'info-card' },
              content: [
                { type: 'icon', attrs: { icon: 'code', size: 40 } },
                h(3, t('Developer First')),
                p(t('Built for developers with TypeScript, REST API, and GraphQL out of the box.')),
              ],
            },
            {
              type: 'column',
              attrs: { className: 'info-card' },
              content: [
                { type: 'icon', attrs: { icon: 'plugin', size: 40 } },
                h(3, t('Extensible')),
                p(t('Powerful plugin and hook system for endless customization.')),
              ],
            },
            {
              type: 'column',
              attrs: { className: 'info-card' },
              content: [
                { type: 'icon', attrs: { icon: 'theme', size: 40 } },
                h(3, t('Themeable')),
                p(t('Full theme system with child themes, block patterns, and template parts.')),
              ],
            },
          ],
        },
      ],
    },
    keywords: ['cards', 'grid', 'info', 'features', 'reasons'],
  },
  {
    name: 'image-text-overlay',
    title: 'Image with Text Overlay',
    description: 'Background image with centered text overlay and opacity dimming',
    category: 'hero',
    content: {
      type: 'doc',
      content: [
        {
          type: 'cover',
          attrs: { url: '', dimRatio: 60, minHeight: 500, align: 'center' },
          content: [
            h(2, t('Create Something Amazing')),
            p(t('Powerful tools. Infinite possibilities. Start building today.')),
            { type: 'button', attrs: { text: 'Explore Now', variant: 'primary', url: '#' } },
          ],
        },
      ],
    },
    keywords: ['overlay', 'cover', 'image background', 'hero', 'banner'],
  },
  {
    name: 'product-showcase',
    title: 'Product Showcase',
    description: 'Feature highlight with product image on one side and description on the other',
    category: 'features',
    content: {
      type: 'doc',
      content: [
        {
          type: 'columns',
          attrs: { columns: 2 },
          content: [
            {
              type: 'column',
              content: [
                {
                  type: 'image',
                  attrs: { src: '', alt: 'Product screenshot', width: 500, height: 350 },
                },
              ],
            },
            {
              type: 'column',
              content: [
                h(2, t('Powerful Dashboard')),
                p(
                  t(
                    'Get a complete overview of your content, traffic, and team activity all in one place.',
                  ),
                ),
                bulletItem(t('Real-time analytics')),
                bulletItem(t('Content performance metrics')),
                bulletItem(t('Team collaboration tools')),
                bulletItem(t('Custom report builder')),
                { type: 'button', attrs: { text: 'Learn More', variant: 'primary', url: '#' } },
              ],
            },
          ],
        },
      ],
    },
    keywords: ['product', 'showcase', 'feature highlight', 'app screenshot'],
  },
  {
    name: 'video-embed',
    title: 'Video Embed Section',
    description: 'Section with embedded video player and supporting description',
    category: 'media',
    content: {
      type: 'doc',
      content: [
        h(2, t('Watch Our Demo')),
        p(t('See NodePress in action. Watch our product demo video.')),
        { type: 'embed', attrs: { url: '', type: 'video', aspectRatio: '16/9', maxWidth: 800 } },
        p(
          t(
            'Learn how NodePress can transform your content workflow with its powerful features and intuitive interface.',
          ),
        ),
      ],
    },
    keywords: ['video', 'embed', 'demo', 'youtube', 'vimeo'],
  },
  {
    name: 'page-header-breadcrumbs',
    title: 'Page Header with Breadcrumbs',
    description: 'Page header with breadcrumb navigation, title, and subtitle',
    category: 'header',
    content: {
      type: 'doc',
      content: [
        {
          type: 'group',
          attrs: { className: 'page-header', padding: 30 },
          content: [
            {
              type: 'breadcrumbs',
              attrs: { separator: '/' },
              content: [
                { type: 'breadcrumb-item', attrs: { label: 'Home', url: '/' } },
                { type: 'breadcrumb-item', attrs: { label: 'Products', url: '/products' } },
                { type: 'breadcrumb-item', attrs: { label: 'NodePress', url: '' } },
              ],
            },
            h(1, t('NodePress CMS')),
            p(t('A modern, headless content management system built for developers.')),
          ],
        },
      ],
    },
    keywords: ['page header', 'breadcrumbs', 'navigation', 'title', 'subtitle'],
  },
  {
    name: 'two-column-text',
    title: 'Two-Column Text',
    description: 'Side-by-side text columns for about pages or content sections',
    category: 'text',
    content: {
      type: 'doc',
      content: [
        h(2, t('About Us')),
        {
          type: 'columns',
          attrs: { columns: 2 },
          content: [
            {
              type: 'column',
              content: [
                p(
                  t(
                    'We are a team of passionate developers and designers dedicated to building the best content management experience. Our platform serves thousands of users worldwide.',
                  ),
                ),
                p(
                  t(
                    'Founded in 2024, we have grown from a small startup to a trusted name in the CMS space.',
                  ),
                ),
              ],
            },
            {
              type: 'column',
              content: [
                p(
                  t(
                    'Our mission is to democratize content management by providing a powerful, flexible, and open-source platform that anyone can use.',
                  ),
                ),
                p(
                  t(
                    'We believe in the power of community and open-source software to drive innovation.',
                  ),
                ),
              ],
            },
          ],
        },
      ],
    },
    keywords: ['about', 'text columns', 'content', 'two column'],
  },
  {
    name: 'social-proof-bar',
    title: 'Social Proof Bar',
    description: 'Horizontal bar with testimonials, ratings, and trust indicators',
    category: 'testimonials',
    content: {
      type: 'doc',
      content: [
        {
          type: 'group',
          attrs: { align: 'center', backgroundColor: '#f8f9fa', padding: 20 },
          content: [
            {
              type: 'columns',
              attrs: { columns: 3 },
              content: [
                {
                  type: 'column',
                  content: [
                    { type: 'stars', attrs: { rating: 5 } },
                    p(t('"Best CMS we have used."')),
                    p(t('— TechCrunch')),
                  ],
                },
                {
                  type: 'column',
                  content: [
                    { type: 'stars', attrs: { rating: 4.8 } },
                    p(t('"Incredible performance and flexibility."')),
                    p(t('— Forbes')),
                  ],
                },
                {
                  type: 'column',
                  content: [
                    { type: 'stars', attrs: { rating: 4.9 } },
                    p(t('"The future of content management."')),
                    p(t('— Wired')),
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    keywords: ['social proof', 'ratings', 'stars', 'testimonials', 'trust'],
  },
];

export function getPatternsByCategory(category: string): EditorPattern[] {
  return BLOCK_PATTERNS.filter((p) => p.category === category);
}

export function getPatternByName(name: string): EditorPattern | undefined {
  return BLOCK_PATTERNS.find((p) => p.name === name);
}

export const PATTERN_CATEGORIES = [
  { slug: 'hero', label: 'Hero Sections' },
  { slug: 'features', label: 'Features' },
  { slug: 'team', label: 'Team' },
  { slug: 'pricing', label: 'Pricing' },
  { slug: 'call-to-action', label: 'Call to Action' },
  { slug: 'testimonials', label: 'Testimonials' },
  { slug: 'text', label: 'Text & Content' },
  { slug: 'forms', label: 'Forms' },
  { slug: 'portfolio', label: 'Portfolio' },
  { slug: 'blog', label: 'Blog' },
  { slug: 'logos', label: 'Logos & Clients' },
  { slug: 'stats', label: 'Statistics' },
  { slug: 'content', label: 'Content Layouts' },
  { slug: 'media', label: 'Media' },
  { slug: 'header', label: 'Headers' },
] as const;
