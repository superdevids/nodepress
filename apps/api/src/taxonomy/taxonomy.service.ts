import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

export interface Term {
  id: string;
  taxonomy: 'category' | 'tag' | 'post_format' | string;
  name: string;
  slug: string;
  description: string;
  parentId: string | null;
  count: number;
  createdAt: Date;
}

@Injectable()
export class TaxonomyService {
  private readonly logger = new Logger(TaxonomyService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    taxonomy?: string,
    page = 1,
    limit = 50,
  ): Promise<{ items: Term[]; total: number; page: number; limit: number }> {
    const where: Record<string, unknown> = {};
    if (taxonomy) {
      const tax = await this.prisma.taxonomy.findFirst({ where: { name: taxonomy } });
      if (tax) {
        where.taxonomyId = tax.id;
      } else {
        return { items: [], total: 0, page, limit };
      }
    }

    const [entries, total] = await Promise.all([
      this.prisma.term.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
        include: { taxonomy: true },
      }),
      this.prisma.term.count({ where }),
    ]);

    return {
      items: entries.map((t) => this.toTerm(t)),
      total,
      page,
      limit,
    };
  }

  async findById(id: string): Promise<Term> {
    const term = await this.prisma.term.findUnique({
      where: { id },
      include: { taxonomy: true },
    });
    if (!term) throw new NotFoundException(`Term ${id} not found`);
    return this.toTerm(term);
  }

  async findBySlug(taxonomy: string, slug: string): Promise<Term> {
    const tax = await this.prisma.taxonomy.findFirst({ where: { name: taxonomy } });
    if (!tax) throw new NotFoundException(`Taxonomy "${taxonomy}" not found`);

    const term = await this.prisma.term.findFirst({
      where: { taxonomyId: tax.id, slug },
      include: { taxonomy: true },
    });
    if (!term) throw new NotFoundException(`Term "${slug}" not found in ${taxonomy}`);
    return this.toTerm(term);
  }

  async create(data: {
    taxonomy: string;
    name: string;
    slug?: string;
    description?: string;
    parentId?: string;
  }): Promise<Term> {
    let tax = await this.prisma.taxonomy.findFirst({ where: { name: data.taxonomy } });
    if (!tax) {
      const hierarchical = data.taxonomy === 'category';
      tax = await this.prisma.taxonomy.create({
        data: { name: data.taxonomy, hierarchical },
      });
    }

    const slug = data.slug ?? this.slugify(data.name);

    const existing = await this.prisma.term.findFirst({
      where: { taxonomyId: tax.id, slug },
    });
    if (existing) {
      throw new ConflictException(
        `Term "${slug}" already exists in taxonomy "${data.taxonomy}"`,
      );
    }

    const term = await this.prisma.term.create({
      data: {
        taxonomyId: tax.id,
        name: data.name,
        slug,
        description: data.description ?? '',
        parentId: data.parentId ?? null,
      },
      include: { taxonomy: true },
    });

    this.logger.log(`Term created: ${term.taxonomy.name}/${term.slug}`);
    return this.toTerm(term);
  }

  async update(
    id: string,
    data: { name?: string; slug?: string; description?: string; parentId?: string },
  ): Promise<Term> {
    const existing = await this.prisma.term.findUnique({
      where: { id },
      include: { taxonomy: true },
    });
    if (!existing) throw new NotFoundException(`Term ${id} not found`);

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.parentId !== undefined) updateData.parentId = data.parentId;

    const term = await this.prisma.term.update({
      where: { id },
      data: updateData,
      include: { taxonomy: true },
    });

    return this.toTerm(term);
  }

  async delete(id: string): Promise<void> {
    const term = await this.prisma.term.findUnique({
      where: { id },
      include: { taxonomy: true },
    });
    if (!term) throw new NotFoundException(`Term ${id} not found`);
    await this.prisma.term.delete({ where: { id } });
    this.logger.log(`Term deleted: ${id}`);
  }

  private toTerm(t: {
    id: string; taxonomy: { name: string }; name: string;
    slug: string; description: string | null; parentId: string | null;
    count: number; createdAt: Date;
  }): Term {
    return {
      id: t.id,
      taxonomy: t.taxonomy.name as Term['taxonomy'],
      name: t.name,
      slug: t.slug,
      description: t.description ?? '',
      parentId: t.parentId,
      count: t.count,
      createdAt: t.createdAt,
    };
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 255);
  }
}
