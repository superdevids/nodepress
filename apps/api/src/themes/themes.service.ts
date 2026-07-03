import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

export interface Theme {
  id: string;
  name: string;
  slug: string;
  version: string;
  description: string;
  author: string;
  active: boolean;
  settings: Record<string, unknown>;
  installedAt: Date;
  updatedAt: Date;
}

@Injectable()
export class ThemesService {
  private readonly logger = new Logger(ThemesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Theme[]> {
    const themes = await this.prisma.theme.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return themes.map((t) => this.toTheme(t));
  }

  async findById(id: string): Promise<Theme> {
    const theme = await this.prisma.theme.findUnique({ where: { id } });
    if (!theme) throw new NotFoundException(`Theme ${id} not found`);
    return this.toTheme(theme);
  }

  async getActive(): Promise<Theme | null> {
    const theme = await this.prisma.theme.findFirst({ where: { active: true } });
    if (!theme) return null;
    return this.toTheme(theme);
  }

  async install(data: {
    name: string;
    slug: string;
    version?: string;
    description?: string;
    author?: string;
  }): Promise<Theme> {
    const existing = await this.prisma.theme.findUnique({ where: { slug: data.slug } });
    if (existing) {
      throw new BadRequestException(`Theme "${data.slug}" already installed`);
    }

    const theme = await this.prisma.theme.create({
      data: {
        slug: data.slug,
        name: data.name,
        version: data.version ?? '1.0.0',
        description: data.description ?? '',
        author: data.author ?? 'Unknown',
        active: false,
        supports: [],
        tags: [],
        settings: {},
      },
    });

    this.logger.log(`Theme installed: ${theme.slug} v${theme.version}`);

    const count = await this.prisma.theme.count();
    if (count === 1) {
      return this.activate(theme.id);
    }

    return this.toTheme(theme);
  }

  async activate(id: string): Promise<Theme> {
    const theme = await this.prisma.theme.findUnique({ where: { id } });
    if (!theme) throw new NotFoundException(`Theme ${id} not found`);

    await this.prisma.theme.updateMany({
      where: { active: true },
      data: { active: false },
    });

    const updated = await this.prisma.theme.update({
      where: { id },
      data: { active: true },
    });

    this.logger.log(`Theme activated: ${updated.slug}`);
    return this.toTheme(updated);
  }

  async uninstall(id: string): Promise<void> {
    const theme = await this.prisma.theme.findUnique({ where: { id } });
    if (!theme) throw new NotFoundException(`Theme ${id} not found`);
    if (theme.active) {
      throw new BadRequestException('Cannot uninstall an active theme');
    }
    await this.prisma.theme.delete({ where: { id } });
    this.logger.log(`Theme uninstalled: ${id}`);
  }

  private toTheme(t: {
    id: string; slug: string; name: string; version: string;
    description: string | null; author: string | null; active: boolean;
    settings: unknown; createdAt: Date; updatedAt: Date;
  }): Theme {
    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      version: t.version,
      description: t.description ?? '',
      author: t.author ?? 'Unknown',
      active: t.active,
      settings: (t.settings as Record<string, unknown>) ?? {},
      installedAt: t.createdAt,
      updatedAt: t.updatedAt,
    };
  }
}
