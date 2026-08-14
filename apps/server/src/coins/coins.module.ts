import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoinsController } from './coins.controller';
import { CoinsService } from './coins.service';
import { WechatPayService } from './wechat-pay.service';
import { CoinTransactionEntity } from './coin-transaction.entity';
import { PointDepositEntity } from './point-deposit.entity';
import { CheckInEntity } from './check-in.entity';
import { WineVoucherBatchEntity } from './wine-voucher-batch.entity';
import { WineVoucherRedeemOptionEntity } from './wine-voucher-redeem-option.entity';
import { WineVoucherRedeemItemEntity } from './wine-voucher-redeem-item.entity';
import { WineVoucherRedemptionEntity } from './wine-voucher-redemption.entity';
import { WineVoucherOptionsController } from './wine-voucher-options.controller';
import { WineVoucherOptionsService } from './wine-voucher-options.service';
import { MemberEntity } from '../membership/member.entity';
import { OrdersModule } from '../orders/orders.module';
import { AdminNotificationsModule } from '../notifications/admin-notifications.module';
import { MembershipModule } from '../membership/membership.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            CoinTransactionEntity,
            PointDepositEntity,
            CheckInEntity,
            WineVoucherBatchEntity,
            WineVoucherRedeemOptionEntity,
            WineVoucherRedeemItemEntity,
            WineVoucherRedemptionEntity,
            MemberEntity,
        ]),
        OrdersModule,
        AdminNotificationsModule,
        MembershipModule,
    ],
    controllers: [CoinsController, WineVoucherOptionsController],
    providers: [CoinsService, WechatPayService, WineVoucherOptionsService],
    exports: [CoinsService, WechatPayService, WineVoucherOptionsService],
})
export class CoinsModule { }

