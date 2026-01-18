import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservationService } from './reservation.service';
import { ReservationController } from './reservation.controller';
import { ReservationEntity } from './reservation.entity';
import { TableModule } from '../tables/table.module';
import { MembershipModule } from '../membership/membership.module';

@Module({
  imports: [TypeOrmModule.forFeature([ReservationEntity]), forwardRef(() => TableModule), MembershipModule],
  providers: [ReservationService],
  controllers: [ReservationController],
  exports: [ReservationService, TypeOrmModule],
})
export class ReservationModule { }
