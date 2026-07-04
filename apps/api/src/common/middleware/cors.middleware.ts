/**
 * @deprecated This middleware is no longer part of the active middleware chain.
 * CORS is now handled globally via the NestJS CORS configuration in main.ts
 * (or via cors.config.ts). This file is kept only as a reference artifact
 * and should be removed once all references are confirmed cleared.
 *
 * See: apps/api/src/cors.config.ts or the `app.enableCors()` call in main.ts
 */
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * CORS middleware that applies per-request CORS headers.
 *
 * For a centralised CORS config see `cors.config.ts`.
 *
 * @deprecated CORS is now configured globally. This class is no longer registered.
 */
@Injectable()
export class CorsMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const origin = req.headers.origin || '*';

    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With, X-Correlation-ID',
    );
    res.setHeader('Access-Control-Expose-Headers', 'X-Correlation-ID');
    res.setHeader('Access-Control-Max-Age', '86400');

    // Handle preflight
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }

    next();
  }
}
