import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentEntity, PaymentType, PaymentStatus } from './payment.entity';
import { RechargeRecordEntity, RechargeStatus } from './recharge-record.entity';
import { RechargePackageEntity } from './recharge-package.entity';
import { WechatPayService } from './wechat-pay.service';
import { MemberEntity } from '../membership/member.entity';
import { OrderEntity } from '../orders/order.entity';
import { CreatePaymentDto, CreateRechargeDto, PaymentCallbackDto } from './dto/payment.dto';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { OrdersService } from '../orders/orders.service';
import { NotificationService } from './notification.service';

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
    private wechatPayService: WechatPayService,
    private loyaltyService: LoyaltyService,
    private ordersService: OrdersService,
    private notificationService: NotificationService,
  ) {}

  // 创建订单支付
  async createOrderPayment(orderId: string, dto: CreatePaymentDto) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['member'],
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    if (order.status !== 'PENDING') {
      throw new BadRequestException('订单状态不允许支付');
    }

    const member = order.member;
    if (!member) {
      throw new BadRequestException('用户信息不存在');
    }

    // 创建支付记录
    const payment = this.paymentRepo.create({
      orderId,
      memberId: member.id,
      type: PaymentType.ORDER,
      amount: order.totalAmount,
      status: PaymentStatus.PENDING,
      description: `订单支付 - ${order.orderNumber}`,
      paymentMethod: dto.paymentMethod || 'WECHAT_PAY',
      outTradeNo: this.generateTradeNo('ORDER'),
    });

    await this.paymentRepo.save(payment);

    // 调用微信支付
    if (payment.paymentMethod === 'WECHAT_PAY') {
      const wechatPayResult = await this.wechatPayService.createJsapiOrder({
        outTradeNo: payment.outTradeNo,
        description: payment.description,
        amount: Math.round(payment.amount * 100), // 转换为分
        openid: dto.openid,
        notifyUrl: `${process.env.API_BASE_URL}/payment/wechat-callback`,
      });

      if (wechatPayResult) {
        payment.thirdPartyTransactionId = wechatPayResult.prepayId;
        payment.status = PaymentStatus.PROCESSING;
        await this.paymentRepo.save(payment);

        return {
          paymentId: payment.id,
          ...wechatPayResult,
        };
      } else {
        payment.status = PaymentStatus.FAILED;
        await this.paymentRepo.save(payment);
        throw new BadRequestException('创建微信支付订单失败');
      }
    }

    return payment;
  }

  // 创建充值支付
  async createRechargePayment(dto: CreateRechargeDto) {
    const member = await this.memberRepo.findOne({
      where: { id: dto.memberId },
    });

    if (!member) {
      throw new NotFoundException('用户不存在');
    }

    const rechargePackage = await this.packageRepo.findOne({
      where: { id: dto.packageId, isActive: true },
    });

    if (!rechargePackage) {
      throw new NotFoundException('充值套餐不存在或已下架');
    }

    // 创建充值记录
    const rechargeRecord = this.rechargeRepo.create({
      memberId: member.id,
      packageId: rechargePackage.id,
      amount: rechargePackage.price,
      points: rechargePackage.points,
      bonusPoints: rechargePackage.bonusPoints,
      status: RechargeStatus.PENDING,
      outTradeNo: this.generateTradeNo('RECHARGE'),
    });

    await this.rechargeRepo.save(rechargeRecord);

    // 创建支付记录
    const payment = this.paymentRepo.create({
      rechargeId: rechargeRecord.id,
      memberId: member.id,
      type: PaymentType.RECHARGE,
      amount: rechargePackage.price,
      status: PaymentStatus.PENDING,
      description: `积分充值 - ${rechargePackage.name}`,
      paymentMethod: dto.paymentMethod || 'WECHAT_PAY',
      outTradeNo: rechargeRecord.outTradeNo,
    });

    await this.paymentRepo.save(payment);

    // 调用微信支付
    if (payment.paymentMethod === 'WECHAT_PAY') {
      const wechatPayResult = await this.wechatPayService.createJsapiOrder({
        outTradeNo: payment.outTradeNo,
        description: payment.description,
        amount: Math.round(payment.amount * 100), // 转换为分
        openid: dto.openid,
        notifyUrl: `${process.env.API_BASE_URL}/payment/wechat-callback`,
      });

      if (wechatPayResult) {
        payment.thirdPartyTransactionId = wechatPayResult.prepayId;
        payment.status = PaymentStatus.PROCESSING;
        await this.paymentRepo.save(payment);

        return {
          paymentId: payment.id,
          rechargeId: rechargeRecord.id,
          ...wechatPayResult,
        };
      } else {
        payment.status = PaymentStatus.FAILED;
        rechargeRecord.status = RechargeStatus.FAILED;
        await this.paymentRepo.save(payment);
        await this.rechargeRepo.save(rechargeRecord);
        throw new BadRequestException('创建微信支付订单失败');
      }
    }

    return { paymentId: payment.id, rechargeId: rechargeRecord.id };
  }

  // 处理微信支付回调
  async handleWechatPayCallback(callbackData: PaymentCallbackDto) {
    this.logger.log('收到微信支付回调:', callbackData);

    // 验证签名
    const isValidSignature = this.wechatPayService.verifyCallback(
      callbackData.signature,
      callbackData.timestamp,
      callbackData.nonce,
      callbackData.body,
    );

    if (!isValidSignature) {
      this.logger.error('微信支付回调签名验证失败');
      throw new BadRequestException('签名验证失败');
    }

    // 解密回调数据
    const decryptedData = this.wechatPayService.decryptCallback(callbackData.resource);
    if (!decryptedData) {
      this.logger.error('微信支付回调数据解密失败');
      throw new BadRequestException('数据解密失败');
    }

    const { out_trade_no, trade_state, transaction_id, amount } = decryptedData;

    // 查找支付记录
    const payment = await this.paymentRepo.findOne({
      where: { outTradeNo: out_trade_no },
      relations: ['recharge', 'order'],
    });

    if (!payment) {
      this.logger.error(`找不到支付记录: ${out_trade_no}`);
      throw new NotFoundException('支付记录不存在');
    }

    // 避免重复处理
    if (payment.status === PaymentStatus.SUCCESS) {
      this.logger.warn(`支付已处理过: ${payment.id}`);
      return { code: 'SUCCESS', message: '支付已处理' };
    }

    // 更新支付记录
    payment.thirdPartyTransactionId = transaction_id;
    payment.paidAt = new Date();

    if (trade_state === 'SUCCESS') {
      payment.status = PaymentStatus.SUCCESS;
      await this.paymentRepo.save(payment);

      // 处理支付成功逻辑
      await this.handlePaymentSuccess(payment);
    } else if (trade_state === 'PAYERROR') {
      payment.status = PaymentStatus.FAILED;
      await this.paymentRepo.save(payment);

      // 处理支付失败逻辑
      await this.handlePaymentFailure(payment);
    }

    return { code: 'SUCCESS', message: 'OK' };
  }

  // 处理支付成功
  private async handlePaymentSuccess(payment: PaymentEntity) {
    if (payment.type === PaymentType.ORDER && payment.orderId) {
      // 处理订单支付成功
      await this.handleOrderPaymentSuccess(payment.orderId);
    } else if (payment.type === PaymentType.RECHARGE && payment.rechargeId) {
      // 处理充值支付成功
      await this.handleRechargePaymentSuccess(payment.rechargeId);
    }
  }

  // 处理支付失败
  private async handlePaymentFailure(payment: PaymentEntity) {
    if (payment.type === PaymentType.ORDER && payment.orderId) {
      // 标记订单为支付失败
      await this.orderRepo.update(payment.orderId, { status: 'PAYMENT_FAILED' });
    } else if (payment.type === PaymentType.RECHARGE && payment.rechargeId) {
      // 标记充值为失败
      await this.rechargeRepo.update(payment.rechargeId, { status: RechargeStatus.FAILED });
    }
  }

  // 处理订单支付成功
  private async handleOrderPaymentSuccess(orderId: string) {
    const order = await this.ordersService.markAsPaid(orderId);

    // 发送订单支付成功通知
    if (order.member) {
      await this.notificationService.sendOrderPaidNotification(
        order.member.id,
        order.orderNumber,
        order.totalAmount
      );
    }

    this.logger.log(`订单支付成功: ${orderId}`);
  }

  // 处理充值支付成功
  private async handleRechargePaymentSuccess(rechargeId: string) {
    const rechargeRecord = await this.rechargeRepo.findOne({
      where: { id: rechargeId },
      relations: ['member', 'package'],
    });

    if (!rechargeRecord) return;

    // 更新充值状态
    rechargeRecord.status = RechargeStatus.SUCCESS;
    rechargeRecord.completedAt = new Date();
    await this.rechargeRepo.save(rechargeRecord);

    // 给用户增加积分
    const totalPoints = rechargeRecord.points + rechargeRecord.bonusPoints;
    await this.loyaltyService.addPoints(
      rechargeRecord.memberId,
      totalPoints,
      'RECHARGE',
      `充值获得积分 - ${rechargeRecord.package.name}`,
    );

    // 发送充值成功通知
    await this.notificationService.sendRechargeSuccessNotification(
      rechargeRecord.memberId,
      rechargeRecord.package.name,
      rechargeRecord.points,
      rechargeRecord.bonusPoints
    );

    this.logger.log(`充值成功: 用户${rechargeRecord.memberId} 获得${totalPoints}积分`);
  }

  // 查询支付状态
  async getPaymentStatus(paymentId: string) {
    const payment = await this.paymentRepo.findOne({
      where: { id: paymentId },
      relations: ['recharge', 'order'],
    });

    if (!payment) {
      throw new NotFoundException('支付记录不存在');
    }

    // 如果是进行中状态，主动查询微信支付状态
    if (payment.status === PaymentStatus.PROCESSING && payment.paymentMethod === 'WECHAT_PAY') {
      const wechatStatus = await this.wechatPayService.queryOrder(payment.outTradeNo);
      if (wechatStatus && wechatStatus.trade_state === 'SUCCESS') {
        payment.status = PaymentStatus.SUCCESS;
        payment.thirdPartyTransactionId = wechatStatus.transaction_id;
        payment.paidAt = new Date();
        await this.paymentRepo.save(payment);

        // 处理支付成功逻辑
        await this.handlePaymentSuccess(payment);
      }
    }

    return payment;
  }

  // 获取充值套餐列表
  async getRechargePackages() {
    return this.packageRepo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', price: 'ASC' },
    });
  }

  // 获取用户支付记录
  async getPaymentHistory(memberId: string, page: number = 1, limit: number = 20) {
    const [payments, total] = await this.paymentRepo.findAndCount({
      where: { memberId },
      relations: ['recharge', 'order'],
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

  // 获取用户充值记录
  async getRechargeHistory(memberId: string, page: number = 1, limit: number = 20) {
    const [recharges, total] = await this.rechargeRepo.findAndCount({
      where: { memberId },
      relations: ['package', 'payment'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: recharges,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

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

    // 如果是微信支付，尝试关闭订单
    if (payment.paymentMethod === 'WECHAT_PAY' && payment.status === PaymentStatus.PROCESSING) {
      await this.wechatPayService.closeOrder(payment.outTradeNo);
    }

    payment.status = PaymentStatus.CANCELLED;
    await this.paymentRepo.save(payment);

    return payment;
  }
}