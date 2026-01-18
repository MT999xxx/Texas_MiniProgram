import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateLevelDto } from './dto/create-level.dto';
import { CreateMemberDto } from './dto/create-member.dto';
import { MembershipLevelEntity } from './membership-level.entity';
import { MemberEntity } from './member.entity';

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

  listLevels() {
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
    });
    return this.memberRepo.save(member);
  }

  listMembers(levelCode?: string) {
    return this.memberRepo.find({
      where: levelCode ? { levelCode } : {},
      relations: ['level'],
      order: { createdAt: 'DESC' },
    });
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
    member.coins = Number(member.coins || 0) + delta;
    if (member.coins < 0) {
      throw new NotFoundException('金币余额不足');
    }
    return this.memberRepo.save(member);
  }

  findMemberById(id: string) {
    return this.memberRepo.findOne({ where: { id }, relations: ['level'] });
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
    } else {
      member.levelCode = null as unknown as string;
      member.level = undefined as unknown as MembershipLevelEntity;
    }

    return this.memberRepo.save(member);
  }
}
