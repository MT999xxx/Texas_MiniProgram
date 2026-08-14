import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateLevelDto } from './dto/create-level.dto';
import { CreateMemberDto } from './dto/create-member.dto';
import { MembershipLevelEntity } from './membership-level.entity';
import { MemberEntity } from './member.entity';
import {
  getCoinConsumptionBonusPoints,
  getEffectiveWineVoucherBatchExpiresAt,
  getWineVoucherExpiresAt,
} from '../coins/coin-rules';
import { WineVoucherBatchEntity } from '../coins/wine-voucher-batch.entity';
import {
  formatMembershipBenefits,
  getMembershipRewardBaselineLevel,
  getStoredMembershipLevelRule,
  MEMBERSHIP_LEVEL_RULES,
} from './membership-level-rules';

@Injectable()
export class MembershipService {
  constructor(
    @InjectRepository(MembershipLevelEntity)
    private readonly levelRepo: Repository<MembershipLevelEntity>,
    @InjectRepository(MemberEntity)
    private readonly memberRepo: Repository<MemberEntity>,
  ) { }

  createLevel(dto: CreateLevelDto) {
    const level = this.levelRepo.create({
      code: dto.code,
      name: dto.name,
      threshold: dto.threshold,
      discount: dto.discount,
      benefits: dto.benefits,
    });
    return this.levelRepo.save(level);
  }

  async listLevels() {
    for (const rule of MEMBERSHIP_LEVEL_RULES) {
      await this.levelRepo.save(this.levelRepo.create({
        code: rule.code,
        name: rule.name,
        threshold: rule.threshold,
        benefits: formatMembershipBenefits(rule),
      }));
    }
    return this.levelRepo.find({ order: { threshold: 'ASC' } });
  }

  async createMember(dto: CreateMemberDto) {
    let level: MembershipLevelEntity | undefined;
    if (dto.levelCode) {
      const foundLevel = await this.levelRepo.findOne({ where: { code: dto.levelCode } });
      if (!foundLevel) {
        throw new NotFoundException('Level not found');
      }
      level = foundLevel;
    }
    const member = this.memberRepo.create({
      userId: dto.userId,
      phone: dto.phone,
      nickname: dto.nickname,
      levelCode: dto.levelCode,
      level,
      points: dto.points ?? 0,
      membershipRewardLevel: 1,
      membershipRewardInitialized: true,
    });
    return this.memberRepo.save(member);
  }

  async listMembers(levelCode?: string) {
    const members = await this.memberRepo.find({
      where: {},
      relations: ['level'],
      order: { createdAt: 'DESC' },
    });
    const normalized = members.map((member) => this.normalizeMemberLevel(member));
    return levelCode ? normalized.filter((member) => member.levelCode === levelCode) : normalized;
  }

  async adjustPoints(memberId: string, delta: number) {
    const member = await this.memberRepo.findOne({ where: { id: memberId } });
    if (!member) {
      throw new NotFoundException('Member not found');
    }
    member.points += delta;
    return this.memberRepo.save(member);
  }

  async adjustCoins(memberId: string, delta: number) {
    const member = await this.memberRepo.findOne({ where: { id: memberId } });
    if (!member) {
      throw new NotFoundException('Member not found');
    }
    const coinDelta = Number(delta || 0);
    member.coins = Number(member.coins || 0) + coinDelta;
    if (member.coins < 0) {
      throw new NotFoundException('金币余额不足');
    }
    if (coinDelta < 0) {
      member.points = Number(member.points || 0) + getCoinConsumptionBonusPoints(Math.abs(coinDelta));
    }
    return this.memberRepo.save(member);
  }

  async adjustWineVouchers(memberId: string, delta: number) {
    const voucherDelta = Math.trunc(Number(delta || 0));
    if (voucherDelta === 0) {
      return this.findMemberById(memberId);
    }

    return this.memberRepo.manager.transaction(async (manager) => {
      const memberRepo = manager.getRepository(MemberEntity);
      const batchRepo = manager.getRepository(WineVoucherBatchEntity);
      const member = await memberRepo.findOne({ where: { id: memberId } });
      if (!member) {
        throw new NotFoundException('Member not found');
      }

      const nextBalance = Number(member.wineVouchers || 0) + voucherDelta;
      if (nextBalance < 0) {
        throw new BadRequestException('酒券余额不足');
      }

      if (voucherDelta > 0) {
        const now = new Date();
        const batches = Array.from({ length: voucherDelta }, () => batchRepo.create({
          memberId,
          sourceType: 'admin',
          packageName: '后台赠送酒券',
          quantity: 1,
          remainingQuantity: 1,
          bonusPoints: 0,
          expiresAt: getWineVoucherExpiresAt(now),
          remark: '后台手工调整',
        }));
        await batchRepo.save(batches);
      } else {
        let remaining = Math.abs(voucherDelta);
        const now = new Date();
        const batches = await batchRepo.find({
          where: { memberId },
          order: { expiresAt: 'ASC', createdAt: 'ASC' },
        });
        for (const batch of batches) {
          if (remaining <= 0) break;
          if (getEffectiveWineVoucherBatchExpiresAt(batch) < now) continue;
          const available = Math.max(0, Number(batch.remainingQuantity || 0));
          if (available <= 0) continue;
          const used = Math.min(available, remaining);
          batch.remainingQuantity = available - used;
          remaining -= used;
          await batchRepo.save(batch);
        }
      }

      member.wineVouchers = nextBalance;
      return memberRepo.save(member);
    });
  }

  async findMemberById(id: string) {
    const member = await this.memberRepo.findOne({ where: { id }, relations: ['level'] });
    return member ? this.normalizeMemberLevel(member) : null;
  }

  async updateMemberLevel(memberId: string, levelCode: string | null) {
    const member = await this.memberRepo.findOne({ where: { id: memberId } });
    if (!member) {
      throw new NotFoundException('Member not found');
    }

    if (levelCode) {
      const level = await this.levelRepo.findOne({ where: { code: levelCode } });
      if (!level) {
        throw new NotFoundException('Level not found');
      }
      member.levelCode = levelCode;
      member.level = level;
      member.membershipRewardLevel = getMembershipRewardBaselineLevel(levelCode);
      member.membershipRewardInitialized = true;
    } else {
      member.levelCode = null as unknown as string;
      member.level = undefined as unknown as MembershipLevelEntity;
    }

    return this.memberRepo.save(member);
  }

  private normalizeMemberLevel(member: MemberEntity): MemberEntity {
    const rule = getStoredMembershipLevelRule(member.levelCode);
    if (rule) {
      member.level = {
        ...(member.level || {}),
        code: rule.code,
        name: rule.name,
        threshold: rule.threshold,
        benefits: formatMembershipBenefits(rule),
      } as MembershipLevelEntity;
    }
    return member;
  }
}
