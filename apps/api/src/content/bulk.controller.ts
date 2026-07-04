import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { BulkActionsService } from './bulk-actions.service';
import { BulkActionDto } from './dto/bulk-action.dto';

@ApiTags('Content - Bulk Actions')
@Controller('content/bulk')
export class BulkActionsController {
  constructor(private readonly bulkService: BulkActionsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'EDITOR')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Execute bulk action on content entries' })
  async bulkAction(@Body() dto: BulkActionDto) {
    return this.bulkService.execute(dto);
  }
}
