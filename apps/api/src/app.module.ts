import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { ContentModule } from './content/content.module';
import { CommentsModule } from './comments/comments.module';
import { MediaModule } from './media/media.module';
import { ConfigModule } from './config/config.module';
import { HealthModule } from './health/health.module';
import { InstallModule } from './install/install.module';
import { FeedsModule } from './feeds/feeds.module';
import { SearchModule } from './search/search.module';
import { MenusModule } from './menus/menus.module';
import { TaxonomyModule } from './taxonomy/taxonomy.module';
import { PluginsModule } from './plugins/plugins.module';
import { ThemesModule } from './themes/themes.module';
import { SettingsModule } from './settings/settings.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { OEmbedModule } from './oembed/oembed.module';
import { SeoModule } from './seo/seo.module';
import { UsersModule } from './users/users.module';
import { GraphqlAppModule } from './graphql/graphql.module';
import { PrismaModule } from './common/prisma.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { ForcePasswordChangeGuard } from './common/guards/force-password-change.guard';
import { CorsMiddleware } from './common/middleware/cors.middleware';
import { TrustedHostMiddleware } from './common/middleware/trusted-host.middleware';
import { RateLimitMiddleware } from './common/middleware/rate-limit.middleware';
import { MaintenanceMiddleware } from './common/middleware/maintenance.middleware';
import { InstallCheckMiddleware } from './common/middleware/install-check.middleware';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    AuthModule,
    UsersModule,
    ContentModule,
    CommentsModule,
    MediaModule,
    HealthModule,
    InstallModule,
    FeedsModule,
    SearchModule,
    MenusModule,
    TaxonomyModule,
    PluginsModule,
    ThemesModule,
    SettingsModule,
    WebhooksModule,
    OEmbedModule,
    SeoModule,
    GraphqlAppModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ForcePasswordChangeGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        CorsMiddleware,
        TrustedHostMiddleware,
        RateLimitMiddleware,
        MaintenanceMiddleware,
        InstallCheckMiddleware,
      )
      .forRoutes('*');
  }
}
