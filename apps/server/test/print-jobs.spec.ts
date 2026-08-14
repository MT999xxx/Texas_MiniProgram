import { UnauthorizedException } from '@nestjs/common';
import { PrintJobStatus } from '../src/print-jobs/print-job.entity';
import { PrintJobsService } from '../src/print-jobs/print-jobs.service';

describe('order receipt print jobs', () => {
  const order = {
    id: 'order-1',
    orderNumber: 'TXP260725001',
    table: { name: '酒桌1' },
    member: { nickname: '测试会员' },
    paymentMethod: 'wechat_pay',
    originalAmount: 116,
    discountAmount: 0,
    totalAmount: 116,
    paidAt: new Date('2026-07-25T12:00:00.000Z'),
    createdAt: new Date('2026-07-25T11:59:00.000Z'),
    items: [
      {
        menuItem: { name: '长岛冰茶', price: 68 },
        quantity: 1,
        unitPrice: 68,
        amount: 68,
        specType: 'single',
      },
    ],
  };

  function createService(existing: any = null) {
    const saved: any[] = [];
    const orderRepo = {
      findOne: jest.fn().mockResolvedValue(order),
    };
    const repo: any = {
      findOne: jest.fn().mockResolvedValue(existing),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => {
        const result = { id: 'job-1', attempts: 0, ...value };
        saved.push(result);
        return result;
      }),
      manager: {
        getRepository: jest.fn(() => orderRepo),
      },
    };
    return { service: new PrintJobsService(repo), repo, orderRepo, saved };
  }

  it('creates one payload snapshot per paid order', async () => {
    const { service, saved } = createService();
    const job = await service.enqueueOrder(order.id);

    expect(job.status).toBe(PrintJobStatus.PENDING);
    expect(job.payload.tableName).toBe('酒桌1');
    expect(job.payload.paymentMethod).toBe('微信支付');
    expect(job.payload.items[0]).toMatchObject({
      name: '长岛冰茶',
      quantity: 1,
      amount: 68,
    });
    expect(saved).toHaveLength(1);
  });

  it('returns the existing job instead of printing an order twice', async () => {
    const existing = { id: 'job-existing', orderId: order.id };
    const { service, repo, orderRepo } = createService(existing);

    await expect(service.enqueueOrder(order.id)).resolves.toBe(existing);
    expect(repo.save).not.toHaveBeenCalled();
    expect(orderRepo.findOne).not.toHaveBeenCalled();
  });

  it('rejects agents when the shared token is absent or wrong', () => {
    const original = process.env.PRINT_AGENT_TOKEN;
    process.env.PRINT_AGENT_TOKEN = 'correct-token';
    const { service } = createService();
    expect(() => service.validateAgentToken('wrong-token')).toThrow(UnauthorizedException);
    expect(() => service.validateAgentToken('correct-token')).not.toThrow();
    if (original === undefined) {
      delete process.env.PRINT_AGENT_TOKEN;
    } else {
      process.env.PRINT_AGENT_TOKEN = original;
    }
  });
});
