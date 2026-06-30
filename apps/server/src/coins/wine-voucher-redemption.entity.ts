import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MemberEntity } from '../membership/member.entity';
import { OrderEntity } from '../orders/order.entity';
import { WineVoucherBatchEntity } from './wine-voucher-batch.entity';
import { WineVoucherRedeemOptionEntity } from './wine-voucher-redeem-option.entity';

@Entity('wine_voucher_redemptions')
export class WineVoucherRedemptionEntity {
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ description: '会员ID' })
  @Column({ name: 'member_id' })
  memberId!: string;

  @ManyToOne(() => MemberEntity, { nullable: true })
  @JoinColumn({ name: 'member_id' })
  member?: MemberEntity;

  @ApiPropertyOptional({ description: '优先消耗的酒券批次ID' })
  @Column({ nullable: true, name: 'voucher_batch_id' })
  voucherBatchId?: string;

  @ManyToOne(() => WineVoucherBatchEntity, { nullable: true })
  @JoinColumn({ name: 'voucher_batch_id' })
  voucherBatch?: WineVoucherBatchEntity;

  @ApiProperty({ description: '兑换项ID' })
  @Column({ name: 'option_id' })
  optionId!: string;

  @ManyToOne(() => WineVoucherRedeemOptionEntity, { eager: true })
  @JoinColumn({ name: 'option_id' })
  option!: WineVoucherRedeemOptionEntity;

  @ApiProperty({ description: '订单ID' })
  @Column({ name: 'order_id' })
  orderId!: string;

  @ManyToOne(() => OrderEntity, { eager: true })
  @JoinColumn({ name: 'order_id' })
  order!: OrderEntity;

  @ApiProperty({ description: '消耗酒券数量' })
  @Column({ type: 'int', name: 'voucher_count' })
  voucherCount!: number;

  @ApiPropertyOptional({ description: '兑换快照' })
  @Column({ type: 'text', nullable: true, name: 'items_snapshot' })
  itemsSnapshot?: string;

  @ApiProperty({ type: String, format: 'date-time' })
  @CreateDateColumn()
  createdAt!: Date;
}

