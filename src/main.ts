import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';

const UPLOADS_DIR = join(process.cwd(), 'uploads');

async function bootstrap() {
  // Ensure uploads directory exists
  mkdirSync(UPLOADS_DIR, { recursive: true });

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api');

  // Increase body size limit to 50 MB — block-forge may store images as base64
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Serve uploaded files at /uploads/* (public, no auth)
  app.useStaticAssets(UPLOADS_DIR, { prefix: '/uploads' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.enableCors({ origin: true });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
