import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '../config/config.module';
import { ConfigService } from '../config/config.service';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { ApplicationPasswordsService } from './application-passwords.service';
import { ApplicationPasswordsController } from './application-passwords.controller';
import { PasswordResetService } from './password-reset.service';
import { PasswordResetController } from './password-reset.controller';
import { TwoFactorService } from './two-factor.service';
import { TwoFactorController } from './two-factor.controller';
import { SessionService } from './session.service';
import { SessionController } from './session.controller';
import { PasswordPolicyService } from './password-policy.service';
import { RecoveryService } from './recovery.controller';
import { RecoveryController } from './recovery.controller';
import { SecurityLogController } from './security-log.controller';
import { SecurityAuditService } from '../common/security-audit.service';
import { RateLimitDetailService } from '../common/rate-limit-detail.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET environment variable is required');
        }
        return {
          secret,
          signOptions: {
            issuer: 'nodepress',
          },
        };
      },
    }),
    ConfigModule,
    UsersModule,
  ],
  controllers: [
    AuthController,
    ApplicationPasswordsController,
    PasswordResetController,
    TwoFactorController,
    SessionController,
    RecoveryController,
    SecurityLogController,
  ],
  providers: [
    AuthService,
    JwtStrategy,
    LocalStrategy,
    ApplicationPasswordsService,
    PasswordResetService,
    TwoFactorService,
    SessionService,
    PasswordPolicyService,
    RecoveryService,
    SecurityAuditService,
    RateLimitDetailService,
  ],
  exports: [
    AuthService,
    JwtModule,
    ApplicationPasswordsService,
    PasswordResetService,
    SessionService,
    PasswordPolicyService,
    SecurityAuditService,
    RateLimitDetailService,
  ],
})
export class AuthModule {}
