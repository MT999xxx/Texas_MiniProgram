import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import dotenv from 'dotenv';
import { AppModule } from './modules/app.module';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

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
