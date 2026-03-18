import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PaymentEntity, RechargeRecordEntity, RechargePackageEntity } from './payment.entity';
import { WechatPayService } from './wechat-pay.service';
import { WechatPayConfigService } from './wechat-pay.config';
import { MemberEntity } from '../membership/member.entity';
import { OrderEntity } from '../orders/order.entity';
import { ReservationEntity } from '../reservation/reservation.entity';
import { NotificationService } from './notification.service';
import { CoinTransactionEntity } from '../coins/coin-transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PaymentEntity,
      RechargeRecordEntity,
      RechargePackageEntity,
      MemberEntity,
      OrderEntity,
      ReservationEntity,
      CoinTransactionEntity,
    ]),
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
export class PaymentModule { }