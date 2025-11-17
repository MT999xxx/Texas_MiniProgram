import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoyaltyTransactionEntity } from './loyalty-transaction.entity';
import { LoyaltyService } from './loyalty.service';
import { MembershipModule } from '../membership/membership.module';

@Module({
  imports: [TypeOrmModule.forFeature([LoyaltyTransactionEntity]), MembershipModule],
  providers: [LoyaltyService],
  exports: [LoyaltyService],
})
export class LoyaltyModule {}
