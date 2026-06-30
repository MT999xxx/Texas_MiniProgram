import { Injectable, Logger, BadRequestException, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { PaymentEntity, PaymentType, PaymentStatus, PaymentMethod, RechargeRecordEntity, RechargePackageEntity } from './payment.entity';
import { WechatPayOrderRequest, WechatPayService } from './wechat-pay.service';
import { MemberEntity } from '../membership/member.entity';
import { OrderEntity, OrderStatus } from '../orders/order.entity';
import { ReservationEntity } from '../reservation/reservation.entity';
import { CoinTransactionEntity, CoinTransactionType, CoinTransactionStatus } from '../coins/coin-transaction.entity';
import { WineVoucherBatchEntity } from '../coins/wine-voucher-batch.entity';
import {
  COIN_RECHARGE_PACKAGES,
  WINE_VOUCHER_PURCHASE_BONUS_POINTS,
  getCoinRechargePackageFromCents,
  getWineVoucherExpiresAt,
  isWineVoucherMenuItem,
} from '../coins/coin-rules';
import { LoyaltyService } from '../loyalty/loyalty.service';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(PaymentEntity)
    private paymentRepo: Repository<PaymentEntity>,
    @InjectRepository(RechargeRecordEntity)
    private rechargeRepo: Repository<RechargeRecordEntity>,
    @InjectRepository(RechargePackageEntity)
    private packageRepo: Repository<RechargePackageEntity>,
    @InjectRepository(MemberEntity)
    private memberRepo: Repository<MemberEntity>,
    @InjectRepository(OrderEntity)
    private orderRepo: Repository<OrderEntity>,
    @InjectRepository(ReservationEntity)
    private reservationRepo: Repository<ReservationEntity>,
    @InjectRepository(CoinTransactionEntity)
    private coinTransactionRepo: Repository<CoinTransactionEntity>,
    @InjectRepository(WineVoucherBatchEntity)
    private wineVoucherBatchRepo: Repository<WineVoucherBatchEntity>,
    private wechatPayService: WechatPayService,
    @Optional()
    private readonly loyaltyService?: LoyaltyService,
  ) { }

  // ========== 创建支付 ==========

  // 创建订单支付
  async createOrderPayment(orderId: string, memberId: string, openid?: string) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['member'],
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('订单状态不允许支付');
    }

    // 创建支付记录
    const member = await this.memberRepo.findOne({ where: { id: memberId } });
    if (!member) {
      throw new NotFoundException('用户不存在');
    }

    const payment = this.paymentRepo.create({
      type: PaymentType.ORDER_PAYMENT,
      method: PaymentMethod.WECHAT_PAY,
      status: PaymentStatus.PENDING,
      amount: Math.round(Number(order.totalAmount) * 100), // 转换为分
      description: `订单支付 - ${order.orderNumber}`,
      paymentOrderNo: this.generateTradeNo('ORDER'),
      member,
      order,
    });

    const saved = await this.paymentRepo.save(payment);

    // 调用微信支付
    const payerOpenid = this.resolvePayerOpenid(openid, member || order.member);
    const wechatPayResult = await this.createWechatPaymentOrFail(payment, {
      outTradeNo: saved.paymentOrderNo,
      description: saved.description || '订单支付',
      amount: Number(saved.amount),
      openid: payerOpenid,
    }, '创建微信支付订单失败');

    // 更新支付状态为PROCESSING
    payment.status = PaymentStatus.PROCESSING;
    payment.thirdPartyOrderNo = wechatPayResult.prepayId;
    await this.paymentRepo.save(payment);

    return {
      paymentId: saved.id,
      paymentOrderNo: saved.paymentOrderNo,
      amount: saved.amount,
      // 微信支付参数
      ...wechatPayResult,
    };
  }

  // 创建预约订金支付
  async createReservationPayment(reservationId: string, depositAmount: number, memberId: string, openid?: string) {
    const reservation = await this.reservationRepo.findOne({
      where: { id: reservationId },
      relations: ['table', 'member'],
    });

    if (!reservation) {
      throw new NotFoundException('预约不存在');
    }

    if (reservation.depositPaid) {
      throw new BadRequestException('订金已支付');
    }

    // 创建支付记录
    const member = await this.memberRepo.findOne({ where: { id: memberId } });
    if (!member) {
      throw new NotFoundException('用户不存在');
    }

    const payment = this.paymentRepo.create({
      type: PaymentType.RESERVATION_DEPOSIT,
      method: PaymentMethod.WECHAT_PAY,
      status: PaymentStatus.PENDING,
      amount: Math.round(depositAmount * 100), // 转换为分
      description: `预约订金 - ${reservation.table.name}`,
      paymentOrderNo: this.generateTradeNo('RESERVATION'),
      member,
      reservationId,
    });

    const saved = await this.paymentRepo.save(payment);

    // 调用微信支付
    const payerOpenid = this.resolvePayerOpenid(openid, member);
    const wechatPayResult = await this.createWechatPaymentOrFail(payment, {
      outTradeNo: saved.paymentOrderNo,
      description: saved.description || '预约订金',
      amount: Number(saved.amount),
      openid: payerOpenid,
    }, '创建预约支付订单失败');

    payment.status = PaymentStatus.PROCESSING;
    payment.thirdPartyOrderNo = wechatPayResult.prepayId;
    await this.paymentRepo.save(payment);

    return {
      paymentId: saved.id,
      paymentOrderNo: saved.paymentOrderNo,
      amount: saved.amount,
      reservationId,
      // 微信支付参数
      ...wechatPayResult,
    };
  }

  // 创建充值支付
  async createRechargePayment(packageId: string, memberId: string, openid?: string) {
    const member = await this.memberRepo.findOne({ where: { id: memberId } });
    if (!member) {
      throw new NotFoundException('用户不存在');
    }

    const rechargePackage = await this.packageRepo.findOne({
      where: { id: packageId, isEnabled: true },
    });

    if (!rechargePackage) {
      throw new NotFoundException('充值套餐不存在或已下架');
    }

    // 创建充值记录
    const rechargeRecord = this.rechargeRepo.create({
      member,
      amount: rechargePackage.amount,
      pointsEarned: rechargePackage.points,
      bonusPoints: rechargePackage.bonusPoints,
      packageId: rechargePackage.id,
    });

    await this.rechargeRepo.save(rechargeRecord);

    // 创建支付记录
    const payment = this.paymentRepo.create({
      type: PaymentType.RECHARGE,
      method: PaymentMethod.WECHAT_PAY,
      status: PaymentStatus.PENDING,
      amount: rechargePackage.amount,
      description: `积分充值 - ${rechargePackage.name}`,
      paymentOrderNo: this.generateTradeNo('RECHARGE'),
      member,
    });

    // 关联充值记录
    rechargeRecord.payment = payment;
    await this.rechargeRepo.save(rechargeRecord);

    const saved = await this.paymentRepo.save(payment);

    // 调用微信支付
    const payerOpenid = this.resolvePayerOpenid(openid, member);
    const wechatPayResult = await this.createWechatPaymentOrFail(payment, {
      outTradeNo: saved.paymentOrderNo,
      description: saved.description || '积分充值',
      amount: Number(saved.amount),
      openid: payerOpenid,
    }, '创建充值支付订单失败');

    payment.status = PaymentStatus.PROCESSING;
    payment.thirdPartyOrderNo = wechatPayResult.prepayId;
    await this.paymentRepo.save(payment);

    return {
      paymentId: saved.id,
      paymentOrderNo: saved.paymentOrderNo,
      amount: saved.amount,
      // 微信支付参数
      ...wechatPayResult,
    };
  }

  // 创建金币充值支付（直接按金额，不需要套餐）
  async createCoinRechargePayment(amount: number, memberId: string, openid?: string) {
    const member = await this.memberRepo.findOne({ where: { id: memberId } });
    if (!member) {
      throw new NotFoundException('用户不存在');
    }

    if (amount <= 0) {
      throw new BadRequestException('充值金额必须大于0');
    }
    const rechargePackage = getCoinRechargePackageFromCents(amount * 100);
    if (!rechargePackage) {
      throw new BadRequestException('请选择有效的充值套餐');
    }

    // 创建支付记录
    const payment = this.paymentRepo.create({
      type: PaymentType.RECHARGE,
      method: PaymentMethod.WECHAT_PAY,
      status: PaymentStatus.PENDING,
      amount: Math.round(amount * 100), // 元转分
      description: `金币充值 - ${amount}元`,
      paymentOrderNo: this.generateTradeNo('COIN'),
      member,
    });

    const saved = await this.paymentRepo.save(payment);

    // 调用微信支付
    const payerOpenid = this.resolvePayerOpenid(openid, member);
    const wechatPayResult = await this.createWechatPaymentOrFail(payment, {
      outTradeNo: saved.paymentOrderNo,
      description: saved.description || '金币充值',
      amount: Number(saved.amount),
      openid: payerOpenid,
    }, '创建金币充值支付订单失败');

    payment.status = PaymentStatus.PROCESSING;
    payment.thirdPartyOrderNo = wechatPayResult.prepayId;
    await this.paymentRepo.save(payment);

    return {
      paymentId: saved.id,
      paymentOrderNo: saved.paymentOrderNo,
      amount: saved.amount,
      coins: rechargePackage.coins,
      bonusPoints: rechargePackage.bonusPoints,
      ...wechatPayResult,
    };
  }

  // ========== 支付回调处理 ==========

  // 处理微信支付回调
  async handleWechatPayCallback(paymentOrderNo: string, transactionId: string) {
    const payment = await this.paymentRepo.findOne({
      where: { paymentOrderNo },
      relations: ['member', 'order'],
    });

    if (!payment) {
      this.logger.error(`找不到支付记录: ${paymentOrderNo}`);
      throw new NotFoundException('支付记录不存在');
    }

    // 原子更新：仅当状态不是 SUCCESS 时才更新，防止并发重复处理
    const updateResult = await this.paymentRepo
      .createQueryBuilder()
      .update(PaymentEntity)
      .set({ status: PaymentStatus.SUCCESS, thirdPartyOrderNo: transactionId, paidAt: new Date() })
      .where('id = :id AND status != :success', { id: payment.id, success: PaymentStatus.SUCCESS })
      .execute();

    if (!updateResult.affected || updateResult.affected === 0) {
      this.logger.warn(`支付已处理过（原子检查）: ${payment.id}`);
      const handledPayment = await this.paymentRepo.findOne({
        where: { id: payment.id },
        relations: ['member', 'order'],
      });
      if (handledPayment) {
        await this.settleSuccessfulRechargeIfNeeded(handledPayment);
      }
      return { code: 'SUCCESS', message: '支付已处理' };
    }

    // 重新加载完整实体用于后续逻辑
    const freshPayment = await this.paymentRepo.findOne({
      where: { id: payment.id },
      relations: ['member', 'order'],
    });
    if (freshPayment) {
      await this.handlePaymentSuccess(freshPayment);
    }

    return { code: 'SUCCESS', message: 'OK' };
  }

  // 处理支付成功
  private async handlePaymentSuccess(payment: PaymentEntity) {
    switch (payment.type) {
      case PaymentType.ORDER_PAYMENT:
        await this.handleOrderPaymentSuccess(payment);
        break;
      case PaymentType.RESERVATION_DEPOSIT:
        await this.handleReservationPaymentSuccess(payment);
        break;
      case PaymentType.RECHARGE:
        await this.handleRechargePaymentSuccess(payment);
        break;
    }
  }

  private async settleSuccessfulRechargeIfNeeded(payment: PaymentEntity) {
    if (payment.status === PaymentStatus.SUCCESS && payment.type === PaymentType.RECHARGE) {
      await this.handleRechargePaymentSuccess(payment);
    }
  }

  private resolvePayerOpenid(openid?: string, member?: Pick<MemberEntity, 'userId'>): string {
    const payerOpenid = (openid || member?.userId || '').trim();
    if (!payerOpenid) {
      throw new BadRequestException('缺少微信openid，请重新登录后再支付');
    }
    return payerOpenid;
  }

  private async createWechatPaymentOrFail(
    payment: PaymentEntity,
    request: WechatPayOrderRequest,
    fallbackMessage: string,
  ) {
    try {
      const result = await this.wechatPayService.createJsapiOrder(request);
      if (result) {
        return result;
      }

      await this.markPaymentCreationFailed(payment, fallbackMessage);
      throw new BadRequestException(fallbackMessage);
    } catch (error: any) {
      const message = this.getPaymentCreationErrorMessage(error, fallbackMessage);
      await this.markPaymentCreationFailed(payment, message);
      throw new BadRequestException(message);
    }
  }

  private async markPaymentCreationFailed(payment: PaymentEntity, failureReason: string) {
    payment.status = PaymentStatus.FAILED;
    payment.failureReason = failureReason;
    await this.paymentRepo.save(payment);
  }

  private getPaymentCreationErrorMessage(error: any, fallbackMessage: string): string {
    const response = error?.getResponse?.();
    if (typeof response === 'string') {
      return response;
    }
    if (response?.message) {
      return Array.isArray(response.message) ? response.message.join('；') : String(response.message);
    }
    return error?.message || fallbackMessage;
  }

  // 处理订单支付成功
  private async handleOrderPaymentSuccess(payment: PaymentEntity) {
    if (!payment.order) {
      this.logger.error(`订单支付记录缺少订单关联: ${payment.id}`);
      return;
    }

    // 更新订单状态
    payment.order.status = OrderStatus.PAID;
    payment.order.paidAt = new Date();
    const savedOrder = await this.orderRepo.save(payment.order);
    const rewardOrder = await this.orderRepo.findOne({
      where: { id: savedOrder.id },
      relations: ['member', 'items', 'items.menuItem', 'items.menuItem.category'],
    });

    if (rewardOrder?.member) {
      await this.loyaltyService?.awardPointsForOrder(rewardOrder);
    }
    await this.grantWineVoucherBenefitsForOrder(savedOrder.id);

    this.logger.log(`订单支付成功: ${savedOrder.id}`);
  }

  // 处理预约订金支付成功
  private async handleReservationPaymentSuccess(payment: PaymentEntity) {
    if (!payment.reservationId) {
      this.logger.error(`预约支付记录缺少预约ID: ${payment.id}`);
      return;
    }

    const reservation = await this.reservationRepo.findOne({
      where: { id: payment.reservationId },
    });

    if (reservation) {
      reservation.depositPaid = true;
      reservation.paymentId = payment.id;
      await this.reservationRepo.save(reservation);
      this.logger.log(`预约订金支付成功: ${reservation.id}`);
    }
  }

  // 处理充值支付成功
  private async handleRechargePaymentSuccess(payment: PaymentEntity) {
    // 幂等检查：如果已有该支付ID对应的充值交易记录，说明已处理过
    const existingTx = await this.coinTransactionRepo.findOne({
      where: { transactionId: payment.paymentOrderNo, type: CoinTransactionType.RECHARGE },
    });
    if (existingTx) {
      this.logger.warn(`充值已处理过（幂等检查）: paymentOrderNo=${payment.paymentOrderNo}`);
      if (payment.paymentOrderNo.startsWith('COIN_')) {
        await this.repairCoinRechargeBonusPoints(payment, existingTx);
      }
      return;
    }

    // 金币充值（通过 paymentOrderNo 前缀判断）
    if (payment.paymentOrderNo.startsWith('COIN_')) {
      if (!payment.member) {
        this.logger.error(`金币充值支付记录缺少会员关联: ${payment.id}`);
        return;
      }
      const member = await this.memberRepo.findOne({ where: { id: payment.member.id } });
      if (!member) {
        this.logger.error(`金币充值找不到会员: ${payment.member.id}`);
        return;
      }

      const rechargePackage = getCoinRechargePackageFromCents(Number(payment.amount));
      if (!rechargePackage) {
        this.logger.error(`无效金币充值金额: ${payment.amount}`);
        return;
      }
      const coins = rechargePackage.coins;
      member.coins = Number(member.coins || 0) + coins;

      const bonusPoints = rechargePackage.bonusPoints;
      member.points = Number(member.points || 0) + bonusPoints;

      await this.memberRepo.save(member);

      // 记录充值交易，兼做幂等标记
      const tx = this.coinTransactionRepo.create({
        memberId: member.id,
        type: CoinTransactionType.RECHARGE,
        amount: coins,
        pointsUsed: bonusPoints,
        paymentAmount: rechargePackage.amount,
        transactionId: payment.paymentOrderNo,
        status: CoinTransactionStatus.SUCCESS,
        remark: `金币充值 ${coins}金币，赠送${bonusPoints}积分`,
      });
      await this.coinTransactionRepo.save(tx);

      this.logger.log(`金币充值成功: 用户${member.id} 获得${coins}金币 + ${bonusPoints}积分，当前余额: ${member.coins}金币, ${member.points}积分`);
      return;
    }

    // 套餐充值：查找充值记录
    const rechargeRecord = await this.rechargeRepo.findOne({
      where: { payment: { id: payment.id } },
      relations: ['member'],
    });

    if (!rechargeRecord) {
      this.logger.error(`找不到充值记录: payment ${payment.id}`);
      return;
    }

    // TODO: 给用户增加积分（需要LoyaltyService）
    const totalPoints = rechargeRecord.pointsEarned + rechargeRecord.bonusPoints;
    this.logger.log(`充值成功: 用户${rechargeRecord.member.id} 应获得${totalPoints}积分`);
  }

  private async repairCoinRechargeBonusPoints(payment: PaymentEntity, existingTx: CoinTransactionEntity) {
    const rechargePackage = getCoinRechargePackageFromCents(Number(payment.amount));
    if (!rechargePackage) {
      this.logger.error(`无效金币充值金额: ${payment.amount}`);
      return;
    }

    const expectedBonusPoints = Number(rechargePackage.bonusPoints || 0);
    const recordedBonusPoints = Number(existingTx.pointsUsed || 0);
    const missingBonusPoints = Math.max(expectedBonusPoints - recordedBonusPoints, 0);
    if (missingBonusPoints <= 0) {
      return;
    }

    const memberId = existingTx.memberId || payment.member?.id;
    if (!memberId) {
      this.logger.error(`金币充值补积分失败：缺少会员ID payment=${payment.id}`);
      return;
    }

    const member = await this.memberRepo.findOne({ where: { id: memberId } });
    if (!member) {
      this.logger.error(`金币充值补积分失败：找不到会员 ${memberId}`);
      return;
    }

    member.points = Number(member.points || 0) + missingBonusPoints;
    await this.memberRepo.save(member);

    existingTx.pointsUsed = expectedBonusPoints;
    existingTx.paymentAmount = existingTx.paymentAmount ?? rechargePackage.amount;
    existingTx.remark = existingTx.remark || `金币充值 ${rechargePackage.coins}金币，赠送${expectedBonusPoints}积分`;
    await this.coinTransactionRepo.save(existingTx);

    this.logger.log(`金币充值补积分成功: 用户${memberId} 补发${missingBonusPoints}积分`);
  }

  private async grantWineVoucherBenefitsForOrder(orderId: string) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['member', 'items', 'items.menuItem', 'items.menuItem.category'],
    });
    if (!order?.member) return;

    const voucherQuantity = (order.items || [])
      .filter((item) => item.menuItem && isWineVoucherMenuItem(item.menuItem as any))
      .reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    if (voucherQuantity <= 0) return;

    const expiresAt = getWineVoucherExpiresAt();
    const memberId = order.member.id;
    const voucherBatches = Array.from({ length: voucherQuantity }, () => this.wineVoucherBatchRepo.create({
      memberId,
      sourceType: 'menu_order',
      sourceId: order.id,
      packageName: '点单酒券',
      quantity: 1,
      remainingQuantity: 1,
      bonusPoints: WINE_VOUCHER_PURCHASE_BONUS_POINTS,
      expiresAt,
      remark: `订单${order.orderNumber}购买酒券`,
    }));
    await this.wineVoucherBatchRepo.save(voucherBatches);

    const member = await this.memberRepo.findOne({ where: { id: memberId } });
    if (!member) return;
    member.wineVouchers = Number(member.wineVouchers || 0) + voucherQuantity;
    member.points = Number(member.points || 0) + WINE_VOUCHER_PURCHASE_BONUS_POINTS * voucherQuantity;
    await this.memberRepo.save(member);
  }

  // ========== 查询接口 ==========

  // 查询支付状态（带同步）
  async getPaymentStatus(paymentId: string) {
    const payment = await this.paymentRepo.findOne({
      where: { id: paymentId },
      relations: ['member', 'order'],
    });

    if (!payment) {
      throw new NotFoundException('支付记录不存在');
    }

    let currentPayment = payment;
    let settledInThisCall = false;

    // 如果状态还是 PENDING 或 PROCESSING，主动查询微信支付
    if (payment.status === PaymentStatus.PENDING || payment.status === PaymentStatus.PROCESSING) {
      try {
        const wechatResult = await this.wechatPayService.queryOrder(payment.paymentOrderNo);

        if (wechatResult && wechatResult.trade_state) {
          this.logger.log(`微信支付状态: ${wechatResult.trade_state}`);

          if (wechatResult.trade_state === 'SUCCESS') {
            // 原子更新：防止与微信回调并发导致重复处理
            const updateResult = await this.paymentRepo
              .createQueryBuilder()
              .update(PaymentEntity)
              .set({ status: PaymentStatus.SUCCESS, thirdPartyOrderNo: wechatResult.transaction_id, paidAt: new Date() })
              .where('id = :id AND status != :success', { id: payment.id, success: PaymentStatus.SUCCESS })
              .execute();

            if (updateResult.affected && updateResult.affected > 0) {
              // 只有本次原子更新成功才执行后续逻辑
              const freshPayment = await this.paymentRepo.findOne({
                where: { id: payment.id },
                relations: ['member', 'order'],
              });
              if (freshPayment) {
                await this.handlePaymentSuccess(freshPayment);
                currentPayment = freshPayment;
                settledInThisCall = true;
              }
              this.logger.log(`支付状态同步成功: ${paymentId} -> SUCCESS`);
            } else {
              this.logger.warn(`支付状态同步跳过（已被回调处理）: ${paymentId}`);
            }
          } else if (wechatResult.trade_state === 'CLOSED' || wechatResult.trade_state === 'PAYERROR') {
            payment.status = PaymentStatus.FAILED;
            await this.paymentRepo.save(payment);
            currentPayment = payment;
          }
        }
      } catch (error) {
        this.logger.error('查询微信支付状态异常:', error);
        // 查询失败不影响返回当前状态
      }
    }

    if (!settledInThisCall) {
      await this.settleSuccessfulRechargeIfNeeded(currentPayment);
    }

    return currentPayment;
  }


  // 获取充值套餐列表
  async getRechargePackages() {
    return COIN_RECHARGE_PACKAGES.map((item, index) => ({
      id: item.id,
      name: `${item.amount}元金币套餐`,
      amount: item.amount * 100,
      points: item.bonusPoints,
      bonusPoints: item.bonusPoints,
      coins: item.coins,
      description: `得${item.coins}金币，赠送${item.bonusPoints}积分`,
      isEnabled: true,
      sortOrder: index + 1,
    }));
  }

  // 获取用户支付记录
  async getPaymentHistory(memberId: string, page: number = 1, limit: number = 20) {
    const [payments, total] = await this.paymentRepo.findAndCount({
      where: { member: { id: memberId } },
      relations: ['order'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: payments,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ========== 工具方法 ==========

  // 生成交易号
  private generateTradeNo(prefix: string): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}_${timestamp}_${random}`;
  }

  // 取消支付
  async cancelPayment(paymentId: string) {
    const payment = await this.paymentRepo.findOne({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('支付记录不存在');
    }

    if (payment.status !== PaymentStatus.PENDING && payment.status !== PaymentStatus.PROCESSING) {
      throw new BadRequestException('当前状态不允许取消支付');
    }

    payment.status = PaymentStatus.CANCELLED;
    await this.paymentRepo.save(payment);

    return payment;
  }

  // 通过支付订单号查询订单ID（用于微信订单中心跳转）
  async getOrderByTradeNo(tradeNo: string) {
    const payment = await this.paymentRepo.findOne({
      where: { paymentOrderNo: tradeNo },
      relations: ['order'],
    });

    if (!payment) {
      throw new NotFoundException('支付记录不存在');
    }

    return {
      paymentId: payment.id,
      orderId: payment.order?.id || null,
      reservationId: payment.reservationId || null,
      type: payment.type,
      status: payment.status,
    };
  }
}
