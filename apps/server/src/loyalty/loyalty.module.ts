import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoyaltyTransactionEntity } from './loyalty-transaction.entity';
import { ChampionRankingEntity } from './champion-ranking.entity';
import { LoyaltyService } from './loyalty.service';
import { LoyaltyController } from './loyalty.controller';
import { MemberEntity } from '../membership/member.entity';
import { MembershipModule } from '../membership/membership.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LoyaltyTransactionEntity, MemberEntity, ChampionRankingEntity]),
    MembershipModule
  ],
  providers: [LoyaltyService],
  controllers: [LoyaltyController],
  exports: [LoyaltyService],
})
export class LoyaltyModule {}
