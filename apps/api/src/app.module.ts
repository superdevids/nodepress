import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

import { ContentModule } from './content/content.module';
import { CommentsModule } from './comments/comments.module';
import { MediaModule } from './media/media.module';
import { TaxonomyModule } from './taxonomy/taxonomy.module';
import { SeoModule } from './seo/seo.module';

import { ConfigModule } from './config/config.module';
import { HealthModule } from './health/health.module';
import { InstallModule } from './install/install.module';
import { FeedsModule } from './feeds/feeds.module';
import { SearchModule } from './search/search.module';
import { MenusModule } from './menus/menus.module';
import { PluginsModule } from './plugins/plugins.module';
import { ThemesModule } from './themes/themes.module';
import { SettingsModule } from './settings/settings.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { OEmbedModule } from './oembed/oembed.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AdminMenuModule } from './admin/admin-menu.module';
import { GraphqlAppModule } from './graphql/graphql.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PrismaModule } from './common/prisma.module';
import { WorkerModule } from './worker/worker.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { CapabilitiesGuard } from './common/guards/capabilities.guard';
import { ForcePasswordChangeGuard } from './common/guards/force-password-change.guard';
import { TrustedHostMiddleware } from './common/middleware/trusted-host.middleware';
import { RateLimitMiddleware } from './common/middleware/rate-limit.middleware';
import { MaintenanceMiddleware } from './common/middleware/maintenance.middleware';
import { InstallCheckMiddleware } from './common/middleware/install-check.middleware';

@Module({
  imports: [
    // Global infrastructure
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 60,
    }]),

    // Core
    PrismaModule,
    ConfigModule,

    // Auth & Users
    AuthModule,
    UsersModule,

    // Content
    ContentModule,
    CommentsModule,
    MediaModule,
    TaxonomyModule,
    SeoModule,

    // System
    HealthModule,
    InstallModule,
    FeedsModule,
    SearchModule,
    MenusModule,
    PluginsModule,
    ThemesModule,
    SettingsModule,
    WebhooksModule,
    OEmbedModule,
    DashboardModule,
    AdminMenuModule,
    GraphqlAppModule,
    NotificationsModule,

    // Background Workers (cron, scheduled actions)
    WorkerModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: CapabilitiesGuard },
    { provide: APP_GUARD, useClass: ForcePasswordChangeGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        TrustedHostMiddleware,
        RateLimitMiddleware,
        MaintenanceMiddleware,
        InstallCheckMiddleware,
      )
      .forRoutes('*');
  }
}
