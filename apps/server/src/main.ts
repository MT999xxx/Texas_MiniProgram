import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import dotenv from 'dotenv';
import { AppModule } from './modules/app.module';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Enable CORS for admin and mini-program API requests.
  app.enableCors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Serve uploaded/static assets.
  app.useStaticAssets(join(process.cwd(), 'public'), {
    prefix: '/static/',
  });

  const config = new DocumentBuilder()
    .setTitle('Texas Poker Bar Mini Program API')
    .setDescription('Texas bar mini-program and admin API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`API server running on http://localhost:${port}`);
  // eslint-disable-next-line no-console
  console.log(`Swagger UI available at http://localhost:${port}/docs`);
}

bootstrap();
