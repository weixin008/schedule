import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { seedDatabase } from './database/seed';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: 'http://localhost:9010',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true
  });
  app.useGlobalPipes(new ValidationPipe());
  app.setGlobalPrefix('api');

  // 获取数据源并执行数据库初始化
  const dataSource = app.get(DataSource);
  await seedDatabase(dataSource);

  const port = process.env.PORT ?? 9020;
  await app.listen(port);
}
bootstrap();
