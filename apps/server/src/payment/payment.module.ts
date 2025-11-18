import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { WechatPayService } from './wechat-pay.service';
import { WechatPayConfigService } from './wechat-pay.config';
import { NotificationService } from './notification.service';
import { PaymentEntity } from './payment.entity';
import { RechargeRecordEntity } from './recharge-record.entity';
import { RechargePackageEntity } from './recharge-package.entity';
import { MemberEntity } from '../membership/member.entity';
import { OrderEntity } from '../orders/order.entity';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PaymentEntity,
      RechargeRecordEntity,
      RechargePackageEntity,
      MemberEntity,
      OrderEntity,
    ]),
    LoyaltyModule,
    OrdersModule,
  ],
  controllers: [PaymentController],
  providers: [
    PaymentService,
    WechatPayService,
    WechatPayConfigService,
    NotificationService,
  ],
  exports: [PaymentService, WechatPayService],
})
export class PaymentModule {}