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

  // 配置 CORS - 允许所有来源
  app.enableCors({
    origin: true, // 允许所有来源
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // 静态文件服务 - 用于提供大图片资源
  app.useStaticAssets(join(process.cwd(), 'public'), {
    prefix: '/static/',
  });

  const config = new DocumentBuilder()
    .setTitle('Texas Poker Bar Mini Program API')
    .setDescription('服务型小程序 + 管理后台接口')
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
