import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  $queryRawUnsafe: vi.fn(),
};

vi.mock('redis', () => ({
  createClient: vi.fn(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    ping: vi.fn().mockResolvedValue('PONG'),
    quit: vi.fn().mockResolvedValue(undefined),
  })),
}));

const { HealthChecker, HealthController } = await import('../health.controller.js');

describe('HealthChecker', () => {
  let healthChecker: HealthChecker;

  beforeEach(() => {
    vi.clearAllMocks();
    healthChecker = new HealthChecker(mockPrisma as any);
  });

  describe('checkLiveness', () => {
    it('returns ok status with timestamp', async () => {
      const result = await healthChecker.checkLiveness();

      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
      expect(typeof result.timestamp).toBe('string');
    });

    it('returns ISO timestamp', async () => {
      const result = await healthChecker.checkLiveness();

      expect(() => new Date(result.timestamp)).not.toThrow();
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });
  });

  describe('checkReadiness', () => {
    it('returns degraded status when optional services are not configured', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([{ 1: 1 }]);

      const result = await healthChecker.checkReadiness();

      // Redis, storage, queue are "degraded" when env vars not set
      expect(result.status).toBe('degraded');
      expect(result.checks.database.status).toBe('healthy');
      expect(result.checks.redis.status).toBe('degraded');
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });

    it('includes database check with healthy status', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([{ 1: 1 }]);

      const result = await healthChecker.checkReadiness();

      expect(result.checks).toHaveProperty('database');
      expect(result.checks.database.status).toBe('healthy');
      expect(result.checks.database.latency).toBeGreaterThanOrEqual(0);
    });

    it('returns degraded status when database check fails', async () => {
      mockPrisma.$queryRawUnsafe.mockRejectedValue(new Error('Connection refused'));

      const result = await healthChecker.checkReadiness();

      expect(result.status).toBe('unhealthy');
      expect(result.checks.database.status).toBe('unhealthy');
      expect(result.checks.database.error).toBeDefined();
    });

    it('caches readiness result within TTL', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([{ 1: 1 }]);

      const result1 = await healthChecker.checkReadiness();
      const result2 = await healthChecker.checkReadiness();

      // Second call should use cache — $queryRawUnsafe only called once
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledTimes(1);
      expect(result1.status).toBe(result2.status);
    });

    it('re-checks after cache TTL expires', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([{ 1: 1 }]);

      await healthChecker.checkReadiness();

      // Advance time past cache TTL (5000ms)
      const originalDateNow = Date.now;
      const startTime = Date.now();
      vi.spyOn(Date, 'now').mockImplementation(() => startTime + 6000);

      mockPrisma.$queryRawUnsafe.mockResolvedValue([{ 1: 1 }]);
      await healthChecker.checkReadiness();

      // Should have queried again after cache expiry
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledTimes(2);

      Date.now = originalDateNow;
    });

    it('includes all check categories', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([{ 1: 1 }]);

      const result = await healthChecker.checkReadiness();

      expect(result.checks).toHaveProperty('database');
      expect(result.checks).toHaveProperty('redis');
      expect(result.checks).toHaveProperty('storage');
      expect(result.checks).toHaveProperty('queue');
      expect(result.checks).toHaveProperty('disk');
    });

    it('returns degraded status when redis is not configured', async () => {
      const originalRedisUrl = process.env.REDIS_URL;
      delete process.env.REDIS_URL;
      mockPrisma.$queryRawUnsafe.mockResolvedValue([{ 1: 1 }]);

      const result = await healthChecker.checkReadiness();

      expect(result.checks.redis.status).toBe('degraded');
      expect(result.checks.redis.error).toContain('Redis not configured');

      if (originalRedisUrl) process.env.REDIS_URL = originalRedisUrl;
    });

    it('reports correct status hierarchy: unhealthy > degraded > healthy', async () => {
      // Make database check fail -> status should be 'unhealthy'
      mockPrisma.$queryRawUnsafe.mockRejectedValue(new Error('DB down'));

      const result = await healthChecker.checkReadiness();

      expect(result.status).toBe('unhealthy');
    });
  });

  describe('checkDetails', () => {
    it('includes version and memory info', async () => {
      const originalVersion = process.env.APP_VERSION;
      process.env.APP_VERSION = '1.2.3-test';
      mockPrisma.$queryRawUnsafe.mockResolvedValue([{ 1: 1 }]);

      const result = await healthChecker.checkDetails();

      expect(result.version).toBe('1.2.3-test');
      expect(result).toHaveProperty('memory');
      expect(result.memory).toHaveProperty('heapUsed');
      expect(result.memory).toHaveProperty('heapTotal');
      expect(result.memory).toHaveProperty('rss');

      if (originalVersion) process.env.APP_VERSION = originalVersion;
      else delete process.env.APP_VERSION;
    });

    it('falls back to 0.0.1 when APP_VERSION is not set', async () => {
      const originalVersion = process.env.APP_VERSION;
      delete process.env.APP_VERSION;
      mockPrisma.$queryRawUnsafe.mockResolvedValue([{ 1: 1 }]);

      const result = await healthChecker.checkDetails();

      expect(result.version).toBe('0.0.1');

      if (originalVersion) process.env.APP_VERSION = originalVersion;
    });

    it('includes readiness check results in details', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([{ 1: 1 }]);

      const result = await healthChecker.checkDetails();

      expect(result).toHaveProperty('checks');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
    });
  });
});

describe('HealthController', () => {
  let healthController: HealthController;
  let healthChecker: HealthChecker;

  beforeEach(() => {
    vi.clearAllMocks();
    healthChecker = new HealthChecker(mockPrisma as any);
    healthController = new HealthController(healthChecker);
  });

  describe('healthz', () => {
    it('returns liveness check result', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([{ 1: 1 }]);

      const result = await healthController.healthz();

      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('timestamp');
    });
  });

  describe('readyz', () => {
    it('returns readiness check result', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([{ 1: 1 }]);

      const result = await healthController.readyz();

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('checks');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
    });
  });

  describe('details', () => {
    it('returns full health report with memory and version', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([{ 1: 1 }]);

      const result = await healthController.details();

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('checks');
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('memory');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
    });
  });
});
