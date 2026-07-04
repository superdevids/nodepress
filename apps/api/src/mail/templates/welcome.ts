/**
 * Welcome Email Template
 * Sent to new users upon registration.
 */

export interface WelcomeTemplateData {
  userName: string;
  loginUrl: string;
  siteName?: string;
}

export function renderWelcomeHtml(data: WelcomeTemplateData): string {
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
          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 0 32px;">
              <h1 style="margin:0;font-size:24px;color:#1a202c;font-weight:600;">Welcome to ${escapeHtml(site)}!</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:20px 32px 32px 32px;color:#4a5568;font-size:16px;line-height:1.6;">
              <p>Hello ${escapeHtml(data.userName)},</p>
              <p>Your account has been created successfully. We're excited to have you on board!</p>
              <p>You can now log in and start exploring:</p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;">
                <tr>
                  <td align="center" style="border-radius:6px;">
                    <a href="${escapeHtml(data.loginUrl)}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:16px;font-weight:600;color:#ffffff;background-color:#2563eb;text-decoration:none;border-radius:6px;">
                      Log In to ${escapeHtml(site)}
                    </a>
                  </td>
                </tr>
              </table>
              <p style="font-size:14px;color:#6b7280;">If you have any questions or need help getting started, feel free to reach out to our support team.</p>
            </td>
          </tr>
          <!-- Footer -->
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

export function renderWelcomeText(data: WelcomeTemplateData): string {
  const site = data.siteName || 'NodePress';
  return [
    `Welcome to ${site}!`,
    `========================================`,
    ``,
    `Hello ${data.userName},`,
    ``,
    `Your account has been created successfully. We're excited to have you on board!`,
    ``,
    `Log in here: ${data.loginUrl}`,
    ``,
    `If you have any questions or need help getting started, feel free to reach out.`,
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
