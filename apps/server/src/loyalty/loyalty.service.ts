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
  ) { }

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
  async getLeaderboard(type: 'total' | 'weekly' | 'event' = 'total', limit: number | string = 50) {
    try {
      // 确保 limit 是数字
      const numLimit = typeof limit === 'string' ? parseInt(limit, 10) : limit;
      const safeLimit = isNaN(numLimit) ? 50 : numLimit;

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
        .leftJoin('member.loyaltyTransactions', 'transactions');

      if (type === 'weekly' && startDate) {
        query = query.where('transactions.createdAt >= :startDate', { startDate });
      } else if (type === 'event') {
        // 活动榜可以根据具体需求筛选特定活动的积分
        query = query.where('transactions.remark LIKE :eventRemark', { eventRemark: '%活动%' });
      }

      const members = await query
        .orderBy('member.points', 'DESC')
        .limit(safeLimit)
        .getMany();

      // 计算排行榜数据
      const rankings = members.map((member, index) => ({
        rank: index + 1,
        id: member.id,
        nickname: member.nickname || '匿名用户',
        avatar: member.avatar,
        points: member.points,
        levelName: member.level?.name || 'V1 普通会员',
        levelNumber: member.level?.threshold || 0
      }))
        .filter(member => member.points > 0) // 过滤掉0积分的用户
        .sort((a, b) => b.points - a.points); // 重新按积分排序

      return rankings;
    } catch (error) {
      console.error('获取排行榜失败:', error);
      return [];
    }
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
          levelNumber: member.level?.threshold || 0
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

  // 创建测试排行榜数据
  async seedTestData() {
    const testMembers = [
      { nickname: '王者荣耀', phone: '13800138001', points: 15800 },
      { nickname: '德州大师', phone: '13800138002', points: 12500 },
      { nickname: '小牌手', phone: '13800138003', points: 8200 },
    ];

    const created = [];
    for (const testMember of testMembers) {
      // 检查是否已存在
      const existing = await this.memberRepo.findOne({ where: { phone: testMember.phone } });
      if (existing) {
        // 更新积分
        existing.points = testMember.points;
        existing.nickname = testMember.nickname;
        await this.memberRepo.save(existing);
        created.push(existing);
      } else {
        // 创建新会员（不设置levelCode以避免外键约束）
        const member = this.memberRepo.create({
          userId: `test_user_${testMember.phone}`,
          nickname: testMember.nickname,
          phone: testMember.phone,
          points: testMember.points,
        });
        await this.memberRepo.save(member);
        created.push(member);
      }
    }

    return { message: '测试数据创建成功', members: created };
  }
}
