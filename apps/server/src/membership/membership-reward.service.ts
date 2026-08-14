import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CoinTransactionEntity, CoinTransactionStatus, CoinTransactionType } from '../coins/coin-transaction.entity';
import { getWineVoucherExpiresAt } from '../coins/coin-rules';
import { WineVoucherBatchEntity } from '../coins/wine-voucher-batch.entity';
import { LoyaltyTransactionEntity, LoyaltyTransactionType } from '../loyalty/loyalty-transaction.entity';
import { UpdateMembershipRewardDto } from './dto/update-membership-reward.dto';
import {
  formatMembershipBenefits,
  getEffectiveMembershipLevelRule,
  getMembershipRewardBaselineLevel,
  MEMBERSHIP_LEVEL_RULES,
} from './membership-level-rules';
import { MembershipLevelEntity } from './membership-level.entity';
import {
  MembershipRewardGrantEntity,
  MembershipRewardGrantStatus,
} from './membership-reward-grant.entity';
import { MemberEntity } from './member.entity';

@Injectable()
export class MembershipRewardService implements OnApplicationBootstrap {
  private readonly logger = new Logger(MembershipRewardService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(MembershipLevelEntity)
    private readonly levelRepo: Repository<MembershipLevelEntity>,
    @InjectRepository(MemberEntity)
    private readonly memberRepo: Repository<MemberEntity>,
    @InjectRepository(CoinTransactionEntity)
    private readonly coinTransactionRepo: Repository<CoinTransactionEntity>,
    @InjectRepository(MembershipRewardGrantEntity)
    private readonly rewardRepo: Repository<MembershipRewardGrantEntity>,
  ) {}

  async onApplicationBootstrap() {
    try {
      await this.ensureLevelDefinitions();
      await this.initializeHistoricalMembers();
    } catch (error) {
      this.logger.error('会员等级与历史奖励基线初始化失败', error instanceof Error ? error.stack : String(error));
    }
  }

  async ensureLevelDefinitions() {
    for (const rule of MEMBERSHIP_LEVEL_RULES) {
      await this.levelRepo.save(this.levelRepo.create({
        code: rule.code,
        name: rule.name,
        threshold: rule.threshold,
        benefits: formatMembershipBenefits(rule),
      }));
    }
  }

  async initializeHistoricalMembers() {
    const members = await this.memberRepo.find({ where: { membershipRewardInitialized: false } });
    for (const member of members) {
      const totalRechargeAmount = await this.calculateSuccessfulRechargeTotal(member.id);
      member.totalRechargeAmount = totalRechargeAmount;
      member.membershipRewardLevel = getMembershipRewardBaselineLevel(member.levelCode);
      member.membershipRewardInitialized = true;
      await this.memberRepo.save(member);
    }
    if (members.length > 0) {
      this.logger.log(`已保留原等级并初始化 ${members.length} 位历史会员奖励基线，未补发历史奖励`);
    }
  }

  async syncMembershipAfterRecharge(memberId: string) {
    return this.dataSource.transaction(async (manager) => {
      const memberRepo = manager.getRepository(MemberEntity);
      const transactionRepo = manager.getRepository(CoinTransactionEntity);
      const rewardRepo = manager.getRepository(MembershipRewardGrantEntity);
      const member = await memberRepo.findOne({
        where: { id: memberId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!member) {
        throw new NotFoundException('会员不存在');
      }

      const raw = await transactionRepo
        .createQueryBuilder('transaction')
        .select('COALESCE(SUM(transaction.paymentAmount), 0)', 'total')
        .where('transaction.memberId = :memberId', { memberId })
        .andWhere('transaction.type = :type', { type: CoinTransactionType.RECHARGE })
        .andWhere('transaction.status = :status', { status: CoinTransactionStatus.SUCCESS })
        .getRawOne<{ total: string | number }>();
      const totalRechargeAmount = Number(raw?.total || 0);
      if (member.levelCode === 'VP') {
        member.totalRechargeAmount = totalRechargeAmount;
        member.membershipRewardLevel = getMembershipRewardBaselineLevel(member.levelCode);
        member.membershipRewardInitialized = true;
        await memberRepo.save(member);
        return { member, pendingRewards: [] };
      }
      const currentRule = getEffectiveMembershipLevelRule(totalRechargeAmount, member.levelCode);

      if (!member.membershipRewardInitialized) {
        member.totalRechargeAmount = totalRechargeAmount;
        member.levelCode = currentRule.code;
        member.membershipRewardLevel = currentRule.level;
        member.membershipRewardInitialized = true;
        await memberRepo.save(member);
        return { member, pendingRewards: [] };
      }

      const previousRewardLevel = Math.max(
        1,
        Number(member.membershipRewardLevel || 1),
        getMembershipRewardBaselineLevel(member.levelCode),
      );
      const crossedRules = MEMBERSHIP_LEVEL_RULES.filter(
        (rule) => rule.level > previousRewardLevel && rule.level <= currentRule.level,
      );
      const pendingRewards: MembershipRewardGrantEntity[] = [];

      for (const rule of crossedRules) {
        const existing = await rewardRepo.findOne({ where: { memberId, levelCode: rule.code } });
        if (existing) continue;
        const reward = rewardRepo.create({
          memberId,
          levelCode: rule.code,
          levelName: rule.name,
          threshold: rule.threshold,
          points: rule.reward.points,
          coins: rule.reward.coins,
          wineVouchers: rule.reward.wineVouchers,
          monthlyTickets: rule.reward.monthlyTickets,
          status: MembershipRewardGrantStatus.PENDING,
          remark: `累计充值达到${rule.threshold}元，升级至${rule.code} ${rule.name}`,
        });
        pendingRewards.push(await rewardRepo.save(reward));
      }

      member.totalRechargeAmount = totalRechargeAmount;
      member.levelCode = currentRule.code;
      member.membershipRewardLevel = Math.max(previousRewardLevel, currentRule.level);
      await memberRepo.save(member);
      return { member, pendingRewards };
    });
  }

  listRewards(status?: MembershipRewardGrantStatus) {
    return this.rewardRepo.find({
      where: status ? { status } : {},
      relations: ['member'],
      order: { createdAt: 'DESC' },
    });
  }

  async updateReward(id: string, dto: UpdateMembershipRewardDto) {
    const reward = await this.rewardRepo.findOne({ where: { id } });
    if (!reward) throw new NotFoundException('等级奖励记录不存在');
    if (reward.status !== MembershipRewardGrantStatus.PENDING) {
      throw new BadRequestException('只有待发放奖励可以修改');
    }
    Object.assign(reward, dto);
    return this.rewardRepo.save(reward);
  }

  async issueReward(id: string) {
    return this.dataSource.transaction(async (manager) => {
      const rewardRepo = manager.getRepository(MembershipRewardGrantEntity);
      const memberRepo = manager.getRepository(MemberEntity);
      const batchRepo = manager.getRepository(WineVoucherBatchEntity);
      const loyaltyRepo = manager.getRepository(LoyaltyTransactionEntity);
      const reward = await rewardRepo.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!reward) throw new NotFoundException('等级奖励记录不存在');
      if (reward.status === MembershipRewardGrantStatus.ISSUED) return reward;
      if (reward.status !== MembershipRewardGrantStatus.PENDING) {
        throw new BadRequestException('该奖励当前不能发放');
      }

      const member = await memberRepo.findOne({
        where: { id: reward.memberId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!member) throw new NotFoundException('会员不存在');

      const points = Math.max(0, Math.trunc(Number(reward.points || 0)));
      const coins = Math.max(0, Number(reward.coins || 0));
      const wineVouchers = Math.max(0, Math.trunc(Number(reward.wineVouchers || 0)));
      const monthlyTickets = Math.max(0, Math.trunc(Number(reward.monthlyTickets || 0)));

      member.points = Number(member.points || 0) + points;
      member.coins = Number(member.coins || 0) + coins;
      member.wineVouchers = Number(member.wineVouchers || 0) + wineVouchers;
      member.monthlyTickets = Number(member.monthlyTickets || 0) + monthlyTickets;
      await memberRepo.save(member);

      if (points > 0) {
        await loyaltyRepo.save(loyaltyRepo.create({
          member,
          type: LoyaltyTransactionType.EARN,
          points,
          remark: `${reward.levelCode}升级奖励`,
        }));
      }

      if (wineVouchers > 0) {
        const now = new Date();
        const batches = Array.from({ length: wineVouchers }, () => batchRepo.create({
          memberId: member.id,
          sourceType: 'membership_reward',
          sourceId: reward.id,
          packageName: `${reward.levelCode}${reward.levelName}升级奖励`,
          quantity: 1,
          remainingQuantity: 1,
          bonusPoints: 0,
          expiresAt: getWineVoucherExpiresAt(now),
          remark: '会员等级升级奖励',
        }));
        await batchRepo.save(batches);
      }

      reward.status = MembershipRewardGrantStatus.ISSUED;
      reward.issuedAt = new Date();
      return rewardRepo.save(reward);
    });
  }

  private async calculateSuccessfulRechargeTotal(memberId: string): Promise<number> {
    const raw = await this.coinTransactionRepo
      .createQueryBuilder('transaction')
      .select('COALESCE(SUM(transaction.paymentAmount), 0)', 'total')
      .where('transaction.memberId = :memberId', { memberId })
      .andWhere('transaction.type = :type', { type: CoinTransactionType.RECHARGE })
      .andWhere('transaction.status = :status', { status: CoinTransactionStatus.SUCCESS })
      .getRawOne<{ total: string | number }>();
    return Number(raw?.total || 0);
  }
}
