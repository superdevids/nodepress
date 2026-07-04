/**
 * General Notification Email Template
 * Used for comment notifications, content published notifications, etc.
 */

export interface CommentNotificationData {
  recipientName: string;
  commentAuthor: string;
  contentTitle: string;
  commentExcerpt: string;
  contentUrl: string;
  siteName?: string;
}

export interface ContentPublishedNotificationData {
  recipientName: string;
  contentTitle: string;
  contentUrl: string;
  siteName?: string;
}

export function renderCommentNotificationHtml(data: CommentNotificationData): string {
  const site = data.siteName || 'NodePress';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <tr>
            <td style="padding:32px 32px 0 32px;">
              <h1 style="margin:0;font-size:22px;color:#1a202c;font-weight:600;">New Comment on "${escapeHtml(data.contentTitle)}"</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 32px 32px;color:#4a5568;font-size:16px;line-height:1.6;">
              <p>Hello ${escapeHtml(data.recipientName)},</p>
              <p><strong>${escapeHtml(data.commentAuthor)}</strong> left a comment on your post "${escapeHtml(data.contentTitle)}":</p>
              <blockquote style="margin:20px 0;padding:16px 20px;background-color:#f8fafc;border-left:4px solid #2563eb;border-radius:4px;font-style:italic;color:#475569;">
                ${escapeHtml(data.commentExcerpt)}
              </blockquote>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;">
                <tr>
                  <td align="center" style="border-radius:6px;">
                    <a href="${escapeHtml(data.contentUrl)}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:16px;font-weight:600;color:#ffffff;background-color:#2563eb;text-decoration:none;border-radius:6px;">
                      View Comment
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;background-color:#f8fafc;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:13px;color:#94a3b8;">&copy; ${new Date().getFullYear()} ${escapeHtml(site)}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderCommentNotificationText(data: CommentNotificationData): string {
  const site = data.siteName || 'NodePress';
  return [
    `New Comment on "${data.contentTitle}"`,
    `========================================`,
    ``,
    `Hello ${data.recipientName},`,
    ``,
    `${data.commentAuthor} left a comment on your post "${data.contentTitle}":`,
    ``,
    `  "${data.commentExcerpt}"`,
    ``,
    `View the comment here: ${data.contentUrl}`,
    ``,
    `---`,
    `${site}`,
  ].join('\n');
}

export function renderContentPublishedHtml(data: ContentPublishedNotificationData): string {
  const site = data.siteName || 'NodePress';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <tr>
            <td style="padding:32px 32px 0 32px;">
              <h1 style="margin:0;font-size:22px;color:#1a202c;font-weight:600;">Content Published</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 32px 32px;color:#4a5568;font-size:16px;line-height:1.6;">
              <p>Hello ${escapeHtml(data.recipientName)},</p>
              <p>Your content "<strong>${escapeHtml(data.contentTitle)}</strong>" has been published on ${escapeHtml(site)}.</p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;">
                <tr>
                  <td align="center" style="border-radius:6px;">
                    <a href="${escapeHtml(data.contentUrl)}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:16px;font-weight:600;color:#ffffff;background-color:#2563eb;text-decoration:none;border-radius:6px;">
                      View Published Content
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;background-color:#f8fafc;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:13px;color:#94a3b8;">&copy; ${new Date().getFullYear()} ${escapeHtml(site)}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderContentPublishedText(data: ContentPublishedNotificationData): string {
  const site = data.siteName || 'NodePress';
  return [
    `Content Published`,
    `========================================`,
    ``,
    `Hello ${data.recipientName},`,
    ``,
    `Your content "${data.contentTitle}" has been published on ${site}.`,
    ``,
    `View it here: ${data.contentUrl}`,
    ``,
    `---`,
    `${site}`,
  ].join('\n');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
