import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrderEntity } from './order.entity';
import { OrderItemEntity } from './order-item.entity';
import { MenuItemEntity } from '../menu/menu-item.entity';
import { ReservationEntity } from '../reservation/reservation.entity';
import { TableEntity } from '../tables/table.entity';
import { UserCouponEntity } from '../coupons/user-coupon.entity';
import { TableModule } from '../tables/table.module';
import { ReservationModule } from '../reservation/reservation.module';
import { MembershipModule } from '../membership/membership.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { MenuModule } from '../menu/menu.module';
import { CouponsModule } from '../coupons/coupons.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrderEntity,
      OrderItemEntity,
      MenuItemEntity,
      ReservationEntity,
      TableEntity,
      UserCouponEntity
    ]),
    TableModule,
    ReservationModule,
    MembershipModule,
    LoyaltyModule,
    MenuModule,
    CouponsModule,
  ],
  providers: [OrdersService],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}
