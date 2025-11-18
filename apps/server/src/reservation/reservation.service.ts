import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateReservationDto } from './dto/create-reservation.dto';
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
  ) {}

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
}
