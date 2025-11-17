import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import dotenv from 'dotenv';

dotenv.config();

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'mysql',
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'password',
  database: process.env.DB_NAME || 'texas_mp',
  autoLoadEntities: true,
  synchronize: false,
  migrationsRun: false,
};
