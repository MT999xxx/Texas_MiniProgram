import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, LessThan, Repository } from 'typeorm';
import { OrderEntity } from '../orders/order.entity';
import {
  PrintJobEntity,
  PrintJobStatus,
  ReceiptPrintPayload,
} from './print-job.entity';

const MAX_PRINT_ATTEMPTS = 10;
const STALE_CLAIM_MS = 2 * 60 * 1000;

@Injectable()
export class PrintJobsService {
  constructor(
    @InjectRepository(PrintJobEntity)
    private readonly printJobRepo: Repository<PrintJobEntity>,
  ) {}

  validateAgentToken(token?: string) {
    const expected = process.env.PRINT_AGENT_TOKEN?.trim();
    if (!expected || !token || token !== expected) {
      throw new UnauthorizedException('打印代理鉴权失败');
    }
  }

  async enqueueOrder(orderId: string, manager?: EntityManager): Promise<PrintJobEntity> {
    const jobRepo = manager?.getRepository(PrintJobEntity) || this.printJobRepo;
    const orderRepo = manager?.getRepository(OrderEntity)
      || this.printJobRepo.manager.getRepository(OrderEntity);

    const existing = await jobRepo.findOne({ where: { orderId } });
    if (existing) return existing;

    const order = await orderRepo.findOne({
      where: { id: orderId },
      relations: ['member', 'table', 'items', 'items.menuItem'],
    });
    if (!order) throw new NotFoundException('待打印订单不存在');

    const payload: ReceiptPrintPayload = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      tableName: order.table?.name || '未选择桌位',
      memberName: order.member?.nickname,
      paymentMethod: this.paymentMethodLabel(order.paymentMethod),
      originalAmount: Number(order.originalAmount || 0),
      discountAmount: Number(order.discountAmount || 0),
      totalAmount: Number(order.totalAmount || 0),
      notes: order.notes || undefined,
      paidAt: (order.paidAt || order.createdAt || new Date()).toISOString(),
      items: (order.items || []).map((item) => ({
        name: item.menuItem?.name || '商品',
        quantity: Number(item.quantity || 0),
        unitPrice: Number(item.unitPrice ?? item.menuItem?.price ?? 0),
        amount: Number(item.amount || 0),
        specType: item.specType || undefined,
      })),
    };

    try {
      return await jobRepo.save(jobRepo.create({
        orderId: order.id,
        payload,
        status: PrintJobStatus.PENDING,
      }));
    } catch (error: any) {
      if (error?.code === 'ER_DUP_ENTRY' || error?.code === 'SQLITE_CONSTRAINT') {
        const duplicate = await jobRepo.findOne({ where: { orderId } });
        if (duplicate) return duplicate;
      }
      throw error;
    }
  }

  async claimNext(): Promise<PrintJobEntity | null> {
    await this.printJobRepo.update(
      {
        status: PrintJobStatus.PRINTING,
        claimedAt: LessThan(new Date(Date.now() - STALE_CLAIM_MS)),
      },
      {
        status: PrintJobStatus.PENDING,
        claimedAt: undefined,
        lastError: '打印代理超时，任务已重新排队',
      },
    );

    return this.printJobRepo.manager.transaction(async (manager) => {
      const repo = manager.getRepository(PrintJobEntity);
      const job = await repo
        .createQueryBuilder('job')
        .setLock('pessimistic_write')
        .where('job.status = :status', { status: PrintJobStatus.PENDING })
        .andWhere('job.attempts < :maxAttempts', { maxAttempts: MAX_PRINT_ATTEMPTS })
        .orderBy('job.createdAt', 'ASC')
        .getOne();

      if (!job) return null;
      job.status = PrintJobStatus.PRINTING;
      job.claimedAt = new Date();
      job.attempts += 1;
      return repo.save(job);
    });
  }

  async complete(id: string): Promise<PrintJobEntity> {
    const job = await this.getJob(id);
    job.status = PrintJobStatus.PRINTED;
    job.printedAt = new Date();
    job.lastError = undefined;
    return this.printJobRepo.save(job);
  }

  async fail(id: string, error?: string): Promise<PrintJobEntity> {
    const job = await this.getJob(id);
    job.status = job.attempts >= MAX_PRINT_ATTEMPTS
      ? PrintJobStatus.FAILED
      : PrintJobStatus.PENDING;
    job.claimedAt = undefined;
    job.lastError = String(error || '打印失败').slice(0, 2000);
    return this.printJobRepo.save(job);
  }

  async requeue(id: string): Promise<PrintJobEntity> {
    const job = await this.getJob(id);
    job.status = PrintJobStatus.PENDING;
    job.attempts = 0;
    job.claimedAt = undefined;
    job.printedAt = undefined;
    job.lastError = undefined;
    return this.printJobRepo.save(job);
  }

  private async getJob(id: string): Promise<PrintJobEntity> {
    const job = await this.printJobRepo.findOne({ where: { id } });
    if (!job) throw new NotFoundException('打印任务不存在');
    return job;
  }

  private paymentMethodLabel(method?: string): string {
    const normalized = String(method || '').toLowerCase();
    if (normalized.includes('wechat')) return '微信支付';
    if (normalized.includes('coin')) return '金币支付';
    if (normalized.includes('voucher') || normalized.includes('酒券') || normalized.includes('优惠')) {
      return '酒券支付';
    }
    if (normalized.includes('backend')) return '后台确认';
    return method || '其他';
  }
}
