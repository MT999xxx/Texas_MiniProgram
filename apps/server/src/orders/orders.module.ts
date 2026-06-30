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
import { MemberEntity } from '../membership/member.entity';
import { CoinTransactionEntity } from '../coins/coin-transaction.entity';
import { WineVoucherBatchEntity } from '../coins/wine-voucher-batch.entity';
import { PaymentEntity } from '../payment/payment.entity';
import { TableModule } from '../tables/table.module';
import { ReservationModule } from '../reservation/reservation.module';
import { MembershipModule } from '../membership/membership.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { MenuModule } from '../menu/menu.module';
import { CouponsModule } from '../coupons/coupons.module';
import { PaymentModule } from '../payment/payment.module';
import { AdminNotificationsModule } from '../notifications/admin-notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrderEntity,
      OrderItemEntity,
      MenuItemEntity,
      ReservationEntity,
      TableEntity,
      UserCouponEntity,
      MemberEntity,
      CoinTransactionEntity,
      WineVoucherBatchEntity,
      PaymentEntity,
    ]),
    TableModule,
    ReservationModule,
    MembershipModule,
    LoyaltyModule,
    MenuModule,
    CouponsModule,
    PaymentModule,
    AdminNotificationsModule,
  ],
  providers: [OrdersService],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule { }
