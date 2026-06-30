import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
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
import { MemberEntity } from '../membership/member.entity';
import { CoinTransactionEntity, CoinTransactionType, CoinTransactionStatus } from '../coins/coin-transaction.entity';
import { WineVoucherBatchEntity } from '../coins/wine-voucher-batch.entity';
import { WineVoucherRedemptionEntity } from '../coins/wine-voucher-redemption.entity';
import {
  WINE_VOUCHER_PURCHASE_BONUS_POINTS,
  getCoinConsumptionBonusPoints,
  getEffectiveWineVoucherBatchExpiresAt,
  getWineVoucherExpiresAt,
  isWineVoucherMenuItem,
} from '../coins/coin-rules';
import { WechatPayService } from '../payment/wechat-pay.service';
import { PaymentEntity, PaymentStatus } from '../payment/payment.entity';
import { AdminNotificationsService } from '../notifications/admin-notifications.service';

type WineVoucherRedemptionOrderInput = {
  memberId: string;
  tableId: string;
  optionName: string;
  items: { menuItemId: string; quantity: number; specType?: string }[];
  redemption?: WineVoucherRedemptionEntity;
};

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
    @InjectRepository(MemberEntity)
    private readonly memberRepo: Repository<MemberEntity>,
    @InjectRepository(CoinTransactionEntity)
    private readonly coinTransactionRepo: Repository<CoinTransactionEntity>,
    @InjectRepository(WineVoucherBatchEntity)
    private readonly wineVoucherBatchRepo: Repository<WineVoucherBatchEntity>,
    @InjectRepository(PaymentEntity)
    private readonly paymentRepo: Repository<PaymentEntity>,
    private readonly redisService: RedisService,
    private readonly tableService: TableService,
    private readonly reservationService: ReservationService,
    private readonly membershipService: MembershipService,
    private readonly loyaltyService: LoyaltyService,
    private readonly couponsService: CouponsService,
    private readonly wechatPayService: WechatPayService,
    @Optional()
    private readonly adminNotificationsService?: AdminNotificationsService,
  ) { }

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
      const foundReservation = await this.reservationRepo.findOne({ where: { id: dto.reservationId }, relations: ['table'] });
      if (!foundReservation) throw new NotFoundException('Reservation not found');
      reservation = foundReservation;
      table = reservation.table;
      if (reservation.status !== ReservationStatus.CHECKED_IN) {
        await this.reservationService.updateStatus(reservation.id, ReservationStatus.CHECKED_IN);
      }
    } else if (dto.tableId) {
      const foundTable = await this.tableRepo.findOne({ where: { id: dto.tableId } });
      if (!foundTable) throw new NotFoundException('Table not found');
      table = foundTable;
      if (table.status === TableStatus.AVAILABLE) {
        await this.tableService.updateStatus(table.id, TableStatus.IN_USE);
      }
    }

    const member = dto.memberId
      ? await this.membershipService.findMemberById(dto.memberId)
      : undefined;
    if (dto.memberId && !member) {
      throw new NotFoundException('Member not found');
    }

    // 验证并处理优惠券
    let userCoupon: UserCouponEntity | undefined;
    if (dto.userCouponId) {
      const foundCoupon = await this.userCouponRepo.findOne({
        where: { id: dto.userCouponId, member: { id: dto.memberId } },
        relations: ['coupon', 'member'],
      });

      if (!foundCoupon) {
        throw new NotFoundException('User coupon not found');
      }

      userCoupon = foundCoupon;

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

      // 根据规格类型选择正确的单价
      let unitPrice = Number(menuItem.price);
      if (itemDto.specType === 'half_dozen' && menuItem.halfDozenPrice) {
        unitPrice = Number(menuItem.halfDozenPrice);
      } else if (itemDto.specType === 'dozen' && menuItem.dozenPrice) {
        unitPrice = Number(menuItem.dozenPrice);
      }

      const amount = unitPrice * itemDto.quantity;
      originalAmount += amount;
      items.push(
        this.orderItemRepo.create({
          menuItem,
          quantity: itemDto.quantity,
          unitPrice,
          specType: itemDto.specType || 'single',
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
      member: member || undefined,
      reservation,
      table,
      // userCoupon,  // TODO: 优惠券功能待实现，当前 OrderEntity 中未定义此属性
      originalAmount: dto.originalAmount || originalAmount,
      discountAmount: dto.discountAmount || discountAmount,
      totalAmount: dto.finalAmount || finalAmount,
      status: OrderStatus.PENDING,
      items,
    });

    const saved: OrderEntity = await this.orderRepo.save(order);
    await this.redisService.getClient().set(`order:${saved.id}:status`, saved.status);
    if (table) {
      await this.redisService.getClient().set(`table:${table.id}:lastOrder`, saved.id);
    }
    await this.adminNotificationsService?.createOrderNotification(saved).catch(() => undefined);
    return saved;
  }

  async createWineVoucherRedemptionOrder(
    dto: WineVoucherRedemptionOrderInput,
    manager?: EntityManager,
  ): Promise<OrderEntity> {
    const orderRepo = manager?.getRepository(OrderEntity) || this.orderRepo;
    const orderItemRepo = manager?.getRepository(OrderItemEntity) || this.orderItemRepo;
    const menuRepo = manager?.getRepository(MenuItemEntity) || this.menuRepo;
    const memberRepo = manager?.getRepository(MemberEntity) || this.memberRepo;
    const tableRepo = manager?.getRepository(TableEntity) || this.tableRepo;

    const member = await memberRepo.findOne({ where: { id: dto.memberId } });
    if (!member) throw new NotFoundException('会员不存在');

    const table = await tableRepo.findOne({ where: { id: dto.tableId } });
    if (!table) throw new NotFoundException('桌位不存在');
    if (table.status === TableStatus.AVAILABLE) {
      table.status = TableStatus.IN_USE;
      await tableRepo.save(table);
    }

    const menuIds = dto.items.map((item) => item.menuItemId);
    const menuItems = await menuRepo.find({ where: { id: In(menuIds) } });
    if (menuItems.length !== menuIds.length) {
      throw new NotFoundException('兑换商品不存在');
    }

    const items: OrderItemEntity[] = [];
    let originalAmount = 0;
    for (const itemDto of dto.items) {
      const menuItem = menuItems.find((item) => item.id === itemDto.menuItemId)!;
      if (menuItem.stock < itemDto.quantity) {
        throw new BadRequestException(`库存不足：${menuItem.name}`);
      }

      menuItem.stock -= itemDto.quantity;
      if (menuItem.stock === 0) {
        menuItem.status = 'SOLD_OUT' as any;
      }

      let unitPrice = Number(menuItem.price);
      if (itemDto.specType === 'half_dozen' && menuItem.halfDozenPrice) {
        unitPrice = Number(menuItem.halfDozenPrice);
      } else if (itemDto.specType === 'dozen' && menuItem.dozenPrice) {
        unitPrice = Number(menuItem.dozenPrice);
      }

      const amount = unitPrice * itemDto.quantity;
      originalAmount += amount;
      items.push(orderItemRepo.create({
        menuItem,
        quantity: itemDto.quantity,
        unitPrice,
        specType: itemDto.specType || 'single',
        amount,
      }));
    }

    await menuRepo.save(menuItems);

    const order = orderRepo.create({
      orderNumber: this.generateOrderNumber(),
      member,
      table,
      originalAmount,
      discountAmount: originalAmount,
      totalAmount: 0,
      status: OrderStatus.PAID,
      paidAt: new Date(),
      notes: `酒券兑换：${dto.optionName}`,
      items,
    });
    order.paymentMethod = 'wine_voucher';

    const saved = await orderRepo.save(order);
    await this.redisService.getClient().set(`order:${saved.id}:status`, saved.status);
    await this.redisService.getClient().set(`table:${table.id}:lastOrder`, saved.id);
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

  /**
   * 获取订单统计数据
   */
  async getStats() {
    // 获取所有订单
    const orders = await this.orderRepo.find();

    // 计算各项统计
    const totalOrders = orders.length;
    const totalAmount = orders
      .filter(o => o.status === OrderStatus.PAID || o.status === OrderStatus.COMPLETED)
      .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
    const completedOrders = orders.filter(o => o.status === OrderStatus.COMPLETED || o.status === OrderStatus.PAID).length;
    const averageAmount = completedOrders > 0 ? totalAmount / completedOrders : 0;

    return {
      totalOrders,       // 订单数量
      totalAmount,       // 总营收
      completedOrders,   // 已完成
      averageAmount,     // 客单价
    };
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
      relations: ['member', 'items', 'items.menuItem', 'items.menuItem.category'],
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

  async updateRemark(id: string, remark: string): Promise<OrderEntity> {
    const order = await this.findById(id);
    order.notes = remark;
    return this.orderRepo.save(order);
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
    order.paymentMethod = 'wechat_pay';
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

  // 使用金币支付订单
  async payWithCoins(orderId: string, memberId: string): Promise<OrderEntity> {
    const order = await this.findById(orderId);

    // 验证订单状态
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('订单状态不允许支付');
    }

    // 获取会员信息
    const member = await this.memberRepo.findOne({ where: { id: memberId } });
    if (!member) {
      throw new NotFoundException('会员不存在');
    }

    const orderAmount = Number(order.totalAmount);
    const memberCoins = Number(member.coins || 0);

    // 验证金币余额
    if (memberCoins < orderAmount) {
      throw new BadRequestException(`金币余额不足，需要${orderAmount}金币，当前余额${memberCoins}金币`);
    }

    const consumptionBonusPoints = getCoinConsumptionBonusPoints(
      this.getCoinRewardableAmount(order),
    );

    // 扣除金币
    member.coins = memberCoins - orderAmount;
    member.points = Number(member.points || 0) + consumptionBonusPoints;
    await this.memberRepo.save(member);

    // 记录金币消费交易
    const transaction = this.coinTransactionRepo.create({
      memberId,
      type: CoinTransactionType.CONSUME,
      amount: -orderAmount,
      status: CoinTransactionStatus.SUCCESS,
      remark: `订单支付: ${order.orderNumber}`,
    });
    await this.coinTransactionRepo.save(transaction);

    // 标记订单为已支付
    order.status = OrderStatus.PAID;
    order.paymentMethod = 'coins';
    const saved = await this.orderRepo.save(order);
    await this.redisService.getClient().set(`order:${saved.id}:status`, saved.status);

    await this.grantWineVoucherBenefitsForOrder(saved);

    return saved;
  }

  private getCoinRewardableAmount(order: OrderEntity): number {
    const items = order.items || [];
    if (items.length === 0) {
      return Number(order.totalAmount || 0);
    }

    const nonVoucherAmount = items
      .filter((item) => !isWineVoucherMenuItem(item.menuItem as any))
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    return Math.min(nonVoucherAmount, Number(order.totalAmount || 0));
  }

  /**
   * 酒卷抵扣鸡尾酒：扣减酒卷并更新订单抵扣金额
   * 若抵扣后余额为0则直接标记PAID，否则保持PENDING等待支付
   */
  async payWithWineVouchers(
    orderId: string,
    memberId: string,
    vouchersToUse: number,
    cocktailDiscount: number,
  ): Promise<{ remainingAmount: number; order: OrderEntity }> {
    const order = await this.findById(orderId);
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('订单状态不允许使用酒卷');
    }
    const member = await this.memberRepo.findOne({ where: { id: memberId } });
    if (!member) throw new NotFoundException('会员不存在');
    const availableVouchers = await this.getAvailableWineVoucherCount(memberId, Number(member.wineVouchers || 0));
    if (availableVouchers < vouchersToUse) {
      throw new BadRequestException(`酒券余额不足，需要${vouchersToUse}张，当前${availableVouchers}张`);
    }
    await this.consumeWineVoucherBatches(memberId, vouchersToUse);
    member.wineVouchers = Math.max(0, Number(member.wineVouchers || 0) - vouchersToUse);
    await this.memberRepo.save(member);
    // 更新订单折扣和应付金额
    const newDiscount = Number(order.discountAmount || 0) + cocktailDiscount;
    const newTotal = Math.max(0, Number(order.totalAmount) - cocktailDiscount);
    order.discountAmount = newDiscount;
    order.totalAmount = newTotal;
    // 若完全抵扣，直接标记已支付
    if (newTotal <= 0) {
      order.status = OrderStatus.PAID;
      order.paymentMethod = '鸡尾酒优惠卷';
      order.paidAt = new Date();
    }
    const saved = await this.orderRepo.save(order);
    await this.redisService.getClient().set(`order:${saved.id}:status`, saved.status);
    if (saved.status === OrderStatus.PAID && order.member) {
      await this.loyaltyService.awardPointsForOrder(saved);
      await this.grantWineVoucherBenefitsForOrder(saved);
    }
    return { remainingAmount: newTotal, order: saved };
  }

  private async getAvailableWineVoucherCount(memberId: string, legacyCount = 0): Promise<number> {
    const batches = await this.wineVoucherBatchRepo.find({
      where: {
        memberId,
      },
    });
    const now = new Date();
    const batchTotal = batches
      .filter((batch) => getEffectiveWineVoucherBatchExpiresAt(batch) >= now)
      .reduce((sum, batch) => sum + Math.max(0, Number(batch.remainingQuantity || 0)), 0);
    return batchTotal > 0 ? batchTotal : legacyCount;
  }

  private async consumeWineVoucherBatches(memberId: string, quantity: number): Promise<void> {
    if (quantity <= 0) return;
    let remaining = quantity;
    const batches = await this.wineVoucherBatchRepo.find({
      where: {
        memberId,
      },
      order: { expiresAt: 'ASC', createdAt: 'ASC' },
    });
    const now = new Date();

    for (const batch of batches.filter((item) => getEffectiveWineVoucherBatchExpiresAt(item) >= now)) {
      if (remaining <= 0) break;
      const available = Math.max(0, Number(batch.remainingQuantity || 0));
      if (available <= 0) continue;
      const used = Math.min(available, remaining);
      batch.remainingQuantity = available - used;
      remaining -= used;
      await this.wineVoucherBatchRepo.save(batch);
    }
  }

  private async grantWineVoucherBenefitsForOrder(order: OrderEntity): Promise<void> {
    const fullOrder = await this.orderRepo.findOne({
      where: { id: order.id },
      relations: ['member', 'items', 'items.menuItem', 'items.menuItem.category'],
    });
    if (!fullOrder?.member) return;

    const voucherQuantity = (fullOrder.items || [])
      .filter((item) => item.menuItem && isWineVoucherMenuItem(item.menuItem as any))
      .reduce((sum, item) => sum + Number(item.quantity || 0), 0);

    if (voucherQuantity <= 0) return;

    const expiresAt = getWineVoucherExpiresAt();
    const memberId = fullOrder.member.id;
    const voucherBatches = Array.from({ length: voucherQuantity }, () => this.wineVoucherBatchRepo.create({
      memberId,
      sourceType: 'menu_order',
      sourceId: fullOrder.id,
      packageName: '点单酒券',
      quantity: 1,
      remainingQuantity: 1,
      bonusPoints: WINE_VOUCHER_PURCHASE_BONUS_POINTS,
      expiresAt,
      remark: `订单${fullOrder.orderNumber}购买酒券`,
    }));
    await this.wineVoucherBatchRepo.save(voucherBatches);

    const member = await this.memberRepo.findOne({ where: { id: memberId } });
    if (!member) return;
    member.wineVouchers = Number(member.wineVouchers || 0) + voucherQuantity;
    member.points = Number(member.points || 0) + WINE_VOUCHER_PURCHASE_BONUS_POINTS * voucherQuantity;
    await this.memberRepo.save(member);
  }

  /**
   * 管理员退款：回补库存 + 金币退还（如果是金币支付）+ 状态标记为 CANCELLED
   * @param orderId 订单ID
   * @param reason  退款原因
   * @param amount  退款金额（可选，默认全额退款）
   */
  async refund(orderId: string, reason: string, amount?: number): Promise<OrderEntity> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['member', 'items', 'items.menuItem'],
    });
    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    if (order.status !== OrderStatus.PAID && order.status !== OrderStatus.COMPLETED && order.status !== OrderStatus.CANCELLED) {
      throw new BadRequestException('仅已支付、已完成或已取消的订单可退款');
    }

    // 前端 <Input type="number"> 可能传入字符串，强制转为数字
    const refundAmount = amount != null ? Number(amount) : Number(order.totalAmount);

    // 查找该订单的微信支付记录（无论 paymentMethod 字段是否正确设置）
    if (order.paymentMethod !== 'coins') {
      const payment = await this.paymentRepo.findOne({
        where: { order: { id: orderId }, status: PaymentStatus.SUCCESS },
        order: { createdAt: 'DESC' },
      });

      if (payment) {
        const refundNo = `REFUND_${Date.now()}_${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
        try {
          await this.wechatPayService.refund({
            outTradeNo: payment.paymentOrderNo,
            outRefundNo: refundNo,
            refundAmount: Math.round(refundAmount * 100),
            totalAmount: Number(payment.amount),
            reason,
          });
        } catch (err: any) {
          throw new BadRequestException(`微信退款失败: ${err.message || '未知错误'}`);
        }
      }
    }

    // 金币支付订单：退还金币到会员账户
    if (order.paymentMethod === 'coins' && order.member) {
      const member = await this.memberRepo.findOne({ where: { id: order.member.id } });
      if (member) {
        member.coins = Number(member.coins || 0) + refundAmount;
        await this.memberRepo.save(member);

        const transaction = this.coinTransactionRepo.create({
          memberId: member.id,
          type: CoinTransactionType.REFUND,
          amount: refundAmount,
          status: CoinTransactionStatus.SUCCESS,
          remark: `订单退款: ${order.orderNumber}，原因: ${reason}`,
        });
        await this.coinTransactionRepo.save(transaction);
      }
    }

    // 回补库存
    await this.restockItems(order);

    // 标记为已取消
    order.status = OrderStatus.CANCELLED;
    order.notes = `[退款] ${reason}`;
    const saved = await this.orderRepo.save(order);
    await this.redisService.getClient().set(`order:${saved.id}:status`, saved.status);

    return saved;
  }
}
