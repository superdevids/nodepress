import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

export interface SettingsGroup {
  group: string;
  values: Record<string, unknown>;
  updatedAt: Date;
}

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);
  private seeded = false;

  constructor(private readonly prisma: PrismaService) {}

  private async ensureSeeded() {
    if (this.seeded) return;
    this.seeded = true;

    const existing = await this.prisma.setting.findFirst({ where: { group: 'general' } });
    if (existing) return;

    const defaults: { group: string; key: string; value: unknown }[] = [
      { group: 'general', key: 'siteTitle', value: 'NodePress' },
      { group: 'general', key: 'tagline', value: 'A Headless CMS built with NestJS' },
      { group: 'general', key: 'siteUrl', value: 'http://localhost:3000' },
      { group: 'general', key: 'adminEmail', value: 'admin@nodepress.local' },
      { group: 'general', key: 'language', value: 'en-US' },
      { group: 'general', key: 'timezone', value: 'UTC' },
      { group: 'general', key: 'dateFormat', value: 'Y-m-d' },
      { group: 'reading', key: 'postsPerPage', value: 10 },
      { group: 'discussion', key: 'defaultCommentStatus', value: 'open' },
      { group: 'discussion', key: 'requireCommentModeration', value: true },
      { group: 'discussion', key: 'commentModerationQueue', value: true },
    ];

    await this.prisma.setting.createMany({ data: defaults });
    this.logger.log('Default settings seeded');
  }

  async getGroup(group: string): Promise<SettingsGroup> {
    await this.ensureSeeded();
    const settings = await this.prisma.setting.findMany({
      where: { group },
    });

    if (settings.length === 0) {
      throw new NotFoundException(`Settings group "${group}" not found`);
    }

    const values: Record<string, unknown> = {};
    for (const s of settings) {
      values[s.key] = s.value;
    }

    const latest = settings.reduce((a, b) =>
      a.updatedAt > b.updatedAt ? a : b,
    );

    return { group, values, updatedAt: latest.updatedAt };
  }

  async getAll(): Promise<SettingsGroup[]> {
    await this.ensureSeeded();
    const settings = await this.prisma.setting.findMany({
      orderBy: [{ group: 'asc' }, { key: 'asc' }],
    });

    const groups = new Map<string, { values: Record<string, unknown>; updatedAt: Date }>();
    for (const s of settings) {
      if (!groups.has(s.group)) {
        groups.set(s.group, { values: {}, updatedAt: s.updatedAt });
      }
      const g = groups.get(s.group)!;
      g.values[s.key] = s.value;
      if (s.updatedAt > g.updatedAt) g.updatedAt = s.updatedAt;
    }

    return Array.from(groups.entries()).map(([group, data]) => ({
      group,
      values: data.values,
      updatedAt: data.updatedAt,
    }));
  }

  async updateGroup(
    group: string,
    values: Record<string, unknown>,
  ): Promise<SettingsGroup> {
    await this.ensureSeeded();

    const existing = await this.prisma.setting.findMany({ where: { group } });
    const existingKeys = new Set(existing.map((s) => s.key));

    const operations = Object.entries(values).map(([key, value]) => {
      if (existingKeys.has(key)) {
        return this.prisma.setting.updateMany({
          where: { group, key },
          data: { value: value as any, updatedAt: new Date() },
        });
      }
      return this.prisma.setting.create({
        data: { group, key, value: value as any },
      });
    });

    await Promise.all(operations);
    this.logger.log(`Settings group "${group}" updated`);

    return this.getGroup(group);
  }
}
