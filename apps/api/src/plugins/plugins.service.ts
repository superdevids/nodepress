import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

export interface Plugin {
  id: string;
  name: string;
  slug: string;
  version: string;
  description: string;
  author: string;
  enabled: boolean;
  settings: Record<string, unknown>;
  installedAt: Date;
  updatedAt: Date;
}

@Injectable()
export class PluginsService {
  private readonly logger = new Logger(PluginsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(enabled?: boolean): Promise<Plugin[]> {
    const where: Record<string, unknown> = {};
    if (enabled !== undefined) {
      where.active = enabled;
    }

    const plugins = await this.prisma.plugin.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return plugins.map((p) => this.toPlugin(p));
  }

  async findById(id: string): Promise<Plugin> {
    const plugin = await this.prisma.plugin.findUnique({ where: { id } });
    if (!plugin) throw new NotFoundException(`Plugin ${id} not found`);
    return this.toPlugin(plugin);
  }

  async install(data: {
    name: string;
    slug: string;
    version?: string;
    description?: string;
    author?: string;
  }): Promise<Plugin> {
    const existing = await this.prisma.plugin.findUnique({ where: { slug: data.slug } });
    if (existing) {
      throw new BadRequestException(`Plugin "${data.slug}" already installed`);
    }

    const plugin = await this.prisma.plugin.create({
      data: {
        slug: data.slug,
        version: data.version ?? '1.0.0',
        active: false,
        settings: {},
      },
    });

    this.logger.log(`Plugin installed: ${plugin.slug} v${plugin.version}`);
    return this.toPlugin(plugin);
  }

  async activate(id: string): Promise<Plugin> {
    const plugin = await this.prisma.plugin.findUnique({ where: { id } });
    if (!plugin) throw new NotFoundException(`Plugin ${id} not found`);

    const updated = await this.prisma.plugin.update({
      where: { id },
      data: { active: true },
    });

    this.logger.log(`Plugin activated: ${updated.slug}`);
    return this.toPlugin(updated);
  }

  async deactivate(id: string): Promise<Plugin> {
    const plugin = await this.prisma.plugin.findUnique({ where: { id } });
    if (!plugin) throw new NotFoundException(`Plugin ${id} not found`);

    const updated = await this.prisma.plugin.update({
      where: { id },
      data: { active: false },
    });

    this.logger.log(`Plugin deactivated: ${updated.slug}`);
    return this.toPlugin(updated);
  }

  async uninstall(id: string): Promise<void> {
    const plugin = await this.prisma.plugin.findUnique({ where: { id } });
    if (!plugin) throw new NotFoundException(`Plugin ${id} not found`);
    await this.prisma.plugin.delete({ where: { id } });
    this.logger.log(`Plugin uninstalled: ${id}`);
  }

  private toPlugin(p: {
    id: string; slug: string; version: string; active: boolean;
    settings: unknown; createdAt: Date; updatedAt: Date;
  }): Plugin {
    return {
      id: p.id,
      name: p.slug,
      slug: p.slug,
      version: p.version,
      description: '',
      author: 'Unknown',
      enabled: p.active,
      settings: (p.settings as Record<string, unknown>) ?? {},
      installedAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }
}
