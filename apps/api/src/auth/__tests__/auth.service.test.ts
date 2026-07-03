import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
  compare: vi.fn(),
  hash: vi.fn(),
}));

import * as bcrypt from 'bcryptjs';

const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
};

const mockJwtService = {
  sign: vi.fn().mockReturnValue('mock-access-token'),
};

const mockAppPasswordsService = {
  verify: vi.fn(),
};

const mockSessionService = {
  create: vi.fn(),
  findByRefreshToken: vi.fn(),
  rotateRefreshToken: vi.fn(),
};

const mockPasswordPolicyService = {
  validateAndEnforce: vi.fn(),
  addToHistory: vi.fn(),
};

const mockTwoFactorService = {
  isEnabled: vi.fn().mockResolvedValue(false),
  verifyToken: vi.fn(),
};

const mockAuditService = {
  logLogin: vi.fn(),
};

const mockConfigService = {};

const { AuthService } = await import('../auth.service.js');

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    authService = new AuthService(
      mockJwtService as any,
      mockAppPasswordsService as any,
      mockSessionService as any,
      mockPasswordPolicyService as any,
      mockTwoFactorService as any,
      mockAuditService as any,
      mockPrisma as any,
    );
  });

  describe('validateUser', () => {
    it('returns user when credentials are valid', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: '$2a$12$hashed',
        name: 'Test User',
        role: 'ADMIN',
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      const result = await authService.validateUser('test@example.com', 'password');

      expect(result).not.toBeNull();
      expect(result).not.toHaveProperty('passwordHash');
      expect(result.email).toBe('test@example.com');
    });

    it('returns null when user is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const result = await authService.validateUser('missing@example.com', 'password');
      expect(result).toBeNull();
    });

    it('returns null when password is incorrect', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: '$2a$12$hashed',
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      const result = await authService.validateUser('test@example.com', 'wrong-password');
      expect(result).toBeNull();
    });
  });

  describe('register', () => {
    const registerDto = {
      email: 'new@example.com',
      password: 'Str0ng!Pass',
      firstName: 'John',
      lastName: 'Doe',
      username: 'johndoe',
    };

    it('creates a new user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      vi.mocked(bcrypt.hash).mockResolvedValue('$2a$12$hashed' as never);
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user-id',
        email: 'new@example.com',
        name: 'John Doe',
        displayName: 'johndoe',
        role: 'SUBSCRIBER',
        capabilities: ['read'],
      });

      const result = await authService.register(registerDto);

      expect(result.email).toBe('new@example.com');
      expect(mockPrisma.user.create).toHaveBeenCalled();
      expect(mockPasswordPolicyService.addToHistory).toHaveBeenCalled();
    });

    it('throws ConflictException when email is already registered', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing', email: 'new@example.com' });

      await expect(authService.register(registerDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    const loginDto = { email: 'test@example.com', password: 'password' };

    it('returns token pair on successful login', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: '$2a$12$hashed',
        name: 'Test User',
        role: 'ADMIN',
        capabilities: ['read', 'write'],
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      mockSessionService.create.mockResolvedValue({ id: 'session-1' });

      const result = await authService.login(loginDto, '127.0.0.1', 'test-agent');

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBeDefined();
      expect(result.sessionId).toBe('session-1');
      expect(result.requires2fa).toBe(false);
    });

    it('throws UnauthorizedException for invalid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(authService.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('rotates tokens successfully', async () => {
      const mockSession = {
        id: 'session-1',
        userId: 'user-1',
        refreshToken: 'old-refresh',
        expiresAt: new Date(Date.now() + 86400000),
      };
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        role: 'ADMIN',
        capabilities: ['read', 'write'],
      };
      mockSessionService.findByRefreshToken.mockResolvedValue(mockSession);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockSessionService.rotateRefreshToken.mockResolvedValue(undefined);

      const result = await authService.refresh('valid-refresh-token');

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBeDefined();
      expect(result.refreshToken).not.toBe('old-refresh');
      expect(mockSessionService.rotateRefreshToken).toHaveBeenCalled();
    });

    it('throws UnauthorizedException when session is not found', async () => {
      mockSessionService.findByRefreshToken.mockResolvedValue(null);

      await expect(authService.refresh('invalid-token')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when session is expired', async () => {
      const expiredSession = {
        id: 'session-1',
        userId: 'user-1',
        refreshToken: 'expired',
        expiresAt: new Date(Date.now() - 86400000),
      };
      mockSessionService.findByRefreshToken.mockResolvedValue(expiredSession);

      await expect(authService.refresh('expired-token')).rejects.toThrow('Session expired');
    });
  });
});
