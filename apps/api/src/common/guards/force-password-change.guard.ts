import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const SKIP_FORCE_PASSWORD_CHECK_KEY = 'skipForcePasswordCheck';

@Injectable()
export class ForcePasswordChangeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const skip = this.reflector.getAllAndOverride<boolean>(
      SKIP_FORCE_PASSWORD_CHECK_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skip) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user?.forcePasswordChange) {
      const url = request.url;
      if (
        !url.includes('/auth/change-password') &&
        !url.includes('/auth/logout') &&
        !url.includes('/auth/me')
      ) {
        throw new ForbiddenException({
          success: false,
          statusCode: 403,
          message: 'You must change your password before continuing.',
          error: 'ForcePasswordChange',
          redirect: '/change-password',
        });
      }
    }

    return true;
  }
}

import { SetMetadata } from '@nestjs/common';

export const SkipForcePasswordCheck = () =>
  SetMetadata(SKIP_FORCE_PASSWORD_CHECK_KEY, true);
