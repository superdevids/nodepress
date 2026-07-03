import {
  Injectable,
  NestMiddleware,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Maintenance mode middleware.
 *
 * When enabled (via env or config service) all incoming requests
 * return 503 Service Unavailable except those carrying the
 * configured bypass header (e.g. X-NodePress-Maintenance).
 */
@Injectable()
export class MaintenanceMiddleware implements NestMiddleware {
  private readonly maintenanceMode =
    process.env.NODEPRESS_MAINTENANCE_MODE === 'true';
  private readonly bypassHeader = 'X-NodePress-Maintenance';
  private readonly bypassToken = process.env.NODEPRESS_MAINTENANCE_TOKEN ?? '';

  use(_req: Request, _res: Response, next: NextFunction) {
    if (!this.maintenanceMode) {
      next();
      return;
    }

    const providedToken = _req.headers[this.bypassHeader.toLowerCase()] as
      | string
      | undefined;

    if (providedToken && providedToken === this.bypassToken) {
      next();
      return;
    }

    throw new ServiceUnavailableException(
      'Service is temporarily unavailable due to maintenance.',
    );
  }
}
