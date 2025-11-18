import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoyaltyTransactionEntity, LoyaltyTransactionType } from './loyalty-transaction.entity';
import { MembershipService } from '../membership/membership.service';
import { OrderEntity } from '../orders/order.entity';
import { MemberEntity } from '../membership/member.entity';

@Injectable()
export class LoyaltyService {
  constructor(
    @InjectRepository(LoyaltyTransactionEntity)
    private readonly repo: Repository<LoyaltyTransactionEntity>,
    @InjectRepository(MemberEntity)
    private readonly memberRepo: Repository<MemberEntity>,
    private readonly membershipService: MembershipService,
  ) {}

  async awardPointsForOrder(order: OrderEntity) {
    if (!order.member) {
      return null;
    }
    const points = Math.floor(Number(order.totalAmount));
    if (points <= 0) {
      return null;
    }
    await this.membershipService.adjustPoints(order.member.id, points);
    const trx = this.repo.create({
      member: order.member,
      order,
      type: LoyaltyTransactionType.EARN,
      points,
      remark: '订单消费奖励',
    });
    return this.repo.save(trx);
  }

  // 获取排行榜数据
  async getLeaderboard(type: 'total' | 'weekly' | 'event' = 'total', limit: number = 50) {
    let startDate: Date | undefined;

    if (type === 'weekly') {
      // 获取本周开始时间
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay()); // 周日开始
      weekStart.setHours(0, 0, 0, 0);
      startDate = weekStart;
    }

    let query = this.memberRepo
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.level', 'level')
      .leftJoinAndSelect('member.loyaltyTransactions', 'transactions');

    if (type === 'weekly' && startDate) {
      query = query.where('transactions.createdAt >= :startDate', { startDate });
    } else if (type === 'event') {
      // 活动榜可以根据具体需求筛选特定活动的积分
      query = query.where('transactions.remark LIKE :eventRemark', { eventRemark: '%活动%' });
    }

    const members = await query
      .orderBy('member.points', 'DESC')
      .limit(limit)
      .getMany();

    // 计算排行榜数据
    const rankings = members.map((member, index) => {
      // 如果是周榜，计算本周积分
      let points = member.points;
      if (type === 'weekly' && startDate) {
        points = member.loyaltyTransactions
          ?.filter(t => t.createdAt >= startDate!)
          .reduce((sum, t) => sum + t.points, 0) || 0;
      } else if (type === 'event') {
        points = member.loyaltyTransactions
          ?.filter(t => t.remark?.includes('活动'))
          .reduce((sum, t) => sum + t.points, 0) || 0;
      }

      return {
        rank: index + 1,
        id: member.id,
        nickname: member.nickname,
        avatar: member.avatar,
        points,
        levelName: member.level?.name || 'V1 普通会员',
        levelNumber: member.level?.level || 1
      };
    })
    .filter(member => member.points > 0) // 过滤掉0积分的用户
    .sort((a, b) => b.points - a.points); // 重新按积分排序

    return rankings;
  }

  // 获取用户在排行榜中的排名
  async getUserRank(memberId: string, type: 'total' | 'weekly' | 'event' = 'total') {
    const rankings = await this.getLeaderboard(type, 1000); // 获取更多数据以确保包含目标用户
    const userRank = rankings.find(rank => rank.id === memberId);

    if (!userRank) {
      // 如果用户不在排行榜中，查询用户信息
      const member = await this.memberRepo.findOne({
        where: { id: memberId },
        relations: ['level']
      });

      if (member) {
        return {
          rank: null,
          id: member.id,
          nickname: member.nickname,
          avatar: member.avatar,
          points: 0,
          levelName: member.level?.name || 'V1 普通会员',
          levelNumber: member.level?.level || 1
        };
      }
    }

    return userRank || null;
  }

  // 奖励活动积分
  async awardEventPoints(memberId: string, points: number, eventName: string, remark?: string) {
    if (points <= 0) {
      return null;
    }

    await this.membershipService.adjustPoints(memberId, points);

    const trx = this.repo.create({
      member: { id: memberId } as MemberEntity,
      type: LoyaltyTransactionType.EARN,
      points,
      remark: remark || `${eventName}活动奖励`,
    });

    return this.repo.save(trx);
  }
}
