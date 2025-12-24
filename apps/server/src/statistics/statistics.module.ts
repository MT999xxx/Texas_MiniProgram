import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservationEntity } from '../reservation/reservation.entity';
import { OrderEntity } from '../orders/order.entity';
import { StatisticsService } from './statistics.service';
import { StatisticsController } from './statistics.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([ReservationEntity, OrderEntity]),
    ],
    controllers: [StatisticsController],
    providers: [StatisticsService],
    exports: [StatisticsService],
})
export class StatisticsModule { }
