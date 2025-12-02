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
      level = await this.levelRepo.findOne({ where: { code: dto.levelCode } }) || undefined;
      if (!level) {
        throw new NotFoundException('Level not found');
      }
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

  getMemberById(id: string) {
    return this.memberRepo.findOne({ where: { id }, relations: ['level'] });
  }

  // 更新会员
  async updateMember(id: string, dto: Partial<MemberEntity>): Promise<MemberEntity> {
    const member = await this.memberRepo.findOne({ where: { id } });
    if (!member) {
      throw new NotFoundException('Member not found');
    }

    if (dto.nickname !== undefined) member.nickname = dto.nickname;
    if (dto.phone !== undefined) member.phone = dto.phone;
    if (dto.avatar !== undefined) member.avatar = dto.avatar;

    return this.memberRepo.save(member);
  }

  async adjustPoints(memberId: string, delta: number) {
    const member = await this.memberRepo.findOne({ where: { id: memberId } });
    if (!member) {
      throw new NotFoundException('Member not found');
    }
    member.points += delta;
    return this.memberRepo.save(member);
  }

  findMemberById(id: string) {
    return this.memberRepo.findOne({ where: { id }, relations: ['level'] });
  }
}
