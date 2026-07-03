import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { ContentResolver } from './resolvers/content.resolver';
import { AuthResolver } from './resolvers/auth.resolver';
import { MediaResolver } from './resolvers/media.resolver';
import { ContentModule } from '../content/content.module';
import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/graphql/schema.gql'),
      sortSchema: true,
      playground: true,
      introspection: true,
      context: ({ req }) => ({ req }),
    }),
    ContentModule,
    AuthModule,
    MediaModule,
  ],
  providers: [ContentResolver, AuthResolver, MediaResolver],
})
export class GraphqlAppModule {}
