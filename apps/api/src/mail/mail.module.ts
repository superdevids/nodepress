import { Module, Global } from '@nestjs/common';
import { MailService } from './mail.service';

/**
 * MailModule — provides email sending capabilities across the application.
 *
 * MailService is exported as a singleton provider. If email is not configured
 * (no MAIL_PROVIDER or SMTP_HOST env var), all send methods will gracefully
 * log instead of crashing — making it safe to use without configuration.
 *
 * Configuration:
 *   MAIL_PROVIDER=smtp|resend|sendgrid|ses (default: smtp)
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS — for SMTP provider
 *   RESEND_API_KEY — for Resend provider
 *   SENDGRID_API_KEY — for SendGrid provider
 *   AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY — for SES provider
 *   MAIL_FROM=noreply@example.com — sender address
 */
@Global()
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
