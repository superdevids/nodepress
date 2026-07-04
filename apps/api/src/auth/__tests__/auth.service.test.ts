import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException, ConflictException } from '@nestjs/common';

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
  compare: vi.fn(),
  hash: vi.fn(),
}));

import * as bcrypt from 'bcryptjs';

interface MockPrisma {
  user: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
}

function createMocks() {
  return {
    prisma: {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    } as MockPrisma,
    jwtService: { sign: vi.fn().mockReturnValue('mock-access-token') },
    appPasswordsService: { verify: vi.fn() },
    sessionService: { create: vi.fn(), findByRefreshToken: vi.fn(), rotateRefreshToken: vi.fn() },
    passwordPolicyService: { validateAndEnforce: vi.fn(), addToHistory: vi.fn() },
    twoFactorService: { isEnabled: vi.fn().mockResolvedValue(false), verifyToken: vi.fn() },
    auditService: { logLogin: vi.fn() },
    mailService: {
      sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
      sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
      sendCommentNotification: vi.fn().mockResolvedValue(undefined),
      sendContentPublishedNotification: vi.fn().mockResolvedValue(undefined),
    },
  };
}

type Mocks = ReturnType<typeof createMocks>;

const { AuthService } = await import('../auth.service.js');

function createAuthService(mocks: Mocks) {
  return new AuthService(
    mocks.jwtService as any,
    mocks.appPasswordsService as any,
    mocks.sessionService as any,
    mocks.passwordPolicyService as any,
    mocks.twoFactorService as any,
    mocks.auditService as any,
    mocks.prisma as any,
    mocks.mailService as any,
  );
}

describe('AuthService', () => {
  let mocks: Mocks;
  let authService: AuthService;

  beforeEach(() => {
    mocks = createMocks();
    authService = createAuthService(mocks);
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
      mocks.prisma.user.findUnique.mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      const result = await authService.validateUser('test@example.com', 'password');

      expect(result).not.toBeNull();
      expect(result).not.toHaveProperty('passwordHash');
      expect(result!.email).toBe('test@example.com');
    });

    it('returns null when user is not found', async () => {
      mocks.prisma.user.findUnique.mockResolvedValue(null);
      const result = await authService.validateUser('missing@example.com', 'password');
      expect(result).toBeNull();
    });

    it('returns null when password is incorrect', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: '$2a$12$hashed',
      };
      mocks.prisma.user.findUnique.mockResolvedValue(mockUser);
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
      mocks.prisma.user.findUnique.mockResolvedValue(mockUser);

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
      mocks.prisma.user.findUnique.mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);
      mocks.appPasswordsService.verify.mockResolvedValue(true);

      const result = await authService.validateUser('test@example.com', 'app-password');
      expect(result).not.toBeNull();
      expect(result!.email).toBe('test@example.com');
    });

    it('calls bcrypt.compare with correct password hash', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: '$2a$12$specific-hash-value',
        name: 'Test User',
        role: 'ADMIN',
      };
      mocks.prisma.user.findUnique.mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      await authService.validateUser('test@example.com', 'my-password');

      expect(bcrypt.compare).toHaveBeenCalledWith('my-password', '$2a$12$specific-hash-value');
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

    it('creates a new user with hashed password', async () => {
      mocks.prisma.user.findUnique.mockResolvedValue(null);
      vi.mocked(bcrypt.hash).mockResolvedValue('$2a$12$hashed' as never);
      mocks.prisma.user.create.mockResolvedValue({
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
      expect(bcrypt.hash).toHaveBeenCalledWith('Str0ng!Pass', 12);
      expect(mocks.prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'new@example.com',
            role: 'SUBSCRIBER',
            capabilities: ['read'],
          }),
        }),
      );
      expect(mocks.passwordPolicyService.addToHistory).toHaveBeenCalled();
    });

    it('creates a user without lastName', async () => {
      const dto = { ...registerDto, lastName: undefined };
      mocks.prisma.user.findUnique.mockResolvedValue(null);
      vi.mocked(bcrypt.hash).mockResolvedValue('$2a$12$hashed' as never);
      mocks.prisma.user.create.mockResolvedValue({
        id: 'new-user-id',
        email: 'new@example.com',
        name: 'John',
        displayName: 'johndoe',
        role: 'SUBSCRIBER',
        capabilities: ['read'],
      });

      const result = await authService.register(dto);
      expect(result.email).toBe('new@example.com');
      expect(mocks.prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'John',
          }),
        }),
      );
    });

    it('generates displayName from email when username is not provided', async () => {
      const dto = { ...registerDto, username: undefined, email: 'newuser@example.com' };
      mocks.prisma.user.findUnique.mockResolvedValue(null);
      vi.mocked(bcrypt.hash).mockResolvedValue('$2a$12$hashed' as never);
      mocks.prisma.user.create.mockResolvedValue({
        id: 'new-user-id',
        email: 'newuser@example.com',
        name: 'John Doe',
        displayName: 'newuser',
        role: 'SUBSCRIBER',
        capabilities: ['read'],
      });

      const result = await authService.register(dto);
      expect(result.displayName).toBe('newuser');
      expect(mocks.prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            displayName: 'newuser',
          }),
        }),
      );
    });

    it('throws ConflictException when email is already registered', async () => {
      mocks.prisma.user.findUnique.mockResolvedValue({ id: 'existing', email: 'new@example.com' });

      await expect(authService.register(registerDto)).rejects.toThrow(ConflictException);
      expect(mocks.prisma.user.create).not.toHaveBeenCalled();
    });

    it('does not throw when welcome email fails (non-blocking)', async () => {
      mocks.prisma.user.findUnique.mockResolvedValue(null);
      vi.mocked(bcrypt.hash).mockResolvedValue('$2a$12$hashed' as never);
      mocks.prisma.user.create.mockResolvedValue({
        id: 'new-user-id',
        email: 'new@example.com',
        name: 'John Doe',
        displayName: 'johndoe',
        role: 'SUBSCRIBER',
        capabilities: ['read'],
      });
      mocks.mailService.sendWelcomeEmail.mockRejectedValue(new Error('SMTP error'));

      const result = await authService.register(registerDto);
      expect(result.email).toBe('new@example.com');
    });

    it('calls password policy service to validate password strength', async () => {
      mocks.prisma.user.findUnique.mockResolvedValue(null);
      vi.mocked(bcrypt.hash).mockResolvedValue('$2a$12$hashed' as never);
      mocks.prisma.user.create.mockResolvedValue({
        id: 'new-user-id',
        email: 'new@example.com',
        name: 'John Doe',
        displayName: 'johndoe',
        role: 'SUBSCRIBER',
        capabilities: ['read'],
      });

      await authService.register(registerDto);

      expect(mocks.passwordPolicyService.validateAndEnforce).toHaveBeenCalledWith(
        'new',
        'Str0ng!Pass',
      );
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
      mocks.prisma.user.findUnique.mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      mocks.sessionService.create.mockResolvedValue({ id: 'session-1' });

      const result = await authService.login(loginDto, '127.0.0.1', 'test-agent');

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBeDefined();
      expect(result.sessionId).toBe('session-1');
      expect(result.requires2fa).toBe(false);
    });

    it('throws UnauthorizedException for invalid credentials', async () => {
      mocks.prisma.user.findUnique.mockResolvedValue(null);

      await expect(authService.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('logs failed login attempt via SecurityAuditService', async () => {
      mocks.prisma.user.findUnique.mockResolvedValue(null);

      await expect(authService.login(loginDto, '1.2.3.4', 'bot')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mocks.auditService.logLogin).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          failReason: 'Invalid credentials',
          ipAddress: '1.2.3.4',
          userAgent: 'bot',
        }),
      );
    });

    it('logs successful login attempt via SecurityAuditService', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: '$2a$12$hashed',
        name: 'Test User',
        role: 'ADMIN',
        capabilities: ['read', 'write'],
      };
      mocks.prisma.user.findUnique.mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      mocks.sessionService.create.mockResolvedValue({ id: 'session-1' });

      await authService.login(loginDto, '192.168.1.1', 'chrome');

      expect(mocks.auditService.logLogin).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          email: 'test@example.com',
          ipAddress: '192.168.1.1',
          userAgent: 'chrome',
        }),
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
      mocks.prisma.user.findUnique.mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      mocks.twoFactorService.isEnabled.mockResolvedValue(true);

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
      mocks.prisma.user.findUnique.mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      mocks.twoFactorService.isEnabled.mockResolvedValue(true);
      mocks.twoFactorService.verifyToken.mockResolvedValue(false);

      await expect(
        authService.login({ ...loginDto, twoFactorCode: 'wrong' }, '1.2.3.4', 'agent'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('proceeds with login when 2FA code is valid', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: '$2a$12$hashed',
        name: 'Test User',
        role: 'ADMIN',
      };
      mocks.prisma.user.findUnique.mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      mocks.twoFactorService.isEnabled.mockResolvedValue(true);
      mocks.twoFactorService.verifyToken.mockResolvedValue(true);
      mocks.sessionService.create.mockResolvedValue({ id: 'session-1' });

      const result = await authService.login(
        { ...loginDto, twoFactorCode: '123456' },
        '1.2.3.4',
        'agent',
      );

      expect(result.requires2fa).toBe(false);
      expect(result.accessToken).toBe('mock-access-token');
    });

    it('passes rememberMe flag to session service', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: '$2a$12$hashed',
        name: 'Test User',
        role: 'ADMIN',
      };
      mocks.prisma.user.findUnique.mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      mocks.sessionService.create.mockResolvedValue({ id: 'session-1' });

      await authService.login({ ...loginDto, rememberMe: true }, '1.2.3.4', 'agent');

      expect(mocks.sessionService.create).toHaveBeenCalledWith(
        expect.objectContaining({ rememberMe: true }),
      );
    });
  });

  describe('JWT token generation', () => {
    it('signs JWT with correct payload', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: '$2a$12$hashed',
        name: 'Test User',
        role: 'ADMIN',
        capabilities: ['read', 'write'],
      };
      mocks.prisma.user.findUnique.mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      mocks.sessionService.create.mockResolvedValue({ id: 'session-1' });

      await authService.login(
        { email: 'test@example.com', password: 'password' },
        '127.0.0.1',
        'test-agent',
      );

      expect(mocks.jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'user-1',
          email: 'test@example.com',
          role: 'ADMIN',
          sessionId: 'session-1',
        }),
        expect.objectContaining({
          expiresIn: expect.any(String),
          issuer: 'nodepress',
        }),
      );
    });

    it('uses default permissions when user has no capabilities', async () => {
      const mockUser = {
        id: 'user-2',
        email: 'sub@example.com',
        passwordHash: '$2a$12$hashed',
        role: 'SUBSCRIBER',
      };
      mocks.prisma.user.findUnique.mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      mocks.sessionService.create.mockResolvedValue({ id: 'session-2' });

      await authService.login(
        { email: 'sub@example.com', password: 'password' },
        '127.0.0.1',
        'test-agent',
      );

      expect(mocks.jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          permissions: ['read'],
        }),
        expect.any(Object),
      );
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
      mocks.sessionService.findByRefreshToken.mockResolvedValue(mockSession);
      mocks.prisma.user.findUnique.mockResolvedValue(mockUser);
      mocks.sessionService.rotateRefreshToken.mockResolvedValue(undefined);

      const result = await authService.refresh('valid-refresh-token');

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBeDefined();
      expect(result.refreshToken).not.toBe('old-refresh');
      expect(result.sessionId).toBe('session-1');
      expect(mocks.sessionService.rotateRefreshToken).toHaveBeenCalled();
    });

    it('throws UnauthorizedException when session is not found', async () => {
      mocks.sessionService.findByRefreshToken.mockResolvedValue(null);

      await expect(authService.refresh('invalid-token')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when session is expired', async () => {
      const expiredSession = {
        id: 'session-1',
        userId: 'user-1',
        refreshToken: 'expired',
        expiresAt: new Date(Date.now() - 86400000),
      };
      mocks.sessionService.findByRefreshToken.mockResolvedValue(expiredSession);

      await expect(authService.refresh('expired-token')).rejects.toThrow('Session expired');
    });

    it('throws UnauthorizedException when user is not found', async () => {
      const mockSession = {
        id: 'session-1',
        userId: 'deleted-user',
        refreshToken: 'old-refresh',
        expiresAt: new Date(Date.now() + 86400000),
      };
      mocks.sessionService.findByRefreshToken.mockResolvedValue(mockSession);
      mocks.prisma.user.findUnique.mockResolvedValue(null);

      await expect(authService.refresh('valid-token')).rejects.toThrow(UnauthorizedException);
    });

    it('generates new access token with correct issuer on refresh', async () => {
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
      mocks.sessionService.findByRefreshToken.mockResolvedValue(mockSession);
      mocks.prisma.user.findUnique.mockResolvedValue(mockUser);
      mocks.sessionService.rotateRefreshToken.mockResolvedValue(undefined);

      await authService.refresh('valid-refresh-token');

      expect(mocks.jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'user-1',
          email: 'test@example.com',
          role: 'ADMIN',
          sessionId: 'session-1',
        }),
        expect.objectContaining({
          issuer: 'nodepress',
        }),
      );
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
      mocks.prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await authService.getProfile('user-1');

      expect(result.email).toBe('test@example.com');
      expect(result).not.toHaveProperty('passwordHash');
      expect(result.forcePasswordChange).toBe(false);
    });

    it('throws UnauthorizedException for non-existent user', async () => {
      mocks.prisma.user.findUnique.mockResolvedValue(null);

      await expect(authService.getProfile('nonexistent')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('changePassword', () => {
    it('changes password with correct current password', async () => {
      const mockUser = {
        id: 'user-1',
        passwordHash: '$2a$12$oldhash',
      };
      mocks.prisma.user.findUnique.mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      vi.mocked(bcrypt.hash).mockResolvedValue('$2a$12$newhash' as never);
      mocks.prisma.user.update.mockResolvedValue({ id: 'user-1' });

      const result = await authService.changePassword('user-1', 'currentPass', 'newStr0ngPass1!');

      expect(result.success).toBe(true);
      expect(mocks.prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { passwordHash: '$2a$12$newhash', forcePasswordChange: false },
      });
      expect(mocks.passwordPolicyService.validateAndEnforce).toHaveBeenCalled();
      expect(mocks.passwordPolicyService.addToHistory).toHaveBeenCalled();
    });

    it('throws UnauthorizedException when current password is incorrect', async () => {
      const mockUser = {
        id: 'user-1',
        passwordHash: '$2a$12$oldhash',
      };
      mocks.prisma.user.findUnique.mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(
        authService.changePassword('user-1', 'wrongPassword', 'newStr0ngPass1!'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when user is not found', async () => {
      mocks.prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.changePassword('nonexistent', 'pass', 'newStr0ngPass1!'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when user has no passwordHash', async () => {
      mocks.prisma.user.findUnique.mockResolvedValue({ id: 'user-1', passwordHash: null });

      await expect(authService.changePassword('user-1', 'pass', 'newStr0ngPass1!')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('hashes new password with cost factor 12', async () => {
      const mockUser = {
        id: 'user-1',
        passwordHash: '$2a$12$oldhash',
      };
      mocks.prisma.user.findUnique.mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      vi.mocked(bcrypt.hash).mockResolvedValue('$2a$12$newhash' as never);
      mocks.prisma.user.update.mockResolvedValue({ id: 'user-1' });

      await authService.changePassword('user-1', 'currentPass', 'newStr0ngPass1!');

      expect(bcrypt.hash).toHaveBeenCalledWith('newStr0ngPass1!', 12);
    });
  });

  describe('adminForcePasswordChange', () => {
    it('forces password change for a user', async () => {
      mocks.prisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'test@test.com' });
      mocks.prisma.user.update.mockResolvedValue({ id: 'user-1' });

      const result = await authService.adminForcePasswordChange('user-1');

      expect(result.success).toBe(true);
      expect(mocks.prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { forcePasswordChange: true },
      });
    });

    it('throws UnauthorizedException when user is not found', async () => {
      mocks.prisma.user.findUnique.mockResolvedValue(null);

      await expect(authService.adminForcePasswordChange('nonexistent')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('bcrypt password hashing', () => {
    it('hash is called with salt rounds for register', async () => {
      mocks.prisma.user.findUnique.mockResolvedValue(null);
      vi.mocked(bcrypt.hash).mockResolvedValue('$2a$12$hashed' as never);
      mocks.prisma.user.create.mockResolvedValue({
        id: 'new-user-id',
        email: 'new@example.com',
        name: 'Test',
        displayName: 'test',
        role: 'SUBSCRIBER',
        capabilities: ['read'],
      });

      await authService.register({
        email: 'new@example.com',
        password: 'Str0ng!Pass',
        firstName: 'Test',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('Str0ng!Pass', 12);
    });

    it('hash output is stored as passwordHash', async () => {
      mocks.prisma.user.findUnique.mockResolvedValue(null);
      vi.mocked(bcrypt.hash).mockResolvedValue('$2a$12$custom-hash-value' as never);
      mocks.prisma.user.create.mockResolvedValue({
        id: 'new-user-id',
        email: 'new@example.com',
        name: 'Test',
        displayName: 'test',
        role: 'SUBSCRIBER',
        capabilities: ['read'],
      });

      await authService.register({
        email: 'new@example.com',
        password: 'Str0ng!Pass',
        firstName: 'Test',
      });

      expect(mocks.prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            passwordHash: '$2a$12$custom-hash-value',
          }),
        }),
      );
    });
  });
});
