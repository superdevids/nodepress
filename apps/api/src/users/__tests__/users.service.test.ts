import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, ConflictException } from '@nestjs/common';

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
  },
  hash: vi.fn(),
}));

import * as bcrypt from 'bcryptjs';

const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
};

const { UsersService } = await import('../users.service.js');

describe('UsersService', () => {
  let usersService: UsersService;

  beforeEach(() => {
    vi.clearAllMocks();
    usersService = new UsersService(mockPrisma as any);
  });

  const mockPrismaUser = {
    id: 'user-1',
    email: 'john@example.com',
    passwordHash: '$2a$12$hashed',
    name: 'John Doe',
    displayName: 'johndoe',
    role: 'SUBSCRIBER',
    capabilities: ['read'],
    avatar: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  describe('findAll', () => {
    it('returns paginated users', async () => {
      mockPrisma.user.findMany.mockResolvedValue([mockPrismaUser]);
      mockPrisma.user.count.mockResolvedValue(1);

      const result = await usersService.findAll(1, 20);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('returns users without passwordHash', async () => {
      mockPrisma.user.findMany.mockResolvedValue([mockPrismaUser]);
      mockPrisma.user.count.mockResolvedValue(1);

      const result = await usersService.findAll();

      expect(result.items[0]).not.toHaveProperty('passwordHash');
      expect(result.items[0].email).toBe('john@example.com');
    });

    it('handles pagination parameters', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await usersService.findAll(3, 10);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
    });
  });

  describe('findById', () => {
    it('returns a user by id', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockPrismaUser);

      const result = await usersService.findById('user-1');

      expect(result.email).toBe('john@example.com');
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('throws NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(usersService.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEmail', () => {
    it('returns user with passwordHash when found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockPrismaUser);

      const result = await usersService.findByEmail('john@example.com');

      expect(result).toBeDefined();
      expect(result?.email).toBe('john@example.com');
      expect(result?.passwordHash).toBe('$2a$12$hashed');
    });

    it('returns undefined when email not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await usersService.findByEmail('missing@example.com');

      expect(result).toBeUndefined();
    });
  });

  describe('create', () => {
    const createDto = {
      email: 'newuser@example.com',
      password: 'Str0ng!Pass',
      firstName: 'Jane',
      lastName: 'Smith',
      username: 'janesmith',
    };

    it('creates a user with valid data', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      vi.mocked(bcrypt.hash).mockResolvedValue('$2a$12$newhash' as never);
      mockPrisma.user.create.mockResolvedValue(mockPrismaUser);

      const result = await usersService.create(createDto);

      expect(result.email).toBe('john@example.com');
      expect(result).not.toHaveProperty('passwordHash');
      expect(mockPrisma.user.create).toHaveBeenCalled();
    });

    it('creates user with default role when not specified', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      vi.mocked(bcrypt.hash).mockResolvedValue('$2a$12$newhash' as never);
      mockPrisma.user.create.mockResolvedValue(mockPrismaUser);

      await usersService.create(createDto);

      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: 'SUBSCRIBER',
          }),
        }),
      );
    });

    it('throws ConflictException when email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'existing',
        email: 'newuser@example.com',
      });

      await expect(usersService.create(createDto)).rejects.toThrow(ConflictException);
    });

    it('creates user without lastName', async () => {
      const dto = { ...createDto, lastName: undefined };
      mockPrisma.user.findUnique.mockResolvedValue(null);
      vi.mocked(bcrypt.hash).mockResolvedValue('$2a$12$newhash' as never);
      mockPrisma.user.create.mockResolvedValue(mockPrismaUser);

      await usersService.create(dto);

      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Jane',
          }),
        }),
      );
    });
  });

  describe('update', () => {
    it('updates user data', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockPrismaUser);
      const updatedUser = { ...mockPrismaUser, name: 'John Updated' };
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const result = await usersService.update('user-1', {
        firstName: 'John',
        lastName: 'Updated',
      });

      expect(result).not.toHaveProperty('passwordHash');
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
        }),
      );
    });

    it('updates username (displayName)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockPrismaUser);
      const updatedUser = { ...mockPrismaUser, displayName: 'newusername' };
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const result = await usersService.update('user-1', { username: 'newusername' });

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ displayName: 'newusername' }),
        }),
      );
    });

    it('updates role to valid value', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockPrismaUser);
      const updatedUser = { ...mockPrismaUser, role: 'ADMIN' };
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const result = await usersService.update('user-1', { role: 'admin' as any });

      expect(result).toBeDefined();
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ role: 'ADMIN' }),
        }),
      );
    });

    it('updates capabilities when permissions provided', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockPrismaUser);
      const updatedUser = { ...mockPrismaUser, capabilities: ['read', 'write', 'delete'] };
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      await usersService.update('user-1', { permissions: ['read', 'write', 'delete'] as any });

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ capabilities: ['read', 'write', 'delete'] }),
        }),
      );
    });

    it('throws NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(usersService.update('nonexistent', { firstName: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('deletes an existing user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockPrismaUser);
      mockPrisma.user.delete.mockResolvedValue(mockPrismaUser);

      await usersService.delete('user-1');

      expect(mockPrisma.user.delete).toHaveBeenCalledWith({ where: { id: 'user-1' } });
    });

    it('throws NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(usersService.delete('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('role validation', () => {
    const validRoles = ['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'AUTHOR', 'CONTRIBUTOR', 'SUBSCRIBER'];

    it.each(validRoles)('accepts valid role: %s', async (role) => {
      mockPrisma.user.findUnique.mockResolvedValue(mockPrismaUser);
      const updatedUser = { ...mockPrismaUser, role };
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const result = await usersService.update('user-1', { role: role.toLowerCase() as any });

      expect(result).toBeDefined();
    });

    it('falls back to SUBSCRIBER for invalid role', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockPrismaUser);
      const updatedUser = { ...mockPrismaUser, role: 'SUBSCRIBER' };
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      await usersService.update('user-1', { role: 'hacker' as any });

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ role: 'SUBSCRIBER' }),
        }),
      );
    });
  });
});
