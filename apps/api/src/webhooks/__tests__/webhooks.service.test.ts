import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const mockPrisma = {
  webhookSubscription: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  webhookDelivery: {
    create: vi.fn(),
  },
};

const { WebhooksService } = await import('../webhooks.service.js');

describe('WebhooksService', () => {
  let webhooksService: WebhooksService;

  beforeEach(() => {
    vi.resetAllMocks();
    webhooksService = new WebhooksService(mockPrisma as any);
  });

  const mockSubscription = {
    id: 'wh-1',
    event: '["content.published"]',
    targetUrl: 'https://example.com/webhook',
    secret: 'my-secret-key',
    active: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  describe('findAll', () => {
    it('returns all webhook subscriptions', async () => {
      mockPrisma.webhookSubscription.findMany.mockResolvedValue([mockSubscription]);

      const result = await webhooksService.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].url).toBe('https://example.com/webhook');
      expect(result[0].enabled).toBe(true);
    });

    it('returns empty array when no webhooks exist', async () => {
      mockPrisma.webhookSubscription.findMany.mockResolvedValue([]);

      const result = await webhooksService.findAll();

      expect(result).toHaveLength(0);
    });

    it('orders by createdAt descending', async () => {
      mockPrisma.webhookSubscription.findMany.mockResolvedValue([mockSubscription]);

      await webhooksService.findAll();

      expect(mockPrisma.webhookSubscription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });

  describe('findById', () => {
    it('returns a webhook by id', async () => {
      mockPrisma.webhookSubscription.findUnique.mockResolvedValue(mockSubscription);

      const result = await webhooksService.findById('wh-1');

      expect(result.id).toBe('wh-1');
      expect(result.url).toBe('https://example.com/webhook');
    });

    it('throws NotFoundException when webhook not found', async () => {
      mockPrisma.webhookSubscription.findUnique.mockResolvedValue(null);

      await expect(webhooksService.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates a webhook subscription', async () => {
      mockPrisma.webhookSubscription.create.mockResolvedValue(mockSubscription);

      const result = await webhooksService.create({
        name: 'Content Published',
        url: 'https://example.com/webhook',
        events: ['content.published'],
      });

      expect(result.id).toBe('wh-1');
      expect(mockPrisma.webhookSubscription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            targetUrl: 'https://example.com/webhook',
            event: JSON.stringify(['content.published']),
            active: true,
          }),
        }),
      );
    });

    it('generates a secret when not provided', async () => {
      mockPrisma.webhookSubscription.create.mockResolvedValue(mockSubscription);

      await webhooksService.create({
        name: 'Test Webhook',
        url: 'https://example.com/hook',
        events: ['test.event'],
      });

      expect(mockPrisma.webhookSubscription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            secret: expect.any(String),
          }),
        }),
      );
    });

    it('uses provided secret when given', async () => {
      mockPrisma.webhookSubscription.create.mockResolvedValue({
        ...mockSubscription,
        secret: 'custom-secret',
      });

      const result = await webhooksService.create({
        name: 'Secure Webhook',
        url: 'https://example.com/hook',
        events: ['secure.event'],
        secret: 'custom-secret',
      });

      expect(mockPrisma.webhookSubscription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            secret: 'custom-secret',
          }),
        }),
      );
    });

    it('stores events as JSON stringified array', async () => {
      mockPrisma.webhookSubscription.create.mockResolvedValue(mockSubscription);

      await webhooksService.create({
        name: 'Multi Event',
        url: 'https://example.com/hook',
        events: ['content.published', 'content.updated', 'user.created'],
      });

      expect(mockPrisma.webhookSubscription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            event: JSON.stringify(['content.published', 'content.updated', 'user.created']),
          }),
        }),
      );
    });
  });

  describe('update', () => {
    it('updates webhook url', async () => {
      mockPrisma.webhookSubscription.findUnique.mockResolvedValue(mockSubscription);
      const updatedSub = { ...mockSubscription, targetUrl: 'https://newexample.com/hook' };
      mockPrisma.webhookSubscription.update.mockResolvedValue(updatedSub);

      const result = await webhooksService.update('wh-1', {
        url: 'https://newexample.com/hook',
      });

      expect(result.url).toBe('https://newexample.com/hook');
    });

    it('disables webhook when enabled is false', async () => {
      mockPrisma.webhookSubscription.findUnique.mockResolvedValue(mockSubscription);
      const updatedSub = { ...mockSubscription, active: false };
      mockPrisma.webhookSubscription.update.mockResolvedValue(updatedSub);

      const result = await webhooksService.update('wh-1', {
        enabled: false,
      });

      expect(result.enabled).toBe(false);
    });

    it('updates webhook events', async () => {
      mockPrisma.webhookSubscription.findUnique.mockResolvedValue(mockSubscription);
      const updatedSub = { ...mockSubscription, event: JSON.stringify(['user.deleted']) };
      mockPrisma.webhookSubscription.update.mockResolvedValue(updatedSub);

      await webhooksService.update('wh-1', {
        events: ['user.deleted'],
      });

      expect(mockPrisma.webhookSubscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            event: JSON.stringify(['user.deleted']),
          }),
        }),
      );
    });

    it('throws NotFoundException when webhook not found', async () => {
      mockPrisma.webhookSubscription.findUnique.mockResolvedValue(null);

      await expect(
        webhooksService.update('nonexistent', { url: 'https://example.com' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('deletes an existing webhook', async () => {
      mockPrisma.webhookSubscription.findUnique.mockResolvedValue(mockSubscription);
      mockPrisma.webhookSubscription.delete.mockResolvedValue(mockSubscription);

      await webhooksService.delete('wh-1');

      expect(mockPrisma.webhookSubscription.delete).toHaveBeenCalledWith({
        where: { id: 'wh-1' },
      });
    });

    it('throws NotFoundException when webhook not found', async () => {
      mockPrisma.webhookSubscription.findUnique.mockResolvedValue(null);

      await expect(webhooksService.delete('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('trigger', () => {
    it('finds webhooks matching the event', async () => {
      mockPrisma.webhookSubscription.findMany.mockResolvedValue([mockSubscription]);
      mockFetch.mockResolvedValue({ ok: true });
      mockPrisma.webhookDelivery.create.mockResolvedValue({ id: 'delivery-1' });

      await webhooksService.trigger('content.published', { entryId: 'entry-1' });

      expect(mockPrisma.webhookSubscription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { event: { contains: 'content.published' }, active: true },
        }),
      );
    });

    it('does not trigger when no matching webhooks', async () => {
      mockPrisma.webhookSubscription.findMany.mockResolvedValue([]);

      await webhooksService.trigger('unknown.event', { data: 'test' });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('does not trigger when no active webhooks match', async () => {
      // Simulate findMany returning empty because no active webhooks match
      mockPrisma.webhookSubscription.findMany.mockResolvedValue([]);
      mockFetch.mockResolvedValue({ ok: true });

      await webhooksService.trigger('content.published', { entryId: 'entry-1' });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('delivers payload to webhook URL', async () => {
      mockPrisma.webhookSubscription.findMany.mockResolvedValue([mockSubscription]);
      mockFetch.mockResolvedValue({ ok: true });
      mockPrisma.webhookDelivery.create.mockResolvedValue({ id: 'delivery-1' });

      await webhooksService.trigger('content.published', { entryId: 'entry-1' });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/webhook',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Webhook-Event': 'content.published',
            'User-Agent': 'NodePress-Webhook/1.0',
          }),
        }),
      );
    });

    it('delivery creates a delivery record', async () => {
      mockPrisma.webhookSubscription.findMany.mockResolvedValue([mockSubscription]);
      mockFetch.mockResolvedValue({ ok: true });
      mockPrisma.webhookDelivery.create.mockResolvedValue({ id: 'delivery-1' });

      await webhooksService.trigger('content.published', { entryId: 'entry-1' });

      // Wait for the fire-and-forget deliver() to complete
      await vi.waitFor(() => {
        expect(mockPrisma.webhookDelivery.create).toHaveBeenCalled();
      });

      const callArg = mockPrisma.webhookDelivery.create.mock.calls[0][0];
      expect(callArg.data.subscriptionId).toBe('wh-1');
      expect(callArg.data.status).toBe('delivered');
    });

    it('includes X-Webhook-Signature header', async () => {
      mockPrisma.webhookSubscription.findMany.mockResolvedValue([mockSubscription]);
      mockFetch.mockResolvedValue({ ok: true });
      mockPrisma.webhookDelivery.create.mockResolvedValue({ id: 'delivery-1' });

      await webhooksService.trigger('content.published', { entryId: 'entry-1' });

      const fetchCall = mockFetch.mock.calls[0][1];
      expect(fetchCall.headers['X-Webhook-Signature']).toBeDefined();
      expect(typeof fetchCall.headers['X-Webhook-Signature']).toBe('string');
    });

    it('handles multiple matching webhooks', async () => {
      const sub2 = {
        ...mockSubscription,
        id: 'wh-2',
        targetUrl: 'https://another.com/webhook',
        secret: 'another-secret',
      };
      mockPrisma.webhookSubscription.findMany.mockResolvedValue([mockSubscription, sub2]);
      mockFetch.mockResolvedValue({ ok: true });
      mockPrisma.webhookDelivery.create.mockResolvedValue({ id: 'delivery-1' });

      await webhooksService.trigger('content.published', { entryId: 'entry-1' });

      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });
  });
});
