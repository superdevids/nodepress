import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { CspService } from './common/csp-config';
import { corsConfigService } from './common/cors-config';
import {
  NODEPRESS_API_PREFIX,
  NODEPRESS_SWAGGER_TITLE,
  NODEPRESS_SWAGGER_DESCRIPTION,
  NODEPRESS_SWAGGER_VERSION,
  NODEPRESS_SWAGGER_PATH,
} from './common/constants';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // CSP Service
  const cspService = app.get(CspService);
  const cspPolicy = cspService.generatePolicy();
  const cspHeaderName = cspService.getHeaderName();

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.use((req: any, res: any, next: any) => {
    res.setHeader(cspHeaderName, cspPolicy);
    next();
  });

  app.use(compression());

  // CORS
  const corsConfig = corsConfigService.getConfig();
  app.enableCors({
    origin: corsConfigService.getOriginPredicate(),
    methods: corsConfig.methods,
    credentials: corsConfig.credentials,
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: corsConfig.maxAge,
  });

  const globalPrefix = process.env.API_PREFIX || NODEPRESS_API_PREFIX;
  app.setGlobalPrefix(globalPrefix);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  app.useGlobalInterceptors(new LoggingInterceptor(), new TransformInterceptor());

  const swaggerConfig = new DocumentBuilder()
    .setTitle(NODEPRESS_SWAGGER_TITLE)
    .setDescription(NODEPRESS_SWAGGER_DESCRIPTION)
    .setVersion(NODEPRESS_SWAGGER_VERSION)
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
    .addServer(process.env.SWAGGER_SERVER_URL || `http://localhost:${process.env.PORT || 3001}`)
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(process.env.SWAGGER_PATH || NODEPRESS_SWAGGER_PATH, app, document, {
    customSiteTitle: NODEPRESS_SWAGGER_TITLE,
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      filter: true,
      showRequestDuration: true,
    },
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);

  logger.log(`NodePress API is running on http://localhost:${port}/${globalPrefix}`);
  logger.log(
    `Swagger docs available at http://localhost:${port}/${process.env.SWAGGER_PATH || NODEPRESS_SWAGGER_PATH}`,
  );
}

bootstrap().catch((err) => {
  console.error('Failed to bootstrap NodePress API', err);
  process.exit(1);
});
