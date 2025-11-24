import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentEntity, PaymentType, PaymentStatus, PaymentMethod, RechargeRecordEntity, RechargePackageEntity } from './payment.entity';
import { WechatPayService } from './wechat-pay.service';
import { MemberEntity } from '../membership/member.entity';
import { OrderEntity, OrderStatus } from '../orders/order.entity';
import { ReservationEntity } from '../reservation/reservation.entity';

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
    private wechatPayService: WechatPayService,
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
    const wechatPayResult = await this.wechatPayService.createJsapiOrder({
      outTradeNo: saved.paymentOrderNo,
      description: saved.description || '订单支付',
      amount: Number(saved.amount),
      openid: openid || '',
    });

    if (wechatPayResult) {
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

    // 微信支付创建失败，标记为FAILED
    payment.status = PaymentStatus.FAILED;
    await this.paymentRepo.save(payment);

    throw new BadRequestException('创建微信支付订单失败');
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
    const wechatPayResult = await this.wechatPayService.createJsapiOrder({
      outTradeNo: saved.paymentOrderNo,
      description: saved.description || '预约订金',
      amount: Number(saved.amount),
      openid: openid || '',
    });

    if (wechatPayResult) {
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

    payment.status = PaymentStatus.FAILED;
    await this.paymentRepo.save(payment);
    throw new BadRequestException('创建预约支付订单失败');
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
    const wechatPayResult = await this.wechatPayService.createJsapiOrder({
      outTradeNo: saved.paymentOrderNo,
      description: saved.description || '积分充值',
      amount: Number(saved.amount),
      openid: openid || '',
    });

    if (wechatPayResult) {
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

    payment.status = PaymentStatus.FAILED;
    await this.paymentRepo.save(payment);
    throw new BadRequestException('创建充值支付订单失败');
  }

  // ========== 支付回调处理 ==========

  // 处理微信支付回调（简化版）
  async handleWechatPayCallback(paymentOrderNo: string, transactionId: string) {
    // 查找支付记录
    const payment = await this.paymentRepo.findOne({
      where: { paymentOrderNo },
      relations: ['member', 'order'],
    });

    if (!payment) {
      this.logger.error(`找不到支付记录: ${paymentOrderNo}`);
      throw new NotFoundException('支付记录不存在');
    }

    // 避免重复处理
    if (payment.status === PaymentStatus.SUCCESS) {
      this.logger.warn(`支付已处理过: ${payment.id}`);
      return { code: 'SUCCESS', message: '支付已处理' };
    }

    // 更新支付记录
    payment.thirdPartyOrderNo = transactionId;
    payment.paidAt = new Date();
    payment.status = PaymentStatus.SUCCESS;
    await this.paymentRepo.save(payment);

    // 处理支付成功逻辑
    await this.handlePaymentSuccess(payment);

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

  // 处理订单支付成功
  private async handleOrderPaymentSuccess(payment: PaymentEntity) {
    if (!payment.order) {
      this.logger.error(`订单支付记录缺少订单关联: ${payment.id}`);
      return;
    }

    // 更新订单状态
    payment.order.status = OrderStatus.PAID;
    payment.order.paidAt = new Date();
    await this.orderRepo.save(payment.order);

    this.logger.log(`订单支付成功: ${payment.order.id}`);
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

  // ========== 查询接口 ==========

  // 查询支付状态
  async getPaymentStatus(paymentId: string) {
    const payment = await this.paymentRepo.findOne({
      where: { id: paymentId },
      relations: ['member', 'order'],
    });

    if (!payment) {
      throw new NotFoundException('支付记录不存在');
    }

    return payment;
  }

  // 获取充值套餐列表
  async getRechargePackages() {
    return this.packageRepo.find({
      where: { isEnabled: true },
      order: { sortOrder: 'ASC', amount: 'ASC' },
    });
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
}