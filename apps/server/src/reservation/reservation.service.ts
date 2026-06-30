import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { CreateReservationDto, CreateReservationWithDepositDto, UpdateReservationDto } from './dto/create-reservation.dto';
import { ReservationEntity, ReservationStatus } from './reservation.entity';
import { TableService } from '../tables/table.service';
import { TableStatus } from '../tables/table.entity';
import { RedisService } from '../redis/redis.service';
import { MembershipService } from '../membership/membership.service';

@Injectable()
export class ReservationService {
  constructor(
    @InjectRepository(ReservationEntity)
    private readonly repo: Repository<ReservationEntity>,
    private readonly tableService: TableService,
    private readonly redisService: RedisService,
    private readonly membershipService: MembershipService,
  ) { }

  async create(dto: CreateReservationDto): Promise<ReservationEntity> {
    const table = await this.tableService.findById(dto.tableId);
    if (!table) {
      throw new NotFoundException('Table not found');
    }
    if (![TableStatus.AVAILABLE, TableStatus.RESERVED, TableStatus.IN_USE].includes(table.status)) {
      throw new BadRequestException('Table is not available for reservation');
    }

    // 检查该座位是否已被预约
    if (dto.seatNumber) {
      const existingSeat = await this.repo.findOne({
        where: {
          table: { id: dto.tableId },
          seatNumber: dto.seatNumber,
          status: ReservationStatus.PENDING,
        },
      });
      if (existingSeat) {
        throw new BadRequestException('该座位已被预约');
      }

      // 同时检查 CONFIRMED 状态
      const confirmedSeat = await this.repo.findOne({
        where: {
          table: { id: dto.tableId },
          seatNumber: dto.seatNumber,
          status: ReservationStatus.CONFIRMED,
        },
      });
      if (confirmedSeat) {
        throw new BadRequestException('该座位已被预约');
      }
    }

    // 检查该用户是否已在此桌台有预约
    if (dto.memberId) {
      const existingUserReservation = await this.repo.findOne({
        where: {
          table: { id: dto.tableId },
          memberId: dto.memberId,
          status: ReservationStatus.PENDING,
        },
      });
      if (existingUserReservation) {
        throw new BadRequestException('您在该桌台已有预约，每人限预约一个座位');
      }

      const confirmedUserReservation = await this.repo.findOne({
        where: {
          table: { id: dto.tableId },
          memberId: dto.memberId,
          status: ReservationStatus.CONFIRMED,
        },
      });
      if (confirmedUserReservation) {
        throw new BadRequestException('您在该桌台已有预约，每人限预约一个座位');
      }
    }

    // 获取会员信息（如果提供了memberId）
    const member = dto.memberId ? await this.membershipService.findMemberById(dto.memberId) : undefined;

    const entity = this.repo.create({
      customerName: dto.customerName,
      phone: dto.phone,
      partySize: dto.partySize,
      reservedAt: new Date(dto.reservedAt),
      seatNumber: dto.seatNumber,
      avatar: dto.avatar,
      note: dto.note,
      table,
      member: member || undefined,  // 关联会员实体
      memberId: dto.memberId,
      status: ReservationStatus.PENDING,
    });
    const saved = await this.repo.save(entity);
    await this.tableService.updateStatus(table.id, TableStatus.RESERVED);
    await this.redisService.getClient().set(`table:${table.id}:status`, TableStatus.RESERVED);
    return saved;
  }


  async updateStatus(id: string, status: ReservationStatus): Promise<ReservationEntity> {
    const reservation = await this.repo.findOne({ where: { id }, relations: ['table'] });
    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }
    reservation.status = status;
    const saved = await this.repo.save(reservation);

    if (status === ReservationStatus.CANCELLED) {
      await this.tableService.updateStatus(reservation.table.id, TableStatus.AVAILABLE);
      await this.redisService.getClient().set(`table:${reservation.table.id}:status`, TableStatus.AVAILABLE);
    } else if (status === ReservationStatus.CHECKED_IN) {
      await this.tableService.updateStatus(reservation.table.id, TableStatus.IN_USE);
      await this.redisService.getClient().set(`table:${reservation.table.id}:status`, TableStatus.IN_USE);
    } else if (status === ReservationStatus.CONFIRMED) {
      await this.redisService.getClient().set(`table:${reservation.table.id}:status`, TableStatus.RESERVED);
    }
    return saved;
  }

  list(filter?: { status?: ReservationStatus; tableId?: string; memberId?: string }): Promise<ReservationEntity[]> {
    const where: any = {};
    if (filter?.status) where.status = filter.status;
    if (filter?.tableId) where.table = { id: filter.tableId };
    if (filter?.memberId) where.memberId = filter.memberId;
    return this.repo.find({
      where,
      relations: ['table', 'member'],
      order: { reservedAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<ReservationEntity> {
    const reservation = await this.repo.findOne({
      where: { id },
      relations: ['table', 'member']
    });
    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }
    return reservation;
  }

  async update(id: string, dto: UpdateReservationDto): Promise<ReservationEntity> {
    const reservation = await this.findById(id);

    if (dto.tableId && dto.tableId !== reservation.table.id) {
      const table = await this.tableService.findById(dto.tableId);
      if (!table) {
        throw new NotFoundException('Table not found');
      }
      reservation.table = table;
    }

    if (dto.customerName !== undefined) reservation.customerName = dto.customerName;
    if (dto.phone !== undefined) reservation.phone = dto.phone;
    if (dto.partySize !== undefined) reservation.partySize = dto.partySize;
    if (dto.reservedAt !== undefined) reservation.reservedAt = new Date(dto.reservedAt);
    if (dto.seatNumber !== undefined) reservation.seatNumber = dto.seatNumber;
    if (dto.note !== undefined) reservation.note = dto.note;
    if (dto.remark !== undefined) reservation.note = dto.remark;
    if (dto.depositAmount !== undefined) reservation.depositAmount = dto.depositAmount;

    return this.repo.save(reservation);
  }

  async getAvailableTables(date?: string) {
    const tables = await this.tableService.list();
    const reservableTables = tables.filter((table) => table.isActive && table.status !== TableStatus.MAINTENANCE);

    if (!date) {
      return reservableTables.filter((table) => table.status === TableStatus.AVAILABLE);
    }

    const start = new Date(date);
    if (Number.isNaN(start.getTime())) {
      return reservableTables.filter((table) => table.status === TableStatus.AVAILABLE);
    }

    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const reservations = await this.repo.find({
      where: [
        {
          reservedAt: Between(start, end),
          status: ReservationStatus.PENDING,
        },
        {
          reservedAt: Between(start, end),
          status: ReservationStatus.CONFIRMED,
        },
      ],
      relations: ['table'],
    });

    const bookedTableIds = new Set(
      reservations.map((reservation) => reservation.table.id),
    );

    return reservableTables.filter((table) => !bookedTableIds.has(table.id));
  }

  // 创建预约（带订金）- 返回预约ID，前端需要再调用支付接口
  async createWithDeposit(dto: CreateReservationWithDepositDto): Promise<{ reservation: ReservationEntity; needPayment: boolean }> {
    const table = await this.tableService.findById(dto.tableId);
    if (!table) {
      throw new NotFoundException('Table not found');
    }
    if (![TableStatus.AVAILABLE, TableStatus.RESERVED, TableStatus.IN_USE].includes(table.status)) {
      throw new BadRequestException('Table is not available for reservation');
    }

    const entity = this.repo.create({
      customerName: dto.customerName,
      phone: dto.phone,
      partySize: dto.partySize,
      reservedAt: new Date(dto.reservedAt),
      note: dto.note,
      table,
      memberId: dto.memberId,
      status: ReservationStatus.PENDING,
      depositAmount: dto.depositAmount,
      depositPaid: false, // 初始状态为未支付
    });

    const saved = await this.repo.save(entity);

    // 如果订金大于0，则标记桌位为预订状态（但预约状态仍为待确认，直到支付完成）
    if (dto.depositAmount > 0) {
      await this.tableService.updateStatus(table.id, TableStatus.RESERVED);
      await this.redisService.getClient().set(`table:${table.id}:status`, TableStatus.RESERVED);
    }

    return {
      reservation: saved,
      needPayment: dto.depositAmount > 0,
    };
  }

  // 确认订金支付成功
  async confirmDepositPayment(reservationId: string, paymentId: string): Promise<ReservationEntity> {
    const reservation = await this.findById(reservationId);

    reservation.depositPaid = true;
    reservation.paymentId = paymentId;
    reservation.status = ReservationStatus.CONFIRMED; // 支付成功后更新为已确认

    return this.repo.save(reservation);
  }

  // 取消预约
  async cancelReservation(id: string, reason?: string): Promise<ReservationEntity> {
    const reservation = await this.findById(id);

    if (reservation.status === ReservationStatus.CANCELLED) {
      throw new BadRequestException('Reservation already cancelled');
    }

    if (reservation.status === ReservationStatus.CHECKED_IN) {
      throw new BadRequestException('Cannot cancel checked-in reservation');
    }

    reservation.status = ReservationStatus.CANCELLED;
    if (reason) {
      reservation.note = `${reservation.note || ''}\n取消原因: ${reason}`;
    }

    const saved = await this.repo.save(reservation);

    // 释放桌位
    await this.tableService.updateStatus(reservation.table.id, TableStatus.AVAILABLE);
    await this.redisService.getClient().set(`table:${reservation.table.id}:status`, TableStatus.AVAILABLE);

    return saved;
  }

  /**
   * 取消所有过期预约（reservedAt在今天之前的PENDING/CONFIRMED预约）
   * 用于每日凌晨自动清理或管理员手动触发
   */
  async cancelExpiredReservations(): Promise<{ count: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await this.repo
      .createQueryBuilder()
      .update(ReservationEntity)
      .set({ status: ReservationStatus.CANCELLED })
      .where('reservedAt < :today', { today })
      .andWhere('status IN (:...statuses)', {
        statuses: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED],
      })
      .execute();

    return { count: result.affected || 0 };
  }
}
