import {
  Controller,
  Get,
  Delete,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SessionService } from './session.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from './strategies/jwt.strategy';
import { Request } from 'express';

@ApiTags('Sessions')
@Controller('users/me/sessions')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Get()
  @ApiOperation({ summary: 'List all active sessions' })
  async list(@CurrentUser() user: JwtPayload) {
    return this.sessionService.listForUser(user.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a session' })
  async revoke(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.sessionService.revoke(id, user.sub);
    return { revoked: true };
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke all sessions except current' })
  async revokeAll(@CurrentUser() user: JwtPayload, @Req() req: Request) {
    const currentSessionId = user.sessionId || this.extractSessionFromRequest(req);
    await this.sessionService.revokeAllForUser(user.sub, currentSessionId);
    return { revoked: true };
  }

  private extractSessionFromRequest(req: Request): string | undefined {
    // Fallback: attempt to read session from the x-session-id header
    return req.headers['x-session-id'] as string | undefined;
  }
}
