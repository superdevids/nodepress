import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { isInstalled } from '@nodepressjs/core/config/config-generator';

/**
 * Install Check Middleware
 *
 * If NodePress has not been installed yet (no config/nodepress.config.json),
 * all API requests (except /api/install/*) return a 400 InstallRequired error.
 *
 * The frontend (Next.js admin) will detect this and redirect the user to /install.
 */
@Injectable()
export class InstallCheckMiddleware implements NestMiddleware {
  private readonly logger = new Logger(InstallCheckMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    // Skip install check if .env file exists (advanced/production mode)
    if (process.env.NODEPRESS_SKIP_INSTALL_CHECK === 'true' || process.env.DATABASE_URL) {
      next();
      return;
    }

    // Always allow install API routes and static assets
    const path = req.baseUrl || req.path;
    if (
      path.startsWith('/api/install') ||
      path.startsWith('/install') ||
      path.startsWith('/_next') ||
      path.startsWith('/static') ||
      path.startsWith('/favicon') ||
      path.startsWith('/api/health')
    ) {
      next();
      return;
    }

    // Check if installed
    const installed = isInstalled();

    if (!installed) {
      // Return JSON for API requests, redirect for browser
      if (path.startsWith('/api/')) {
        res.status(400).json({
          success: false,
          statusCode: 400,
          message: 'NodePress is not installed. Please run the installer at /install.',
          error: 'Install Required',
          installUrl: '/install',
        });
        return;
      }

      // For non-API requests (e.g. admin pages that aren't /install)
      res.redirect('/install');
      return;
    }

    next();
  }
}
