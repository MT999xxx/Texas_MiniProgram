import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { MemberEntity } from '../membership/member.entity';
import { OrderEntity } from '../orders/order.entity';

export enum LoyaltyTransactionType {
  EARN = 'EARN',
  REDEEM = 'REDEEM',
}

@Entity('loyalty_transactions')
export class LoyaltyTransactionEntity {
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ type: () => MemberEntity })
  @ManyToOne(() => MemberEntity, (member) => member.loyaltyTransactions, { eager: true })
  member!: MemberEntity;

  @ApiPropertyOptional({ type: () => OrderEntity })
  @ManyToOne(() => OrderEntity, { nullable: true, eager: true })
  order?: OrderEntity;

  @ApiProperty({ enum: LoyaltyTransactionType })
  @Column({ type: 'enum', enum: LoyaltyTransactionType })
  type!: LoyaltyTransactionType;

  @ApiProperty({ description: '积分变动' })
  @Column({ type: 'int' })
  points!: number;

  @ApiPropertyOptional({ description: '备注' })
  @Column({ length: 120, nullable: true })
  remark?: string;

  @ApiProperty({ type: String, format: 'date-time' })
  @CreateDateColumn()
  createdAt!: Date;
}
