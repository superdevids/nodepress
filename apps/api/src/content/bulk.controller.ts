import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BulkActionsService } from './bulk-actions.service';
import { BulkActionDto } from './dto/bulk-action.dto';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { Request } from 'express';

@ApiTags('Content - Bulk Actions')
@Controller('content/bulk')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN', 'EDITOR')
@ApiBearerAuth()
export class BulkActionsController {
  constructor(private readonly bulkService: BulkActionsService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Execute bulk action on content entries',
    description:
      'Processes up to 100 items synchronously. Larger batches are queued for async processing via BullMQ. Returns per-item error details on failures.',
  })
  async bulkAction(
    @Body() dto: BulkActionDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.bulkService.execute(
      dto,
      { sub: user.sub, role: user.role, permissions: user.permissions },
      {
        ipAddress: (req.headers['x-forwarded-for'] as string) || req.ip,
        userAgent: req.headers['user-agent'],
      },
    );
  }
}
