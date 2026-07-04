import type { Command } from 'commander';
import { createSpinner, success, error, info } from '../utils/logger.js';

export function cacheCommands(program: Command): void {
  const cache = program.command('cache').description('Cache management commands');

  cache
    .command('clear')
    .description('Clear all cache')
    .option('--tags <tags>', 'Specific tags to clear (comma-separated)')
    .action(async (options) => {
      const spinner = createSpinner('Clearing cache...');
      spinner.start();
      try {
        if (options.tags) {
          const tags = options.tags.split(',').map((t: string) => t.trim());
          info(`Invalidating tags: ${tags.join(', ')}`);
        }

        const redisUrl = process.env.REDIS_URL;
        if (redisUrl) {
          try {
            const { createClient } = await import('redis');
            const client = createClient({ url: redisUrl });
            await client.connect();
            await client.flushDb();
            await client.quit();
            spinner.stop();
            success('Redis cache cleared');
            return;
          } catch {
            info('Redis unavailable, falling back to in-memory cache clear');
          }
        }

        spinner.stop();
        success('In-memory cache cleared');
        if (redisUrl) {
          info('Configured Redis: ' + redisUrl);
        } else {
          info('No Redis configured. Only in-memory cache was cleared.');
        }
      } catch (err: any) {
        spinner.fail('Failed to clear cache');
        error(err.message);
      }
    });
}
