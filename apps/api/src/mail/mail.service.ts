import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MailManager } from '@nodepressjs/core';
import type { MailOptions, MailLog } from '@nodepressjs/core';
import { PrismaService } from '../common/prisma.service';
import { renderPasswordResetHtml, renderPasswordResetText } from './templates/password-reset';
import { renderWelcomeHtml, renderWelcomeText } from './templates/welcome';
import {
  renderCommentNotificationHtml,
  renderCommentNotificationText,
  renderContentPublishedHtml,
  renderContentPublishedText,
} from './templates/notification';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private mailManager: MailManager | null = null;
  private enabled = false;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    const provider = process.env.MAIL_PROVIDER || process.env.EMAIL_PROVIDER || '';
    const smtpHost = process.env.SMTP_HOST || process.env.EMAIL_HOST || '';

    // Mail is enabled if a provider is explicitly set, or SMTP host is configured,
    // or any mail-related env vars are present
    const hasMailConfig = !!(
      provider ||
      smtpHost ||
      process.env.RESEND_API_KEY ||
      process.env.SENDGRID_API_KEY
    );

    if (!hasMailConfig) {
      this.logger.warn(
        'Email is not configured. Set MAIL_PROVIDER or SMTP_HOST env vars to enable email sending. ' +
          'Emails will be logged to console instead.',
      );
      return;
    }

    try {
      this.mailManager = new MailManager(this.prisma as any);
      this.enabled = true;
      this.logger.log(
        `Mail service initialized with provider: ${this.mailManager.getProviderName()}`,
      );
    } catch (err) {
      this.logger.error(`Failed to initialize MailManager: ${err}`);
    }
  }

  /**
   * Send a raw email via the configured provider.
   * Gracefully falls back to logging when mail is not configured.
   */
  async send(options: MailOptions): Promise<MailLog | null> {
    if (!this.enabled || !this.mailManager) {
      this.logger.log(
        `[MAIL DISABLED] Would send email — To: ${options.to}, Subject: "${options.subject}"`,
      );
      if (options.html) {
        this.logger.debug(
          `[MAIL DISABLED] HTML content preview: ${options.html.substring(0, 200)}...`,
        );
      }
      return null;
    }

    try {
      const result = await this.mailManager.send(options);
      this.logger.log(
        `Email sent — To: ${options.to}, Subject: "${options.subject}", ID: ${result.id}`,
      );
      return result;
    } catch (err) {
      this.logger.error(`Failed to send email to ${options.to}: ${err}`);
      return null;
    }
  }

  /**
   * Send a password reset email.
   */
  async sendPasswordResetEmail(email: string, resetUrl: string, userName: string): Promise<void> {
    const subject = 'Password Reset Request — NodePress';

    await this.send({
      to: email,
      subject,
      html: renderPasswordResetHtml({ resetUrl, userName }),
      text: renderPasswordResetText({ resetUrl, userName }),
    });
  }

  /**
   * Send a welcome email to a newly registered user.
   */
  async sendWelcomeEmail(email: string, userName: string): Promise<void> {
    const loginUrl =
      process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000/login';
    const subject = 'Welcome to NodePress!';

    await this.send({
      to: email,
      subject,
      html: renderWelcomeHtml({ userName, loginUrl }),
      text: renderWelcomeText({ userName, loginUrl }),
    });
  }

  /**
   * Notify a content author about a new comment on their content.
   */
  async sendCommentNotification(
    recipientEmail: string,
    recipientName: string,
    commentAuthor: string,
    contentTitle: string,
    commentExcerpt: string,
    contentUrl: string,
  ): Promise<void> {
    const subject = `New Comment on "${contentTitle}"`;

    await this.send({
      to: recipientEmail,
      subject,
      html: renderCommentNotificationHtml({
        recipientName,
        commentAuthor,
        contentTitle,
        commentExcerpt,
        contentUrl,
      }),
      text: renderCommentNotificationText({
        recipientName,
        commentAuthor,
        contentTitle,
        commentExcerpt,
        contentUrl,
      }),
    });
  }

  /**
   * Notify an author that their content has been published.
   */
  async sendContentPublishedNotification(
    recipientEmail: string,
    recipientName: string,
    contentTitle: string,
    contentUrl: string,
  ): Promise<void> {
    const subject = `Published: "${contentTitle}"`;

    await this.send({
      to: recipientEmail,
      subject,
      html: renderContentPublishedHtml({ recipientName, contentTitle, contentUrl }),
      text: renderContentPublishedText({ recipientName, contentTitle, contentUrl }),
    });
  }

  /**
   * Check if the mail service is enabled and configured.
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Verify the email provider connection.
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.enabled || !this.mailManager) {
      return false;
    }
    try {
      return await this.mailManager.verifyConnection();
    } catch {
      return false;
    }
  }
}
