import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, Repository } from 'typeorm';
import { OrderEntity } from '../orders/order.entity';
import { AdminNotificationEntity, AdminNotificationType } from './admin-notification.entity';

@Injectable()
export class AdminNotificationsService {
  constructor(
    @InjectRepository(AdminNotificationEntity)
    private readonly notificationRepo: Repository<AdminNotificationEntity>,
  ) {}

  async createOrderNotification(order: OrderEntity, manager?: EntityManager) {
    const repo = manager?.getRepository(AdminNotificationEntity) || this.notificationRepo;
    const tableName = order.table?.name || '未选择桌位';
    const memberName = order.member?.nickname || '顾客';
    const paymentText = order.paymentMethod === 'wine_voucher' ? '酒券支付' : '新订单';
    const content = `${memberName} 在 ${tableName} 下单，${paymentText}`;

    return repo.save(repo.create({
      type: AdminNotificationType.ORDER,
      title: '新订单',
      content,
      sourceType: 'order',
      sourceId: order.id,
    }));
  }

  async createPointWithdrawNotification(
    member: { id?: string; nickname?: string; phone?: string } | undefined,
    points: number,
    transaction: { id?: string } | undefined,
    manager?: EntityManager,
  ) {
    const repo = manager?.getRepository(AdminNotificationEntity) || this.notificationRepo;
    const memberName = member?.nickname || member?.phone || '顾客';

    return repo.save(repo.create({
      type: AdminNotificationType.WARNING,
      title: '取分申请',
      content: `${memberName} 提交取分 ${points} 积分`,
      sourceType: 'point_withdraw',
      sourceId: transaction?.id || member?.id,
    }));
  }

  list(status: 'all' | 'unread' = 'all', limit = 50) {
    const take = Math.min(Math.max(Number(limit) || 50, 1), 100);
    return this.notificationRepo.find({
      where: status === 'unread' ? { readAt: IsNull() } : {},
      order: { createdAt: 'DESC' },
      take,
    });
  }

  async markRead(id: string) {
    const notification = await this.notificationRepo.findOne({ where: { id } });
    if (!notification) throw new NotFoundException('通知不存在');
    if (!notification.readAt) {
      notification.readAt = new Date();
      await this.notificationRepo.save(notification);
    }
    return notification;
  }

  async markAllRead() {
    await this.notificationRepo
      .createQueryBuilder()
      .update(AdminNotificationEntity)
      .set({ readAt: new Date() })
      .where('read_at IS NULL')
      .execute();
    return { success: true };
  }
}
