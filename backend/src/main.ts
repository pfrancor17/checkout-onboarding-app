import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import {
  API_DOCS_PATH,
  GLOBAL_PREFIX,
  GLOBAL_PREFIX_OPTIONS,
} from './shared/infrastructure/http/global-prefix';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.use(helmet());
  app.enableCors({
    origin: config
      .get<string>('CORS_ORIGIN', '')
      .split(',')
      .map((origin) => origin.trim()),
  });
  app.setGlobalPrefix(GLOBAL_PREFIX, GLOBAL_PREFIX_OPTIONS);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Checkout Onboarding API')
    .setDescription('Products, stock, customers, transactions and deliveries.')
    .setVersion('1.0')
    .build();
  SwaggerModule.setup(
    API_DOCS_PATH,
    app,
    SwaggerModule.createDocument(app, swaggerConfig),
  );

  await app.listen(config.get<number>('PORT', 3000));
}

void bootstrap();
