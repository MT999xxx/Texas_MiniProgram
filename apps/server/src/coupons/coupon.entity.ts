import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum CouponType {
  AMOUNT = 'AMOUNT',        // 满减券 (满X元减Y元)
  DISCOUNT = 'DISCOUNT',    // 折扣券 (X折)
  PERCENTAGE = 'PERCENTAGE' // 百分比折扣 (减免X%)
}

export enum CouponStatus {
  ACTIVE = 'ACTIVE',       // 可领取
  INACTIVE = 'INACTIVE',   // 已下架
  EXPIRED = 'EXPIRED'      // 已过期
}

@Entity('coupons')
export class CouponEntity {
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ description: '优惠券名称' })
  @Column({ length: 100 })
  name!: string;

  @ApiProperty({ description: '优惠券描述' })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({ enum: CouponType })
  @Column({ type: 'enum', enum: CouponType })
  type!: CouponType;

  @ApiProperty({ description: '优惠券面值/折扣值' })
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  value!: number;

  @ApiProperty({ description: '最低消费金额', nullable: true })
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'min_amount' })
  minAmount?: number;

  @ApiProperty({ description: '最大折扣金额', nullable: true })
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'max_discount' })
  maxDiscount?: number;

  @ApiProperty({ description: '发行总量' })
  @Column({ type: 'int', name: 'total_quantity' })
  totalQuantity!: number;

  @ApiProperty({ description: '已领取数量' })
  @Column({ type: 'int', name: 'claimed_quantity', default: 0 })
  claimedQuantity!: number;

  @ApiProperty({ description: '每人限领数量', nullable: true })
  @Column({ type: 'int', nullable: true, name: 'limit_per_user' })
  limitPerUser?: number;

  @ApiProperty({ description: '会员等级要求', nullable: true })
  @Column({ type: 'int', nullable: true, name: 'min_member_level' })
  minMemberLevel?: number;

  @ApiProperty({ enum: CouponStatus })
  @Column({ type: 'enum', enum: CouponStatus, default: CouponStatus.ACTIVE })
  status!: CouponStatus;

  @ApiProperty({ description: '生效时间' })
  @Column({ type: 'datetime', name: 'start_time' })
  startTime!: Date;

  @ApiProperty({ description: '过期时间' })
  @Column({ type: 'datetime', name: 'end_time' })
  endTime!: Date;

  @ApiProperty({ description: '领取后有效天数', nullable: true })
  @Column({ type: 'int', nullable: true, name: 'valid_days' })
  validDays?: number;

  @ApiProperty({ type: String, format: 'date-time' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}