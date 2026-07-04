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

const mockMailService = {
  sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  sendCommentNotification: vi.fn().mockResolvedValue(undefined),
  sendContentPublishedNotification: vi.fn().mockResolvedValue(undefined),
};

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
      mockMailService as any,
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

    it('returns null when user has no passwordHash', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: null,
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await authService.validateUser('test@example.com', 'password');
      expect(result).toBeNull();
    });

    it('returns user when app password is valid', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: '$2a$12$hashed',
        name: 'Test User',
        role: 'ADMIN',
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);
      mockAppPasswordsService.verify.mockResolvedValue(true);

      const result = await authService.validateUser('test@example.com', 'app-password');
      expect(result).not.toBeNull();
      expect(result.email).toBe('test@example.com');
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
      expect(result).not.toHaveProperty('passwordHash');
      expect(mockPrisma.user.create).toHaveBeenCalled();
      expect(mockPasswordPolicyService.addToHistory).toHaveBeenCalled();
    });

    it('creates a user without lastName', async () => {
      const dto = { ...registerDto, lastName: undefined };
      mockPrisma.user.findUnique.mockResolvedValue(null);
      vi.mocked(bcrypt.hash).mockResolvedValue('$2a$12$hashed' as never);
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user-id',
        email: 'new@example.com',
        name: 'John',
        displayName: 'johndoe',
        role: 'SUBSCRIBER',
        capabilities: ['read'],
      });

      const result = await authService.register(dto);
      expect(result.email).toBe('new@example.com');
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'John',
          }),
        }),
      );
    });

    it('throws ConflictException when email is already registered', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing', email: 'new@example.com' });

      await expect(authService.register(registerDto)).rejects.toThrow(ConflictException);
    });

    it('does not throw when welcome email fails (non-blocking)', async () => {
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
      mockMailService.sendWelcomeEmail.mockRejectedValue(new Error('SMTP error'));

      const result = await authService.register(registerDto);
      expect(result.email).toBe('new@example.com');
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

    it('logs failed login attempt', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(authService.login(loginDto, '1.2.3.4', 'bot')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockAuditService.logLogin).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, failReason: 'Invalid credentials' }),
      );
    });

    it('returns requires2fa when 2FA is enabled', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: '$2a$12$hashed',
        name: 'Test User',
        role: 'ADMIN',
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      mockTwoFactorService.isEnabled.mockResolvedValue(true);

      const result = await authService.login(loginDto);

      expect(result.requires2fa).toBe(true);
      expect(result.accessToken).toBe('');
      expect(result.refreshToken).toBe('');
    });

    it('throws UnauthorizedException when 2FA code is invalid', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: '$2a$12$hashed',
        name: 'Test User',
        role: 'ADMIN',
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      mockTwoFactorService.isEnabled.mockResolvedValue(true);
      mockTwoFactorService.verifyToken.mockResolvedValue(false);

      await expect(
        authService.login({ ...loginDto, twoFactorCode: 'wrong' }, '1.2.3.4', 'agent'),
      ).rejects.toThrow(UnauthorizedException);
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
      expect(result.sessionId).toBe('session-1');
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

    it('throws UnauthorizedException when user is not found', async () => {
      const mockSession = {
        id: 'session-1',
        userId: 'deleted-user',
        refreshToken: 'old-refresh',
        expiresAt: new Date(Date.now() + 86400000),
      };
      mockSessionService.findByRefreshToken.mockResolvedValue(mockSession);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(authService.refresh('valid-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getProfile', () => {
    it('returns the user profile without passwordHash', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: '$2a$12$hashed',
        name: 'Test User',
        displayName: 'testuser',
        role: 'ADMIN',
        capabilities: ['read', 'write'],
        forcePasswordChange: false,
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await authService.getProfile('user-1');

      expect(result.email).toBe('test@example.com');
      expect(result).not.toHaveProperty('passwordHash');
      expect(result.forcePasswordChange).toBe(false);
    });

    it('throws UnauthorizedException for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(authService.getProfile('nonexistent')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('changePassword', () => {
    it('changes password with correct current password', async () => {
      const mockUser = {
        id: 'user-1',
        passwordHash: '$2a$12$oldhash',
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      vi.mocked(bcrypt.hash).mockResolvedValue('$2a$12$newhash' as never);
      mockPrisma.user.update.mockResolvedValue({ id: 'user-1' });

      const result = await authService.changePassword('user-1', 'currentPass', 'newStr0ngPass1!');

      expect(result.success).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { passwordHash: '$2a$12$newhash', forcePasswordChange: false },
      });
      expect(mockPasswordPolicyService.validateAndEnforce).toHaveBeenCalled();
      expect(mockPasswordPolicyService.addToHistory).toHaveBeenCalled();
    });

    it('throws UnauthorizedException when current password is incorrect', async () => {
      const mockUser = {
        id: 'user-1',
        passwordHash: '$2a$12$oldhash',
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(
        authService.changePassword('user-1', 'wrongPassword', 'newStr0ngPass1!'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when user is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.changePassword('nonexistent', 'pass', 'newStr0ngPass1!'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when user has no passwordHash', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', passwordHash: null });

      await expect(authService.changePassword('user-1', 'pass', 'newStr0ngPass1!')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('adminForcePasswordChange', () => {
    it('forces password change for a user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'test@test.com' });
      mockPrisma.user.update.mockResolvedValue({ id: 'user-1' });

      const result = await authService.adminForcePasswordChange('user-1');

      expect(result.success).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { forcePasswordChange: true },
      });
    });

    it('throws UnauthorizedException when user is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(authService.adminForcePasswordChange('nonexistent')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
