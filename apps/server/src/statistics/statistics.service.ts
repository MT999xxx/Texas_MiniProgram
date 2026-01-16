import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository, Not, In, MoreThanOrEqual } from 'typeorm';
import { ReservationEntity, ReservationStatus } from '../reservation/reservation.entity';
import { OrderEntity, OrderStatus } from '../orders/order.entity';
import { OrderItemEntity } from '../orders/order-item.entity';
import { MemberEntity } from '../membership/member.entity';

@Injectable()
export class StatisticsService {
    constructor(
        @InjectRepository(ReservationEntity)
        private readonly reservationRepository: Repository<ReservationEntity>,
        @InjectRepository(OrderEntity)
        private readonly orderRepository: Repository<OrderEntity>,
        @InjectRepository(OrderItemEntity)
        private readonly orderItemRepository: Repository<OrderItemEntity>,
        @InjectRepository(MemberEntity)
        private readonly memberRepository: Repository<MemberEntity>,
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

    /**
     * 获取营收趋势数据
     * @param range 时间范围: '7d' | '1m' | '6m'
     */
    async getRevenueTrend(range: '7d' | '1m' | '6m') {
        const now = new Date();
        let startDate: Date;
        let groupFormat: string;

        if (range === '7d') {
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 7);
            groupFormat = 'DATE(order.createdAt)';
        } else if (range === '1m') {
            startDate = new Date(now);
            startDate.setMonth(now.getMonth() - 1);
            groupFormat = 'DATE(order.createdAt)';
        } else {
            startDate = new Date(now);
            startDate.setMonth(now.getMonth() - 6);
            groupFormat = "DATE_FORMAT(order.createdAt, '%Y-%m')";
        }

        const results = await this.orderRepository
            .createQueryBuilder('order')
            .select(`${groupFormat} `, 'date')
            .addSelect('SUM(order.totalAmount)', 'revenue')
            .where('order.createdAt >= :startDate', { startDate })
            .andWhere('order.status IN (:...statuses)', {
                statuses: [OrderStatus.PAID, OrderStatus.COMPLETED],
            })
            .groupBy(groupFormat)
            .orderBy(groupFormat, 'ASC')
            .getRawMany();

        return results.map(r => ({
            date: range === '6m' ? r.date : new Date(r.date).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }).replace('/', '/'),
            revenue: parseFloat(r.revenue) || 0,
        }));
    }

    /**
     * 获取热门菜品 TOP5
     */
    async getHotMenuItems() {
        const results = await this.orderItemRepository
            .createQueryBuilder('item')
            .select('item.name', 'name')
            .addSelect('SUM(item.quantity)', 'sales')
            .groupBy('item.name')
            .orderBy('sales', 'DESC')
            .limit(5)
            .getRawMany();

        return results.map(r => ({
            name: r.name,
            sales: parseInt(r.sales, 10) || 0,
        }));
    }

    /**
     * 获取积分排行榜
     */
    async getLeaderboard(limit: number = 10) {
        try {
            const members = await this.memberRepository.find({
                where: { points: Not(0) }, // 过滤掉0积分的用户
                order: { points: 'DESC' },
                take: limit,
            });

            return members.map((m, index) => ({
                rank: index + 1,
                id: m.id,
                name: m.nickname || '匿名会员',
                avatar: m.avatar || '🎭',
                score: m.points,
                tag: this.generateTag(m.points),
            }));
        } catch (error) {
            console.error('获取排行榜失败:', error);
            return [];
        }
    }


    private generateTag(points: number): string {
        if (points >= 10000) return '至尊VIP';
        if (points >= 5000) return '黄金玩家';
        if (points >= 2000) return '积分高手';
        if (points >= 1000) return '活跃玩家';
        return '新晋会员';
    }
}
