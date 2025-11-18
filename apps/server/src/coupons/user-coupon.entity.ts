import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MemberEntity } from '../membership/member.entity';
import { CouponEntity } from './coupon.entity';
import { OrderEntity } from '../orders/order.entity';

export enum UserCouponStatus {
  AVAILABLE = 'AVAILABLE', // 可使用
  USED = 'USED',          // 已使用
  EXPIRED = 'EXPIRED'     // 已过期
}

@Entity('user_coupons')
export class UserCouponEntity {
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ type: () => MemberEntity })
  @ManyToOne(() => MemberEntity, { eager: true })
  member!: MemberEntity;

  @Column({ name: 'member_id' })
  memberId!: string;

  @ApiProperty({ type: () => CouponEntity })
  @ManyToOne(() => CouponEntity, { eager: true })
  coupon!: CouponEntity;

  @Column({ name: 'coupon_id' })
  couponId!: string;

  @ApiProperty({ description: '优惠券编码' })
  @Column({ length: 32, unique: true })
  code!: string;

  @ApiProperty({ enum: UserCouponStatus })
  @Column({ type: 'enum', enum: UserCouponStatus, default: UserCouponStatus.AVAILABLE })
  status!: UserCouponStatus;

  @ApiProperty({ description: '生效时间' })
  @Column({ type: 'datetime', name: 'start_time' })
  startTime!: Date;

  @ApiProperty({ description: '过期时间' })
  @Column({ type: 'datetime', name: 'end_time' })
  endTime!: Date;

  @ApiProperty({ type: () => OrderEntity, nullable: true })
  @ManyToOne(() => OrderEntity, { nullable: true })
  usedOrder?: OrderEntity;

  @Column({ name: 'used_order_id', nullable: true })
  usedOrderId?: string;

  @ApiProperty({ description: '使用时间', nullable: true })
  @Column({ type: 'datetime', nullable: true, name: 'used_at' })
  usedAt?: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}