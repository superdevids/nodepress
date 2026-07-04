/**
 * Password Reset Email Template
 * Supports both HTML and plain text versions.
 */

export interface PasswordResetTemplateData {
  resetUrl: string;
  userName: string;
  siteName?: string;
}

export function renderPasswordResetHtml(data: PasswordResetTemplateData): string {
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
              <h1 style="margin:0;font-size:24px;color:#1a202c;font-weight:600;">Password Reset</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:20px 32px 32px 32px;color:#4a5568;font-size:16px;line-height:1.6;">
              <p>Hello ${escapeHtml(data.userName)},</p>
              <p>We received a request to reset the password for your <strong>${escapeHtml(site)}</strong> account. Click the button below to create a new password:</p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;">
                <tr>
                  <td align="center" style="border-radius:6px;">
                    <a href="${escapeHtml(data.resetUrl)}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:16px;font-weight:600;color:#ffffff;background-color:#2563eb;text-decoration:none;border-radius:6px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="font-size:14px;color:#6b7280;">If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="font-size:14px;word-break:break-all;color:#2563eb;">${escapeHtml(data.resetUrl)}</p>
              <p style="font-size:14px;color:#6b7280;">This link will expire in <strong>1 hour</strong>. If you didn't request this reset, you can safely ignore this email.</p>
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

export function renderPasswordResetText(data: PasswordResetTemplateData): string {
  const site = data.siteName || 'NodePress';
  return [
    `Password Reset Request`,
    `========================================`,
    ``,
    `Hello ${data.userName},`,
    ``,
    `We received a request to reset the password for your ${site} account.`,
    ``,
    `To reset your password, visit the following link:`,
    data.resetUrl,
    ``,
    `This link will expire in 1 hour.`,
    `If you didn't request this reset, you can safely ignore this email.`,
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
