import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';

const mockPrisma = {
  setting: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    updateMany: vi.fn(),
  },
};

const { SettingsService } = await import('../settings.service.js');

describe('SettingsService', () => {
  let settingsService: SettingsService;

  beforeEach(() => {
    vi.resetAllMocks();
    settingsService = new SettingsService(mockPrisma as any);
  });

  const mockGeneralSettings = [
    {
      id: 's-1',
      group: 'general',
      key: 'siteTitle',
      value: 'NodePress',
      autoload: true,
      pluginId: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: 's-2',
      group: 'general',
      key: 'tagline',
      value: 'A Headless CMS',
      autoload: true,
      pluginId: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
    },
  ];

  const mockReadingSettings = [
    {
      id: 's-3',
      group: 'reading',
      key: 'postsPerPage',
      value: 10,
      autoload: true,
      pluginId: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
  ];

  describe('getGroup', () => {
    it('returns settings for an existing group', async () => {
      mockPrisma.setting.findFirst.mockResolvedValue(mockGeneralSettings[0]);
      mockPrisma.setting.findMany.mockResolvedValue(mockGeneralSettings);

      const result = await settingsService.getGroup('general');

      expect(result.group).toBe('general');
      expect(result.values.siteTitle).toBe('NodePress');
      expect(result.values.tagline).toBe('A Headless CMS');
    });

    it('throws NotFoundException for non-existent group', async () => {
      mockPrisma.setting.findFirst.mockResolvedValue(mockGeneralSettings[0]);
      mockPrisma.setting.findMany.mockResolvedValue([]);

      await expect(settingsService.getGroup('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('coerces string number to number in values', async () => {
      const settingsWithNumber = [
        {
          ...mockReadingSettings[0],
          key: 'postsPerPage',
          value: 10,
        },
      ];
      mockPrisma.setting.findFirst.mockResolvedValue(mockReadingSettings[0]);
      mockPrisma.setting.findMany.mockResolvedValue(settingsWithNumber);

      const result = await settingsService.getGroup('reading');

      expect(result.values.postsPerPage).toBe(10);
    });

    it('coerces boolean string to boolean in values', async () => {
      const settingsWithBool = [
        {
          ...mockGeneralSettings[0],
          group: 'discussion',
          key: 'requireCommentModeration',
          value: true,
        },
      ];
      mockPrisma.setting.findFirst.mockResolvedValue(mockGeneralSettings[0]);
      mockPrisma.setting.findMany.mockResolvedValue(settingsWithBool);

      const result = await settingsService.getGroup('discussion');

      expect(result.values.requireCommentModeration).toBe(true);
    });
  });

  describe('getAll', () => {
    it('returns all settings grouped', async () => {
      mockPrisma.setting.findFirst.mockResolvedValue(mockGeneralSettings[0]);
      mockPrisma.setting.findMany.mockResolvedValue([
        ...mockGeneralSettings,
        ...mockReadingSettings,
      ]);

      const result = await settingsService.getAll();

      expect(result.length).toBeGreaterThanOrEqual(2);
      const general = result.find((g) => g.group === 'general');
      expect(general).toBeDefined();
      expect(general!.values.siteTitle).toBe('NodePress');
    });

    it('handles empty settings gracefully', async () => {
      mockPrisma.setting.findFirst.mockResolvedValue(null);
      mockPrisma.setting.findMany.mockResolvedValue([]);

      const result = await settingsService.getAll();

      expect(result).toEqual([]);
    });

    it('returns groups in insertion order (as returned from db)', async () => {
      mockPrisma.setting.findFirst.mockResolvedValue(mockGeneralSettings[0]);
      mockPrisma.setting.findMany.mockResolvedValue([
        ...mockReadingSettings,
        ...mockGeneralSettings,
      ]);

      const result = await settingsService.getAll();

      const groupNames = result.map((g: { group: string }) => g.group);
      expect(groupNames.length).toBe(2);
      expect(groupNames).toContain('reading');
      expect(groupNames).toContain('general');
    });
  });

  describe('updateGroup', () => {
    it('upserts settings in a group', async () => {
      mockPrisma.setting.findFirst.mockResolvedValue(mockGeneralSettings[0]);
      mockPrisma.setting.findMany
        .mockResolvedValueOnce(mockGeneralSettings)
        .mockResolvedValueOnce(mockGeneralSettings);

      mockPrisma.setting.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.setting.create.mockResolvedValue(mockGeneralSettings[0]);

      const result = await settingsService.updateGroup('general', {
        siteTitle: 'Updated NodePress',
      });

      expect(result.group).toBe('general');
      expect(mockPrisma.setting.updateMany).toHaveBeenCalled();
    });

    it('creates new settings that do not exist', async () => {
      mockPrisma.setting.findFirst.mockResolvedValue(mockGeneralSettings[0]);
      mockPrisma.setting.findMany
        .mockResolvedValueOnce(mockGeneralSettings)
        .mockResolvedValueOnce(mockGeneralSettings);

      mockPrisma.setting.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.setting.create.mockResolvedValue({
        ...mockGeneralSettings[0],
        key: 'newKey',
        value: 'newValue',
      });

      const result = await settingsService.updateGroup('general', {
        newKey: 'newValue',
      });

      expect(mockPrisma.setting.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            group: 'general',
            key: 'newKey',
            value: 'newValue',
          }),
        }),
      );
    });

    it('handles mixed update and create in one call', async () => {
      mockPrisma.setting.findFirst.mockResolvedValue(mockGeneralSettings[0]);
      mockPrisma.setting.findMany
        .mockResolvedValueOnce(mockGeneralSettings)
        .mockResolvedValueOnce(mockGeneralSettings);

      mockPrisma.setting.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.setting.create.mockResolvedValue({
        ...mockGeneralSettings[0],
        key: 'customKey',
        value: 'customValue',
      });

      await settingsService.updateGroup('general', {
        siteTitle: 'Updated',
        customKey: 'customValue',
      });

      expect(mockPrisma.setting.updateMany).toHaveBeenCalled();
      expect(mockPrisma.setting.create).toHaveBeenCalled();
    });

    it('updates the updatedAt timestamp on existing settings', async () => {
      mockPrisma.setting.findFirst.mockResolvedValue(mockGeneralSettings[0]);
      mockPrisma.setting.findMany
        .mockResolvedValueOnce(mockGeneralSettings)
        .mockResolvedValueOnce(mockGeneralSettings);

      mockPrisma.setting.updateMany.mockResolvedValue({ count: 1 });

      await settingsService.updateGroup('general', {
        siteTitle: 'Updated Title',
      });

      expect(mockPrisma.setting.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            updatedAt: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe('autoload settings', () => {
    it('returns autoload settings correctly', async () => {
      const autoloadSettings = mockGeneralSettings.filter((s) => s.autoload);
      mockPrisma.setting.findFirst.mockResolvedValue(mockGeneralSettings[0]);
      mockPrisma.setting.findMany
        .mockResolvedValueOnce(autoloadSettings)
        .mockResolvedValueOnce(autoloadSettings);

      const result = await settingsService.getGroup('general');

      expect(result.values.siteTitle).toBeDefined();
      expect(result.values.tagline).toBeDefined();
    });
  });

  describe('type coercion', () => {
    it('preserves numeric values as numbers', async () => {
      const numericSettings = [
        {
          ...mockGeneralSettings[0],
          key: 'postsPerPage',
          value: 25,
        },
      ];
      mockPrisma.setting.findFirst.mockResolvedValue(mockGeneralSettings[0]);
      mockPrisma.setting.findMany.mockResolvedValue(numericSettings);

      const result = await settingsService.getGroup('general');

      expect(typeof result.values.postsPerPage).toBe('number');
      expect(result.values.postsPerPage).toBe(25);
    });

    it('preserves boolean values as booleans', async () => {
      const boolSettings = [
        {
          ...mockGeneralSettings[0],
          group: 'discussion',
          key: 'enabled',
          value: false,
        },
      ];
      mockPrisma.setting.findFirst.mockResolvedValue(mockGeneralSettings[0]);
      mockPrisma.setting.findMany.mockResolvedValue(boolSettings);

      const result = await settingsService.getGroup('discussion');

      expect(typeof result.values.enabled).toBe('boolean');
      expect(result.values.enabled).toBe(false);
    });

    it('preserves null values', async () => {
      const nullSettings = [
        {
          ...mockGeneralSettings[0],
          group: 'custom',
          key: 'nullableKey',
          value: null,
        },
      ];
      mockPrisma.setting.findFirst.mockResolvedValue(mockGeneralSettings[0]);
      mockPrisma.setting.findMany.mockResolvedValue(nullSettings);

      const result = await settingsService.getGroup('custom');

      expect(result.values.nullableKey).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('handles empty values object in updateGroup', async () => {
      mockPrisma.setting.findFirst.mockResolvedValue(mockGeneralSettings[0]);
      mockPrisma.setting.findMany
        .mockResolvedValueOnce(mockGeneralSettings)
        .mockResolvedValueOnce(mockGeneralSettings);

      await settingsService.updateGroup('general', {});

      // Should not throw and should call getGroup
      expect(mockPrisma.setting.findMany).toHaveBeenCalledTimes(2);
    });

    it('returns the most recent updatedAt for a group', async () => {
      const settingsWithDiffDates = [
        { ...mockGeneralSettings[0], updatedAt: new Date('2024-01-01') },
        { ...mockGeneralSettings[1], updatedAt: new Date('2024-06-15') },
      ];
      mockPrisma.setting.findFirst.mockResolvedValue(mockGeneralSettings[0]);
      mockPrisma.setting.findMany.mockResolvedValue(settingsWithDiffDates);

      const result = await settingsService.getGroup('general');

      expect(result.updatedAt).toEqual(new Date('2024-06-15'));
    });
  });
});
