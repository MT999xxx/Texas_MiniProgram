import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateReservationDto, CreateReservationWithDepositDto } from './dto/create-reservation.dto';
import { ReservationEntity, ReservationStatus } from './reservation.entity';
import { TableService } from '../tables/table.service';
import { TableStatus } from '../tables/table.entity';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class ReservationService {
  constructor(
    @InjectRepository(ReservationEntity)
    private readonly repo: Repository<ReservationEntity>,
    private readonly tableService: TableService,
    private readonly redisService: RedisService,
  ) { }

  async create(dto: CreateReservationDto): Promise<ReservationEntity> {
    const table = await this.tableService.findById(dto.tableId);
    if (!table) {
      throw new NotFoundException('Table not found');
    }
    if (![TableStatus.AVAILABLE, TableStatus.RESERVED].includes(table.status)) {
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

  // 更新预约
  async update(id: string, dto: Partial<CreateReservationDto>): Promise<ReservationEntity> {
    const reservation = await this.repo.findOne({ where: { id } });
    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    if (dto.customerName !== undefined) reservation.customerName = dto.customerName;
    if (dto.phone !== undefined) reservation.phone = dto.phone;
    if (dto.partySize !== undefined) reservation.partySize = dto.partySize;
    if (dto.reservedAt !== undefined) reservation.reservedAt = new Date(dto.reservedAt);
    if (dto.note !== undefined) reservation.note = dto.note;

    return this.repo.save(reservation);
  }

  // 删除预约
  async delete(id: string): Promise<void> {
    const reservation = await this.repo.findOne({ where: { id }, relations: ['table'] });
    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    // 释放桌位
    if (reservation.table) {
      await this.tableService.updateStatus(reservation.table.id, TableStatus.AVAILABLE);
      await this.redisService.getClient().set(`table:${reservation.table.id}:status`, TableStatus.AVAILABLE);
    }

    await this.repo.remove(reservation);
  }

  // 创建预约（带订金）- 返回预约ID，前端需要再调用支付接口
  async createWithDeposit(dto: CreateReservationWithDepositDto): Promise<{ reservation: ReservationEntity; needPayment: boolean }> {
    const table = await this.tableService.findById(dto.tableId);
    if (!table) {
      throw new NotFoundException('Table not found');
    }
    if (![TableStatus.AVAILABLE, TableStatus.RESERVED].includes(table.status)) {
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
}
