import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { Request } from 'express';
import { ContentResolver } from './resolvers/content.resolver';
import { AuthResolver } from './resolvers/auth.resolver';
import { MediaResolver } from './resolvers/media.resolver';
import { ContentModule } from '../content/content.module';
import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { UsersModule } from '../users/users.module';
import { ConfigModule } from '../config/config.module';
import { ConfigService } from '../config/config.service';

@Module({
  imports: [
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProduction = config.get<string>('NODE_ENV') === 'production';
        return {
          autoSchemaFile: join(process.cwd(), 'src/graphql/schema.gql'),
          sortSchema: true,
          playground: !isProduction,
          introspection: !isProduction,
          context: ({ req }: { req: Request }) => ({ req }),
        };
      },
    }),
    ContentModule,
    AuthModule,
    MediaModule,
    UsersModule,
  ],
  providers: [ContentResolver, AuthResolver, MediaResolver],
})
export class GraphqlAppModule {}
