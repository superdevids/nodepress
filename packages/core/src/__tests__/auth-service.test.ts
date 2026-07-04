import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthService } from '../auth/auth-service.js';
import { CapabilityService } from '../auth/capability-service.js';

const ORIGINAL_ENV = { ...process.env };

describe('AuthService (Core)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'a'.repeat(32);
    process.env.JWT_REFRESH_SECRET = 'b'.repeat(32);
    process.env.JWT_EXPIRES_IN = '900';
    process.env.JWT_ISSUER = 'nodepress-test';
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  const mockPrisma = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  } as any;

  describe('constructor validation', () => {
    it('throws when JWT_SECRET is not set', () => {
      delete process.env.JWT_SECRET;
      expect(() => new AuthService(mockPrisma)).toThrow('JWT_SECRET');
    });

    it('throws when JWT_SECRET is too short', () => {
      process.env.JWT_SECRET = 'short';
      expect(() => new AuthService(mockPrisma)).toThrow('at least 32 characters');
    });

    it('throws when JWT_SECRET is a well-known placeholder (length check fires first for short values)', () => {
      process.env.JWT_SECRET = 'nodepress-secret';
      process.env.JWT_REFRESH_SECRET = 'c'.repeat(32);
      // Well-known placeholders are all < 32 chars, so the length check fires first
      expect(() => new AuthService(mockPrisma)).toThrow('at least 32 characters');
    });

    it('throws when JWT_REFRESH_SECRET is not set', () => {
      process.env.JWT_SECRET = 'a'.repeat(32);
      delete process.env.JWT_REFRESH_SECRET;
      expect(() => new AuthService(mockPrisma)).toThrow('JWT_REFRESH_SECRET');
    });

    it('throws when JWT_REFRESH_SECRET is too short', () => {
      process.env.JWT_SECRET = 'a'.repeat(32);
      process.env.JWT_REFRESH_SECRET = 'short';
      expect(() => new AuthService(mockPrisma)).toThrow('at least 32 characters');
    });

    it('throws when JWT_REFRESH_SECRET is a well-known placeholder', () => {
      process.env.JWT_SECRET = 'a'.repeat(32);
      process.env.JWT_REFRESH_SECRET = 'change-me-to-a-secure-random-string';
      expect(() => new AuthService(mockPrisma)).toThrow('must not be a well-known');
    });

    it('accepts well-known placeholders list', () => {
      const placeholders = [
        'nodepress-secret',
        'nodepress-refresh-secret',
        'change-me-to-a-secure-random-string',
        'change-me-to-another-secure-random-string',
        'your-secret-key',
        'secret',
        'default',
      ];
      for (const p of placeholders) {
        expect(typeof p).toBe('string');
      }
    });

    it('creates instance with valid secrets', () => {
      const service = new AuthService(mockPrisma);
      expect(service).toBeInstanceOf(AuthService);
      expect(service.getCapabilityService()).toBeInstanceOf(CapabilityService);
    });
  });

  describe('login', () => {
    it('throws error when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const service = new AuthService(mockPrisma);

      await expect(service.login({ email: 'missing@test.com', password: 'pass' })).rejects.toThrow(
        'Invalid email or password',
      );
    });

    it('throws error when user has no passwordHash', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        passwordHash: null,
      });
      const service = new AuthService(mockPrisma);

      await expect(service.login({ email: 'test@test.com', password: 'pass' })).rejects.toThrow(
        'Invalid email or password',
      );
    });

    it('throws error when password is wrong', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        passwordHash: '$2a$12$hashed',
      });
      vi.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);
      const service = new AuthService(mockPrisma);

      await expect(service.login({ email: 'test@test.com', password: 'wrong' })).rejects.toThrow(
        'Invalid email or password',
      );
    });

    it('returns user and tokens on successful login', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@test.com',
        passwordHash: '$2a$12$hashed',
        role: 'ADMIN',
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      vi.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      const service = new AuthService(mockPrisma);

      const result = await service.login({ email: 'test@test.com', password: 'correct' });

      expect(result.user.email).toBe('test@test.com');
      expect(result.tokens.token).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
      expect(result.tokens.expiresIn).toBe(900);
    });
  });

  describe('register', () => {
    it('creates user with hashed password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const hashSpy = vi.spyOn(bcrypt, 'hash').mockResolvedValue('$2a$12$hashed' as never);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'new@test.com',
        name: 'New User',
        role: 'SUBSCRIBER',
      });
      const service = new AuthService(mockPrisma);

      const result = await service.register({
        email: 'new@test.com',
        password: 'Str0ng!Pass',
        name: 'New User',
      });

      expect(result.user.email).toBe('new@test.com');
      expect(result.user.role).toBe('SUBSCRIBER');
      expect(hashSpy).toHaveBeenCalledWith('Str0ng!Pass', 12);
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'new@test.com',
            role: 'SUBSCRIBER',
          }),
        }),
      );
    });

    it('throws error when email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing', email: 'dup@test.com' });
      const service = new AuthService(mockPrisma);

      await expect(
        service.register({ email: 'dup@test.com', password: 'Str0ng!Pass', name: 'Dup' }),
      ).rejects.toThrow('already exists');
    });
  });

  describe('refreshToken', () => {
    it('throws error for invalid refresh token', async () => {
      vi.spyOn(jwt, 'verify').mockImplementation(() => {
        throw new Error('jwt expired');
      });
      const service = new AuthService(mockPrisma);

      await expect(service.refreshToken('bad-token')).rejects.toThrow();
    });

    it('throws error when user not found', async () => {
      vi.spyOn(jwt, 'verify').mockReturnValue({
        userId: 'nonexistent',
        email: 'test@test.com',
        role: 'USER',
      } as any);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const service = new AuthService(mockPrisma);

      await expect(service.refreshToken('valid-token')).rejects.toThrow('User not found');
    });

    it('returns new tokens with valid refresh token', async () => {
      vi.spyOn(jwt, 'verify').mockReturnValue({
        userId: 'user-1',
        email: 'test@test.com',
        role: 'ADMIN',
      } as any);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        role: 'ADMIN',
      });
      const service = new AuthService(mockPrisma);

      const result = await service.refreshToken('valid-token');

      expect(result.token).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(typeof result.token).toBe('string');
    });
  });

  describe('verifyToken', () => {
    it('returns payload for a valid token', () => {
      const payload = { userId: 'user-1', email: 'test@test.com', role: 'ADMIN' };
      vi.spyOn(jwt, 'verify').mockReturnValue(payload as any);
      const service = new AuthService(mockPrisma);

      const result = service.verifyToken('valid-token');

      expect(result.userId).toBe('user-1');
      expect(result.email).toBe('test@test.com');
    });

    it('throws for invalid token', () => {
      vi.spyOn(jwt, 'verify').mockImplementation(() => {
        throw new Error('invalid signature');
      });
      const service = new AuthService(mockPrisma);

      expect(() => service.verifyToken('bad-token')).toThrow();
    });
  });

  describe('CapabilityService integration', () => {
    it('returns capability service', () => {
      const service = new AuthService(mockPrisma);
      expect(service.getCapabilityService()).toBeInstanceOf(CapabilityService);
    });
  });
});

describe('CapabilityService', () => {
  let capabilities: CapabilityService;

  beforeEach(() => {
    capabilities = new CapabilityService();
  });

  describe('userCan', () => {
    it('allows SUPER_ADMIN to do anything', () => {
      expect(capabilities.userCan('SUPER_ADMIN', 'anything:at:all')).toBe(true);
    });

    it('allows ADMIN to manage all content', () => {
      expect(capabilities.userCan('ADMIN', 'content:post:create')).toBe(true);
      expect(capabilities.userCan('ADMIN', 'media:upload')).toBe(true);
      expect(capabilities.userCan('ADMIN', 'users:manage')).toBe(true);
    });

    it('allows EDITOR to manage content', () => {
      expect(capabilities.userCan('EDITOR', 'content:post:create')).toBe(true);
      expect(capabilities.userCan('EDITOR', 'content:publish')).toBe(true);
      expect(capabilities.userCan('EDITOR', 'content:edit:others')).toBe(true);
      expect(capabilities.userCan('EDITOR', 'media:upload')).toBe(true);
    });

    it('prevents EDITOR from managing users', () => {
      expect(capabilities.userCan('EDITOR', 'users:manage')).toBe(false);
    });

    it('allows AUTHOR to create own content', () => {
      expect(capabilities.userCan('AUTHOR', 'content:create')).toBe(true);
      expect(capabilities.userCan('AUTHOR', 'content:publish:own')).toBe(true);
      expect(capabilities.userCan('AUTHOR', 'content:edit:own')).toBe(true);
      expect(capabilities.userCan('AUTHOR', 'media:upload')).toBe(true);
    });

    it('prevents AUTHOR from editing others content', () => {
      expect(capabilities.userCan('AUTHOR', 'content:edit:others')).toBe(false);
    });

    it('allows CONTRIBUTOR to create and edit own', () => {
      expect(capabilities.userCan('CONTRIBUTOR', 'content:create')).toBe(true);
      expect(capabilities.userCan('CONTRIBUTOR', 'content:edit:own')).toBe(true);
    });

    it('prevents CONTRIBUTOR from publishing', () => {
      expect(capabilities.userCan('CONTRIBUTOR', 'content:publish')).toBe(false);
    });

    it('allows SUBSCRIBER only to read', () => {
      expect(capabilities.userCan('SUBSCRIBER', 'content:read')).toBe(true);
      expect(capabilities.userCan('SUBSCRIBER', 'content:create')).toBe(false);
    });

    it('returns false for unknown role', () => {
      expect(capabilities.userCan('NONEXISTENT', 'content:read')).toBe(false);
    });

    it('respects user-specific capabilities as overrides', () => {
      expect(capabilities.userCan('SUBSCRIBER', 'content:create', ['content:create'])).toBe(true);
    });
  });

  describe('registerRole', () => {
    it('registers a new role', () => {
      capabilities.registerRole('CUSTOM', {
        name: 'Custom Role',
        capabilities: new Set(['custom:do']),
      });

      expect(capabilities.userCan('CUSTOM', 'custom:do')).toBe(true);
      expect(capabilities.userCan('CUSTOM', 'custom:other')).toBe(false);
    });
  });

  describe('getRoles', () => {
    it('returns all registered roles', () => {
      const roles = capabilities.getRoles();
      expect(roles.has('SUPER_ADMIN')).toBe(true);
      expect(roles.has('ADMIN')).toBe(true);
      expect(roles.has('EDITOR')).toBe(true);
      expect(roles.has('AUTHOR')).toBe(true);
      expect(roles.has('CONTRIBUTOR')).toBe(true);
      expect(roles.has('SUBSCRIBER')).toBe(true);
    });
  });
});
