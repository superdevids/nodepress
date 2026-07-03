import { Global, Module } from '@nestjs/common';
import { ConfigService } from './config.service';

/**
 * Global configuration module.
 *
 * Makes ConfigService available application-wide without
 * requiring explicit imports in every feature module.
 */
@Global()
@Module({
  providers: [
    {
      provide: ConfigService,
      useFactory: () => new ConfigService(),
    },
  ],
  exports: [ConfigService],
})
export class ConfigModule {}
