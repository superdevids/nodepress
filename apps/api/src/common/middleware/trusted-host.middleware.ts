import {
  Injectable,
  NestMiddleware,
  ForbiddenException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TRUSTED_HOSTS_DEFAULT } from '../constants';

/**
 * Validates the incoming Host header against a whitelist of
 * trusted origins to prevent host header injection attacks.
 */
@Injectable()
export class TrustedHostMiddleware implements NestMiddleware {
  private readonly trustedHosts: string[] =
    process.env.TRUSTED_HOSTS?.split(',') ?? TRUSTED_HOSTS_DEFAULT;

  use(req: Request, _res: Response, next: NextFunction) {
    const host = req.hostname;

    // Allow loopback addresses unconditionally
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host.startsWith('192.168.') ||
      host.startsWith('10.')
    ) {
      next();
      return;
    }

    const isTrusted = this.trustedHosts.some(
      (trusted) =>
        host === trusted || host.endsWith(`.${trusted}`),
    );

    if (!isTrusted) {
      throw new ForbiddenException(`Untrusted host: ${host}`);
    }

    next();
  }
}
