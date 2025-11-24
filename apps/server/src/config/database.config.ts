import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import dotenv from 'dotenv';

dotenv.config();

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'mysql',
  host: process.env.DB_HOST || '127.0.0.1',  // 修复：127.00.1 → 127.0.0.1
  port: Number(process.env.DB_PORT || 3306),
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'password',
  database: process.env.DB_NAME || 'texas_mp',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: true, // 开发环境启用，自动同步schema
  // migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  logging: process.env.NODE_ENV === 'development',
};
