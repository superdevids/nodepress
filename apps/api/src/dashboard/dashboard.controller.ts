import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('at-a-glance')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get at-a-glance content counts' })
  async atAGlance() {
    return this.dashboardService.getAtAGlance();
  }

  @Get('activity')
  @Roles('ADMIN', 'SUPER_ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Get recent activity log' })
  async recentActivity() {
    return this.dashboardService.getRecentActivity();
  }

  @Get('activity/:limit')
  @Roles('ADMIN', 'SUPER_ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Get recent activity log with limit' })
  async recentActivityWithLimit(@Param('limit', ParseIntPipe) limit: number) {
    return this.dashboardService.getRecentActivity(limit);
  }

  @Get('quick-draft')
  @Roles('ADMIN', 'SUPER_ADMIN', 'EDITOR', 'AUTHOR')
  @ApiOperation({ summary: 'Get quick draft statistics' })
  async quickDraft() {
    return this.dashboardService.getQuickDraftStats();
  }

  @Get('news')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get NodePress news feed' })
  async news() {
    return this.dashboardService.getNodePressNews();
  }

  @Get('site-health')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get site health status' })
  async siteHealth() {
    return this.dashboardService.getSiteHealth();
  }
}
