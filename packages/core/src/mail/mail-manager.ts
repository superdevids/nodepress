import crypto from "node:crypto";
import type { PrismaClient } from "@nodepressjs/db";
import { EventEmitter } from "node:events";

export interface MailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: MailAttachment[];
  template?: string;
  templateData?: Record<string, unknown>;
}

export interface MailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface MailResult {
  id: string;
  accepted: string[];
  rejected: string[];
  messageId?: string;
  provider: string;
}

export interface MailProvider {
  send(options: MailOptions): Promise<MailResult>;
  verifyConnection(): Promise<boolean>;
}

export interface MailLog {
  id: string;
  to: string;
  subject: string;
  provider: string;
  status: "pending" | "sent" | "failed";
  error: string | null;
  sentAt: Date | null;
  createdAt: Date;
}

export class SmtpProvider implements MailProvider {
  private config: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    from: string;
  };
  private transporter: import("nodemailer").Transporter | null = null;

  constructor() {
    this.config = {
      host: process.env.SMTP_HOST || "localhost",
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: process.env.SMTP_SECURE === "true",
      user: process.env.SMTP_USER || "",
      pass: process.env.SMTP_PASS || "",
      from: process.env.MAIL_FROM || "noreply@nodepress.local",
    };
  }

  private async getTransporter(): Promise<import("nodemailer").Transporter> {
    if (this.transporter) return this.transporter;
    const nodemailer = await import("nodemailer");
    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: this.config.user
        ? { user: this.config.user, pass: this.config.pass }
        : undefined,
    });
    return this.transporter;
  }

  async send(options: MailOptions): Promise<MailResult> {
    const transporter = await this.getTransporter();

    const info = await transporter.sendMail({
      from: options.from || this.config.from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      replyTo: options.replyTo,
      cc: options.cc,
      bcc: options.bcc,
      attachments: options.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    });

    return {
      id: info.messageId || crypto.randomUUID(),
      accepted: info.accepted || [],
      rejected: info.rejected || [],
      messageId: info.messageId,
      provider: "smtp",
    };
  }

  async verifyConnection(): Promise<boolean> {
    try {
      const transporter = await this.getTransporter();
      await transporter.verify();
      return true;
    } catch {
      return false;
    }
  }
}

export class ResendProvider implements MailProvider {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY || "";
  }

  async send(options: MailOptions): Promise<MailResult> {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: options.from || process.env.MAIL_FROM || "noreply@nodepress.local",
        to: [options.to],
        subject: options.subject,
        text: options.text,
        html: options.html,
        reply_to: options.replyTo,
        cc: options.cc,
        bcc: options.bcc,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Resend API error: ${error}`);
    }

    const data = await response.json() as { id: string };
    return {
      id: data.id,
      accepted: [options.to],
      rejected: [],
      provider: "resend",
    };
  }

  async verifyConnection(): Promise<boolean> {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "GET",
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export class SendGridProvider implements MailProvider {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.SENDGRID_API_KEY || "";
  }

  async send(options: MailOptions): Promise<MailResult> {
    const sgMail = await import("@sendgrid/mail");
    sgMail.setApiKey(this.apiKey);

    const msg = {
      to: options.to,
      from: options.from || process.env.MAIL_FROM || "noreply@nodepress.local",
      subject: options.subject,
      text: options.text,
      html: options.html,
      replyTo: options.replyTo,
      cc: options.cc,
      bcc: options.bcc,
      attachments: options.attachments?.map((a) => ({
        filename: a.filename,
        content: Buffer.isBuffer(a.content) ? a.content.toString("base64") : Buffer.from(a.content).toString("base64"),
        type: a.contentType,
      })),
    };

    const [response] = await sgMail.send(msg);

    return {
      id: response.headers["x-message-id"] || crypto.randomUUID(),
      accepted: [options.to],
      rejected: [],
      provider: "sendgrid",
    };
  }

  async verifyConnection(): Promise<boolean> {
    try {
      const sgMail = await import("@sendgrid/mail");
      sgMail.setApiKey(this.apiKey);
      return true;
    } catch {
      return false;
    }
  }
}

export class SesProvider implements MailProvider {
  private config: {
    region: string;
    from: string;
  };
  private client: import("@aws-sdk/client-ses").SESClient | null = null;

  constructor() {
    this.config = {
      region: process.env.AWS_REGION || "us-east-1",
      from: process.env.MAIL_FROM || "noreply@nodepress.local",
    };
  }

  private async getClient(): Promise<import("@aws-sdk/client-ses").SESClient> {
    if (this.client) return this.client;
    const { SESClient } = await import("@aws-sdk/client-ses");
    this.client = new SESClient({
      region: this.config.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      },
    });
    return this.client;
  }

  async send(options: MailOptions): Promise<MailResult> {
    const { SendEmailCommand } = await import("@aws-sdk/client-ses");
    const client = await this.getClient();

    const command = new SendEmailCommand({
      Source: options.from || this.config.from,
      Destination: {
        ToAddresses: [options.to],
        CcAddresses: options.cc,
        BccAddresses: options.bcc,
      },
      Message: {
        Subject: { Data: options.subject },
        Body: {
          Html: options.html ? { Data: options.html } : undefined,
          Text: options.text ? { Data: options.text } : undefined,
        },
      },
      ReplyToAddresses: options.replyTo ? [options.replyTo] : undefined,
    });

    const response = await client.send(command);

    return {
      id: response.MessageId || crypto.randomUUID(),
      accepted: [options.to],
      rejected: [],
      provider: "ses",
    };
  }

  async verifyConnection(): Promise<boolean> {
    try {
      const { GetSendQuotaCommand } = await import("@aws-sdk/client-ses");
      const client = await this.getClient();
      await client.send(new GetSendQuotaCommand({}));
      return true;
    } catch {
      return false;
    }
  }
}

export class MailManager extends EventEmitter {
  private prisma: PrismaClient;
  private provider: MailProvider;
  private queue: MailOptions[] = [];
  private processing: boolean = false;

  constructor(prisma: PrismaClient, provider?: MailProvider) {
    super();
    this.prisma = prisma;

    const providerName = process.env.MAIL_PROVIDER || "smtp";
    switch (providerName) {
      case "resend":
        this.provider = provider || new ResendProvider();
        break;
      case "sendgrid":
        this.provider = provider || new SendGridProvider();
        break;
      case "ses":
        this.provider = provider || new SesProvider();
        break;
      default:
        this.provider = provider || new SmtpProvider();
    }
  }

  async send(options: MailOptions): Promise<MailLog> {
    const logId = crypto.randomUUID();

    const log: MailLog = {
      id: logId,
      to: options.to,
      subject: options.subject,
      provider: this.getProviderName(),
      status: "pending",
      error: null,
      sentAt: null,
      createdAt: new Date(),
    };

    await this.saveLog(log);

    try {
      const result = await this.provider.send(options);

      log.status = "sent";
      log.sentAt = new Date();
      await this.updateLog(log);

      this.emit("sent", { log, result });
    } catch (err) {
      log.status = "failed";
      log.error = err instanceof Error ? err.message : String(err);
      await this.updateLog(log);

      this.emit("failed", { log, error: err });
    }

    return log;
  }

  async sendLater(options: MailOptions): Promise<void> {
    this.queue.push(options);
    if (!this.processing) {
      this.processing = true;
      setImmediate(() => this.processQueue());
    }
  }

  async verifyConnection(): Promise<boolean> {
    return this.provider.verifyConnection();
  }

  setProvider(provider: MailProvider): void {
    this.provider = provider;
  }

  getProvider(): MailProvider {
    return this.provider;
  }

  getProviderName(): string {
    if (this.provider instanceof SmtpProvider) return "smtp";
    if (this.provider instanceof ResendProvider) return "resend";
    if (this.provider instanceof SendGridProvider) return "sendgrid";
    if (this.provider instanceof SesProvider) return "ses";
    return "custom";
  }

  async getLogs(filter?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: MailLog[]; total: number }> {
    try {
      const conditions: string[] = [];
      const params: unknown[] = [];
      let idx = 1;

      if (filter?.status) {
        conditions.push(`status = $${idx++}`);
        params.push(filter.status);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      const countResult = await this.prisma.$queryRawUnsafe<{ total: bigint }[]>(
        `SELECT COUNT(*)::bigint as total FROM mail_logs ${where}`,
        ...params
      );
      const total = Number(countResult[0]?.total || 0);

      const limit = filter?.limit || 50;
      const offset = filter?.offset || 0;

      const rows = await this.prisma.$queryRawUnsafe<MailLog[]>(
        `SELECT * FROM mail_logs ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
        ...params,
        limit,
        offset
      );

      return { logs: rows, total };
    } catch {
      return { logs: [], total: 0 };
    }
  }

  private async processQueue(): Promise<void> {
    while (this.queue.length > 0) {
      const options = this.queue.shift()!;
      try {
        await this.send(options);
      } catch {
      }
    }
    this.processing = false;
  }

  private async saveLog(log: MailLog): Promise<void> {
    try {
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO mail_logs (id, "to", subject, provider, status, error, sent_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        log.id, log.to, log.subject, log.provider, log.status, log.error, log.sentAt, log.createdAt
      );
    } catch {
    }
  }

  private async updateLog(log: MailLog): Promise<void> {
    try {
      await this.prisma.$executeRawUnsafe(
        `UPDATE mail_logs SET status = $1, error = $2, sent_at = $3 WHERE id = $4`,
        log.status, log.error, log.sentAt, log.id
      );
    } catch {
    }
  }
}
