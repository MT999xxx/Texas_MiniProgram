import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservationEntity } from '../reservation/reservation.entity';
import { OrderEntity } from '../orders/order.entity';
import { OrderItemEntity } from '../orders/order-item.entity';
import { MemberEntity } from '../membership/member.entity';
import { StatisticsService } from './statistics.service';
import { StatisticsController } from './statistics.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([ReservationEntity, OrderEntity, OrderItemEntity, MemberEntity]),
    ],
    controllers: [StatisticsController],
    providers: [StatisticsService],
    exports: [StatisticsService],
})
export class StatisticsModule { }
