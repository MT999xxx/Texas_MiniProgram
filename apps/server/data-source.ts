import 'reflect-metadata';
import dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { TableEntity } from './src/tables/table.entity';
import { ReservationEntity } from './src/reservation/reservation.entity';
import { MenuCategoryEntity } from './src/menu/menu-category.entity';
import { MenuItemEntity } from './src/menu/menu-item.entity';
import { MembershipLevelEntity } from './src/membership/membership-level.entity';
import { MemberEntity } from './src/membership/member.entity';
import { OrderEntity } from './src/orders/order.entity';
import { OrderItemEntity } from './src/orders/order-item.entity';
import { LoyaltyTransactionEntity } from './src/loyalty/loyalty-transaction.entity';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'password',
  database: process.env.DB_NAME || 'texas_mp',
  synchronize: false,
  migrations: ['src/migrations/*.ts'],
  entities: [
    TableEntity,
    ReservationEntity,
    MenuCategoryEntity,
    MenuItemEntity,
    MembershipLevelEntity,
    MemberEntity,
    OrderEntity,
    OrderItemEntity,
    LoyaltyTransactionEntity,
  ],
});

export default AppDataSource;
