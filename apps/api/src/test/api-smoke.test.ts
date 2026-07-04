/**
 * API Smoke Tests
 *
 * These tests verify that the API endpoints respond correctly.
 * They use mocked services so no database is required.
 *
 * Run with: npx vitest run apps/api/src/test/api-smoke.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock all external dependencies
// ---------------------------------------------------------------------------

vi.mock('bcryptjs', () => ({
  default: { compare: vi.fn(), hash: vi.fn() },
  compare: vi.fn(),
  hash: vi.fn(),
}));

import * as bcrypt from 'bcryptjs';

const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
  },
  contentType: { findFirst: vi.fn() },
  contentEntry: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  session: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    update: vi.fn(),
  },
};

const mockJwtService = { sign: vi.fn().mockReturnValue('mock-access-token') };
const mockAppPasswordsService = { verify: vi.fn() };
const mockSessionService = {
  create: vi.fn(),
  findByRefreshToken: vi.fn(),
  rotateRefreshToken: vi.fn(),
};
const mockPasswordPolicyService = { validateAndEnforce: vi.fn(), addToHistory: vi.fn() };
const mockTwoFactorService = { isEnabled: vi.fn().mockResolvedValue(false), verifyToken: vi.fn() };
const mockAuditService = { logLogin: vi.fn() };
const mockMailService = {
  sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  sendCommentNotification: vi.fn().mockResolvedValue(undefined),
  sendContentPublishedNotification: vi.fn().mockResolvedValue(undefined),
};
const mockNotificationsService = { createForUsers: vi.fn() };

// ---------------------------------------------------------------------------
// Import services under test
// ---------------------------------------------------------------------------
const { AuthService } = await import('../auth/auth.service.js');
const { ContentService } = await import('../content/content.service.js');
const { HealthChecker } = await import('../health/health.controller.js');

// ---------------------------------------------------------------------------
// Smoke test suite — validates that the core API flow works end-to-end
// with mocked dependencies. Covers: health → login → content CRUD
// ---------------------------------------------------------------------------

describe('API Smoke Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Health Check Flow ───────────────────────────────────────────────

  describe('1. Health Check', () => {
    it('GET /healthz returns liveness status', async () => {
      mockPrisma.$queryRawUnsafe = vi.fn().mockResolvedValue([{ 1: 1 }]);
      const healthChecker = new HealthChecker(mockPrisma as any);

      const result = await healthChecker.checkLiveness();

      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('timestamp');
    });

    it('GET /readyz returns readiness status with checks', async () => {
      mockPrisma.$queryRawUnsafe = vi.fn().mockResolvedValue([{ 1: 1 }]);
      const healthChecker = new HealthChecker(mockPrisma as any);

      const result = await healthChecker.checkReadiness();

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('checks');
      expect(result.checks).toHaveProperty('database');
      expect(result.checks).toHaveProperty('redis');
      expect(result.checks).toHaveProperty('storage');
      expect(result.checks).toHaveProperty('queue');
      expect(result.checks).toHaveProperty('disk');
    });

    it('GET /health/details returns full report with memory and version', async () => {
      mockPrisma.$queryRawUnsafe = vi.fn().mockResolvedValue([{ 1: 1 }]);
      const healthChecker = new HealthChecker(mockPrisma as any);

      const result = await healthChecker.checkDetails();

      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('memory');
      expect(result.memory).toHaveProperty('heapUsed');
      expect(result.memory).toHaveProperty('heapTotal');
      expect(result.memory).toHaveProperty('rss');
    });
  });

  // ─── Auth / Login Flow ───────────────────────────────────────────────

  describe('2. Auth / Login', () => {
    it('POST /auth/login returns access token for valid credentials', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'admin@nodepress.local',
        passwordHash: '$2a$12$hashed',
        name: 'Admin User',
        role: 'ADMIN',
        capabilities: ['read', 'write', 'admin'],
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      mockSessionService.create.mockResolvedValue({ id: 'session-1' });

      const authService = new AuthService(
        mockJwtService as any,
        mockAppPasswordsService as any,
        mockSessionService as any,
        mockPasswordPolicyService as any,
        mockTwoFactorService as any,
        mockAuditService as any,
        mockPrisma as any,
        mockMailService as any,
      );

      const result = await authService.login(
        { email: 'admin@nodepress.local', password: 'admin123' },
        '127.0.0.1',
        'smoke-test-agent',
      );

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBeDefined();
      expect(typeof result.refreshToken).toBe('string');
      expect(result.sessionId).toBe('session-1');
      expect(result.requires2fa).toBe(false);
    });

    it('POST /auth/login returns 401 for invalid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const authService = new AuthService(
        mockJwtService as any,
        mockAppPasswordsService as any,
        mockSessionService as any,
        mockPasswordPolicyService as any,
        mockTwoFactorService as any,
        mockAuditService as any,
        mockPrisma as any,
        mockMailService as any,
      );

      await expect(
        authService.login(
          { email: 'wrong@nodepress.local', password: 'wrongpass' },
          '127.0.0.1',
          'smoke-test-agent',
        ),
      ).rejects.toThrow('Invalid credentials');
    });

    it('POST /auth/register creates a new user and returns sanitized profile', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      vi.mocked(bcrypt.hash).mockResolvedValue('$2a$12$hashed' as never);
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user-id',
        email: 'newuser@nodepress.local',
        name: 'New User',
        displayName: 'newuser',
        role: 'SUBSCRIBER',
        capabilities: ['read'],
      });

      const authService = new AuthService(
        mockJwtService as any,
        mockAppPasswordsService as any,
        mockSessionService as any,
        mockPasswordPolicyService as any,
        mockTwoFactorService as any,
        mockAuditService as any,
        mockPrisma as any,
        mockMailService as any,
      );

      const result = await authService.register({
        email: 'newuser@nodepress.local',
        password: 'Str0ng!Pass1',
        firstName: 'New',
        lastName: 'User',
        username: 'newuser',
      });

      expect(result.email).toBe('newuser@nodepress.local');
      expect(result).not.toHaveProperty('passwordHash');
      expect(result.role).toBe('SUBSCRIBER');
    });

    it('POST /auth/refresh rotates tokens successfully', async () => {
      const mockSession = {
        id: 'session-1',
        userId: 'user-1',
        refreshToken: 'old-refresh-token',
        expiresAt: new Date(Date.now() + 86400000),
      };
      const mockUser = {
        id: 'user-1',
        email: 'admin@nodepress.local',
        role: 'ADMIN',
        capabilities: ['read', 'write'],
      };

      mockSessionService.findByRefreshToken.mockResolvedValue(mockSession);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockSessionService.rotateRefreshToken.mockResolvedValue(undefined);

      const authService = new AuthService(
        mockJwtService as any,
        mockAppPasswordsService as any,
        mockSessionService as any,
        mockPasswordPolicyService as any,
        mockTwoFactorService as any,
        mockAuditService as any,
        mockPrisma as any,
        mockMailService as any,
      );

      const result = await authService.refresh('valid-refresh-token');

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBeDefined();
      expect(result.sessionId).toBe('session-1');
    });
  });

  // ─── Content CRUD Flow ──────────────────────────────────────────────

  describe('3. Content CRUD', () => {
    const mockContentType = { id: 'ct-1', name: 'post' };

    const mockEntry = {
      id: 'entry-1',
      contentTypeId: 'ct-1',
      slug: 'smoke-test-post',
      status: 'DRAFT',
      data: {
        title: 'Smoke Test Post',
        content: '<p>This is a smoke test content entry.</p>',
        tags: ['smoke-test'],
        parentId: null,
        featured: false,
        viewCount: 0,
      },
      excerpt: 'Smoke test excerpt',
      authorId: 'user-1',
      publishedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      contentType: { name: 'post' },
    };

    it('POST /content/:type creates a new content entry', async () => {
      mockPrisma.contentType.findFirst.mockResolvedValue(mockContentType);
      mockPrisma.contentEntry.create.mockResolvedValue(mockEntry);

      const contentService = new ContentService(mockPrisma as any, mockNotificationsService as any);

      const result = await contentService.create(
        'post',
        {
          title: 'Smoke Test Post',
          content: '<p>This is a smoke test content entry.</p>',
          tags: ['smoke-test'],
        } as any,
        'user-1',
      );

      expect(result.id).toBe('entry-1');
      expect(result.title).toBe('Smoke Test Post');
      expect(result.type).toBe('post');
      expect(result.status).toBe('draft');
      expect(result.slug).toBe('smoke-test-post');
    });

    it('GET /content/:type returns paginated content list', async () => {
      mockPrisma.contentType.findFirst.mockResolvedValue(mockContentType);
      mockPrisma.contentEntry.count.mockResolvedValue(1);
      mockPrisma.contentEntry.findMany.mockResolvedValue([mockEntry]);

      const contentService = new ContentService(mockPrisma as any, mockNotificationsService as any);

      const result = await contentService.findByType('post');

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.items[0]!.title).toBe('Smoke Test Post');
    });

    it('GET /content/:type/:id returns a single content entry', async () => {
      mockPrisma.contentEntry.findUnique.mockResolvedValue(mockEntry);

      const contentService = new ContentService(mockPrisma as any, mockNotificationsService as any);

      const result = await contentService.findById('entry-1');

      expect(result.id).toBe('entry-1');
      expect(result.title).toBe('Smoke Test Post');
    });

    it('PATCH /content/:type/:id updates a content entry', async () => {
      mockPrisma.contentEntry.findUnique.mockResolvedValue(mockEntry);
      const updatedEntry = {
        ...mockEntry,
        data: { ...mockEntry.data, title: 'Updated Smoke Test Post' },
      };
      mockPrisma.contentEntry.update.mockResolvedValue(updatedEntry);

      const contentService = new ContentService(mockPrisma as any, mockNotificationsService as any);

      const result = await contentService.update('entry-1', {
        title: 'Updated Smoke Test Post',
      } as any);

      expect(result.title).toBe('Updated Smoke Test Post');
    });

    it('PATCH /content/:type/:id transitions status from draft to publish', async () => {
      mockPrisma.contentEntry.findUnique.mockResolvedValue(mockEntry);
      const publishedEntry = {
        ...mockEntry,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        data: { ...mockEntry.data, title: 'Now Published' },
      };
      mockPrisma.contentEntry.update.mockResolvedValue(publishedEntry);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        name: 'Admin',
        displayName: 'admin',
      });

      const contentService = new ContentService(mockPrisma as any, mockNotificationsService as any);

      const result = await contentService.update(
        'entry-1',
        { status: 'publish', title: 'Now Published' } as any,
        'user-1',
        'ADMIN',
      );

      expect(result.status).toBe('publish');
      expect(result.publishedAt).toBeDefined();
    });

    it('DELETE /content/:type/:id deletes a content entry', async () => {
      mockPrisma.contentEntry.findUnique.mockResolvedValue(mockEntry);
      mockPrisma.contentEntry.delete.mockResolvedValue(mockEntry);

      const contentService = new ContentService(mockPrisma as any, mockNotificationsService as any);

      await expect(contentService.delete('entry-1')).resolves.not.toThrow();
    });

    it('DELETE /content/:type/:id returns 404 for non-existent content', async () => {
      mockPrisma.contentEntry.findUnique.mockResolvedValue(null);

      const contentService = new ContentService(mockPrisma as any, mockNotificationsService as any);

      await expect(contentService.delete('nonexistent')).rejects.toThrow('not found');
    });

    it('increments view count on recordView', async () => {
      mockPrisma.contentEntry.findUnique.mockResolvedValue(mockEntry);
      mockPrisma.contentEntry.update.mockResolvedValue(mockEntry);

      const contentService = new ContentService(mockPrisma as any, mockNotificationsService as any);

      await contentService.recordView('entry-1');

      expect(mockPrisma.contentEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'entry-1' },
          data: expect.objectContaining({
            data: expect.objectContaining({ viewCount: 1 }),
          }),
        }),
      );
    });
  });

  // ─── Full End-to-End Flow ──────────────────────────────────────────

  describe('4. Full API Flow Integration', () => {
    it('completes a full flow: health → login → content CRUD', async () => {
      const mockContentType = { id: 'ct-1', name: 'post' };

      // Step 1: Health check
      mockPrisma.$queryRawUnsafe = vi.fn().mockResolvedValue([{ 1: 1 }]);
      const healthChecker = new HealthChecker(mockPrisma as any);
      const healthResult = await healthChecker.checkReadiness();
      expect(healthResult.status).toBe('degraded');
      expect(healthResult.checks.database.status).toBe('healthy');

      // Step 2: Auth login
      const mockUser = {
        id: 'user-1',
        email: 'admin@nodepress.local',
        passwordHash: '$2a$12$hashed',
        name: 'Admin User',
        role: 'ADMIN',
        capabilities: ['read', 'write', 'admin'],
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      mockSessionService.create.mockResolvedValue({ id: 'session-1' });

      const authService = new AuthService(
        mockJwtService as any,
        mockAppPasswordsService as any,
        mockSessionService as any,
        mockPasswordPolicyService as any,
        mockTwoFactorService as any,
        mockAuditService as any,
        mockPrisma as any,
        mockMailService as any,
      );

      const loginResult = await authService.login(
        { email: 'admin@nodepress.local', password: 'admin123' },
        '10.0.0.1',
        'integration-agent',
      );
      expect(loginResult.accessToken).toBeTruthy();

      // Step 3: Create content
      mockPrisma.contentType.findFirst.mockResolvedValue(mockContentType);
      mockPrisma.contentEntry.create.mockResolvedValue({
        id: 'flow-entry-1',
        contentTypeId: 'ct-1',
        slug: 'full-flow-test',
        status: 'PUBLISHED',
        data: {
          title: 'Full Flow Test',
          content: '<p>Created during full flow test</p>',
          tags: ['e2e'],
          parentId: null,
          featured: false,
          viewCount: 0,
        },
        excerpt: 'Full flow test excerpt',
        authorId: 'user-1',
        publishedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        contentType: { name: 'post' },
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        name: 'Admin',
        displayName: 'admin',
      });
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'admin-1' }]);
      mockNotificationsService.createForUsers.mockResolvedValue(undefined);

      const contentService = new ContentService(mockPrisma as any, mockNotificationsService as any);

      const created = await contentService.create(
        'post',
        {
          title: 'Full Flow Test',
          content: '<p>Created during full flow test</p>',
          status: 'publish',
          tags: ['e2e'],
        } as any,
        'user-1',
      );
      expect(created.id).toBe('flow-entry-1');
      expect(created.status).toBe('publish');

      // Step 4: Find content by type
      mockPrisma.contentType.findFirst.mockResolvedValue(mockContentType);
      mockPrisma.contentEntry.count.mockResolvedValue(1);
      mockPrisma.contentEntry.findMany.mockResolvedValue([
        {
          id: 'flow-entry-1',
          contentTypeId: 'ct-1',
          slug: 'full-flow-test',
          status: 'PUBLISHED',
          data: {
            title: 'Full Flow Test',
            content: '<p>Created during full flow test</p>',
            tags: ['e2e'],
            parentId: null,
            featured: false,
            viewCount: 0,
          },
          excerpt: 'Full flow test excerpt',
          authorId: 'user-1',
          publishedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          contentType: { name: 'post' },
        },
      ]);

      const list = await contentService.findByType('post');
      expect(list.total).toBe(1);
      expect(list.items[0]!.title).toBe('Full Flow Test');

      // Step 5: Delete
      mockPrisma.contentEntry.findUnique.mockResolvedValue({
        id: 'flow-entry-1',
        contentTypeId: 'ct-1',
        slug: 'full-flow-test',
        status: 'PUBLISHED',
        data: {},
        excerpt: '',
        authorId: 'user-1',
        publishedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        contentType: { name: 'post' },
      });
      mockPrisma.contentEntry.delete.mockResolvedValue({} as any);

      await contentService.delete('flow-entry-1');
      expect(mockPrisma.contentEntry.delete).toHaveBeenCalledWith({
        where: { id: 'flow-entry-1' },
      });
    });
  });
});
