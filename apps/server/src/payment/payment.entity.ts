import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MemberEntity } from '../membership/member.entity';
import { OrderEntity } from '../orders/order.entity';

export enum PaymentType {
  ORDER_PAYMENT = 'ORDER_PAYMENT',    // 订单支付
  RECHARGE = 'RECHARGE',              // 充值
  REFUND = 'REFUND',                  // 退款
}

export enum PaymentStatus {
  PENDING = 'PENDING',       // 待支付
  PROCESSING = 'PROCESSING', // 支付中
  SUCCESS = 'SUCCESS',       // 支付成功
  FAILED = 'FAILED',         // 支付失败
  CANCELLED = 'CANCELLED',   // 已取消
  REFUNDED = 'REFUNDED',     // 已退款
}

export enum PaymentMethod {
  WECHAT_PAY = 'WECHAT_PAY',     // 微信支付
  ALIPAY = 'ALIPAY',             // 支付宝
  POINTS = 'POINTS',             // 积分支付
  CASH = 'CASH',                 // 现金
}

@Entity('payments')
export class PaymentEntity {
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ description: '支付订单号' })
  @Column({ unique: true, length: 32 })
  paymentOrderNo!: string;

  @ApiPropertyOptional({ description: '第三方支付订单号' })
  @Column({ nullable: true })
  thirdPartyOrderNo?: string;

  @ApiProperty({ enum: PaymentType, description: '支付类型' })
  @Column({ type: 'enum', enum: PaymentType })
  type!: PaymentType;

  @ApiProperty({ enum: PaymentMethod, description: '支付方式' })
  @Column({ type: 'enum', enum: PaymentMethod })
  method!: PaymentMethod;

  @ApiProperty({ enum: PaymentStatus, description: '支付状态' })
  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status!: PaymentStatus;

  @ApiProperty({ description: '支付金额（分）' })
  @Column({ type: 'bigint' })
  amount!: number;

  @ApiProperty({ description: '实际支付金额（分）' })
  @Column({ type: 'bigint', nullable: true })
  actualAmount?: number;

  @ApiProperty({ description: '货币类型' })
  @Column({ default: 'CNY', length: 3 })
  currency!: string;

  @ApiPropertyOptional({ description: '支付描述' })
  @Column({ nullable: true })
  description?: string;

  @ApiPropertyOptional({ type: () => MemberEntity })
  @ManyToOne(() => MemberEntity, { nullable: true })
  member?: MemberEntity;

  @ApiPropertyOptional({ type: () => OrderEntity })
  @ManyToOne(() => OrderEntity, { nullable: true })
  order?: OrderEntity;

  @ApiPropertyOptional({ description: '支付时间' })
  @Column({ type: 'timestamp', nullable: true })
  paidAt?: Date;

  @ApiPropertyOptional({ description: '过期时间' })
  @Column({ type: 'timestamp', nullable: true })
  expireAt?: Date;

  @ApiPropertyOptional({ description: '支付回调数据', type: 'text' })
  @Column({ type: 'text', nullable: true })
  callbackData?: string;

  @ApiPropertyOptional({ description: '失败原因' })
  @Column({ nullable: true })
  failureReason?: string;

  @ApiPropertyOptional({ description: '退款金额（分）' })
  @Column({ type: 'bigint', default: 0 })
  refundAmount!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  @CreateDateColumn()
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  @UpdateDateColumn()
  updatedAt!: Date;
}

// 充值记录实体
@Entity('recharge_records')
export class RechargeRecordEntity {
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ type: () => MemberEntity })
  @ManyToOne(() => MemberEntity)
  member!: MemberEntity;

  @ApiProperty({ type: () => PaymentEntity })
  @ManyToOne(() => PaymentEntity)
  payment!: PaymentEntity;

  @ApiProperty({ description: '充值金额（分）' })
  @Column({ type: 'bigint' })
  amount!: number;

  @ApiProperty({ description: '获得积分' })
  @Column({ type: 'int' })
  pointsEarned!: number;

  @ApiProperty({ description: '充值套餐ID' })
  @Column({ nullable: true })
  packageId?: string;

  @ApiPropertyOptional({ description: '赠送积分' })
  @Column({ type: 'int', default: 0 })
  bonusPoints!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  @CreateDateColumn()
  createdAt!: Date;
}

// 充值套餐实体
@Entity('recharge_packages')
export class RechargePackageEntity {
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ description: '套餐名称' })
  @Column({ length: 100 })
  name!: string;

  @ApiProperty({ description: '充值金额（分）' })
  @Column({ type: 'bigint' })
  amount!: number;

  @ApiProperty({ description: '获得积分' })
  @Column({ type: 'int' })
  points!: number;

  @ApiPropertyOptional({ description: '赠送积分' })
  @Column({ type: 'int', default: 0 })
  bonusPoints!: number;

  @ApiPropertyOptional({ description: '套餐描述' })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({ description: '是否启用' })
  @Column({ default: true })
  isEnabled!: boolean;

  @ApiProperty({ description: '排序' })
  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  @CreateDateColumn()
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  @UpdateDateColumn()
  updatedAt!: Date;
}