import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { ReservationEntity, ReservationStatus } from '../reservation/reservation.entity';
import { OrderEntity, OrderStatus } from '../orders/order.entity';

@Injectable()
export class StatisticsService {
    constructor(
        @InjectRepository(ReservationEntity)
        private readonly reservationRepository: Repository<ReservationEntity>,
        @InjectRepository(OrderEntity)
        private readonly orderRepository: Repository<OrderEntity>,
    ) { }

    async getDashboardSummary() {
        const today = new Date();

        // 手动计算今日零点和午夜，避免依赖 date-fns
        const start = new Date(today);
        start.setHours(0, 0, 0, 0);

        const end = new Date(today);
        end.setHours(23, 59, 59, 999);

        // 1. 今日预约数 (PENDING, CONFIRMED, CHECKED_IN)
        const totalReservations = await this.reservationRepository.count({
            where: {
                reservedAt: Between(start, end),
                status: In([ReservationStatus.PENDING, ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN]),
            },
        });

        // 2. 会员来店数 (今日有预约且状态为 CONFIRMED 或 CHECKED_IN 的唯一会员)
        const visitsQuery = await this.reservationRepository
            .createQueryBuilder('reservation')
            .select('COUNT(DISTINCT reservation.memberId)', 'count')
            .where('reservation.reservedAt BETWEEN :start AND :end', { start, end })
            .andWhere('reservation.status IN (:...statuses)', {
                statuses: [ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN],
            })
            .getRawOne();

        const memberVisits = parseInt(visitsQuery.count, 10) || 0;

        // 3. 预计营收 (今日已支付或已完成的订单总额)
        const revenueQuery = await this.orderRepository
            .createQueryBuilder('order')
            .select('SUM(order.totalAmount)', 'total')
            .where('order.createdAt BETWEEN :start AND :end', { start, end })
            .andWhere('order.status IN (:...statuses)', {
                statuses: [OrderStatus.PAID, OrderStatus.COMPLETED],
            })
            .getRawOne();

        const totalRevenue = parseFloat(revenueQuery.total) || 0;

        return {
            totalReservations,
            memberVisits,
            totalRevenue,
        };
    }
}
