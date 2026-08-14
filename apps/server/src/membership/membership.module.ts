import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MembershipService } from './membership.service';
import { MembershipController } from './membership.controller';
import { MembershipLevelEntity } from './membership-level.entity';
import { MemberEntity } from './member.entity';
import { MembershipRewardGrantEntity } from './membership-reward-grant.entity';
import { MembershipRewardService } from './membership-reward.service';
import { CoinTransactionEntity } from '../coins/coin-transaction.entity';
import { WineVoucherBatchEntity } from '../coins/wine-voucher-batch.entity';
import { LoyaltyTransactionEntity } from '../loyalty/loyalty-transaction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([
    MembershipLevelEntity,
    MemberEntity,
    MembershipRewardGrantEntity,
    CoinTransactionEntity,
    WineVoucherBatchEntity,
    LoyaltyTransactionEntity,
  ])],
  providers: [MembershipService, MembershipRewardService],
  controllers: [MembershipController],
  exports: [MembershipService, MembershipRewardService],
})
export class MembershipModule {}
