import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { OrderEntity, OrderStatus } from './order.entity';
import { OrderItemEntity } from './order-item.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { MenuItemEntity } from '../menu/menu-item.entity';
import { ReservationEntity, ReservationStatus } from '../reservation/reservation.entity';
import { TableEntity, TableStatus } from '../tables/table.entity';
import { RedisService } from '../redis/redis.service';
import { TableService } from '../tables/table.service';
import { ReservationService } from '../reservation/reservation.service';
import { MembershipService } from '../membership/membership.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
    @InjectRepository(OrderItemEntity)
    private readonly orderItemRepo: Repository<OrderItemEntity>,
    @InjectRepository(MenuItemEntity)
    private readonly menuRepo: Repository<MenuItemEntity>,
    @InjectRepository(ReservationEntity)
    private readonly reservationRepo: Repository<ReservationEntity>,
    @InjectRepository(TableEntity)
    private readonly tableRepo: Repository<TableEntity>,
    private readonly redisService: RedisService,
    private readonly tableService: TableService,
    private readonly reservationService: ReservationService,
    private readonly membershipService: MembershipService,
    private readonly loyaltyService: LoyaltyService,
  ) {}

  async create(dto: CreateOrderDto) {
    const menuIds = dto.items.map((item) => item.menuItemId);
    const menuItems = await this.menuRepo.find({
      where: { id: In(menuIds) },
    });
    if (menuItems.length !== menuIds.length) {
      throw new NotFoundException('Some menu items not found');
    }

    let reservation: ReservationEntity | undefined;
    let table: TableEntity | undefined;
    if (dto.reservationId) {
      reservation = await this.reservationRepo.findOne({ where: { id: dto.reservationId }, relations: ['table'] });
      if (!reservation) throw new NotFoundException('Reservation not found');
      table = reservation.table;
      if (reservation.status !== ReservationStatus.CHECKED_IN) {
        await this.reservationService.updateStatus(reservation.id, ReservationStatus.CHECKED_IN);
      }
    } else if (dto.tableId) {
      table = await this.tableRepo.findOne({ where: { id: dto.tableId } });
      if (!table) throw new NotFoundException('Table not found');
      if (table.status === TableStatus.AVAILABLE) {
        await this.tableService.updateStatus(table.id, TableStatus.IN_USE);
      }
    }

    let member = undefined;
    if (dto.memberId) {
      member = await this.membershipService.findMemberById(dto.memberId);
      if (!member) throw new NotFoundException('Member not found');
    }

    const items: OrderItemEntity[] = [];
    let totalAmount = 0;
    for (const itemDto of dto.items) {
      const menuItem = menuItems.find((m) => m.id === itemDto.menuItemId)!;
      if (menuItem.stock < itemDto.quantity) {
        throw new BadRequestException(`Insufficient stock for ${menuItem.name}`);
      }
      menuItem.stock -= itemDto.quantity;
      if (menuItem.stock === 0) {
        menuItem.status = 'SOLD_OUT' as any;
      }
      const amount = Number(menuItem.price) * itemDto.quantity;
      totalAmount += amount;
      items.push(
        this.orderItemRepo.create({
          menuItem,
          quantity: itemDto.quantity,
          amount,
        }),
      );
    }
    await this.menuRepo.save(menuItems);

    const order = this.orderRepo.create({
      member,
      reservation,
      table,
      totalAmount,
      status: OrderStatus.PENDING,
      items,
    });
    const saved = await this.orderRepo.save(order);
    await this.redisService.getClient().set(`order:${saved.id}:status`, saved.status);
    if (table) {
      await this.redisService.getClient().set(`table:${table.id}:lastOrder`, saved.id);
    }
    return saved;
  }

  list() {
    return this.orderRepo.find({ order: { createdAt: 'DESC' } });
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto) {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ['member', 'items', 'items.menuItem'],
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    const prevStatus = order.status;
    order.status = dto.status;
    const saved = await this.orderRepo.save(order);
    await this.redisService.getClient().set(`order:${saved.id}:status`, saved.status);
    if (dto.status === OrderStatus.PAID) {
      await this.loyaltyService.awardPointsForOrder(saved);
    } else if (dto.status === OrderStatus.CANCELLED && prevStatus !== OrderStatus.CANCELLED) {
      // 退款/取消时回补库存；只在状态首次变为 CANCELLED 时执行
      await this.restockItems(order);
    }
    return saved;
  }

  private async restockItems(order: OrderEntity) {
    const itemIds = order.items.map((i) => i.menuItem.id);
    const menuItems = await this.menuRepo.find({ where: { id: In(itemIds) } });
    const menuMap = new Map(menuItems.map((m) => [m.id, m]));
    for (const item of order.items) {
      const menu = menuMap.get(item.menuItem.id);
      if (!menu) continue;
      menu.stock += item.quantity;
      if (menu.stock > 0 && menu.status === 'SOLD_OUT') {
        menu.status = 'ON_SALE' as any;
      }
    }
    await this.menuRepo.save(Array.from(menuMap.values()));
  }
}
