import { CoinTransactionEntity } from '../src/coins/coin-transaction.entity';
import { WineVoucherBatchEntity } from '../src/coins/wine-voucher-batch.entity';
import { LoyaltyTransactionEntity } from '../src/loyalty/loyalty-transaction.entity';
import {
  getEffectiveMembershipLevelRule,
  getMembershipLevelRule,
  MEMBERSHIP_LEVEL_RULES,
} from '../src/membership/membership-level-rules';
import { MembershipLevelEntity } from '../src/membership/membership-level.entity';
import {
  MembershipRewardGrantEntity,
  MembershipRewardGrantStatus,
} from '../src/membership/membership-reward-grant.entity';
import { MembershipRewardService } from '../src/membership/membership-reward.service';
import { MemberEntity } from '../src/membership/member.entity';

describe('membership level rewards', () => {
  it('uses cumulative recharge thresholds for V1 through V10', () => {
    expect(MEMBERSHIP_LEVEL_RULES.map((item) => item.threshold)).toEqual([
      0, 1000, 3000, 10000, 20000, 30000, 40000, 50000, 60000, 70000,
    ]);
    expect(getMembershipLevelRule(999).code).toBe('V1');
    expect(getMembershipLevelRule(1000).code).toBe('V2');
    expect(getMembershipLevelRule(70000).code).toBe('V10');
  });

  it('preserves historical and manually assigned levels while allowing recharge upgrades', () => {
    expect(getEffectiveMembershipLevelRule(0, 'V5').code).toBe('V5');
    expect(getEffectiveMembershipLevelRule(50000, 'V3').code).toBe('V8');
  });

  it('keeps the confirmed V1 through V10 reward schedule', () => {
    expect(MEMBERSHIP_LEVEL_RULES.map((item) => item.reward)).toEqual([
      { points: 0, coins: 0, wineVouchers: 0, monthlyTickets: 0 },
      { points: 10000, coins: 0, wineVouchers: 0, monthlyTickets: 0 },
      { points: 20000, coins: 0, wineVouchers: 0, monthlyTickets: 0 },
      { points: 30000, coins: 0, wineVouchers: 1, monthlyTickets: 0 },
      { points: 40000, coins: 100, wineVouchers: 1, monthlyTickets: 0 },
      { points: 50000, coins: 100, wineVouchers: 2, monthlyTickets: 0 },
      { points: 60000, coins: 100, wineVouchers: 3, monthlyTickets: 1 },
      { points: 70000, coins: 200, wineVouchers: 5, monthlyTickets: 1 },
      { points: 80000, coins: 300, wineVouchers: 6, monthlyTickets: 1 },
      { points: 100000, coins: 300, wineVouchers: 8, monthlyTickets: 1 },
    ]);
  });

  it('queues every crossed level without issuing rewards immediately', async () => {
    const member = {
      id: 'member-1',
      levelCode: 'V1',
      membershipRewardLevel: 1,
      membershipRewardInitialized: true,
      totalRechargeAmount: 0,
    } as MemberEntity;
    const savedRewards: MembershipRewardGrantEntity[] = [];
    const memberRepo = {
      findOne: jest.fn().mockResolvedValue(member),
      save: jest.fn(async (value) => value),
    };
    const transactionRepo = {
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: 25000 }),
      })),
    };
    const rewardRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => {
        savedRewards.push(value as MembershipRewardGrantEntity);
        return value;
      }),
    };
    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === MemberEntity) return memberRepo;
        if (entity === CoinTransactionEntity) return transactionRepo;
        if (entity === MembershipRewardGrantEntity) return rewardRepo;
        throw new Error(`Unexpected repository ${entity.name}`);
      }),
    };
    const service = new MembershipRewardService(
      { transaction: jest.fn(async (callback) => callback(manager)) } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    const result = await service.syncMembershipAfterRecharge(member.id);

    expect(result.pendingRewards.map((item) => item.levelCode)).toEqual(['V2', 'V3', 'V4', 'V5']);
    expect(savedRewards.every((item) => item.status === MembershipRewardGrantStatus.PENDING)).toBe(true);
    expect(member.levelCode).toBe('V5');
    expect(member.membershipRewardLevel).toBe(5);
    expect(member.totalRechargeAmount).toBe(25000);
  });

  it('issues an edited reward once and creates independent wine voucher batches', async () => {
    const reward = {
      id: 'reward-1',
      memberId: 'member-1',
      levelCode: 'V7',
      levelName: '耀金尊客',
      points: 60000,
      coins: 100,
      wineVouchers: 3,
      monthlyTickets: 1,
      status: MembershipRewardGrantStatus.PENDING,
    } as MembershipRewardGrantEntity;
    const member = {
      id: 'member-1',
      points: 100,
      coins: 10,
      wineVouchers: 1,
      monthlyTickets: 0,
    } as MemberEntity;
    const rewardRepo = {
      findOne: jest.fn().mockImplementation(async () => reward),
      save: jest.fn(async (value) => value),
    };
    const memberRepo = {
      findOne: jest.fn().mockResolvedValue(member),
      save: jest.fn(async (value) => value),
    };
    const batchRepo = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
    };
    const loyaltyRepo = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
    };
    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === MembershipRewardGrantEntity) return rewardRepo;
        if (entity === MemberEntity) return memberRepo;
        if (entity === WineVoucherBatchEntity) return batchRepo;
        if (entity === LoyaltyTransactionEntity) return loyaltyRepo;
        throw new Error(`Unexpected repository ${entity.name}`);
      }),
    };
    const service = new MembershipRewardService(
      { transaction: jest.fn(async (callback) => callback(manager)) } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    await service.issueReward(reward.id);
    await service.issueReward(reward.id);

    expect(member.points).toBe(60100);
    expect(member.coins).toBe(110);
    expect(member.wineVouchers).toBe(4);
    expect(member.monthlyTickets).toBe(1);
    expect(batchRepo.save).toHaveBeenCalledTimes(1);
    expect(batchRepo.save.mock.calls[0][0]).toHaveLength(3);
    expect(batchRepo.save.mock.calls[0][0].every((batch: WineVoucherBatchEntity) => batch.quantity === 1)).toBe(true);
    expect(reward.status).toBe(MembershipRewardGrantStatus.ISSUED);
  });

  it('baselines historical members without creating reward records', async () => {
    const member = {
      id: 'member-history',
      levelCode: 'V5',
      membershipRewardInitialized: false,
    } as MemberEntity;
    const memberRepo = {
      find: jest.fn().mockResolvedValue([member]),
      save: jest.fn(async (value) => value),
    };
    const coinRepo = {
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: 32000 }),
      })),
    };
    const rewardRepo = { save: jest.fn() };
    const service = new MembershipRewardService(
      {} as any,
      {} as any,
      memberRepo as any,
      coinRepo as any,
      rewardRepo as any,
    );

    await service.initializeHistoricalMembers();

    expect(member.levelCode).toBe('V5');
    expect(member.membershipRewardLevel).toBe(5);
    expect(member.membershipRewardInitialized).toBe(true);
    expect(rewardRepo.save).not.toHaveBeenCalled();
  });
});
