import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SecurityAuditService } from '../common/security-audit.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { IsOptional, IsString, IsDateString, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SecurityLogQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  actorId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  targetType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiProperty({ required: false, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

@ApiTags('Security Log')
@Controller('security-log')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class SecurityLogController {
  constructor(private readonly auditService: SecurityAuditService) {}

  @Get()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Query security audit log' })
  async query(@Query() query: SecurityLogQueryDto) {
    return this.auditService.query({
      action: query.action,
      actorId: query.actorId,
      targetType: query.targetType,
      dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
      dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
      limit: query.limit,
      offset: query.offset,
    });
  }
}
