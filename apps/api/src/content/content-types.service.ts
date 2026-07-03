import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

export interface ContentTypeDefinition {
  id: string;
  name: string;
  slug: string;
  description: string;
  supports: string[];
  createdAt: Date;
}

@Injectable()
export class ContentTypesService {
  private readonly logger = new Logger(ContentTypesService.name);
  private seeded = false;

  constructor(private readonly prisma: PrismaService) {}

  private async ensureSeeded() {
    if (this.seeded) return;
    this.seeded = true;

    const existing = await this.prisma.contentType.findFirst({ where: { name: 'post' } });
    if (existing) return;

    await this.prisma.contentType.createMany({
      data: [
        {
          name: 'post',
          label: { singular: 'Post', plural: 'Posts' },
          fields: {},
          supports: ['title', 'editor', 'thumbnail', 'comments', 'revisions'],
          source: 'CODE',
          menuPosition: 10,
          showInMenu: true,
          hasArchive: true,
          publiclyQueryable: true,
          excludeFromSearch: false,
        },
        {
          name: 'page',
          label: { singular: 'Page', plural: 'Pages' },
          fields: {},
          supports: ['title', 'editor', 'revisions'],
          source: 'CODE',
          menuPosition: 20,
          showInMenu: true,
          hasArchive: false,
          publiclyQueryable: true,
          excludeFromSearch: false,
        },
      ],
    });

    this.logger.log('Default content types seeded');
  }

  async findAll(): Promise<ContentTypeDefinition[]> {
    await this.ensureSeeded();
    const types = await this.prisma.contentType.findMany({
      orderBy: { menuPosition: 'asc' },
    });
    return types.map((t) => this.toDefinition(t));
  }

  async findBySlug(slug: string): Promise<ContentTypeDefinition> {
    await this.ensureSeeded();
    const ct = await this.prisma.contentType.findFirst({ where: { name: slug } });
    if (!ct) throw new NotFoundException(`Content type "${slug}" not found`);
    return this.toDefinition(ct);
  }

  async create(data: {
    name: string;
    slug: string;
    description: string;
    supports?: string[];
  }): Promise<ContentTypeDefinition> {
    await this.ensureSeeded();
    const existing = await this.prisma.contentType.findFirst({ where: { name: data.slug } });
    if (existing) {
      throw new ConflictException(`Content type "${data.slug}" already exists`);
    }

    const ct = await this.prisma.contentType.create({
      data: {
        name: data.slug,
        label: { singular: data.name, plural: data.name + 's' },
        fields: { description: data.description },
        supports: data.supports ?? ['title', 'editor'],
        source: 'UI',
      },
    });

    this.logger.log(`Content type created: ${ct.name}`);
    return this.toDefinition(ct);
  }

  async delete(slug: string): Promise<void> {
    await this.ensureSeeded();
    const ct = await this.prisma.contentType.findFirst({ where: { name: slug } });
    if (!ct) throw new NotFoundException(`Content type "${slug}" not found`);
    await this.prisma.contentType.delete({ where: { id: ct.id } });
    this.logger.log(`Content type deleted: ${slug}`);
  }

  private toDefinition(ct: {
    id: string; name: string; label: unknown; fields: unknown;
    supports: string[]; createdAt: Date;
  }): ContentTypeDefinition {
    const label = ct.label as { singular?: string; plural?: string } | undefined;
    const fields = ct.fields as { description?: string } | undefined;
    return {
      id: ct.id,
      name: label?.singular ?? ct.name,
      slug: ct.name,
      description: fields?.description ?? '',
      supports: ct.supports,
      createdAt: ct.createdAt,
    };
  }
}
