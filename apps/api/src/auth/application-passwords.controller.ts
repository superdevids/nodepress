import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApplicationPasswordsService } from './application-passwords.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from './strategies/jwt.strategy';
import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAppPasswordDto {
  @ApiProperty({ example: 'My CLI Tool' })
  @IsString()
  @MinLength(1)
  name!: string;
}

@ApiTags('Application Passwords')
@Controller('users/me/application-passwords')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class ApplicationPasswordsController {
  constructor(private readonly appPasswordsService: ApplicationPasswordsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate a new application password' })
  async create(
    @Body() dto: CreateAppPasswordDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.appPasswordsService.create(user.sub, dto.name);
  }

  @Get()
  @ApiOperation({ summary: 'List all application passwords' })
  async list(@CurrentUser() user: JwtPayload) {
    return this.appPasswordsService.list(user.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke an application password' })
  async revoke(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.appPasswordsService.revoke(user.sub, id);
    return { revoked: true };
  }
}
