import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { SkipForcePasswordCheck } from '../common/guards/force-password-change.guard';
import { JwtPayload } from './strategies/jwt.strategy';
import { Request } from 'express';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user account' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @UseGuards(AuthGuard('local'))
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate and receive JWT tokens' })
  async login(
    @Body() dto: LoginDto,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.login(dto, ipAddress, userAgent);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh an expired access token' })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.refresh(dto.refreshToken, ipAddress, userAgent);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Return the currently authenticated user' })
  async me(@CurrentUser() payload: JwtPayload) {
    return this.authService.getProfile(payload.sub);
  }

  @SkipForcePasswordCheck()
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change current password' })
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() payload: JwtPayload,
  ) {
    return this.authService.changePassword(
      payload.sub,
      dto.currentPassword,
      dto.newPassword,
    );
  }
}
