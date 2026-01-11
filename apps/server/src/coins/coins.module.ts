import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoinsController } from './coins.controller';
import { CoinsService } from './coins.service';
import { WechatPayService } from './wechat-pay.service';
import { CoinTransactionEntity } from './coin-transaction.entity';
import { PointDepositEntity } from './point-deposit.entity';
import { MemberEntity } from '../membership/member.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            CoinTransactionEntity,
            PointDepositEntity,
            MemberEntity,
        ]),
    ],
    controllers: [CoinsController],
    providers: [CoinsService, WechatPayService],
    exports: [CoinsService, WechatPayService],
})
export class CoinsModule { }
