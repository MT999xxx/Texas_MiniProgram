import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservationModule } from '../reservation/reservation.module';
import { TableModule } from '../tables/table.module';
import { MenuModule } from '../menu/menu.module';
import { MembershipModule } from '../membership/membership.module';
import { OrdersModule } from '../orders/orders.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { RedisModule } from '../redis/redis.module';
import { AuthModule } from '../auth/auth.module';
import { databaseConfig } from '../config/database.config';

@Module({
  imports: [
    TypeOrmModule.forRoot(databaseConfig),
    RedisModule,
    AuthModule,
    ReservationModule,
    TableModule,
    MenuModule,
    MembershipModule,
    OrdersModule,
    LoyaltyModule,
  ],
})
export class AppModule {}
