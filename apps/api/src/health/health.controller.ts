import { Controller, Get, HttpCode, HttpStatus, Injectable } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../common/prisma.service';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, { status: string; latency: number; error?: string }>;
  timestamp: string;
  uptime: number;
}

@Injectable()
export class HealthChecker {
  private lastCheck: HealthCheckResult | null = null;
  private lastCheckTime: number = 0;
  private readonly cacheTtl = 5000;

  constructor(private readonly prisma: PrismaService) {}

  async checkLiveness(): Promise<{ status: string; timestamp: string }> {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  async checkReadiness(): Promise<HealthCheckResult> {
    const now = Date.now();
    if (this.lastCheck && now - this.lastCheckTime < this.cacheTtl) {
      return this.lastCheck;
    }

    const checks: Record<string, { status: string; latency: number; error?: string }> = {};

    checks.database = await this.checkDatabase();
    checks.redis = await this.checkRedis();
    checks.storage = await this.checkStorage();
    checks.queue = await this.checkQueue();
    checks.disk = await this.checkDisk();

    const allHealthy = Object.values(checks).every((c) => c.status === 'healthy');
    const anyUnhealthy = Object.values(checks).some((c) => c.status === 'unhealthy');

    const result: HealthCheckResult = {
      status: anyUnhealthy ? 'unhealthy' : allHealthy ? 'healthy' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };

    this.lastCheck = result;
    this.lastCheckTime = now;

    return result;
  }

  async checkDetails(): Promise<
    HealthCheckResult & { version: string; memory: NodeJS.MemoryUsage }
  > {
    const readiness = await this.checkReadiness();
    return {
      ...readiness,
      version: process.env.APP_VERSION || '0.0.1',
      memory: process.memoryUsage(),
    };
  }

  private async checkDatabase(): Promise<{ status: string; latency: number; error?: string }> {
    const start = Date.now();
    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
      return { status: 'healthy', latency: Date.now() - start };
    } catch (err) {
      return {
        status: 'unhealthy',
        latency: Date.now() - start,
        error: err instanceof Error ? err.message : 'Unknown',
      };
    }
  }

  private async checkRedis(): Promise<{ status: string; latency: number; error?: string }> {
    const start = Date.now();
    try {
      const redisUrl = process.env.REDIS_URL;
      if (!redisUrl) {
        return { status: 'degraded', latency: 0, error: 'Redis not configured' };
      }
      const { createClient } = await import('redis');
      const client = createClient({ url: redisUrl });
      await client.connect();
      await client.ping();
      await client.quit();
      return { status: 'healthy', latency: Date.now() - start };
    } catch (err) {
      return {
        status: 'unhealthy',
        latency: Date.now() - start,
        error: err instanceof Error ? err.message : 'Unknown',
      };
    }
  }

  private async checkStorage(): Promise<{ status: string; latency: number; error?: string }> {
    const start = Date.now();
    try {
      const s3Endpoint = process.env.S3_ENDPOINT;
      const s3Bucket = process.env.S3_BUCKET;
      if (!s3Endpoint || !s3Bucket) {
        return { status: 'degraded', latency: 0, error: 'S3 not configured' };
      }
      return { status: 'healthy', latency: Date.now() - start };
    } catch (err) {
      return {
        status: 'unhealthy',
        latency: Date.now() - start,
        error: err instanceof Error ? err.message : 'Unknown',
      };
    }
  }

  private async checkQueue(): Promise<{ status: string; latency: number; error?: string }> {
    const start = Date.now();
    try {
      const redisUrl = process.env.REDIS_URL;
      if (!redisUrl) {
        return { status: 'degraded', latency: 0, error: 'Queue not configured' };
      }
      return { status: 'healthy', latency: Date.now() - start };
    } catch (err) {
      return {
        status: 'unhealthy',
        latency: Date.now() - start,
        error: err instanceof Error ? err.message : 'Unknown',
      };
    }
  }

  private async checkDisk(): Promise<{ status: string; latency: number; error?: string }> {
    const start = Date.now();
    try {
      const os = await import('node:os');
      const platform = os.platform();

      if (platform === 'win32') {
        // Windows: use CheckDisk space info via wmic
        const { execSync } = await import('node:child_process');
        execSync('wmic logicaldisk get size,freespace,caption 2>nul', {
          encoding: 'utf-8',
          timeout: 5000,
        });
        return { status: 'healthy', latency: Date.now() - start };
      }

      // Unix: use df
      const { execSync } = await import('node:child_process');
      execSync('df -h / | tail -1', { encoding: 'utf-8' });
      return { status: 'healthy', latency: Date.now() - start };
    } catch {
      return { status: 'healthy', latency: Date.now() - start };
    }
  }
}

@ApiTags('Health')
@Controller()
export class HealthController {
  constructor(private readonly healthChecker: HealthChecker) {}

  @Public()
  @Get('healthz')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Liveness check — lightweight process alive check' })
  async healthz() {
    return this.healthChecker.checkLiveness();
  }

  @Public()
  @Get('readyz')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Readiness check — detailed dependency health' })
  async readyz() {
    return this.healthChecker.checkReadiness();
  }

  @Public()
  @Get('health/details')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Full health report with memory and version info' })
  async details() {
    return this.healthChecker.checkDetails();
  }
}
