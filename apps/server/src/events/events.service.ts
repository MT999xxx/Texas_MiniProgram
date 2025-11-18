import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan } from 'typeorm';
import { EventEntity, EventStatus, EventRegistrationEntity, RegistrationStatus } from './event.entity';
import { CreateEventDto, UpdateEventDto, RegisterEventDto } from './dto/create-event.dto';
import { MembershipService } from '../membership/membership.service';
import { LoyaltyService } from '../loyalty/loyalty.service';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(EventEntity)
    private readonly eventRepo: Repository<EventEntity>,
    @InjectRepository(EventRegistrationEntity)
    private readonly registrationRepo: Repository<EventRegistrationEntity>,
    private readonly membershipService: MembershipService,
    private readonly loyaltyService: LoyaltyService,
  ) {}

  // 创建活动
  async create(dto: CreateEventDto): Promise<EventEntity> {
    // 验证时间
    if (dto.endTime <= dto.startTime) {
      throw new BadRequestException('结束时间必须晚于开始时间');
    }

    const event = this.eventRepo.create({
      ...dto,
      status: this.determineEventStatus(dto.startTime, dto.endTime),
    });

    return this.eventRepo.save(event);
  }

  // 获取活动列表
  async findAll(status?: EventStatus, type?: string): Promise<EventEntity[]> {
    const queryBuilder = this.eventRepo.createQueryBuilder('event')
      .leftJoinAndSelect('event.registrations', 'registrations')
      .orderBy('event.startTime', 'ASC');

    if (status) {
      queryBuilder.where('event.status = :status', { status });
    }

    if (type) {
      queryBuilder.andWhere('event.type = :type', { type });
    }

    return queryBuilder.getMany();
  }

  // 获取活动详情
  async findById(id: string): Promise<EventEntity> {
    const event = await this.eventRepo.findOne({
      where: { id },
      relations: ['registrations', 'registrations.member', 'registrations.member.level']
    });

    if (!event) {
      throw new NotFoundException('活动不存在');
    }

    return event;
  }

  // 更新活动
  async update(id: string, dto: UpdateEventDto): Promise<EventEntity> {
    const event = await this.findById(id);

    // 验证时间
    if (dto.startTime && dto.endTime && dto.endTime <= dto.startTime) {
      throw new BadRequestException('结束时间必须晚于开始时间');
    }

    Object.assign(event, dto);

    // 自动更新状态
    if (dto.startTime || dto.endTime) {
      event.status = this.determineEventStatus(
        dto.startTime || event.startTime,
        dto.endTime || event.endTime
      );
    }

    return this.eventRepo.save(event);
  }

  // 删除活动
  async remove(id: string): Promise<void> {
    const event = await this.findById(id);

    if (event.currentParticipants > 0) {
      throw new BadRequestException('已有用户报名的活动不能删除');
    }

    await this.eventRepo.remove(event);
  }

  // 报名参加活动
  async register(eventId: string, dto: RegisterEventDto): Promise<EventRegistrationEntity> {
    const event = await this.findById(eventId);
    const member = await this.membershipService.findMemberById(dto.memberId);

    // 检查活动状态
    if (event.status !== EventStatus.UPCOMING && event.status !== EventStatus.ONGOING) {
      throw new BadRequestException('活动已结束或已取消，无法报名');
    }

    // 检查是否需要报名
    if (!event.requiresRegistration) {
      throw new BadRequestException('该活动无需报名');
    }

    // 检查是否已经报名
    const existingRegistration = await this.registrationRepo.findOne({
      where: {
        event: { id: eventId },
        member: { id: dto.memberId },
        status: RegistrationStatus.REGISTERED
      }
    });

    if (existingRegistration) {
      throw new BadRequestException('已经报名过该活动');
    }

    // 检查人数限制
    if (event.maxParticipants > 0 && event.currentParticipants >= event.maxParticipants) {
      throw new BadRequestException('活动报名人数已满');
    }

    // 检查会员等级
    const userLevel = member.level?.level || 1;
    if (event.minMemberLevel && userLevel < event.minMemberLevel) {
      throw new BadRequestException(`需要V${event.minMemberLevel}及以上会员才能参加`);
    }

    // 检查积分是否足够
    if (event.entryFee > 0 && member.points < event.entryFee) {
      throw new BadRequestException('积分不足，无法报名');
    }

    // 扣除报名费用
    if (event.entryFee > 0) {
      await this.membershipService.adjustPoints(dto.memberId, -event.entryFee);
    }

    // 创建报名记录
    const registration = this.registrationRepo.create({
      event,
      member,
      notes: dto.notes,
    });

    const savedRegistration = await this.registrationRepo.save(registration);

    // 更新活动报名人数
    await this.eventRepo.update(eventId, {
      currentParticipants: event.currentParticipants + 1
    });

    return savedRegistration;
  }

  // 取消报名
  async cancelRegistration(eventId: string, memberId: string): Promise<void> {
    const registration = await this.registrationRepo.findOne({
      where: {
        event: { id: eventId },
        member: { id: memberId },
        status: RegistrationStatus.REGISTERED
      },
      relations: ['event']
    });

    if (!registration) {
      throw new NotFoundException('报名记录不存在');
    }

    // 检查是否可以取消
    const event = registration.event;
    const now = new Date();
    const startTime = new Date(event.startTime);
    const timeDiff = startTime.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    if (hoursDiff < 2) {
      throw new BadRequestException('活动开始前2小时内不能取消报名');
    }

    // 退还报名费用
    if (event.entryFee > 0) {
      await this.membershipService.adjustPoints(memberId, event.entryFee);
    }

    // 更新报名状态
    registration.status = RegistrationStatus.CANCELLED;
    await this.registrationRepo.save(registration);

    // 更新活动报名人数
    await this.eventRepo.update(eventId, {
      currentParticipants: event.currentParticipants - 1
    });
  }

  // 获取用户报名的活动
  async getUserRegistrations(memberId: string): Promise<EventRegistrationEntity[]> {
    return this.registrationRepo.find({
      where: { member: { id: memberId } },
      relations: ['event'],
      order: { registeredAt: 'DESC' }
    });
  }

  // 奖励活动积分
  async awardEventPoints(eventId: string, memberId: string, points?: number): Promise<void> {
    const event = await this.findById(eventId);
    const registration = await this.registrationRepo.findOne({
      where: {
        event: { id: eventId },
        member: { id: memberId },
        status: RegistrationStatus.REGISTERED
      }
    });

    if (!registration) {
      throw new NotFoundException('用户未报名该活动');
    }

    const rewardPoints = points || event.rewardPoints;
    if (rewardPoints <= 0) {
      return;
    }

    // 奖励积分
    await this.loyaltyService.awardEventPoints(memberId, rewardPoints, event.name, `参加${event.name}活动奖励`);

    // 更新报名记录
    registration.status = RegistrationStatus.ATTENDED;
    registration.pointsEarned = rewardPoints;
    await this.registrationRepo.save(registration);
  }

  // 定期更新活动状态
  async updateEventStatuses(): Promise<void> {
    const now = new Date();

    // 更新即将开始的活动为进行中
    await this.eventRepo.update(
      {
        status: EventStatus.UPCOMING,
        startTime: Between(new Date(0), now)
      },
      { status: EventStatus.ONGOING }
    );

    // 更新进行中的活动为已结束
    await this.eventRepo.update(
      {
        status: EventStatus.ONGOING,
        endTime: Between(new Date(0), now)
      },
      { status: EventStatus.ENDED }
    );
  }

  // 确定活动状态
  private determineEventStatus(startTime: Date, endTime: Date): EventStatus {
    const now = new Date();

    if (now < startTime) {
      return EventStatus.UPCOMING;
    } else if (now >= startTime && now <= endTime) {
      return EventStatus.ONGOING;
    } else {
      return EventStatus.ENDED;
    }
  }
}