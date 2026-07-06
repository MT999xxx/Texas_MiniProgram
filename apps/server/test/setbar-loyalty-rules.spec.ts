import { OrdersService } from '../src/orders/orders.service';
import fs from 'fs';
import path from 'path';
import {
  WINE_VOUCHER_PACKAGES,
  WINE_VOUCHER_PURCHASE_BONUS_POINTS,
  WINE_VOUCHER_VALID_DAYS,
  getWineVoucherMenuItemBonusPoints,
  isWineVoucherGrantableMenuItem,
  getCoinRechargePackage,
  getWineVoucherPackage,
} from '../src/coins/coin-rules';
import { OrderStatus } from '../src/orders/order.entity';
import { CoinTransactionStatus, CoinTransactionType } from '../src/coins/coin-transaction.entity';
import { CouponsService } from '../src/coupons/coupons.service';
import { UserCouponStatus } from '../src/coupons/user-coupon.entity';
import { MembershipService } from '../src/membership/membership.service';
import { PaymentService } from '../src/payment/payment.service';
import { PaymentMethod, PaymentStatus, PaymentType } from '../src/payment/payment.entity';
import { WineVoucherOptionsService } from '../src/coins/wine-voucher-options.service';
import { CoinsService } from '../src/coins/coins.service';
import { LoyaltyService } from '../src/loyalty/loyalty.service';
import { AdminNotificationsService } from '../src/notifications/admin-notifications.service';

describe('Set baR loyalty and voucher rules', () => {
  it('uses the updated coin recharge packages', () => {
    expect(getCoinRechargePackage(500)).toMatchObject({ amount: 500, coins: 60, bonusPoints: 30000 });
    expect(getCoinRechargePackage(1000)).toMatchObject({ amount: 1000, coins: 150, bonusPoints: 80000 });
    expect(getCoinRechargePackage(2000)).toMatchObject({ amount: 2000, coins: 400, bonusPoints: 200000 });
    expect(getCoinRechargePackage(5000)).toMatchObject({ amount: 5000, coins: 1000, bonusPoints: 600000 });
    expect(getCoinRechargePackage(3000)).toBeNull();
  });

  it('defines wine voucher packages with 15-day validity and 8000 bonus points', () => {
    expect(WINE_VOUCHER_VALID_DAYS).toBe(15);
    expect(WINE_VOUCHER_PURCHASE_BONUS_POINTS).toBe(8000);
    expect(getWineVoucherPackage('monthly-free-flow')).toMatchObject({
      name: '月赛畅饮券',
      price: 138,
      voucherCount: 1,
      bonusPoints: 8000,
      validDays: 15,
    });
  });

  it('awards 50x points when an order is paid with coins', async () => {
    const order = {
      id: 'order-1',
      orderNumber: 'TXP001',
      status: OrderStatus.PENDING,
      totalAmount: 116,
      member: { id: 'member-1' },
    };
    const member = { id: 'member-1', coins: 200, points: 20 };

    const orderRepo = {
      findOne: jest.fn().mockResolvedValue(order),
      save: jest.fn(async (entity) => entity),
    };
    const memberRepo = {
      findOne: jest.fn().mockResolvedValue(member),
      save: jest.fn(async (entity) => entity),
    };
    const coinTransactionRepo = {
      create: jest.fn((entity) => entity),
      save: jest.fn(async (entity) => entity),
    };
    const redisService = { getClient: () => ({ set: jest.fn() }) };
    const loyaltyService = { awardPointsForOrder: jest.fn() };

    const service = new OrdersService(
      orderRepo as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      memberRepo as any,
      coinTransactionRepo as any,
      {} as any,
      {} as any,
      redisService as any,
      {} as any,
      {} as any,
      {} as any,
      loyaltyService as any,
      {} as any,
      {} as any,
    );

    await service.payWithCoins('order-1', 'member-1');

    expect(member.coins).toBe(84);
    expect(member.points).toBe(5820);
    expect(coinTransactionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: CoinTransactionType.CONSUME,
        amount: -116,
      }),
    );
  });

  it('awards 50x loyalty points for normal paid order items', async () => {
    const loyaltyRepo = {
      create: jest.fn((entity) => entity),
      save: jest.fn(async (entity) => entity),
    };
    const membershipService = {
      adjustPoints: jest.fn(),
    };
    const service = new LoyaltyService(
      loyaltyRepo as any,
      {} as any,
      {} as any,
      membershipService as any,
    );

    const order = {
      id: 'order-1',
      orderNumber: 'TXP001',
      totalAmount: 100,
      member: { id: 'member-1' },
      items: [
        {
          amount: 100,
          menuItem: {
            name: 'whisky',
            category: { name: 'drinks' },
          },
        },
      ],
    };

    await service.awardPointsForOrder(order as any);

    expect(membershipService.adjustPoints).toHaveBeenCalledWith('member-1', 5000);
    expect(loyaltyRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        order,
        points: 5000,
      }),
    );
  });

  it('does not add 50x loyalty points on wine voucher menu items', async () => {
    const loyaltyRepo = {
      create: jest.fn((entity) => entity),
      save: jest.fn(async (entity) => entity),
    };
    const membershipService = {
      adjustPoints: jest.fn(),
    };
    const service = new LoyaltyService(
      loyaltyRepo as any,
      {} as any,
      {} as any,
      membershipService as any,
    );

    await service.awardPointsForOrder({
      id: 'order-1',
      orderNumber: 'TXP001',
      totalAmount: 138,
      member: { id: 'member-1' },
      items: [
        {
          amount: 138,
          menuItem: {
            name: getWineVoucherPackage('monthly-free-flow')!.name,
            category: { name: '' },
          },
        },
      ],
    } as any);

    expect(membershipService.adjustPoints).not.toHaveBeenCalled();
    expect(loyaltyRepo.create).not.toHaveBeenCalled();
  });

  it('does not stack coin-spend points on wine voucher menu orders', async () => {
    const wineVoucherItem = {
      id: 'order-item-1',
      quantity: 3,
      amount: 234,
      menuItem: {
        id: 'menu-1',
        name: '月赛畅饮券',
        category: { name: '积分加油站' },
      },
    };
    const order = {
      id: 'order-1',
      orderNumber: 'TXP001',
      status: OrderStatus.PENDING,
      totalAmount: 234,
      member: { id: 'member-1' },
      items: [wineVoucherItem],
    };
    const member = { id: 'member-1', coins: 300, points: 0, wineVouchers: 0 };

    const orderRepo = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce(order)
        .mockResolvedValueOnce(order),
      save: jest.fn(async (entity) => entity),
    };
    const memberRepo = {
      findOne: jest.fn().mockResolvedValue(member),
      save: jest.fn(async (entity) => entity),
    };
    const coinTransactionRepo = {
      create: jest.fn((entity) => entity),
      save: jest.fn(async (entity) => entity),
    };
    const wineVoucherBatchRepo = {
      create: jest.fn((entity) => entity),
      save: jest.fn(async (entity) => entity),
    };
    const redisService = { getClient: () => ({ set: jest.fn() }) };
    const loyaltyService = { awardPointsForOrder: jest.fn() };

    const service = new OrdersService(
      orderRepo as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      memberRepo as any,
      coinTransactionRepo as any,
      wineVoucherBatchRepo as any,
      {} as any,
      redisService as any,
      {} as any,
      {} as any,
      {} as any,
      loyaltyService as any,
      {} as any,
      {} as any,
    );

    await service.payWithCoins('order-1', 'member-1');

    expect(member.coins).toBe(66);
    expect(member.points).toBe(24000);
    expect(member.wineVouchers).toBe(3);
  });

  it('direct wine voucher package purchase grants only the fixed 8000 points', async () => {
    const member = { id: 'member-1', coins: 200, points: 0, wineVouchers: 0 };
    const txMemberRepo = {
      findOne: jest.fn().mockResolvedValue(member),
      save: jest.fn(async (entity) => entity),
    };
    const wineVoucherBatchRepo = {
      create: jest.fn((entity) => entity),
      save: jest.fn(async (entity) => entity),
    };
    const transactionRepo = {
      create: jest.fn((entity) => entity),
      save: jest.fn(async (entity) => entity),
    };
    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity.name === 'MemberEntity') return txMemberRepo;
        if (entity.name === 'WineVoucherBatchEntity') return wineVoucherBatchRepo;
        if (entity.name === 'CoinTransactionEntity') return transactionRepo;
        throw new Error(`Unexpected repository ${entity.name}`);
      }),
    };
    const memberRepo = {
      manager: {
        transaction: jest.fn(async (callback) => callback(manager)),
      },
    };
    const service = new CoinsService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      memberRepo as any,
      {} as any,
    );

    const result = await service.purchaseWineVoucherPackage('member-1', 'sng-wine-set');

    expect(member.coins).toBe(122);
    expect(member.points).toBe(8000);
    expect(member.wineVouchers).toBe(1);
    expect(result.bonusPoints).toBe(8000);
    expect(result.consumptionBonusPoints).toBe(0);
  });

  it('direct multi-voucher package purchase grants 8000 points for each voucher', async () => {
    const packageDef = (WINE_VOUCHER_PACKAGES as unknown as any[]).find((item) => item.id === 'sng-wine-set');
    const originalVoucherCount = packageDef.voucherCount;
    packageDef.voucherCount = 3;

    try {
      const member = { id: 'member-1', coins: 300, points: 0, wineVouchers: 0 };
      const txMemberRepo = {
        findOne: jest.fn().mockResolvedValue(member),
        save: jest.fn(async (entity) => entity),
      };
      const wineVoucherBatchRepo = {
        create: jest.fn((entity) => entity),
        save: jest.fn(async (entity) => entity),
      };
      const transactionRepo = {
        create: jest.fn((entity) => entity),
        save: jest.fn(async (entity) => entity),
      };
      const manager = {
        getRepository: jest.fn((entity) => {
          if (entity.name === 'MemberEntity') return txMemberRepo;
          if (entity.name === 'WineVoucherBatchEntity') return wineVoucherBatchRepo;
          if (entity.name === 'CoinTransactionEntity') return transactionRepo;
          throw new Error(`Unexpected repository ${entity.name}`);
        }),
      };
      const memberRepo = {
        manager: {
          transaction: jest.fn(async (callback) => callback(manager)),
        },
      };
      const service = new CoinsService(
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        memberRepo as any,
        {} as any,
      );

      const result = await service.purchaseWineVoucherPackage('member-1', 'sng-wine-set');

      expect(member.wineVouchers).toBe(3);
      expect(member.points).toBe(24000);
      expect(result.bonusPoints).toBe(24000);
      expect(wineVoucherBatchRepo.create).toHaveBeenCalledTimes(3);
      expect(wineVoucherBatchRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          quantity: 1,
          remainingQuantity: 1,
          bonusPoints: 8000,
        }),
      );
      expect(wineVoucherBatchRepo.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ quantity: 1, remainingQuantity: 1 }),
          expect.objectContaining({ quantity: 1, remainingQuantity: 1 }),
          expect.objectContaining({ quantity: 1, remainingQuantity: 1 }),
        ]),
      );
    } finally {
      packageDef.voucherCount = originalVoucherCount;
    }
  });

  it('wechat-paid wine voucher menu orders grant 8000 points for each voucher', async () => {
    const member = { id: 'member-1', points: 0, wineVouchers: 0 };
    const order = {
      id: 'order-1',
      orderNumber: 'TXP001',
      member: { id: 'member-1' },
      items: [
        {
          quantity: 3,
          menuItem: {
            id: 'menu-1',
            name: '月赛畅饮券',
            category: { name: '积分加油站' },
          },
        },
      ],
    };
    const orderRepo = {
      findOne: jest.fn().mockResolvedValue(order),
    };
    const memberRepo = {
      findOne: jest.fn().mockResolvedValue(member),
      save: jest.fn(async (entity) => entity),
    };
    const wineVoucherBatchRepo = {
      create: jest.fn((entity) => entity),
      save: jest.fn(async (entity) => entity),
    };
    const service = new PaymentService(
      {} as any,
      {} as any,
      {} as any,
      memberRepo as any,
      orderRepo as any,
      {} as any,
      {} as any,
      wineVoucherBatchRepo as any,
      {} as any,
    );

    await (service as any).grantWineVoucherBenefitsForOrder('order-1');

    expect(member.wineVouchers).toBe(3);
    expect(member.points).toBe(24000);
    expect(wineVoucherBatchRepo.create).toHaveBeenCalledTimes(3);
    expect(wineVoucherBatchRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        quantity: 1,
        remainingQuantity: 1,
        bonusPoints: 8000,
      }),
    );
    expect(wineVoucherBatchRepo.save).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ quantity: 1, remainingQuantity: 1 }),
        expect.objectContaining({ quantity: 1, remainingQuantity: 1 }),
        expect.objectContaining({ quantity: 1, remainingQuantity: 1 }),
      ]),
    );
  });

  it('does not grant points or wine vouchers for weekly wine voucher menu orders', async () => {
    expect(getWineVoucherMenuItemBonusPoints({
      name: '周赛酒卷',
      category: { name: '积分加油站' },
    })).toBe(0);
    expect(getWineVoucherMenuItemBonusPoints({
      name: '周赛卷',
      category: { name: '积分加油站' },
    })).toBe(0);
    expect(getWineVoucherMenuItemBonusPoints({
      name: '酒券套餐',
      category: { name: '积分加油站' },
    })).toBe(8000);
    expect(isWineVoucherGrantableMenuItem({ name: '周赛酒卷' })).toBe(false);
    expect(isWineVoucherGrantableMenuItem({ name: '周赛卷', category: { name: '积分加油站' } })).toBe(false);
    expect(isWineVoucherGrantableMenuItem({ name: '酒券套餐' })).toBe(true);

    const member = { id: 'member-1', points: 0, wineVouchers: 0 };
    const order = {
      id: 'order-1',
      orderNumber: 'TXP001',
      member: { id: 'member-1' },
      items: [
        {
          quantity: 1,
          menuItem: {
            id: 'menu-weekly',
            name: '周赛酒卷',
            category: { name: '积分加油站' },
          },
        },
      ],
    };
    const orderRepo = {
      findOne: jest.fn().mockResolvedValue(order),
    };
    const memberRepo = {
      findOne: jest.fn().mockResolvedValue(member),
      save: jest.fn(async (entity) => entity),
    };
    const wineVoucherBatchRepo = {
      create: jest.fn((entity) => entity),
      save: jest.fn(async (entity) => entity),
    };
    const service = new PaymentService(
      {} as any,
      {} as any,
      {} as any,
      memberRepo as any,
      orderRepo as any,
      {} as any,
      {} as any,
      wineVoucherBatchRepo as any,
      {} as any,
    );

    await (service as any).grantWineVoucherBenefitsForOrder('order-1');

    expect(member.wineVouchers).toBe(0);
    expect(member.points).toBe(0);
    expect(wineVoucherBatchRepo.create).not.toHaveBeenCalled();
    expect(wineVoucherBatchRepo.save).not.toHaveBeenCalled();
    expect(memberRepo.save).not.toHaveBeenCalled();
  });

  it('wechat order payment awards loyalty points after marking the order paid', async () => {
    const order = {
      id: 'order-1',
      orderNumber: 'TXP001',
      status: OrderStatus.PENDING,
      totalAmount: 100,
      member: { id: 'member-1' },
      items: [
        {
          amount: 100,
          quantity: 1,
          menuItem: { name: 'whisky', category: { name: 'drinks' } },
        },
      ],
    };
    const hydratedOrder = { ...order };
    const orderRepo = {
      save: jest.fn(async (entity) => entity),
      findOne: jest.fn().mockResolvedValue(hydratedOrder),
    };
    const loyaltyService = { awardPointsForOrder: jest.fn() };
    const service = new PaymentService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      orderRepo as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      loyaltyService as any,
    );

    await (service as any).handleOrderPaymentSuccess({
      id: 'payment-1',
      order,
    });

    expect(order.status).toBe(OrderStatus.PAID);
    expect(loyaltyService.awardPointsForOrder).toHaveBeenCalledWith(hydratedOrder);
  });

  it('uses the member openid when the payment request does not include openid', async () => {
    const member = { id: 'member-1', userId: 'openid-from-member' };
    const order = {
      id: 'order-1',
      orderNumber: 'TXP001',
      status: OrderStatus.PENDING,
      totalAmount: 2,
      member,
    };
    const payment = {
      id: 'payment-1',
      paymentOrderNo: 'ORDER_001',
      amount: 200,
      description: '订单支付 - TXP001',
    };
    const paymentRepo = {
      create: jest.fn((entity) => ({ ...entity, ...payment })),
      save: jest.fn(async (entity) => entity),
    };
    const orderRepo = {
      findOne: jest.fn().mockResolvedValue(order),
    };
    const memberRepo = {
      findOne: jest.fn().mockResolvedValue(member),
    };
    const wechatPayService = {
      createJsapiOrder: jest.fn().mockResolvedValue({
        prepayId: 'prepay-1',
        timeStamp: '1',
        nonceStr: 'nonce',
        package: 'prepay_id=prepay-1',
        paySign: 'sign',
        signType: 'RSA',
      }),
    };
    const service = new PaymentService(
      paymentRepo as any,
      {} as any,
      {} as any,
      memberRepo as any,
      orderRepo as any,
      {} as any,
      {} as any,
      {} as any,
      wechatPayService as any,
      {} as any,
    );

    await service.createOrderPayment('order-1', 'member-1');

    expect(wechatPayService.createJsapiOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        openid: 'openid-from-member',
      }),
    );
  });

  it('records the real wechat order creation failure reason', async () => {
    const member = { id: 'member-1', userId: 'openid-from-member' };
    const order = {
      id: 'order-1',
      orderNumber: 'TXP001',
      status: OrderStatus.PENDING,
      totalAmount: 2,
      member,
    };
    const payment = {
      id: 'payment-1',
      paymentOrderNo: 'ORDER_001',
      amount: 200,
      description: '订单支付 - TXP001',
    };
    const paymentRepo = {
      create: jest.fn((entity) => ({ ...entity, ...payment })),
      save: jest.fn(async (entity) => entity),
    };
    const orderRepo = {
      findOne: jest.fn().mockResolvedValue(order),
    };
    const memberRepo = {
      findOne: jest.fn().mockResolvedValue(member),
    };
    const wechatPayService = {
      createJsapiOrder: jest
        .fn()
        .mockRejectedValue(new Error('创建微信支付订单失败：SIGN_ERROR: 证书序列号不正确')),
    };
    const service = new PaymentService(
      paymentRepo as any,
      {} as any,
      {} as any,
      memberRepo as any,
      orderRepo as any,
      {} as any,
      {} as any,
      {} as any,
      wechatPayService as any,
      {} as any,
    );

    await expect(service.createOrderPayment('order-1', 'member-1')).rejects.toThrow('SIGN_ERROR');
    expect(paymentRepo.save).toHaveBeenLastCalledWith(
      expect.objectContaining({
        status: PaymentStatus.FAILED,
        failureReason: expect.stringContaining('SIGN_ERROR'),
      }),
    );
  });

  it('does not send a placeholder wechat pay certificate serial number', () => {
    const source = fs.readFileSync(path.join(__dirname, '../src/payment/wechat-pay.service.ts'), 'utf8');

    expect(source).toContain('X509Certificate');
    expect(source).not.toContain('YOUR_CERT_SERIAL_NO');
  });

  it('combines member point deposit and withdraw records', async () => {
    const depositDate = new Date('2026-06-26T10:00:00.000Z');
    const withdrawDate = new Date('2026-06-26T11:00:00.000Z');
    const transactionRepo = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'withdraw-1',
          type: CoinTransactionType.WITHDRAW,
          pointsUsed: 300,
          status: CoinTransactionStatus.SUCCESS,
          remark: '取出300积分',
          createdAt: withdrawDate,
        },
      ]),
    };
    const depositRepo = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'deposit-1',
          points: 500,
          actualPoints: 500,
          status: 'PENDING',
          reviewRemark: '等待审核',
          createdAt: depositDate,
        },
      ]),
    };
    const service = new CoinsService(
      transactionRepo as any,
      depositRepo as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    const result = await service.getPointRecords('member-1');

    expect(depositRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { memberId: 'member-1' },
        order: { createdAt: 'DESC' },
        take: 50,
      }),
    );
    expect(transactionRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { memberId: 'member-1', type: CoinTransactionType.WITHDRAW },
        order: { createdAt: 'DESC' },
        take: 50,
      }),
    );
    expect(result).toEqual([
      expect.objectContaining({
        id: 'withdraw-1',
        type: 'WITHDRAW',
        title: '取分',
        points: 300,
        statusText: '成功',
      }),
      expect.objectContaining({
        id: 'deposit-1',
        type: 'DEPOSIT',
        title: '存分',
        points: 500,
        actualPoints: 500,
        statusText: '待审核',
      }),
    ]);
  });

  it('creates an admin notification when a member withdraws points', async () => {
    const member = { id: 'member-1', nickname: '大鱼黑鲨', points: 9000 };
    const transaction = {
      id: 'withdraw-1',
      memberId: 'member-1',
      type: CoinTransactionType.WITHDRAW,
      pointsUsed: 1200,
    };
    const transactionRepo = {
      create: jest.fn((entity) => ({ ...transaction, ...entity })),
      save: jest.fn(async (entity) => entity),
    };
    const memberRepo = {
      findOne: jest.fn().mockResolvedValue(member),
      save: jest.fn(async (entity) => entity),
    };
    const adminNotificationsService = {
      createPointWithdrawNotification: jest.fn().mockResolvedValue(undefined),
    };

    const service = new (CoinsService as any)(
      transactionRepo,
      {} as any,
      {} as any,
      {} as any,
      memberRepo,
      {} as any,
      adminNotificationsService,
    );

    await service.withdrawPoints('member-1', { points: 1200 });

    expect(member.points).toBe(7800);
    expect(adminNotificationsService.createPointWithdrawNotification).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'member-1', nickname: '大鱼黑鲨' }),
      1200,
      expect.objectContaining({ id: 'withdraw-1' }),
    );
  });

  it('formats point withdraw admin notification content for sound alerts', async () => {
    const notificationRepo = {
      create: jest.fn((entity) => entity),
      save: jest.fn(async (entity) => ({ id: 'notification-1', ...entity })),
    };
    const service = new AdminNotificationsService(notificationRepo as any);

    await (service as any).createPointWithdrawNotification(
      { id: 'member-1', nickname: '大鱼黑鲨' },
      1200,
      { id: 'withdraw-1' },
    );

    expect(notificationRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'WARNING',
        title: '取分申请',
        content: '大鱼黑鲨 提交取分 1200 积分',
        sourceType: 'point_withdraw',
        sourceId: 'withdraw-1',
      }),
    );
  });

  it('awards 50x points when admin deducts member coins', async () => {
    const member = { id: 'member-1', coins: 200, points: 20 };
    const memberRepo = {
      findOne: jest.fn().mockResolvedValue(member),
      save: jest.fn(async (entity) => entity),
    };
    const service = new MembershipService({} as any, memberRepo as any);

    await service.adjustCoins('member-1', -30);

    expect(member.coins).toBe(170);
    expect(member.points).toBe(1520);
    expect(memberRepo.save).toHaveBeenCalledWith(member);
  });

  it('does not award consumption points when admin adds member coins', async () => {
    const member = { id: 'member-1', coins: 200, points: 20 };
    const memberRepo = {
      findOne: jest.fn().mockResolvedValue(member),
      save: jest.fn(async (entity) => entity),
    };
    const service = new MembershipService({} as any, memberRepo as any);

    await service.adjustCoins('member-1', 30);

    expect(member.coins).toBe(230);
    expect(member.points).toBe(20);
  });

  it('settles coin recharge with both coins and bonus points', async () => {
    const member = { id: 'member-1', coins: 5, points: 100 };
    const coinTransactionRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((entity) => entity),
      save: jest.fn(async (entity) => entity),
    };
    const memberRepo = {
      findOne: jest.fn().mockResolvedValue(member),
      save: jest.fn(async (entity) => entity),
    };
    const service = new PaymentService(
      {} as any,
      {} as any,
      {} as any,
      memberRepo as any,
      {} as any,
      {} as any,
      coinTransactionRepo as any,
      {} as any,
      {} as any,
    );

    await (service as any).handleRechargePaymentSuccess({
      id: 'payment-1',
      paymentOrderNo: 'COIN_001',
      type: PaymentType.RECHARGE,
      method: PaymentMethod.WECHAT_PAY,
      status: PaymentStatus.SUCCESS,
      amount: 50000,
      member: { id: 'member-1' },
    });

    expect(member.coins).toBe(65);
    expect(member.points).toBe(30100);
    expect(coinTransactionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        memberId: 'member-1',
        type: CoinTransactionType.RECHARGE,
        amount: 60,
        pointsUsed: 30000,
        paymentAmount: 500,
        transactionId: 'COIN_001',
        status: 'SUCCESS',
      }),
    );
  });

  it('repairs a successful coin recharge that already added coins but missed bonus points', async () => {
    const member = { id: 'member-1', coins: 60, points: 0 };
    const existingTransaction = {
      memberId: 'member-1',
      type: CoinTransactionType.RECHARGE,
      amount: 60,
      paymentAmount: 500,
      transactionId: 'COIN_001',
      status: CoinTransactionStatus.SUCCESS,
      pointsUsed: null,
      remark: '金币充值 60金币',
    };
    const coinTransactionRepo = {
      findOne: jest.fn().mockResolvedValue(existingTransaction),
      save: jest.fn(async (entity) => entity),
    };
    const memberRepo = {
      findOne: jest.fn().mockResolvedValue(member),
      save: jest.fn(async (entity) => entity),
    };
    const service = new PaymentService(
      {} as any,
      {} as any,
      {} as any,
      memberRepo as any,
      {} as any,
      {} as any,
      coinTransactionRepo as any,
      {} as any,
      {} as any,
    );

    await (service as any).handleRechargePaymentSuccess({
      id: 'payment-1',
      paymentOrderNo: 'COIN_001',
      type: PaymentType.RECHARGE,
      method: PaymentMethod.WECHAT_PAY,
      status: PaymentStatus.SUCCESS,
      amount: 50000,
      member: { id: 'member-1' },
    });

    expect(member.coins).toBe(60);
    expect(member.points).toBe(30000);
    expect(existingTransaction.pointsUsed).toBe(30000);
    expect(existingTransaction.paymentAmount).toBe(500);
    expect(coinTransactionRepo.save).toHaveBeenCalledWith(existingTransaction);
  });

  it('does not grant recharge bonus points again after the bonus marker is recorded', async () => {
    const member = { id: 'member-1', coins: 60, points: 30000 };
    const existingTransaction = {
      memberId: 'member-1',
      type: CoinTransactionType.RECHARGE,
      amount: 60,
      paymentAmount: 500,
      transactionId: 'COIN_001',
      status: CoinTransactionStatus.SUCCESS,
      pointsUsed: 30000,
      remark: '金币充值 60金币，赠送30000积分',
    };
    const coinTransactionRepo = {
      findOne: jest.fn().mockResolvedValue(existingTransaction),
      save: jest.fn(async (entity) => entity),
    };
    const memberRepo = {
      findOne: jest.fn().mockResolvedValue(member),
      save: jest.fn(async (entity) => entity),
    };
    const service = new PaymentService(
      {} as any,
      {} as any,
      {} as any,
      memberRepo as any,
      {} as any,
      {} as any,
      coinTransactionRepo as any,
      {} as any,
      {} as any,
    );

    await (service as any).handleRechargePaymentSuccess({
      id: 'payment-1',
      paymentOrderNo: 'COIN_001',
      type: PaymentType.RECHARGE,
      method: PaymentMethod.WECHAT_PAY,
      status: PaymentStatus.SUCCESS,
      amount: 50000,
      member: { id: 'member-1' },
    });

    expect(member.points).toBe(30000);
    expect(memberRepo.save).not.toHaveBeenCalled();
    expect(coinTransactionRepo.save).not.toHaveBeenCalled();
  });

  it('returns success after payment status sync settles coin recharge', async () => {
    const member = { id: 'member-1', coins: 0, points: 0 };
    const processingPayment = {
      id: 'payment-1',
      paymentOrderNo: 'COIN_001',
      type: PaymentType.RECHARGE,
      method: PaymentMethod.WECHAT_PAY,
      status: PaymentStatus.PROCESSING,
      amount: 100000,
      member: { id: 'member-1' },
    };
    const successPayment = {
      ...processingPayment,
      status: PaymentStatus.SUCCESS,
      thirdPartyOrderNo: 'wx-transaction-1',
      paidAt: new Date(),
    };
    const paymentRepo = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce(processingPayment)
        .mockResolvedValueOnce(successPayment),
      createQueryBuilder: jest.fn(() => ({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      })),
    };
    const coinTransactionRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((entity) => entity),
      save: jest.fn(async (entity) => entity),
    };
    const memberRepo = {
      findOne: jest.fn().mockResolvedValue(member),
      save: jest.fn(async (entity) => entity),
    };
    const wechatPayService = {
      queryOrder: jest.fn().mockResolvedValue({
        trade_state: 'SUCCESS',
        transaction_id: 'wx-transaction-1',
      }),
    };
    const service = new PaymentService(
      paymentRepo as any,
      {} as any,
      {} as any,
      memberRepo as any,
      {} as any,
      {} as any,
      coinTransactionRepo as any,
      {} as any,
      wechatPayService as any,
    );

    const result = await service.getPaymentStatus('payment-1');

    expect(result.status).toBe(PaymentStatus.SUCCESS);
    expect(member.coins).toBe(150);
    expect(member.points).toBe(80000);
  });

  it('recovers unsettled coin recharge when payment is already marked successful', async () => {
    const member = { id: 'member-1', coins: 0, points: 0 };
    const payment = {
      id: 'payment-1',
      paymentOrderNo: 'COIN_001',
      type: PaymentType.RECHARGE,
      method: PaymentMethod.WECHAT_PAY,
      status: PaymentStatus.SUCCESS,
      amount: 200000,
      member: { id: 'member-1' },
    };
    const paymentRepo = {
      findOne: jest.fn().mockResolvedValue(payment),
    };
    const coinTransactionRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((entity) => entity),
      save: jest.fn(async (entity) => entity),
    };
    const memberRepo = {
      findOne: jest.fn().mockResolvedValue(member),
      save: jest.fn(async (entity) => entity),
    };
    const service = new PaymentService(
      paymentRepo as any,
      {} as any,
      {} as any,
      memberRepo as any,
      {} as any,
      {} as any,
      coinTransactionRepo as any,
      {} as any,
      {} as any,
    );

    const result = await service.getPaymentStatus('payment-1');

    expect(result.status).toBe(PaymentStatus.SUCCESS);
    expect(member.coins).toBe(400);
    expect(member.points).toBe(200000);
  });

  it('recovers unsettled coin recharge on duplicate success callback', async () => {
    const member = { id: 'member-1', coins: 0, points: 0 };
    const payment = {
      id: 'payment-1',
      paymentOrderNo: 'COIN_001',
      type: PaymentType.RECHARGE,
      method: PaymentMethod.WECHAT_PAY,
      status: PaymentStatus.SUCCESS,
      amount: 500000,
      member: { id: 'member-1' },
    };
    const paymentRepo = {
      findOne: jest.fn().mockResolvedValue(payment),
      createQueryBuilder: jest.fn(() => ({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0 }),
      })),
    };
    const coinTransactionRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((entity) => entity),
      save: jest.fn(async (entity) => entity),
    };
    const memberRepo = {
      findOne: jest.fn().mockResolvedValue(member),
      save: jest.fn(async (entity) => entity),
    };
    const service = new PaymentService(
      paymentRepo as any,
      {} as any,
      {} as any,
      memberRepo as any,
      {} as any,
      {} as any,
      coinTransactionRepo as any,
      {} as any,
      {} as any,
    );

    await service.handleWechatPayCallback('COIN_001', 'wx-transaction-1');

    expect(member.coins).toBe(1000);
    expect(member.points).toBe(600000);
  });

  it('includes active wine vouchers in owned coupons', async () => {
    const userCouponRepo = {
      update: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
    };
    const wineVoucherBatchRepo = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'batch-1',
          memberId: 'member-1',
          packageName: '月赛畅饮券',
          remainingQuantity: 2,
          quantity: 2,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
        },
      ]),
    };
    const service = new (CouponsService as any)(
      {} as any,
      userCouponRepo as any,
      wineVoucherBatchRepo as any,
      {} as any,
    );

    const result = await service.getUserCoupons('member-1', UserCouponStatus.AVAILABLE);

    expect(result).toEqual([
      expect.objectContaining({
        id: 'wine-voucher-batch-1-1',
        kind: 'WINE_VOUCHER',
        status: UserCouponStatus.AVAILABLE,
        remainingQuantity: 1,
        coupon: expect.objectContaining({
          name: '月赛畅饮券',
          description: '酒券15天有效，过期自动失效',
        }),
      }),
      expect.objectContaining({
        id: 'wine-voucher-batch-1-2',
        kind: 'WINE_VOUCHER',
        status: UserCouponStatus.AVAILABLE,
        remainingQuantity: 1,
      }),
    ]);
  });

  it('does not fall back to legacy wine voucher count once batch records exist', async () => {
    const userCouponRepo = {
      update: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
    };
    const wineVoucherBatchRepo = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'batch-used',
          memberId: 'member-1',
          packageName: '点单酒券',
          remainingQuantity: 0,
          quantity: 1,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
        },
      ]),
    };
    const membershipService = {
      findMemberById: jest.fn().mockResolvedValue({ id: 'member-1', wineVouchers: 2 }),
    };
    const service = new (CouponsService as any)(
      {} as any,
      userCouponRepo as any,
      wineVoucherBatchRepo as any,
      membershipService as any,
    );

    const result = await service.getUserCoupons('member-1', UserCouponStatus.AVAILABLE);

    expect(result).toEqual([]);
    expect(membershipService.findMemberById).not.toHaveBeenCalled();
  });

  it('normalizes old short wine voucher expiry to the required 15-day window', async () => {
    const createdAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const wrongExpiresAt = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const userCouponRepo = {
      update: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
    };
    const wineVoucherBatchRepo = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'batch-short-expiry',
          memberId: 'member-1',
          packageName: '点单酒券',
          remainingQuantity: 2,
          quantity: 2,
          expiresAt: wrongExpiresAt,
          createdAt,
        },
      ]),
    };
    const service = new (CouponsService as any)(
      {} as any,
      userCouponRepo as any,
      wineVoucherBatchRepo as any,
      {} as any,
    );

    const result = await service.getUserCoupons('member-1', UserCouponStatus.AVAILABLE);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      status: UserCouponStatus.AVAILABLE,
      remainingQuantity: 1,
    });
    expect(result[0].endTime.getTime()).toBe(createdAt.getTime() + WINE_VOUCHER_VALID_DAYS * 24 * 60 * 60 * 1000);
  });

  it('falls back to legacy wine voucher count if voucher batches cannot be queried', async () => {
    const userCouponRepo = {
      update: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
    };
    const wineVoucherBatchRepo = {
      find: jest.fn().mockRejectedValue(new Error('wine_voucher_batches missing')),
    };
    const membershipService = {
      findMemberById: jest.fn().mockResolvedValue({ id: 'member-1', wineVouchers: 3 }),
    };
    const service = new (CouponsService as any)(
      {} as any,
      userCouponRepo as any,
      wineVoucherBatchRepo as any,
      membershipService as any,
    );

    const result = await service.getUserCoupons('member-1', UserCouponStatus.AVAILABLE);

    expect(result).toEqual([
      expect.objectContaining({
        id: 'legacy-wine-voucher-member-1',
        kind: 'WINE_VOUCHER',
        status: UserCouponStatus.AVAILABLE,
        remainingQuantity: 3,
        coupon: expect.objectContaining({
          name: '酒券',
          description: '历史酒券，请尽快使用',
        }),
      }),
    ]);
  });

  it('redeems general wine voucher options against legacy member voucher count', async () => {
    const option = {
      id: 'option-1',
      name: '长岛冰茶',
      isActive: true,
      requiredVoucherCount: 1,
      voucherPackageId: null,
      items: [{ menuItemId: 'menu-1', quantity: 1, specType: 'single' }],
    };
    const member = { id: 'member-1', wineVouchers: 1 };
    const optionRepo = {
      findOne: jest.fn().mockResolvedValue(option),
    };
    const batchRepo = {
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn(async (entity) => entity),
    };
    const memberRepo = {
      findOne: jest.fn().mockResolvedValue(member),
      save: jest.fn(async (entity) => entity),
    };
    const redemptionRepo = {
      create: jest.fn((entity) => entity),
      save: jest.fn(async (entity) => ({ id: 'redemption-1', ...entity })),
    };
    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity.name === 'WineVoucherRedeemOptionEntity') return optionRepo;
        if (entity.name === 'WineVoucherBatchEntity') return batchRepo;
        if (entity.name === 'MemberEntity') return memberRepo;
        if (entity.name === 'WineVoucherRedemptionEntity') return redemptionRepo;
        throw new Error(`Unexpected repository ${entity.name}`);
      }),
    };
    const dataSource = {
      transaction: jest.fn(async (callback) => callback(manager)),
    };
    const ordersService = {
      createWineVoucherRedemptionOrder: jest.fn().mockResolvedValue({ id: 'order-1' }),
    };
    const adminNotificationsService = {
      createOrderNotification: jest.fn().mockResolvedValue(undefined),
    };
    const service = new WineVoucherOptionsService(
      dataSource as any,
      {} as any,
      {} as any,
      ordersService as any,
      adminNotificationsService as any,
    );

    const result = await service.redeem('option-1', {
      memberId: 'member-1',
      tableId: 'table-1',
    });

    expect(result.order.id).toBe('order-1');
    expect(member.wineVouchers).toBe(0);
    expect(ordersService.createWineVoucherRedemptionOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        memberId: 'member-1',
        tableId: 'table-1',
        optionName: '长岛冰茶',
      }),
      manager,
    );
    expect(redemptionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        memberId: 'member-1',
        voucherBatchId: undefined,
        optionId: 'option-1',
        orderId: 'order-1',
        voucherCount: 1,
      }),
    );
  });

  it('redeems a selected single wine voucher batch even when the option has a package filter', async () => {
    const option = {
      id: 'option-1',
      name: '长岛冰茶',
      isActive: true,
      requiredVoucherCount: 1,
      voucherPackageId: 'monthly-free-flow',
      items: [{ menuItemId: 'menu-1', quantity: 1, specType: 'single' }],
    };
    const selectedBatch = {
      id: 'batch-1',
      memberId: 'member-1',
      sourceId: 'menu-order-voucher',
      remainingQuantity: 1,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };
    const member = { id: 'member-1', wineVouchers: 1 };
    const optionRepo = {
      findOne: jest.fn().mockResolvedValue(option),
    };
    const batchRepo = {
      find: jest.fn().mockResolvedValue([selectedBatch]),
      save: jest.fn(async (entity) => entity),
    };
    const memberRepo = {
      findOne: jest.fn().mockResolvedValue(member),
      save: jest.fn(async (entity) => entity),
    };
    const redemptionRepo = {
      create: jest.fn((entity) => entity),
      save: jest.fn(async (entity) => ({ id: 'redemption-1', ...entity })),
    };
    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity.name === 'WineVoucherRedeemOptionEntity') return optionRepo;
        if (entity.name === 'WineVoucherBatchEntity') return batchRepo;
        if (entity.name === 'MemberEntity') return memberRepo;
        if (entity.name === 'WineVoucherRedemptionEntity') return redemptionRepo;
        throw new Error(`Unexpected repository ${entity.name}`);
      }),
    };
    const dataSource = {
      transaction: jest.fn(async (callback) => callback(manager)),
    };
    const ordersService = {
      createWineVoucherRedemptionOrder: jest.fn().mockResolvedValue({ id: 'order-1' }),
    };
    const adminNotificationsService = {
      createOrderNotification: jest.fn().mockResolvedValue(undefined),
    };
    const service = new WineVoucherOptionsService(
      dataSource as any,
      {} as any,
      {} as any,
      ordersService as any,
      adminNotificationsService as any,
    );

    const result = await service.redeem('option-1', {
      memberId: 'member-1',
      tableId: 'table-1',
      voucherBatchId: 'batch-1',
    });

    expect(result.order.id).toBe('order-1');
    expect(selectedBatch.remainingQuantity).toBe(0);
    expect(member.wineVouchers).toBe(0);
    expect(batchRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ sourceId: 'monthly-free-flow' }),
      }),
    );
    expect(redemptionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        voucherBatchId: 'batch-1',
        voucherCount: 1,
      }),
    );
  });

  it('models wine voucher redemption as a paid order with wine voucher payment', () => {
    const ordersService = fs.readFileSync(path.join(__dirname, '../src/orders/orders.service.ts'), 'utf8');
    const adminOrders = fs.readFileSync(path.join(__dirname, '../../admin/src/pages/Orders/index.tsx'), 'utf8');

    expect(ordersService).toContain("paymentMethod = 'wine_voucher'");
    expect(ordersService).toContain('WineVoucherRedemptionEntity');
    expect(adminOrders).toContain('wine_voucher');
    expect(adminOrders).toContain('\u9152\u5238\u652f\u4ed8');
  });
});
