import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../common/prisma.service';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  role: string;
  permissions: string[];
  passwordHash: string;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(page = 1, limit = 20): Promise<{ items: Omit<User, 'passwordHash'>[]; total: number }> {
    const [entries, total] = await Promise.all([
      this.prisma.user.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);

    return {
      items: entries.map((u) => this.sanitize(this.toUser(u))),
      total,
    };
  }

  async findById(id: string): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return this.sanitize(this.toUser(user));
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return undefined;
    return this.toUser(user);
  }

  async create(data: {
    email: string;
    password: string;
    firstName: string;
    lastName?: string;
    username?: string;
    role?: string;
  }): Promise<Omit<User, 'passwordHash'>> {
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const role = (data.role ?? 'subscriber').toUpperCase();

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        name: `${data.firstName} ${data.lastName ?? ''}`.trim(),
        displayName: data.username ?? data.email.split('@')[0],
        role: this.parseRole(role),
        capabilities: ['read'],
        avatar: null,
      },
    });

    this.logger.log(`User created: ${user.email}`);
    return this.sanitize(this.toUser(user));
  }

  async update(
    id: string,
    data: Partial<Pick<User, 'firstName' | 'lastName' | 'username' | 'role' | 'permissions'>>,
  ): Promise<Omit<User, 'passwordHash'>> {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`User ${id} not found`);

    const updateData: Record<string, unknown> = {};
    if (data.firstName !== undefined || data.lastName !== undefined) {
      updateData.name = `${data.firstName ?? existing.name.split(' ')[0]} ${data.lastName ?? existing.name.split(' ').slice(1).join(' ')}`.trim();
    }
    if (data.username !== undefined) {
      updateData.displayName = data.username;
    }
    if (data.role !== undefined) {
      updateData.role = this.parseRole(data.role.toUpperCase());
    }
    if (data.permissions !== undefined) {
      updateData.capabilities = data.permissions;
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    return this.sanitize(this.toUser(updated));
  }

  async delete(id: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    await this.prisma.user.delete({ where: { id } });
    this.logger.log(`User deleted: ${id}`);
  }

  private toUser(u: {
    id: string; email: string; passwordHash: string | null; name: string;
    displayName: string | null; role: string; capabilities: string[];
    avatar: string | null; createdAt: Date; updatedAt: Date;
  }): User {
    const nameParts = u.name.split(' ');
    return {
      id: u.id,
      email: u.email,
      firstName: nameParts[0] ?? '',
      lastName: nameParts.slice(1).join(' '),
      username: u.displayName ?? u.email.split('@')[0],
      role: u.role.toLowerCase(),
      permissions: u.capabilities,
      passwordHash: u.passwordHash ?? '',
      avatarUrl: u.avatar,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    };
  }

  private sanitize(user: User): Omit<User, 'passwordHash'> {
    const { passwordHash: _, ...rest } = user;
    return rest;
  }

  private parseRole(role: string): string {
    const validRoles = ['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'AUTHOR', 'CONTRIBUTOR', 'SUBSCRIBER'];
    return validRoles.includes(role) ? role : 'SUBSCRIBER';
  }
}
