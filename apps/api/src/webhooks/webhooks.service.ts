import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createHmac, randomUUID } from 'crypto';
import { PrismaService } from '../common/prisma.service';

export interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret: string;
  enabled: boolean;
  lastTriggeredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 1000;

  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Webhook[]> {
    const subs = await this.prisma.webhookSubscription.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return subs.map((s) => ({
      id: s.id,
      name: s.event,
      url: s.targetUrl,
      events: [s.event],
      secret: s.secret,
      enabled: s.active,
      lastTriggeredAt: null,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));
  }

  async findById(id: string): Promise<Webhook> {
    const sub = await this.prisma.webhookSubscription.findUnique({
      where: { id },
    });
    if (!sub) throw new NotFoundException(`Webhook ${id} not found`);
    return {
      id: sub.id,
      name: sub.event,
      url: sub.targetUrl,
      events: [sub.event],
      secret: sub.secret,
      enabled: sub.active,
      lastTriggeredAt: null,
      createdAt: sub.createdAt,
      updatedAt: sub.updatedAt,
    };
  }

  async create(data: {
    name: string;
    url: string;
    events: string[];
    secret?: string;
  }): Promise<Webhook> {
    const secret = data.secret ?? randomUUID();
    const sub = await this.prisma.webhookSubscription.create({
      data: {
        id: randomUUID(),
        event: data.events[0] ?? data.name,
        targetUrl: data.url,
        secret,
        active: true,
      },
    });
    this.logger.log(`Webhook created: ${sub.id}`);
    return {
      id: sub.id,
      name: sub.event,
      url: sub.targetUrl,
      events: [sub.event],
      secret: sub.secret,
      enabled: sub.active,
      lastTriggeredAt: null,
      createdAt: sub.createdAt,
      updatedAt: sub.updatedAt,
    };
  }

  async update(
    id: string,
    data: Partial<Pick<Webhook, 'name' | 'url' | 'events' | 'enabled'>>,
  ): Promise<Webhook> {
    const existing = await this.prisma.webhookSubscription.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException(`Webhook ${id} not found`);

    const updateData: Record<string, unknown> = {};
    if (data.url !== undefined) updateData.targetUrl = data.url;
    if (data.enabled !== undefined) updateData.active = data.enabled;
    if (data.events !== undefined) updateData.event = data.events[0] ?? existing.event;

    const updated = await this.prisma.webhookSubscription.update({
      where: { id },
      data: updateData,
    });

    return {
      id: updated.id,
      name: updated.event,
      url: updated.targetUrl,
      events: [updated.event],
      secret: updated.secret,
      enabled: updated.active,
      lastTriggeredAt: null,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async delete(id: string): Promise<void> {
    const existing = await this.prisma.webhookSubscription.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException(`Webhook ${id} not found`);
    await this.prisma.webhookSubscription.delete({ where: { id } });
    this.logger.log(`Webhook deleted: ${id}`);
  }

  async trigger(event: string, payload: Record<string, unknown>): Promise<void> {
    const subs = await this.prisma.webhookSubscription.findMany({
      where: { event, active: true },
    });
    for (const sub of subs) {
      this.deliver(sub.id, sub.targetUrl, sub.secret, event, payload).catch((err) =>
        this.logger.error(`Webhook ${sub.id} delivery failed: ${err.message}`),
      );
    }
  }

  private async deliver(
    subscriptionId: string,
    targetUrl: string,
    secret: string,
    event: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    this.logger.log(`Delivering webhook ${subscriptionId} for event "${event}"`);

    const body = JSON.stringify({ event, ...payload });
    const signature = createHmac('sha256', secret).update(body).digest('hex');

    let lastError: string | undefined;
    let success = false;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Event': event,
            'User-Agent': 'NodePress-Webhook/1.0',
          },
          body,
          signal: AbortSignal.timeout(10000),
        });

        if (response.ok) {
          success = true;
          lastError = undefined;
          this.logger.log(`Webhook ${subscriptionId} delivered (attempt ${attempt})`);
          break;
        } else {
          lastError = `HTTP ${response.status}`;
          this.logger.warn(`Webhook ${subscriptionId} attempt ${attempt} failed: ${lastError}`);
        }
      } catch (err) {
        lastError = (err as Error).message;
        this.logger.warn(`Webhook ${subscriptionId} attempt ${attempt} error: ${lastError}`);
      }

      if (attempt < this.MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, this.RETRY_DELAY_MS * attempt));
      }
    }

    await this.prisma.webhookDelivery.create({
      data: {
        id: randomUUID(),
        subscriptionId,
        payload: payload as any,
        status: success ? 'delivered' : 'failed',
        attempts: this.MAX_RETRIES,
        lastError,
      },
    });

    if (success) {
      await this.prisma.webhookSubscription.update({
        where: { id: subscriptionId },
        data: { updatedAt: new Date() },
      });
    }
  }
}
