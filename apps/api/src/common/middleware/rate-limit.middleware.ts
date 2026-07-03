import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX } from '../constants';
import { RateLimitDetailService, RateLimitConfig } from '../rate-limit-detail.service';

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly limiter = rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || RATE_LIMIT_WINDOW_MS,
    max: Number(process.env.RATE_LIMIT_MAX) || RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      statusCode: 429,
      message: 'Too many requests — please slow down.',
      error: 'ThrottleException',
    },
  });

  constructor(private readonly rateLimitDetail: RateLimitDetailService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const user = (req as any).user;

    if (req.path?.includes('/auth/login')) {
      const identifier = user?.sub || ip;
      this.rateLimitDetail.check(identifier, 'login').then((result) => {
        if (!result.allowed) {
          res.status(429).json({
            success: false,
            statusCode: 429,
            message: `Too many login attempts. Retry after ${result.retryAfter}s.`,
            error: 'ThrottleException',
            retryAfter: result.retryAfter,
            requiresCaptcha: result.requiresCaptcha,
          });
          return;
        }
        this.limiter(req, res, next);
      });
      return;
    }

    if (user?.sub) {
      const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
      const action = isMutation ? 'api.create' : 'api.read';
      this.rateLimitDetail.check(user.sub, action).then((result) => {
        res.setHeader('X-RateLimit-Remaining', result.remaining);
        res.setHeader('X-RateLimit-Reset', result.retryAfter.toString());
        if (!result.allowed) {
          res.status(429).json({
            success: false,
            statusCode: 429,
            message: `Rate limit exceeded. Retry after ${result.retryAfter}s.`,
            error: 'ThrottleException',
            retryAfter: result.retryAfter,
          });
          return;
        }
        this.limiter(req, res, next);
      });
      return;
    }

    this.limiter(req, res, next);
  }
}
