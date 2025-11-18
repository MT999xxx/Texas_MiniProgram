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
import { CouponsService } from '../coupons/coupons.service';
import { UserCouponEntity, UserCouponStatus } from '../coupons/user-coupon.entity';
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
    @InjectRepository(UserCouponEntity)
    private readonly userCouponRepo: Repository<UserCouponEntity>,
    private readonly redisService: RedisService,
    private readonly tableService: TableService,
    private readonly reservationService: ReservationService,
    private readonly membershipService: MembershipService,
    private readonly loyaltyService: LoyaltyService,
    private readonly couponsService: CouponsService,
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

    // 验证并处理优惠券
    let userCoupon: UserCouponEntity | undefined;
    if (dto.userCouponId) {
      userCoupon = await this.userCouponRepo.findOne({
        where: { id: dto.userCouponId, member: { id: dto.memberId } },
        relations: ['coupon', 'member'],
      });

      if (!userCoupon) {
        throw new NotFoundException('User coupon not found');
      }

      if (userCoupon.status !== UserCouponStatus.AVAILABLE) {
        throw new BadRequestException('Coupon is not available');
      }

      // 检查优惠券是否过期
      const now = new Date();
      if (userCoupon.endTime < now) {
        throw new BadRequestException('Coupon has expired');
      }
    }

    const items: OrderItemEntity[] = [];
    let originalAmount = 0;
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
      originalAmount += amount;
      items.push(
        this.orderItemRepo.create({
          menuItem,
          quantity: itemDto.quantity,
          amount,
        }),
      );
    }
    await this.menuRepo.save(menuItems);

    // 计算优惠券折扣
    let discountAmount = 0;
    let finalAmount = originalAmount;

    if (userCoupon) {
      // 检查最低消费要求
      if (userCoupon.coupon.minAmount && originalAmount < userCoupon.coupon.minAmount) {
        throw new BadRequestException(`Minimum amount ${userCoupon.coupon.minAmount} required to use this coupon`);
      }

      // 计算折扣金额
      discountAmount = this.couponsService.calculateDiscount(userCoupon, originalAmount);
      finalAmount = Math.max(0, originalAmount - discountAmount);

      // 标记优惠券为已使用
      userCoupon.status = UserCouponStatus.USED;
      userCoupon.usedAt = new Date();
      await this.userCouponRepo.save(userCoupon);
    }

    const order = this.orderRepo.create({
      orderNumber: this.generateOrderNumber(),
      member,
      reservation,
      table,
      userCoupon,
      originalAmount: dto.originalAmount || originalAmount,
      discountAmount: dto.discountAmount || discountAmount,
      totalAmount: dto.finalAmount || finalAmount,
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

  list(filter?: { status?: OrderStatus; memberId?: string; tableId?: string }) {
    const where: any = {};
    if (filter?.status) where.status = filter.status;
    if (filter?.memberId) where.member = { id: filter.memberId };
    if (filter?.tableId) where.table = { id: filter.tableId };

    return this.orderRepo.find({
      where,
      relations: ['member', 'table', 'reservation', 'items', 'items.menuItem'],
      order: { createdAt: 'DESC' }
    });
  }

  async findById(id: string) {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ['member', 'table', 'reservation', 'items', 'items.menuItem', 'items.menuItem.category'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
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

  // 生成订单号
  private generateOrderNumber(): string {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `TXP${year}${month}${day}${hours}${minutes}${seconds}${random}`;
  }

  // 更新订单支付状态
  async markAsPaid(orderId: string): Promise<OrderEntity> {
    const order = await this.findById(orderId);
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('订单状态不允许支付');
    }

    order.status = OrderStatus.PAID;
    order.paidAt = new Date();
    const saved = await this.orderRepo.save(order);

    await this.redisService.getClient().set(`order:${saved.id}:status`, saved.status);

    // 给会员奖励积分
    if (order.member) {
      await this.loyaltyService.awardPointsForOrder(saved);
    }

    return saved;
  }

  // 标记订单支付失败
  async markAsPaymentFailed(orderId: string): Promise<OrderEntity> {
    const order = await this.findById(orderId);
    order.status = OrderStatus.PAYMENT_FAILED;
    const saved = await this.orderRepo.save(order);
    await this.redisService.getClient().set(`order:${saved.id}:status`, saved.status);
    return saved;
  }

  // 根据订单号查找订单
  async findByOrderNumber(orderNumber: string): Promise<OrderEntity> {
    const order = await this.orderRepo.findOne({
      where: { orderNumber },
      relations: ['member', 'table', 'reservation', 'items', 'items.menuItem'],
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    return order;
  }
}
