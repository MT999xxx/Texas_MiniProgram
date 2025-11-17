import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrderEntity } from './order.entity';
import { OrderItemEntity } from './order-item.entity';
import { MenuItemEntity } from '../menu/menu-item.entity';
import { ReservationEntity } from '../reservation/reservation.entity';
import { TableEntity } from '../tables/table.entity';
import { TableModule } from '../tables/table.module';
import { ReservationModule } from '../reservation/reservation.module';
import { MembershipModule } from '../membership/membership.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { MenuModule } from '../menu/menu.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderEntity, OrderItemEntity, MenuItemEntity, ReservationEntity, TableEntity]),
    TableModule,
    ReservationModule,
    MembershipModule,
    LoyaltyModule,
    MenuModule,
  ],
  providers: [OrdersService],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}
