import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoyaltyTransactionEntity, LoyaltyTransactionType } from './loyalty-transaction.entity';
import { ChampionRankingEntity, ChampionType } from './champion-ranking.entity';
import { MembershipService } from '../membership/membership.service';
import { OrderEntity } from '../orders/order.entity';
import { MemberEntity } from '../membership/member.entity';
import { getCoinConsumptionBonusPoints, isWineVoucherMenuItem } from '../coins/coin-rules';

@Injectable()
export class LoyaltyService {
  constructor(
    @InjectRepository(LoyaltyTransactionEntity)
    private readonly repo: Repository<LoyaltyTransactionEntity>,
    @InjectRepository(MemberEntity)
    private readonly memberRepo: Repository<MemberEntity>,
    @InjectRepository(ChampionRankingEntity)
    private readonly championRepo: Repository<ChampionRankingEntity>,
    private readonly membershipService: MembershipService,
  ) { }

  async awardPointsForOrder(order: OrderEntity) {
    if (!order.member) {
      return null;
    }
    const points = getCoinConsumptionBonusPoints(this.getOrderRewardableAmount(order));
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

  private getOrderRewardableAmount(order: OrderEntity): number {
    const items = order.items || [];
    if (items.length === 0) {
      return Number(order.totalAmount || 0);
    }

    const nonVoucherAmount = items
      .filter((item) => !isWineVoucherMenuItem(item.menuItem as any))
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    return Math.min(nonVoucherAmount, Number(order.totalAmount || 0));
  }

  // 获取排行榜数据
  async getLeaderboard(type: string = 'total', limit: number | string = 50) {
    // 冠军赛类型走独立查询
    if (type === 'champion_weekly' || type === 'champion_monthly') {
      return this.getChampionLeaderboard(type as ChampionType);
    }
    try {
      // 确保 limit 是数字
      const numLimit = typeof limit === 'string' ? parseInt(limit, 10) : limit;
      const safeLimit = isNaN(numLimit) ? 50 : numLimit;

      // 简化查询：直接按积分排序，不依赖transaction记录
      // 对于weekly和event类型，目前也使用总积分排序
      // 后续可以根据实际业务需求调整
      const members = await this.memberRepo
        .createQueryBuilder('member')
        .leftJoinAndSelect('member.level', 'level')
        .where('member.points > 0')
        .orderBy('member.points', 'DESC')
        .limit(safeLimit)
        .getMany();

      // 计算排行榜数据
      const rankings = members.map((member, index) => {
        const code = member.level?.code || member.levelCode || 'V1';
        const name = member.level?.name || '';
        return {
          rank: index + 1,
          id: member.id,
          nickname: member.nickname || '匿名用户',
          avatar: member.avatar,
          points: member.points,
          levelCode: code,
          levelName: `${code}${name}`,
          levelNumber: member.level?.threshold || 0
        };
      });

      return rankings;
    } catch (error) {
      console.error('获取排行榜失败:', error);
      return [];
    }
  }

  // 获取用户在排行榜中的排名
  async getUserRank(memberId: string, type: string = 'total') {
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

  /** 获取冠军赛排行榜（手动排名） */
  async getChampionLeaderboard(type: ChampionType) {
    try {
      const entries = await this.championRepo.find({
        where: { type },
        relations: ['member', 'member.level'],
        order: { rank: 'ASC' },
      });

      return entries.map(entry => {
        const member = entry.member;
        const code = member?.level?.code || member?.levelCode || 'V1';
        const name = member?.level?.name || '';
        return {
          rank: entry.rank,
          id: member?.id,
          nickname: member?.nickname || '匿名用户',
          avatar: member?.avatar,
          points: member?.points || 0,
          levelCode: code,
          levelName: `${code}${name}`,
          levelNumber: member?.level?.threshold || 0,
        };
      });
    } catch (error) {
      console.error('获取冠军赛排行榜失败:', error);
      return [];
    }
  }

  /** 批量保存冠军赛排名（先清空再插入） */
  async saveChampionRankings(type: ChampionType, entries: { memberId: string; rank: number }[]) {
    await this.championRepo.delete({ type });
    const entities = entries.map(e =>
      this.championRepo.create({ type, memberId: e.memberId, rank: e.rank }),
    );
    return this.championRepo.save(entities);
  }

  /** 添加单个冠军赛排名 */
  async addChampionEntry(type: ChampionType, memberId: string, rank: number) {
    const entry = this.championRepo.create({ type, memberId, rank });
    return this.championRepo.save(entry);
  }

  /** 移除单个冠军赛排名 */
  async removeChampionEntry(type: ChampionType, memberId: string) {
    return this.championRepo.delete({ type, memberId });
  }
}
