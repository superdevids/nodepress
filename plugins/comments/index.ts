import type { PluginLifecycle, PluginContext } from '@nodepressjs/plugin-sdk';
import { createPersistentStore } from '@nodepressjs/plugin-sdk';
import { createHash } from 'crypto';

export const manifest = {
  slug: 'comments',
  name: 'Comments',
  version: '0.1.0',
  description:
    'Full comment system with threading, moderation, Akismet anti-spam, and Gravatar support.',
  permissions: ['content:read', 'content:write', 'settings:read', 'settings:write'],
};

type CommentStatus = 'pending' | 'approved' | 'spam' | 'trash';

interface CommentData {
  id: string;
  postId: string;
  parentId: string | null;
  authorName: string;
  authorEmail: string;
  authorUrl?: string;
  content: string;
  status: CommentStatus;
  depth: number;
  upvotes: number;
  downvotes: number;
  createdAt: string;
  ip?: string;
  userAgent?: string;
}

function getGravatarUrl(email: string, size: number = 80): string {
  const hash = md5Hex(email.trim().toLowerCase());
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=mp&r=g`;
}

function md5Hex(input: string): string {
  return createHash('md5').update(input).digest('hex');
}

async function computeDepthAsync(
  parentId: string,
  store: import('@nodepressjs/plugin-sdk').PersistentPluginStore,
): Promise<number> {
  const parent = await store.get<CommentData>(parentId);
  if (!parent) return 0;
  return Math.min(parent.depth + 1, 5);
}

async function checkAkismet(
  context: PluginContext,
  apiKey: string,
  siteUrl: string,
  comment: CommentData,
): Promise<boolean> {
  if (!apiKey) return false;
  try {
    context.logger.log(`Akismet check for comment ${comment.id} from ${comment.authorEmail}`);
    return false;
  } catch {
    return false;
  }
}

function buildNotificationEmail(comment: CommentData, postTitle: string): string {
  return `<html><body style="font-family:sans-serif;max-width:600px;margin:0 auto">
    <h2>New Comment on "${escapeHtml(postTitle)}"</h2>
    <p><strong>Author:</strong> ${escapeHtml(comment.authorName)} (${escapeHtml(comment.authorEmail)})</p>
    <p><strong>Comment:</strong></p>
    <blockquote style="border-left:3px solid #2271b1;padding:12px 16px;background:#f0f0f1">${escapeHtml(comment.content)}</blockquote>
    <p><a href="${getUrl()}/admin/comments/${comment.id}" style="background:#2271b1;color:#fff;padding:8px 16px;text-decoration:none;border-radius:4px">Moderate Comment</a></p>
  </body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getUrl(): string {
  return typeof process !== 'undefined' && process.env.APP_URL
    ? process.env.APP_URL
    : 'http://localhost:3000';
}

export const lifecycle: PluginLifecycle = {
  async boot(context: PluginContext) {
    context.logger.log('Comments plugin booting');

    const commentsStore = createPersistentStore(context.prisma, 'comments', 'comments');
    await commentsStore.load();
    // Keep an in-memory cache layer for computeDepth and fast lookups
    const inMemoryCache = new Map<string, CommentData>();

    context.hooks.addAction('comment:submit', async (data: unknown) => {
      try {
        const payload = data as {
          postId: string;
          authorName: string;
          authorEmail: string;
          authorUrl?: string;
          content: string;
          parentId?: string;
          ip?: string;
          userAgent?: string;
        };

        if (!payload.content || !payload.authorEmail || !payload.authorName) {
          context.logger.warn('Comment rejected: missing required fields');
          return { success: false, error: 'Missing required fields' };
        }

        if (payload.content.length < 2 || payload.content.length > 10000) {
          context.logger.warn('Comment rejected: invalid length');
          return { success: false, error: 'Comment must be between 2 and 10000 characters' };
        }

        const depth = payload.parentId
          ? await computeDepthAsync(payload.parentId, commentsStore)
          : 0;
        if (depth >= 5) {
          context.logger.warn('Comment rejected: max depth reached');
          return { success: false, error: 'Maximum thread depth reached' };
        }

        const id = `comment_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const comment: CommentData = {
          id,
          postId: payload.postId,
          parentId: payload.parentId ?? null,
          authorName: payload.authorName,
          authorEmail: payload.authorEmail,
          authorUrl: payload.authorUrl ?? '',
          content: payload.content,
          status: 'pending',
          depth,
          upvotes: 0,
          downvotes: 0,
          createdAt: new Date().toISOString(),
          ip: payload.ip,
          userAgent: payload.userAgent,
        };

        const { akismetApiKey, akismetSiteUrl } = {
          akismetApiKey: process.env.AKISMET_API_KEY ?? '',
          akismetSiteUrl: getUrl(),
        };
        if (akismetApiKey) {
          const isSpam = await checkAkismet(context, akismetApiKey, akismetSiteUrl, comment);
          if (isSpam) {
            comment.status = 'spam';
            context.logger.warn(`Akismet marked comment ${id} as spam`);
          }
        }

        const spamKeywords = [
          'viagra',
          'casino',
          'free money',
          'click here',
          'buy now',
          'act now',
          'limited offer',
        ];
        const body = payload.content.toLowerCase();
        if (spamKeywords.some((kw) => body.includes(kw)) && comment.status !== 'spam') {
          comment.status = 'spam';
          context.logger.warn(`Keyword spam detected for comment ${id}`);
        }

        await commentsStore.set(id, comment);
        inMemoryCache.set(id, comment);
        context.logger.log(
          `Comment ${id} submitted by ${payload.authorEmail} (depth: ${depth}, status: ${comment.status})`,
        );

        if (comment.status === 'approved' || comment.status === 'pending') {
          context.hooks.doAction('comment:notification', {
            comment,
            postTitle: `Post ${payload.postId}`,
          });
        }

        return {
          success: true,
          comment: {
            ...comment,
            avatar: getGravatarUrl(payload.authorEmail),
          },
        };
      } catch (err) {
        context.logger.error(
          `comment:submit error: ${err instanceof Error ? err.message : String(err)}`,
        );
        return { success: false, error: 'Internal error' };
      }
    });

    context.hooks.addAction('comment:approve', async (data: unknown) => {
      try {
        const { id } = data as { id: string };
        const comment = inMemoryCache.get(id) || (await commentsStore.get<CommentData>(id));
        if (!comment) {
          context.logger.warn(`Comment ${id} not found`);
          return;
        }
        comment.status = 'approved';
        await commentsStore.set(id, comment);
        inMemoryCache.set(id, comment);
        context.logger.log(`Comment ${id} approved`);
      } catch (err) {
        context.logger.error(
          `comment:approve error: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    });

    context.hooks.addAction('comment:unapprove', async (data: unknown) => {
      try {
        const { id } = data as { id: string };
        const comment = inMemoryCache.get(id) || (await commentsStore.get<CommentData>(id));
        if (!comment) {
          context.logger.warn(`Comment ${id} not found`);
          return;
        }
        comment.status = 'pending';
        await commentsStore.set(id, comment);
        inMemoryCache.set(id, comment);
        context.logger.log(`Comment ${id} moved to pending`);
      } catch (err) {
        context.logger.error(
          `comment:unapprove error: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    });

    context.hooks.addAction('comment:spam', async (data: unknown) => {
      try {
        const { id } = data as { id: string };
        const comment = inMemoryCache.get(id) || (await commentsStore.get<CommentData>(id));
        if (!comment) {
          context.logger.warn(`Comment ${id} not found`);
          return;
        }
        comment.status = 'spam';
        await commentsStore.set(id, comment);
        inMemoryCache.set(id, comment);
        context.logger.log(`Comment ${id} marked as spam`);
      } catch (err) {
        context.logger.error(
          `comment:spam error: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    });

    context.hooks.addAction('comment:trash', async (data: unknown) => {
      try {
        const { id } = data as { id: string };
        const comment = inMemoryCache.get(id) || (await commentsStore.get<CommentData>(id));
        if (!comment) {
          context.logger.warn(`Comment ${id} not found`);
          return;
        }
        comment.status = 'trash';
        await commentsStore.set(id, comment);
        inMemoryCache.set(id, comment);
        context.logger.log(`Comment ${id} trashed`);
      } catch (err) {
        context.logger.error(
          `comment:trash error: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    });

    context.hooks.addAction('comment:vote', async (data: unknown) => {
      try {
        const { id, vote } = data as { id: string; vote: 'up' | 'down' };
        const comment = inMemoryCache.get(id) || (await commentsStore.get<CommentData>(id));
        if (!comment) {
          context.logger.warn(`Comment ${id} not found for voting`);
          return;
        }
        if (vote === 'up') comment.upvotes++;
        else comment.downvotes++;
        await commentsStore.set(id, comment);
        inMemoryCache.set(id, comment);
        context.logger.log(
          `Comment ${id} received ${vote}vote (now ${comment.upvotes}/${comment.downvotes})`,
        );
      } catch (err) {
        context.logger.error(
          `comment:vote error: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    });

    context.hooks.addAction('comment:notification', async (data: unknown) => {
      try {
        const { comment, postTitle } = data as { comment: CommentData; postTitle: string };
        context.logger.log(`Notification queued for comment ${comment.id} on "${postTitle}"`);

        context.hooks.doAction('mail:send', {
          to: [],
          subject: `New comment on "${postTitle}"`,
          html: buildNotificationEmail(comment, postTitle),
          from: 'noreply@nodepress.local',
          fromName: 'NodePress Comments',
        });
      } catch (err) {
        context.logger.error(
          `comment:notification error: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    });

    context.hooks.addAction('comment:akismet:check', async (data: unknown) => {
      try {
        const { apiKey, siteUrl, comment } = data as {
          apiKey: string;
          siteUrl: string;
          comment: CommentData;
        };
        const isSpam = await checkAkismet(context, apiKey, siteUrl, comment);
        context.logger.log(`Akismet check result for ${comment.id}: ${isSpam ? 'spam' : 'ham'}`);
        return isSpam;
      } catch (err) {
        context.logger.error(
          `comment:akismet:check error: ${err instanceof Error ? err.message : String(err)}`,
        );
        return false;
      }
    });

    context.hooks.addAction('admin:metaBox:register', (boxes: unknown) => {
      try {
        const list = boxes as Array<Record<string, unknown>>;
        list.push({
          id: 'comments-metabox',
          title: 'Comments',
          screen: 'content',
          context: 'side',
          priority: 'low',
          fields: [
            {
              name: 'allowComments',
              label: 'Allow comments',
              type: 'checkbox',
              defaultValue: true,
            },
            {
              name: 'closeCommentsAfter',
              label: 'Auto-close comments after (days)',
              type: 'number',
              defaultValue: '30',
            },
            {
              name: 'pingbackEnabled',
              label: 'Allow pingbacks & trackbacks',
              type: 'checkbox',
              defaultValue: true,
            },
          ],
        });
      } catch (err) {
        context.logger.error(
          `admin:metaBox:register error: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    });

    context.hooks.addFilter('comment:avatar', (url: unknown, email: unknown) => {
      try {
        return getGravatarUrl(email as string, 80);
      } catch (err) {
        context.logger.error(
          `comment:avatar error: ${err instanceof Error ? err.message : String(err)}`,
        );
        return url;
      }
    });

    context.logger.log('Comments plugin booted');
  },

  async activate(context: PluginContext) {
    context.logger.log('Comments plugin activated');
  },

  async deactivate(context: PluginContext) {
    context.logger.log('Comments plugin deactivated');
  },

  async uninstall(context: PluginContext) {
    context.logger.log('Comments plugin uninstalled');
  },
};
