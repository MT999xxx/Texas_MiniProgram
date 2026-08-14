import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { CouponEntity, CouponStatus } from './coupon.entity';
import { UserCouponEntity, UserCouponStatus } from './user-coupon.entity';
import { WineVoucherBatchEntity } from '../coins/wine-voucher-batch.entity';
import { getEffectiveWineVoucherBatchExpiresAt } from '../coins/coin-rules';
import { CreateCouponDto, ClaimCouponDto } from './dto/create-coupon.dto';
import { MembershipService } from '../membership/membership.service';

@Injectable()
export class CouponsService {
  constructor(
    @InjectRepository(CouponEntity)
    private readonly couponRepo: Repository<CouponEntity>,
    @InjectRepository(UserCouponEntity)
    private readonly userCouponRepo: Repository<UserCouponEntity>,
    @InjectRepository(WineVoucherBatchEntity)
    private readonly wineVoucherBatchRepo: Repository<WineVoucherBatchEntity>,
    private readonly membershipService: MembershipService,
  ) { }

  // 创建优惠券
  async create(dto: CreateCouponDto): Promise<CouponEntity> {
    const coupon = this.couponRepo.create({
      ...dto,
      startTime: new Date(dto.startTime),
      endTime: new Date(dto.endTime),
      claimedQuantity: 0,
    });

    return this.couponRepo.save(coupon);
  }

  // 获取可领取的优惠券列表
  async getAvailableCoupons(memberId?: string): Promise<CouponEntity[]> {
    const now = new Date();
    let member = null;

    if (memberId) {
      member = await this.membershipService.findMemberById(memberId);
    }

    const queryBuilder = this.couponRepo.createQueryBuilder('coupon')
      .where('coupon.status = :status', { status: CouponStatus.ACTIVE })
      .andWhere('coupon.startTime <= :now', { now })
      .andWhere('coupon.endTime >= :now', { now })
      .andWhere('coupon.claimedQuantity < coupon.totalQuantity');

    // 会员等级筛选
    if (member) {
      queryBuilder.andWhere('(coupon.minMemberLevel IS NULL OR coupon.minMemberLevel <= :memberLevel)', {
        memberLevel: member.level?.threshold || 0
      });
    } else {
      queryBuilder.andWhere('coupon.minMemberLevel IS NULL OR coupon.minMemberLevel <= 1');
    }

    return queryBuilder.orderBy('coupon.createdAt', 'DESC').getMany();
  }

  // 领取优惠券
  async claimCoupon(couponId: string, dto: ClaimCouponDto): Promise<UserCouponEntity> {
    const coupon = await this.couponRepo.findOne({ where: { id: couponId } });
    if (!coupon) {
      throw new NotFoundException('优惠券不存在');
    }

    const member = await this.membershipService.findMemberById(dto.memberId);
    if (!member) {
      throw new NotFoundException('会员不存在');
    }

    // 检查优惠券是否可领取
    const now = new Date();
    if (coupon.status !== CouponStatus.ACTIVE) {
      throw new BadRequestException('优惠券已下架');
    }
    if (coupon.startTime > now || coupon.endTime < now) {
      throw new BadRequestException('优惠券不在有效期内');
    }
    if (coupon.claimedQuantity >= coupon.totalQuantity) {
      throw new BadRequestException('优惠券已被领完');
    }

    // 检查会员等级要求
    if (coupon.minMemberLevel && (!member.level || member.level.threshold < coupon.minMemberLevel)) {
      throw new BadRequestException(`需要达到会员等级${coupon.minMemberLevel}才能领取`);
    }

    // 检查个人领取限制
    if (coupon.limitPerUser) {
      const claimedCount = await this.userCouponRepo.count({
        where: {
          memberId: dto.memberId,
          couponId: couponId
        }
      });
      if (claimedCount >= coupon.limitPerUser) {
        throw new BadRequestException(`每人最多只能领取${coupon.limitPerUser}张`);
      }
    }

    // 计算有效期
    let startTime = now;
    let endTime: Date;

    if (coupon.validDays) {
      // 如果设置了领取后有效天数
      endTime = new Date(now.getTime() + coupon.validDays * 24 * 60 * 60 * 1000);
    } else {
      // 使用优惠券本身的有效期
      endTime = coupon.endTime;
    }

    // 生成优惠券码
    const code = this.generateCouponCode();

    // 创建用户优惠券
    const userCoupon = this.userCouponRepo.create({
      member,
      memberId: dto.memberId,
      coupon,
      couponId,
      code,
      status: UserCouponStatus.AVAILABLE,
      startTime,
      endTime,
    });

    const savedUserCoupon = await this.userCouponRepo.save(userCoupon);

    // 更新优惠券领取数量
    await this.couponRepo.update(couponId, {
      claimedQuantity: coupon.claimedQuantity + 1
    });

    return savedUserCoupon;
  }

  // 获取用户的优惠券列表
  async getUserCoupons(memberId: string, status?: UserCouponStatus): Promise<any[]> {
    const where: any = { memberId };
    if (status) {
      where.status = status;
    }

    // 自动更新过期优惠券状态
    await this.updateExpiredCoupons(memberId);

    const userCoupons = await this.userCouponRepo.find({
      where,
      relations: ['coupon'],
      order: { createdAt: 'DESC' }
    });
    const wineVouchers = await this.getWineVoucherCoupons(memberId, status);

    return [...wineVouchers, ...userCoupons];
  }

  private async getWineVoucherCoupons(memberId: string, status?: UserCouponStatus) {
    const now = new Date();
    let batches: WineVoucherBatchEntity[] = [];
    try {
      batches = await this.wineVoucherBatchRepo.find({
        where: { memberId },
        order: { expiresAt: 'ASC', createdAt: 'DESC' },
      });
    } catch (error) {
      return this.getLegacyWineVoucherCoupons(memberId, status);
    }

    const member = typeof this.membershipService?.findMemberById === 'function'
      ? await this.membershipService.findMemberById(memberId).catch(() => null)
      : null;
    const representedBatchTotal = batches.reduce(
      (sum, batch) => sum + Math.max(0, Number(batch.remainingQuantity || 0)),
      0,
    );

    const wineVouchers = batches.flatMap((batch) => {
      const quantity = Math.max(0, Number(batch.quantity || 0));
      const remainingQuantity = Math.max(0, Number(batch.remainingQuantity || 0));
      const usedQuantity = Math.max(0, quantity - remainingQuantity);
      const effectiveExpiresAt = getEffectiveWineVoucherBatchExpiresAt(batch);
      const remainingStatus = effectiveExpiresAt <= now
        ? UserCouponStatus.EXPIRED
        : UserCouponStatus.AVAILABLE;

      const createVoucher = (itemStatus: UserCouponStatus, index: number) => ({
          id: itemStatus === UserCouponStatus.AVAILABLE
            ? `wine-voucher-${batch.id}-${index + 1}`
            : `wine-voucher-${batch.id}-${itemStatus.toLowerCase()}-${index + 1}`,
          kind: 'WINE_VOUCHER',
          memberId,
          status: itemStatus,
          startTime: batch.createdAt,
          endTime: effectiveExpiresAt,
          remainingQuantity: itemStatus === UserCouponStatus.AVAILABLE ? 1 : 0,
          displayQuantity: 1,
          quantity: 1,
          voucherBatchId: batch.id,
          voucherPackageId: batch.sourceId,
          coupon: {
            id: `wine-voucher-coupon-${batch.id}-${itemStatus.toLowerCase()}-${index + 1}`,
            name: batch.packageName || '酒券',
            type: 'WINE_VOUCHER',
            value: 1,
            description: '酒券15天有效，过期自动失效',
            minMemberLevel: null,
          },
        });

      return [
        ...Array.from({ length: usedQuantity }, (_, index) => (
          createVoucher(UserCouponStatus.USED, index)
        )),
        ...Array.from({ length: remainingQuantity }, (_, index) => (
          createVoucher(remainingStatus, index)
        )),
      ];
    });

    const legacyRemainder = Math.max(
      0,
      Number(member?.wineVouchers || 0) - representedBatchTotal,
    );
    const legacyVouchers = this.createLegacyWineVoucherCoupons(memberId, legacyRemainder);

    return [...wineVouchers, ...legacyVouchers]
      .filter((item) => !status || item.status === status);
  }

  private async getLegacyWineVoucherCoupons(memberId: string, status?: UserCouponStatus) {
    if (status && status !== UserCouponStatus.AVAILABLE) {
      return [];
    }

    const member = await this.membershipService.findMemberById(memberId).catch(() => null);
    const remainingQuantity = Number(member?.wineVouchers || 0);
    if (remainingQuantity <= 0) {
      return [];
    }

    return this.createLegacyWineVoucherCoupons(memberId, remainingQuantity);
  }

  private createLegacyWineVoucherCoupons(memberId: string, quantity: number) {
    if (quantity <= 0) return [];
    const now = new Date();
    const fallbackExpiresAt = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
    return [{
      id: `legacy-wine-voucher-${memberId}`,
      kind: 'WINE_VOUCHER',
      memberId,
      status: UserCouponStatus.AVAILABLE,
      startTime: now,
      endTime: fallbackExpiresAt,
      remainingQuantity: quantity,
      displayQuantity: quantity,
      quantity,
      voucherBatchId: null,
      voucherPackageId: null,
      coupon: {
        id: `legacy-wine-voucher-coupon-${memberId}`,
        name: '酒券',
        type: 'WINE_VOUCHER',
        value: quantity,
        description: '历史酒券，请尽快使用',
        minMemberLevel: null,
      },
    }];
  }

  // 使用优惠券
  async useCoupon(userCouponId: string, orderId: string): Promise<UserCouponEntity> {
    const userCoupon = await this.userCouponRepo.findOne({
      where: { id: userCouponId },
      relations: ['coupon']
    });

    if (!userCoupon) {
      throw new NotFoundException('优惠券不存在');
    }

    if (userCoupon.status !== UserCouponStatus.AVAILABLE) {
      throw new BadRequestException('优惠券不可用');
    }

    const now = new Date();
    if (userCoupon.startTime > now || userCoupon.endTime < now) {
      throw new BadRequestException('优惠券已过期');
    }

    // 更新优惠券状态
    userCoupon.status = UserCouponStatus.USED;
    userCoupon.usedOrderId = orderId;
    userCoupon.usedAt = now;

    return this.userCouponRepo.save(userCoupon);
  }

  // 计算优惠券折扣金额
  calculateDiscount(userCoupon: UserCouponEntity, orderAmount: number): number {
    const { coupon } = userCoupon;

    // 检查最低消费要求
    if (coupon.minAmount && orderAmount < Number(coupon.minAmount)) {
      return 0;
    }

    let discount = 0;

    switch (coupon.type) {
      case 'AMOUNT':
        // 满减券
        discount = Number(coupon.value);
        break;
      case 'DISCOUNT':
        // 折扣券 (例如8折，value=0.8)
        discount = orderAmount * (1 - Number(coupon.value));
        break;
      case 'PERCENTAGE':
        // 百分比折扣 (例如减免20%，value=20)
        discount = orderAmount * (Number(coupon.value) / 100);
        break;
    }

    // 应用最大折扣限制
    if (coupon.maxDiscount && discount > Number(coupon.maxDiscount)) {
      discount = Number(coupon.maxDiscount);
    }

    // 折扣不能超过订单金额
    return Math.min(discount, orderAmount);
  }

  // 生成优惠券码
  private generateCouponCode(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `CPN${timestamp}${random}`.toUpperCase();
  }

  // 更新过期的优惠券
  private async updateExpiredCoupons(memberId: string): Promise<void> {
    const now = new Date();
    await this.userCouponRepo.update(
      {
        memberId,
        status: UserCouponStatus.AVAILABLE,
        endTime: LessThan(now)
      },
      {
        status: UserCouponStatus.EXPIRED
      }
    );
  }

  // 管理员获取所有优惠券
  async findAll(): Promise<CouponEntity[]> {
    return this.couponRepo.find({
      order: { createdAt: 'DESC' }
    });
  }

  // 根据ID获取优惠券详情
  async findById(id: string): Promise<CouponEntity> {
    const coupon = await this.couponRepo.findOne({ where: { id } });
    if (!coupon) {
      throw new NotFoundException('优惠券不存在');
    }
    return coupon;
  }

  // 更新优惠券状态
  async updateStatus(id: string, status: CouponStatus): Promise<CouponEntity> {
    const coupon = await this.findById(id);
    coupon.status = status;
    return this.couponRepo.save(coupon);
  }
}
