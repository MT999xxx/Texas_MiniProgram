import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoyaltyTransactionEntity, LoyaltyTransactionType } from './loyalty-transaction.entity';
import { MembershipService } from '../membership/membership.service';
import { OrderEntity } from '../orders/order.entity';

@Injectable()
export class LoyaltyService {
  constructor(
    @InjectRepository(LoyaltyTransactionEntity)
    private readonly repo: Repository<LoyaltyTransactionEntity>,
    private readonly membershipService: MembershipService,
  ) {}

  async awardPointsForOrder(order: OrderEntity) {
    if (!order.member) {
      return null;
    }
    const points = Math.floor(Number(order.totalAmount));
    if (points <= 0) {
      return null;
    }
    await this.membershipService.adjustPoints(order.member.id, points);
    const trx = this.repo.create({
      member: order.member,
      order,
      type: LoyaltyTransactionType.EARN,
      points,
      remark: '订单消费奖励',
    });
    return this.repo.save(trx);
  }
}
