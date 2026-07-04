import { Controller, Get, Post, Patch, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List notifications for the current user' })
  @ApiQuery({ name: 'limit', required: false, example: '20' })
  @ApiQuery({ name: 'offset', required: false, example: '0' })
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query('limit') limit = '20',
    @Query('offset') offset = '0',
  ) {
    return this.service.findByUser(user.sub, parseInt(limit, 10), parseInt(offset, 10));
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async unreadCount(@CurrentUser() user: JwtPayload) {
    const count = await this.service.getUnreadCount(user.sub);
    return { count };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a single notification as read' })
  async markRead(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.service.markAsRead(id, user.sub);
    return { success: true };
  }

  @Post('mark-all-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllRead(@CurrentUser() user: JwtPayload) {
    await this.service.markAllAsRead(user.sub);
    return { success: true };
  }
}
