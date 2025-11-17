import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MembershipService } from './membership.service';
import { MembershipController } from './membership.controller';
import { MembershipLevelEntity } from './membership-level.entity';
import { MemberEntity } from './member.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MembershipLevelEntity, MemberEntity])],
  providers: [MembershipService],
  controllers: [MembershipController],
  exports: [MembershipService],
})
export class MembershipModule {}
