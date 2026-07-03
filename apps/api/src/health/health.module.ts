import { Module } from '@nestjs/common';
import { HealthController, HealthChecker } from './health.controller';

@Module({
  controllers: [HealthController],
  providers: [HealthChecker],
})
export class HealthModule {}
